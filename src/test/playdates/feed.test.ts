import { describe, it, expect, beforeEach } from "vitest";
import { buildFeed } from "@/lib/playdates/feed";
import { generateCandidates, isSuppressedBySwipeHistory } from "@/lib/playdates/candidates";
import { diversify, novelty, rankCandidates, responsiveness } from "@/lib/playdates/ranking";
import { playdateEvents } from "@/lib/playdates/analytics";
import { bandForMiles } from "@/lib/playdates/geo";
import { type Block, type Swipe } from "@/lib/playdates/types";
import { makePet, pointMilesAway } from "./fixtures";

const noSwipes: Swipe[] = [];
const noBlocks: Block[] = [];
const noMatches = new Set<string>();

function swipe(actorPetId: string, targetPetId: string, direction: Swipe["direction"], daysAgo = 0): Swipe {
  return {
    id: `sw-${actorPetId}-${targetPetId}-${direction}-${daysAgo}`,
    actorPetId,
    targetPetId,
    direction,
    impressionId: "imp-1",
    scoreAtImpression: 70,
    featureVersion: "feat-v1",
    modelVersion: "rules-v1",
    strategyId: "rules-v1-default",
    createdAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
  };
}

describe("candidate generation (§6.2)", () => {
  it("excludes the actor's own pets, since Priya's dogs do not date each other", () => {
    const actor = makePet({ ownerId: "priya" });
    const sibling = makePet({ ownerId: "priya" });
    const stranger = makePet({ ownerId: "someone" });

    const set = generateCandidates({
      actor,
      pool: [actor, sibling, stranger],
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
    });

    expect(set.candidates.map((c) => c.pet.id)).toEqual([stranger.pet.id]);
  });

  it("excludes pets whose quiz is incomplete (PQ-101)", () => {
    const actor = makePet();
    const unquizzed = makePet({ quizComplete: false });
    const set = generateCandidates({
      actor,
      pool: [unquizzed],
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
    });
    expect(set.candidates).toHaveLength(0);
  });

  it("excludes dormant pets and non-Active social statuses", () => {
    const actor = makePet();
    const dormant = makePet({ pet: { lastActiveAt: new Date(Date.now() - 90 * 86_400_000).toISOString() } });
    const memorial = makePet({ pet: { socialStatus: "Memorial" } });
    const paused = makePet({ pet: { socialStatus: "Paused" } });

    const set = generateCandidates({
      actor,
      pool: [dormant, memorial, paused],
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
    });
    expect(set.candidates).toHaveLength(0);
  });

  it("widens the radius when the set is thin, and reports that it did", () => {
    const actor = makePet({ preference: { maxTravelMiles: 2 } });
    const distant = makePet({ geo: pointMilesAway(20) });

    const set = generateCandidates({
      actor,
      pool: [distant],
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
    });

    expect(set.widened).toBe(true);
    expect(set.requestedRadiusMiles).toBe(2);
    expect(set.radiusMiles).toBeGreaterThan(2);
    expect(set.candidates).toHaveLength(1);
  });

  it("never widens past the 50-mile ceiling", () => {
    const actor = makePet({ preference: { maxTravelMiles: 2 } });
    const veryDistant = makePet({ geo: pointMilesAway(300) });

    const set = generateCandidates({
      actor,
      pool: [veryDistant],
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
    });

    expect(set.radiusMiles).toBeLessThanOrEqual(50);
    expect(set.candidates).toHaveLength(0);
  });
});

