/**
 * Stage 3 — the compatibility score (§6.4).
 *
 *   raw      = Σ (wᵢ × sᵢ)                        over trait dimensions i
 *   gated    = raw × Π gⱼ                          multiplicative soft gates ∈ [0,1]
 *   adjusted = gated × distance_decay × availability_overlap × confidence_penalty
 *   Score    = round(100 × clamp(adjusted, 0, 1))
 *
 * Multiplicative gates are the key modelling choice. A weighted sum alone lets
 * a strong energy match paper over a fatal sociability mismatch. A gate cannot
 * be outvoted.
 *
 * Everything in this file sits behind `ScoringStrategy` (§6.1). When the
 * learned model arrives it implements the same interface and nothing upstream
 * or downstream changes.
 */
import { meanConfidence } from "./quiz";
import {
  FEATURE_VERSION,
  MODEL_VERSION,
  type FeatureContribution,
  type LifeStage,
  type MeetupType,
  type PlayStyle,
  type ScoreResult,
  type ScoredPet,
  type ScoringContext,
  type ScoringStrategy,
} from "./types";

/* ------------------------------------------------------------------ *
 * Weights (v1, to be tuned — §6.8 step 1 fits these against outcomes)
 * ------------------------------------------------------------------ */

export const TRAIT_WEIGHTS = {
  play_style: 0.25,
  energy: 0.2,
  confidence: 0.15,
  size_kg: 0.15,
  life_stage: 0.1,
  noise: 0.05,
  handler_pref_overlap: 0.1,
} as const;

export type WeightedDimension = keyof typeof TRAIT_WEIGHTS;

const DIMENSION_LABELS: Record<WeightedDimension, string> = {
  play_style: "Play style",
  energy: "Energy",
  confidence: "Confidence",
  size_kg: "Size",
  life_stage: "Life stage",
  noise: "Noise",
  handler_pref_overlap: "Meetup preferences",
};

/**
 * Play-style compatibility — complementarity, not similarity. Two wrestlers
 * are a great pair; a wrestler and an observer are not, in either direction.
 */
export const PLAY_STYLE_MATRIX: Record<PlayStyle, Record<PlayStyle, number>> = {
  wrestler: { wrestler: 1.0, chaser: 0.7, toy_focused: 0.5, parallel: 0.3, observer: 0.2 },
  chaser: { wrestler: 0.7, chaser: 0.95, toy_focused: 0.55, parallel: 0.45, observer: 0.3 },
  toy_focused: { wrestler: 0.5, chaser: 0.55, toy_focused: 0.85, parallel: 0.6, observer: 0.4 },
  parallel: { wrestler: 0.3, chaser: 0.45, toy_focused: 0.6, parallel: 0.9, observer: 0.75 },
  observer: { wrestler: 0.2, chaser: 0.3, toy_focused: 0.4, parallel: 0.75, observer: 0.85 },
};

export const LIFE_STAGE_MATRIX: Record<LifeStage, Record<LifeStage, number>> = {
  puppy: { puppy: 0.9, adolescent: 0.8, adult: 0.7, senior: 0.3 },
  adolescent: { puppy: 0.8, adolescent: 1.0, adult: 0.85, senior: 0.5 },
  adult: { puppy: 0.7, adolescent: 0.85, adult: 1.0, senior: 0.8 },
  senior: { puppy: 0.3, adolescent: 0.5, adult: 0.8, senior: 0.95 },
};

/** Score below which the confidence penalty stops applying — a penalty only penalises. */
export const CONFIDENCE_PRIOR = 0.7;
/** RE-605 — no score above this may be displayed on low-confidence input. */
export const LOW_CONFIDENCE_SCORE_CAP = 85;
export const LOW_CONFIDENCE_THRESHOLD = 0.6;
/** §6.4 — a schedule mismatch never zeroes out a good pair. */
export const AVAILABILITY_FLOOR = 0.5;
export const GUARDING_GATE = 0.6;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/* ------------------------------------------------------------------ *
 * Sub-scores
 * ------------------------------------------------------------------ */

/** Proximity on a 1–5 ordinal scale — similar is better. */
export function ordinalProximity(a: number, b: number): number {
  return clamp01(1 - Math.abs(a - b) / 4);
}

/**
 * Asymmetric, ratio-based. 1.0 while the heavier dog is under 2× the lighter
 * one, decaying to 0.3 at 5×. Small-dog risk is real and it is not symmetric
 * with the large dog's experience.
 */
