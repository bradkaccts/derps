import { describe, it, expect } from "vitest";
import {
  CONFIDENCE_PRIOR,
  LOW_CONFIDENCE_SCORE_CAP,
  RulesScoringStrategy,
  TRAIT_WEIGHTS,
  availabilityOverlap,
  confidenceGate,
  confidencePenalty,
  distanceDecay,
  guardingGate,
  ordinalProximity,
  sizeSubScore,
  sociabilityGate,
} from "@/lib/playdates/scoring";
import { type ScoringContext } from "@/lib/playdates/types";
import { makePet } from "./fixtures";

const strategy = new RulesScoringStrategy();
const ctx: ScoringContext = { distanceMiles: 1, preferredMiles: 10 };

describe("trait weights", () => {
  it("sum to 1.0 so a perfect pair can reach 100", () => {
    const total = Object.values(TRAIT_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 10);
  });
});

describe("sub-scores", () => {
  it("ordinal proximity is 1 for identical and 0 for opposite ends", () => {
    expect(ordinalProximity(3, 3)).toBe(1);
    expect(ordinalProximity(1, 5)).toBe(0);
    expect(ordinalProximity(2, 4)).toBeCloseTo(0.5);
  });

  it("size is 1.0 under 2x and decays to 0.3 at 5x", () => {
    expect(sizeSubScore(20, 20)).toBe(1);
    expect(sizeSubScore(30, 20)).toBe(1);
    expect(sizeSubScore(40, 20)).toBe(1);
    expect(sizeSubScore(100, 20)).toBe(0.3);
    expect(sizeSubScore(150, 20)).toBe(0.3);
    // 3.5x sits halfway through the decay band.
    expect(sizeSubScore(70, 20)).toBeCloseTo(0.65, 2);
  });

  it("size penalty is direction-agnostic", () => {
    expect(sizeSubScore(60, 10)).toBe(sizeSubScore(10, 60));
  });
});

describe("soft gates", () => {
  it("the less social pet governs the pair", () => {
    expect(sociabilityGate(5, 5)).toBe(1);
    expect(sociabilityGate(5, 3)).toBeCloseTo(0.6);
    expect(sociabilityGate(3, 5)).toBeCloseTo(0.6);
    expect(sociabilityGate(5, 1)).toBeCloseTo(0.2);
  });

  it("penalises extreme confidence gaps only", () => {
    expect(confidenceGate(3, 3)).toBe(1);
    expect(confidenceGate(5, 3)).toBe(1);
    expect(confidenceGate(5, 2)).toBe(0.8);
    expect(confidenceGate(5, 1)).toBe(0.65);
  });

  it("applies the guarding gate when exactly one pet guards", () => {
    expect(guardingGate([], [])).toBe(1);
    expect(guardingGate(["toys"], [])).toBe(0.6);
    expect(guardingGate([], ["food"])).toBe(0.6);
    // Both guarding is a hard filter's problem, not a gate's.
    expect(guardingGate(["toys"], ["food"])).toBe(1);
  });

  it("a gate cannot be outvoted by a strong weighted sum", () => {
    const actor = makePet({ traits: { play_style: "wrestler", energy: 5, dog_sociability: 5 } });
    const sociable = makePet({ traits: { play_style: "wrestler", energy: 5, dog_sociability: 5 } });
    const selective = makePet({ traits: { play_style: "wrestler", energy: 5, dog_sociability: 3 } });

    const high = strategy.score(actor, sociable, ctx).score;
    const gated = strategy.score(actor, selective, ctx).score;

    expect(high).toBeGreaterThan(gated);
    // min(5,3)/5 = 0.6 — the gate must dominate, not nudge.
    expect(gated).toBeLessThan(high * 0.7);
  });
});