describe("swipe suppression (SW-206)", () => {
  it("suppresses a passed pet for 30 days, then re-serves it", () => {
    expect(isSuppressedBySwipeHistory("a", "b", [swipe("a", "b", "pass", 5)], new Date())).toBe(true);
    expect(isSuppressedBySwipeHistory("a", "b", [swipe("a", "b", "pass", 45)], new Date())).toBe(false);
  });

  it("suppresses a twice-passed pet indefinitely", () => {
    const history = [swipe("a", "b", "pass", 200), swipe("a", "b", "pass", 100)];
    expect(isSuppressedBySwipeHistory("a", "b", history, new Date())).toBe(true);
  });

  it("suppresses liked pets outright — they are a pending like or a match, not deck material", () => {
    expect(isSuppressedBySwipeHistory("a", "b", [swipe("a", "b", "like", 90)], new Date())).toBe(true);
    expect(isSuppressedBySwipeHistory("a", "b", [swipe("a", "b", "boop", 90)], new Date())).toBe(true);
  });
});

describe("ranking & diversification (§6.5)", () => {
  it("demotes pets shown many times without action", () => {
    expect(novelty(0)).toBe(1);
    expect(novelty(24)).toBeLessThan(novelty(6));
  });

  it("floors responsiveness so a brand-new owner is not buried", () => {
    const newcomer = makePet({ pet: { ownerResponsiveness: 0 } });
    expect(responsiveness(newcomer)).toBe(0.4);
  });

  it("ranks on expected mutual value, not raw compatibility", () => {
    const actor = makePet();
    // Same compatibility, but one candidate never swipes right and never replies.
    const eager = makePet({ pet: { historicalRightSwipeRate: 0.6, ownerResponsiveness: 0.95 } });
    const unresponsive = makePet({ pet: { historicalRightSwipeRate: 0.05, ownerResponsiveness: 0.4 } });

    const ranked = rankCandidates({
      actor,
      scored: [
        { candidate: unresponsive, score: 90, meanConfidence: 1 },
        { candidate: eager, score: 90, meanConfidence: 1 },
      ],
      impressionCounts: {},
    });

    expect(ranked[0].candidate.pet.id).toBe(eager.pet.id);
  });

  it("never places more than three consecutive cards sharing a play style", () => {
    const actor = makePet();
    const wrestlers = Array.from({ length: 8 }, () => makePet({ traits: { play_style: "wrestler" } }));
    const chasers = Array.from({ length: 4 }, () => makePet({ traits: { play_style: "chaser" } }));

    const ranked = rankCandidates({
      actor,
      scored: [...wrestlers, ...chasers].map((candidate, i) => ({
        candidate,
        score: 90 - i,
        meanConfidence: 1,
      })),
      impressionCounts: {},
    });

    const ordered = diversify(ranked);
    let run = 1;
    for (let i = 1; i < ordered.length; i += 1) {
      const same =
        ordered[i].candidate.personality.traits.play_style ===
        ordered[i - 1].candidate.personality.traits.play_style;
      run = same ? run + 1 : 1;
      expect(run).toBeLessThanOrEqual(3);
    }
  });

  it("keeps every card from the ranked set — diversification reorders, it does not drop", () => {
    const actor = makePet();
    const pets = Array.from({ length: 12 }, () => makePet());
    const ranked = rankCandidates({
      actor,
      scored: pets.map((candidate, i) => ({ candidate, score: 80 - i, meanConfidence: 1 })),
      impressionCounts: {},
    });
    expect(diversify(ranked)).toHaveLength(ranked.length);
  });

  it("injects exploration candidates into each window of ten", () => {
    const actor = makePet();
    // Six strong exploit candidates and six moderate, unseen exploration ones.
    const exploit = Array.from({ length: 6 }, () => makePet());
    const explore = Array.from({ length: 6 }, () => makePet());

    const ranked = rankCandidates({
      actor,
      scored: [
        ...exploit.map((candidate) => ({ candidate, score: 95, meanConfidence: 1 })),
        ...explore.map((candidate) => ({ candidate, score: 60, meanConfidence: 1 })),
      ],
      impressionCounts: {},
    });

    const firstTen = diversify(ranked).slice(0, 10);
    expect(firstTen.filter((entry) => entry.isExploration).length).toBeGreaterThanOrEqual(2);
  });
});

