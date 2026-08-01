/**
 * TrustScore contributions & feedback-driven trait adjustment
 * (FB-505, FB-506, PQ-109, §13.10).
 *
 * Two rules shape everything here:
 *
 *  1. Playdate-derived trust inputs are a *distinct weighted component* with
 *     their own audit trail. A single opaque number that mixes an escrow
 *     dispute with a park no-show cannot be explained to a user, appealed, or
 *     audited — and one of those will be required of you.
 *
 *  2. A pattern of negative feedback about a *pet* never triggers punitive
 *     action against the *user*. Only owner-behaviour signals — no-shows and
 *     safety reports — move TrustScore. A shy dog is not a bad person.
 */
import {
  type FeedbackTag,
  type MeetupFeedback,
  type PetTraitVector,
  type TraitConfidence,
  type TraitDimension,
} from "./types";

export type TrustSignalSource = "adoption" | "playdates";

export interface TrustSignal {
  id: string;
  source: TrustSignalSource;
  kind: "no_show" | "safety_report" | "completed_meetup" | "positive_feedback";
  userId: string;
  delta: number;
  reason: string;
  at: string;
}

/** §4.2 — two confirmed no-shows in 90 days restricts meetup proposals pending review. */
export const NO_SHOW_LOOKBACK_DAYS = 90;
export const NO_SHOW_RESTRICTION_THRESHOLD = 2;

const DAY_MS = 86_400_000;

export interface TrustBreakdown {
  /** The adoption product's component, carried through untouched. */
  adoptionComponent: number;
  /** Playdates' own component — separately attributable and independently appealable. */
  playdatesComponent: number;
  total: number;
  signals: TrustSignal[];
}

const PLAYDATES_WEIGHT = 0.35;

export function computeTrustBreakdown(
  adoptionScore: number,
  signals: TrustSignal[],
): TrustBreakdown {
  const playdateSignals = signals.filter((s) => s.source === "playdates");
  const raw = playdateSignals.reduce((sum, s) => sum + s.delta, 100);
  const playdatesComponent = Math.max(0, Math.min(100, raw));

  return {
    adoptionComponent: adoptionScore,
    playdatesComponent,
    total: Math.round(adoptionScore * (1 - PLAYDATES_WEIGHT) + playdatesComponent * PLAYDATES_WEIGHT),
    signals: playdateSignals,
  };
}

export function isMeetupProposalRestricted(
  signals: TrustSignal[],
  now: Date = new Date(),
): boolean {
  const cutoff = now.getTime() - NO_SHOW_LOOKBACK_DAYS * DAY_MS;
  const recentNoShows = signals.filter(
    (s) => s.kind === "no_show" && new Date(s.at).getTime() >= cutoff,
  );
  return recentNoShows.length >= NO_SHOW_RESTRICTION_THRESHOLD;
}

/* ------------------------------------------------------------------ *
 * PQ-109 — feedback-driven trait adjustment
 * ------------------------------------------------------------------ */

export interface TraitAdjustmentProposal {
  dimension: TraitDimension;
  currentValue: number;
  proposedValue: number;
  /** Plain-language justification shown to the owner for confirmation. */
  rationale: string;
  supportingFeedbackCount: number;
}

/** Tag → the dimension it informs and the direction it pushes. */
const TAG_SIGNALS: Partial<Record<FeedbackTag, { dimension: TraitDimension; delta: number; phrase: string }>> = {
  too_rough: { dimension: "energy", delta: 0.5, phrase: "played rougher than expected" },
  too_shy: { dimension: "confidence", delta: -0.5, phrase: "was more reserved than expected" },
  guarded_resources: { dimension: "dog_sociability", delta: -0.3, phrase: "guarded resources" },
  great_energy_match: { dimension: "energy", delta: 0, phrase: "matched energy well" },
};

const MIN_SUPPORTING_FEEDBACK = 2;

/**
 * Propose — never apply. Adjustments are surfaced to the owner for
 * confirmation and are never applied silently: a profile that changes behind
 * the owner's back is a profile they stop trusting.
 */
export function proposeTraitAdjustments(
  petId: string,
  traits: PetTraitVector,
  feedback: MeetupFeedback[],
): TraitAdjustmentProposal[] {
  const aboutThisPet = feedback.filter((f) => f.subjectPetId === petId);
  const tallies = new Map<FeedbackTag, number>();

  aboutThisPet.forEach((entry) => {
    entry.tags.forEach((tag) => tallies.set(tag, (tallies.get(tag) ?? 0) + 1));
  });

  const proposals: TraitAdjustmentProposal[] = [];

  tallies.forEach((count, tag) => {
    const signal = TAG_SIGNALS[tag];
    if (!signal || signal.delta === 0 || count < MIN_SUPPORTING_FEEDBACK) return;

    const current = traits[signal.dimension];
    if (typeof current !== "number") return;

    const proposed = Math.min(5, Math.max(1, Number((current + signal.delta).toFixed(1))));
    if (proposed === current) return;

    proposals.push({
      dimension: signal.dimension,
      currentValue: current,
      proposedValue: proposed,
      rationale: `${count} playdate partners said your pup ${signal.phrase}. Want us to nudge ${signal.dimension.replace(/_/g, " ")} to ${proposed}?`,
      supportingFeedbackCount: count,
    });
  });

  return proposals;
}

/** FB-505 — feedback also raises confidence in the dimensions it corroborates. */
export function reinforceConfidence(
  confidence: TraitConfidence,
  feedbackCount: number,
): TraitConfidence {
  if (feedbackCount === 0) return confidence;
  const boost = Math.min(0.15, feedbackCount * 0.05);
  const out = { ...confidence };
  (Object.keys(out) as TraitDimension[]).forEach((dim) => {
    out[dim] = Number(Math.min(1, out[dim] + boost).toFixed(2));
  });
  return out;
}

/**
 * FB-506 in code: only these two kinds ever produce a negative TrustScore
 * delta. Feedback about how a *dog* behaved is routed to the recommender and
 * to trait confidence, and stops there.
 */
export function trustSignalForNoShow(userId: string, meetupId: string): TrustSignal {
  return {
    id: `ts-${meetupId}-noshow`,
    source: "playdates",
    kind: "no_show",
    userId,
    delta: -12,
    reason: "Confirmed no-show at a scheduled meetup",
    at: new Date().toISOString(),
  };
}

export function trustSignalForCompletedMeetup(userId: string, meetupId: string): TrustSignal {
  return {
    id: `ts-${meetupId}-complete`,
    source: "playdates",
    kind: "completed_meetup",
    userId,
    delta: 3,
    reason: "Showed up to a scheduled meetup and checked in",
    at: new Date().toISOString(),
  };
}