describe("modifiers", () => {
  it("distance decay halves the score at the preferred radius", () => {
    expect(distanceDecay(0, 10)).toBe(1);
    expect(distanceDecay(10, 10)).toBeCloseTo(0.5);
    expect(distanceDecay(20, 10)).toBeCloseTo(0.2);
  });

  it("availability overlap is floored so a schedule mismatch never zeroes a good pair", () => {
    expect(availabilityOverlap(["sat-morning"], ["sun-evening"])).toBe(0.5);
    expect(availabilityOverlap(["sat-morning"], ["sat-morning"])).toBe(1);
    expect(availabilityOverlap([], ["sat-morning"])).toBe(0.5);
  });

  it("treats a subset schedule as full overlap, not half", () => {
    // Free only Saturday morning, versus free both weekend mornings: fully
    // compatible. A Jaccard here would halve every score in the deck.
    expect(availabilityOverlap(["sat-morning"], ["sat-morning", "sun-morning"])).toBe(1);
    expect(availabilityOverlap(["sat-morning", "sun-morning"], ["sat-morning"])).toBe(1);
    expect(availabilityOverlap(["sat-morning", "tue-evening"], ["sat-morning", "sun-morning"])).toBe(
      0.5,
    );
  });

  it("confidence penalty pulls high scores toward the prior and leaves low ones alone", () => {
    expect(confidencePenalty(0.95, 1)).toBe(1);
    expect(confidencePenalty(0.4, 0.2)).toBe(1);
    const penalty = confidencePenalty(0.95, 0.5);
    expect(0.95 * penalty).toBeCloseTo(0.5 * 0.95 + 0.5 * CONFIDENCE_PRIOR, 5);
    expect(penalty).toBeLessThan(1);
  });
});

describe("RulesScoringStrategy", () => {
  it("returns per-dimension contributions alongside every score (RE-601)", () => {
    const result = strategy.score(makePet(), makePet(), ctx);
    const traitDims = result.featureContributions.filter((c) => c.kind === "trait");
    expect(traitDims).toHaveLength(Object.keys(TRAIT_WEIGHTS).length);
    expect(result.featureContributions.some((c) => c.kind === "gate")).toBe(true);
    expect(result.featureContributions.some((c) => c.dimension === "distance_decay")).toBe(true);
  });

  it("scores an identical, co-located, fully-confident pair near the top", () => {
    const traits = {
      play_style: "wrestler" as const,
      energy: 4,
      confidence: 4,
      dog_sociability: 5,
      size_kg: 20,
      noise: 3,
    };
    const a = makePet({ traits });
    const b = makePet({ traits });
    const result = strategy.score(a, b, { distanceMiles: 0.5, preferredMiles: 10 });
    expect(result.score).toBeGreaterThan(85);
  });

  it("never displays above 85 when mean trait confidence is below 0.6 (RE-605)", () => {
    const traits = { play_style: "wrestler" as const, energy: 4, confidence: 4, dog_sociability: 5 };
    const a = makePet({ traits, confidence: 1 });
    const b = makePet({ traits, confidence: 0.4 });
    const result = strategy.score(a, b, { distanceMiles: 0.2, preferredMiles: 10 });
    expect(result.score).toBeLessThanOrEqual(LOW_CONFIDENCE_SCORE_CAP);
    expect(result.confidenceCapped).toBe(true);
  });

  it("prefers complementary play styles over mismatched ones", () => {
    const wrestler = makePet({ traits: { play_style: "wrestler" } });
    const otherWrestler = makePet({ traits: { play_style: "wrestler" } });
    const observer = makePet({ traits: { play_style: "observer" } });

    expect(strategy.score(wrestler, otherWrestler, ctx).score).toBeGreaterThan(
      strategy.score(wrestler, observer, ctx).score,
    );
  });

  it("is symmetric for symmetric inputs", () => {
    const a = makePet({ traits: { energy: 5, play_style: "chaser" } });
    const b = makePet({ traits: { energy: 2, play_style: "parallel" } });
    expect(strategy.score(a, b, ctx).score).toBe(strategy.score(b, a, ctx).score);
  });

  it("produces a score in [0, 100] under adversarial inputs", () => {
    const a = makePet({
      traits: { energy: 5, confidence: 5, dog_sociability: 5, size_kg: 80, play_style: "wrestler" },
    });
    const b = makePet({
      traits: { energy: 1, confidence: 1, dog_sociability: 3, size_kg: 2, play_style: "observer" },
      preference: { availabilityWindows: ["thu-evening"] },
    });
    const result = strategy.score(a, b, { distanceMiles: 49, preferredMiles: 2 });
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