describe("buildFeed", () => {
  beforeEach(() => playdateEvents.clear());

  it("runs all four stages and returns cards with scores and reasons", () => {
    const actor = makePet({ traits: { play_style: "wrestler", energy: 4 } });
    const pool = [
      makePet({ traits: { play_style: "wrestler", energy: 4 }, geo: pointMilesAway(1) }),
      makePet({ traits: { play_style: "observer", energy: 1 }, geo: pointMilesAway(2) }),
    ];

    const { deck } = buildFeed({
      actor,
      pool,
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
      impressionCounts: {},
    });

    expect(deck.cards).toHaveLength(2);
    deck.cards.forEach((card) => {
      expect(card.score).toBeGreaterThanOrEqual(0);
      expect(card.reason).toContain("away");
      expect(card.contributions.length).toBeGreaterThan(0);
    });
  });

  it("exposes distance only as a band, never a coordinate or a raw distance (SEC-801/803)", () => {
    const actor = makePet();
    const pool = [makePet({ geo: pointMilesAway(4.7) })];

    const { deck } = buildFeed({
      actor,
      pool,
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
      impressionCounts: {},
    });

    const card = deck.cards[0];
    expect(card.distanceBand).toBe(bandForMiles(4.7));

    const serialised = JSON.stringify(card);
    expect(serialised).not.toContain("homeGeo");
    expect(serialised).not.toContain("lat");
    expect(serialised).not.toContain("lng");
    expect(Object.keys(card)).not.toContain("distanceMiles");
  });

  it("never emits a card for a pet excluded by a hard filter (RE-605)", () => {
    const actor = makePet({ traits: { dog_sociability: 2 } });
    const alsoSelective = makePet({ traits: { dog_sociability: 2 } });
    const sociable = makePet({ traits: { dog_sociability: 5 } });

    const { deck } = buildFeed({
      actor,
      pool: [alsoSelective, sociable],
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
      impressionCounts: {},
    });

    expect(deck.cards.map((c) => c.petId)).toEqual([sociable.pet.id]);
  });

  it("logs one impression per card with the versions needed to interpret it (RE-610)", () => {
    const actor = makePet();
    const pool = [makePet(), makePet()];

    const { deck, impressions } = buildFeed({
      actor,
      pool,
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
      impressionCounts: {},
    });

    expect(impressions).toHaveLength(deck.cards.length);
    impressions.forEach((impression) => {
      expect(impression.featureVersion).toBeTruthy();
      expect(impression.modelVersion).toBeTruthy();
      expect(impression.strategyId).toBeTruthy();
      expect(impression.featureVector.length).toBeGreaterThan(0);
    });
    expect(playdateEvents.recent().filter((e) => e.type === "impression.logged")).toHaveLength(2);
  });

  it("surfaces a Boop sender at the top of the recipient's deck (SW-209)", () => {
    const actor = makePet();
    // The booper is a deliberately weaker match, so only the Boop can lift it.
    const booper = makePet({ traits: { play_style: "observer" }, geo: pointMilesAway(8) });
    const strong = makePet({ traits: { play_style: baseStyle }, geo: pointMilesAway(0.5) });

    const { deck } = buildFeed({
      actor,
      pool: [strong, booper],
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
      impressionCounts: {},
      boopedBy: new Set([booper.pet.id]),
    });

    expect(deck.cards[0].petId).toBe(booper.pet.id);
    expect(deck.cards[0].boopedYou).toBe(true);
  });

  it("reports an exhausted deck rather than inventing candidates", () => {
    const { deck } = buildFeed({
      actor: makePet(),
      pool: [],
      swipes: noSwipes,
      blocks: noBlocks,
      matchedPetIds: noMatches,
      impressionCounts: {},
    });
    expect(deck.exhausted).toBe(true);
    expect(deck.cards).toHaveLength(0);
  });
});

const baseStyle = "parallel" as const;