export function sizeSubScore(sizeA: number, sizeB: number): number {
  const heavier = Math.max(sizeA, sizeB);
  const lighter = Math.max(0.5, Math.min(sizeA, sizeB));
  const ratio = heavier / lighter;
  if (ratio <= 2) return 1;
  if (ratio >= 5) return 0.3;
  return Number((1 - ((ratio - 2) / 3) * 0.7).toFixed(4));
}

export function jaccard<T>(a: T[], b: T[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setB = new Set(b);
  const intersection = a.filter((item) => setB.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

export function handlerPrefOverlap(a: MeetupType[], b: MeetupType[]): number {
  return jaccard(a, b);
}

/* ------------------------------------------------------------------ *
 * Soft gates — multiplicative, cannot be outvoted
 * ------------------------------------------------------------------ */

/**
 * The single most important line in the scorer: the *less* social pet governs
 * the pair. A dog that loves everyone does not make a selective dog braver.
 */
export function sociabilityGate(socA: number, socB: number): number {
  return clamp01(Math.min(socA, socB) / 5);
}

/** A bold dog paired with a timid one is a bad first experience for the timid one. */
export function confidenceGate(confA: number, confB: number): number {
  const gap = Math.abs(confA - confB);
  if (gap <= 2) return 1;
  if (gap < 4) return 0.8;
  return 0.65;
}

/**
 * Manageable with management when only one pet guards — worth flagging in the
 * reason string rather than hiding. Both guarding the *same* trigger is a hard
 * filter, not a gate (§6.3).
 */
export function guardingGate(guardingA: string[], guardingB: string[]): number {
  const aGuards = guardingA.length > 0;
  const bGuards = guardingB.length > 0;
  return aGuards !== bGuards ? GUARDING_GATE : 1;
}

/* ------------------------------------------------------------------ *
 * Modifiers
 * ------------------------------------------------------------------ */

/** A great match 40 miles away never produces a meetup, and a meetup is the only outcome that matters. */
export function distanceDecay(miles: number, preferredMiles: number): number {
  const preferred = Math.max(1, preferredMiles);
  return 1 / (1 + (miles / preferred) ** 2);
}

/**
 * The *fraction of shared* availability windows — an overlap coefficient, not
 * a Jaccard. If one person is free only on Saturday mornings and the other is
 * free Saturday and Sunday, their schedules are fully compatible; Jaccard
 * would score that 0.5 and quietly halve every score in the deck.
 *
 * (§6.4 specifies Jaccard for `handler_pref_overlap` and "fraction of shared"
 * here — deliberately different functions.)
 */
export function availabilityOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return AVAILABILITY_FLOOR;
  const setB = new Set(b);
  const shared = a.filter((window) => setB.has(window)).length;
  return Math.max(AVAILABILITY_FLOOR, shared / Math.min(a.length, b.length));
}

/**
 * Never display a high-precision score derived from low-confidence input.
 * Expressed as a multiplier so it composes with the §6.4 formula, but it only
 * ever pulls a score *down* toward the 0.70 prior — it never flatters a pair
 * whose weak score is well evidenced.
 */
export function confidencePenalty(preAdjusted: number, confidence: number): number {
  if (preAdjusted <= CONFIDENCE_PRIOR || preAdjusted <= 0) return 1;
  const conf = clamp01(confidence);
  const shrunk = conf * preAdjusted + (1 - conf) * CONFIDENCE_PRIOR;
  return clamp01(shrunk / preAdjusted);
}

/* ------------------------------------------------------------------ *
 * The v1 rules strategy
 * ------------------------------------------------------------------ */

export class RulesScoringStrategy implements ScoringStrategy {
  readonly id: string;
  readonly modelVersion = MODEL_VERSION;
  readonly featureVersion = FEATURE_VERSION;

  constructor(id = "rules-v1-default") {
    this.id = id;
  }

  score(actor: ScoredPet, candidate: ScoredPet, context: ScoringContext): ScoreResult {
    const a = actor.personality.traits;
    const b = candidate.personality.traits;

    const subScores: Record<WeightedDimension, number> = {
      play_style: PLAY_STYLE_MATRIX[a.play_style][b.play_style],
      energy: ordinalProximity(a.energy, b.energy),
      confidence: ordinalProximity(a.confidence, b.confidence),
      size_kg: sizeSubScore(a.size_kg, b.size_kg),
      life_stage: LIFE_STAGE_MATRIX[a.life_stage][b.life_stage],
      noise: ordinalProximity(a.noise, b.noise),
      handler_pref_overlap: handlerPrefOverlap(
        actor.preference.preferredMeetupTypes,
        candidate.preference.preferredMeetupTypes,
      ),
    };

    const contributions: FeatureContribution[] = (
      Object.keys(TRAIT_WEIGHTS) as WeightedDimension[]
    ).map((dimension) => {
      const weight = TRAIT_WEIGHTS[dimension];
      const subScore = subScores[dimension];
      return {
        dimension,
        label: DIMENSION_LABELS[dimension],
        weight,
        subScore,
        contribution: Number((weight * subScore).toFixed(4)),
        kind: "trait" as const,
      };
    });

    const raw = contributions.reduce((sum, c) => sum + c.contribution, 0);

    const gates = {
      sociability_gate: sociabilityGate(a.dog_sociability, b.dog_sociability),
      confidence_gate: confidenceGate(a.confidence, b.confidence),
      guarding_gate: guardingGate(a.resource_guarding, b.resource_guarding),
    };

    const gated = Object.values(gates).reduce((product, gate) => product * gate, raw);

    const decay = distanceDecay(context.distanceMiles, context.preferredMiles);
    const overlap = availabilityOverlap(
      actor.preference.availabilityWindows,
      candidate.preference.availabilityWindows,
    );
    const preAdjusted = clamp01(gated * decay * overlap);

    const pairConfidence = Math.min(
      meanConfidence(actor.personality.confidence),
      meanConfidence(candidate.personality.confidence),
    );
    const penalty = confidencePenalty(preAdjusted, pairConfidence);
    const adjusted = clamp01(preAdjusted * penalty);

    const unadjustedScore = Math.round(100 * preAdjusted);
    let score = Math.round(100 * adjusted);

    // RE-605 — a hard display cap, belt-and-braces over the multiplicative penalty.
    if (pairConfidence < LOW_CONFIDENCE_THRESHOLD && score > LOW_CONFIDENCE_SCORE_CAP) {
      score = LOW_CONFIDENCE_SCORE_CAP;
    }

    // True whenever low confidence held the displayed score down, by either
    // mechanism — this is what drives the "still a new profile" disclosure.
    const confidenceCapped = score < unadjustedScore;

    const gateContributions: FeatureContribution[] = Object.entries(gates).map(
      ([dimension, value]) => ({
        dimension,
        label: GATE_LABELS[dimension] ?? dimension,
        weight: 1,
        subScore: value,
        contribution: value,
        kind: "gate" as const,
      }),
    );

    const modifierContributions: FeatureContribution[] = [
      {
        dimension: "distance_decay",
        label: "Distance",
        weight: 1,
        subScore: decay,
        contribution: decay,
        kind: "modifier",
      },
      {
        dimension: "availability_overlap",
        label: "Schedule overlap",
        weight: 1,
        subScore: overlap,
        contribution: overlap,
        kind: "modifier",
      },
      {
        dimension: "confidence_penalty",
        label: "Profile confidence",
        weight: 1,
        subScore: penalty,
        contribution: penalty,
        kind: "modifier",
      },
    ];

    return {
      score,
      featureContributions: [...contributions, ...gateContributions, ...modifierContributions],
      meanConfidence: Number(pairConfidence.toFixed(3)),
      confidenceCapped,
    };
  }
}

const GATE_LABELS: Record<string, string> = {
  sociability_gate: "Sociability",
  confidence_gate: "Confidence gap",
  guarding_gate: "Resource guarding",
};

/**
 * RE-613 — A/B assignment happens at the ScoringStrategy level and is sticky
 * per pet, so a pet's deck never flips strategy mid-session.
 */
const STRATEGIES: ScoringStrategy[] = [new RulesScoringStrategy("rules-v1-default")];

export function strategyForPet(petId: string): ScoringStrategy {
  if (STRATEGIES.length === 1) return STRATEGIES[0];
  let hash = 0;
  for (let i = 0; i < petId.length; i += 1) hash = (hash * 31 + petId.charCodeAt(i)) >>> 0;
  return STRATEGIES[hash % STRATEGIES.length];
}

export const defaultScoringStrategy = STRATEGIES[0];
