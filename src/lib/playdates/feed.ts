/**
 * The four-stage feed pipeline (§6.1).
 *
 *   1. CANDIDATE GENERATION  →  2. HARD FILTER  →  3. SCORE  →  4. RANK & DIVERSIFY
 *      geo + eligibility        safety and         compatibility   reciprocity,
 *      ≤500 candidates          declared limits    0-100 + reasons novelty, explore
 *
 * The stages are stable; the implementations behind them are disposable. This
 * module is also the boundary where precise geo stops: a `FeedCard` carries a
 * `DistanceBand` and no coordinate, at any precision (SEC-801/803).
 */
import { createImpression, playdateEvents } from "./analytics";
import { generateCandidates, type CandidateInput } from "./candidates";
import { applyHardFilters } from "./filters";
import { bandForMiles, haversineMiles } from "./geo";
import { diversify, rankCandidates } from "./ranking";
import { buildGateDisclosures, buildReasonString } from "./reasons";
import { strategyForPet } from "./scoring";
import { deriveVibeArchetype } from "./vibe-card";
import {
  type Block,
  type Deck,
  type FeedCard,
  type Impression,
  type ScoredPet,
  type ScoringStrategy,
  type Swipe,
} from "./types";

export interface BuildFeedInput {
  actor: ScoredPet;
  pool: ScoredPet[];
  swipes: Swipe[];
  blocks: Block[];
  matchedPetIds: Set<string>;
  impressionCounts: Record<string, number>;
  /** Pet ids that have booped the actor — surfaced at the top of the deck (SW-209). */
  boopedBy?: Set<string>;
  /** SW-207 — the deck is prefetched in slices of 20 so swiping stays instant. */
  limit?: number;
  now?: Date;
  strategy?: ScoringStrategy;
}

export interface FeedResult {
  deck: Deck;
  /** RE-610 — one impression per card, logged the moment the deck is served. */
  impressions: Impression[];
}

export const DECK_PREFETCH_SIZE = 20;

export function buildFeed(input: BuildFeedInput): FeedResult {
  const now = input.now ?? new Date();
  const strategy = input.strategy ?? strategyForPet(input.actor.pet.id);
  const limit = input.limit ?? DECK_PREFETCH_SIZE;
  const boopedBy = input.boopedBy ?? new Set<string>();

  /* -------- Stage 1: candidate generation -------- */
  const candidateInput: CandidateInput = {
    actor: input.actor,
    pool: input.pool,
    swipes: input.swipes,
    blocks: input.blocks,
    matchedPetIds: input.matchedPetIds,
    now,
  };
  const candidateSet = generateCandidates(candidateInput);

  /* -------- Stage 2: hard filters (bidirectional, never shown) -------- */
  const survivors = candidateSet.candidates.filter(
    (candidate) =>
      applyHardFilters({ actor: input.actor, candidate, blocks: input.blocks, now }).passed,
  );

  /* -------- Stage 3: score -------- */
  const scored = survivors.map((candidate) => {
    const distanceMiles = haversineMiles(input.actor.pet.homeGeo, candidate.pet.homeGeo);
    const result = strategy.score(input.actor, candidate, {
      distanceMiles,
      preferredMiles: input.actor.preference.maxTravelMiles,
    });
    return { candidate, result, distanceMiles };
  });

  /* -------- Stage 4: rank & diversify -------- */
  const ranked = rankCandidates({
    actor: input.actor,
    scored: scored.map(({ candidate, result }) => ({
      candidate,
      score: result.score,
      meanConfidence: result.meanConfidence,
    })),
    impressionCounts: input.impressionCounts,
  });

  const resultByPetId = new Map(scored.map((s) => [s.candidate.pet.id, s]));
  const ordered = diversify(ranked);

  // SW-209 — a Boop pins its sender to the top of the recipient's deck.
  const boopedFirst = [
    ...ordered.filter((entry) => boopedBy.has(entry.candidate.pet.id)),
    ...ordered.filter((entry) => !boopedBy.has(entry.candidate.pet.id)),
  ];

  const impressions: Impression[] = [];
  const cards: FeedCard[] = boopedFirst.slice(0, limit).map((entry, index) => {
    const scoredEntry = resultByPetId.get(entry.candidate.pet.id);
    /* c8 ignore next */
    if (!scoredEntry) throw new Error(`missing score for ${entry.candidate.pet.id}`);

    const { result, distanceMiles } = scoredEntry;
    const distanceBand = bandForMiles(distanceMiles);
    const candidatePet = entry.candidate.pet;
    const candidateTraits = entry.candidate.personality.traits;
    const actorTraits = input.actor.personality.traits;

    const impression = createImpression({
      actorPetId: input.actor.pet.id,
      candidatePetId: candidatePet.id,
      rankPosition: index,
      score: result.score,
      featureVector: result.featureContributions,
      strategyId: strategy.id,
    });
    impressions.push(impression);
    playdateEvents.publish({
      type: "impression.logged",
      impressionId: impression.id,
      actorPetId: input.actor.pet.id,
      candidatePetId: candidatePet.id,
      rankPosition: index,
      score: result.score,
      strategyId: strategy.id,
      at: impression.shownAt,
    });

    return {
      petId: candidatePet.id,
      name: candidatePet.name,
      breed: candidatePet.breed,
      age: candidatePet.age,
      species: candidatePet.species,
      photos: candidatePet.photos,
      healthVerified: candidatePet.healthVerified,
      distanceBand,
      score: result.score,
      reason: buildReasonString(
        result.featureContributions,
        actorTraits,
        candidateTraits,
        distanceBand,
      ),
      gateDisclosures: buildGateDisclosures(
        result.featureContributions,
        candidatePet.name,
        candidateTraits,
        actorTraits,
      ),
      contributions: result.featureContributions,
      meanConfidence: result.meanConfidence,
      confidenceCapped: result.confidenceCapped,
      traits: {
        energy: candidateTraits.energy,
        playStyle: candidateTraits.play_style,
        lifeStage: candidateTraits.life_stage,
        sizeKg: candidateTraits.size_kg,
        sociability: candidateTraits.dog_sociability,
      },
      archetype: deriveVibeArchetype(candidateTraits).title,
      rankPosition: index,
      impressionId: impression.id,
      strategyId: strategy.id,
      modelVersion: strategy.modelVersion,
      featureVersion: strategy.featureVersion,
      isExploration: entry.isExploration,
      boopedYou: boopedBy.has(candidatePet.id),
    } satisfies FeedCard;
  });

  return {
    deck: {
      cards,
      radiusMiles: candidateSet.radiusMiles,
      widened: candidateSet.widened,
      requestedRadiusMiles: candidateSet.requestedRadiusMiles,
      exhausted: cards.length === 0,
      strategyId: strategy.id,
    },
    impressions,
  };
}
