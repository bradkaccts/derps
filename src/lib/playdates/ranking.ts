/**
 * Stage 4 — rank & diversify (§6.5).
 *
 * Sorting by raw compatibility is the classic mistake: it piles every deck in
 * the metro onto the same handful of highly compatible profiles, whose owners
 * are then overwhelmed and churn, while everyone else sees an empty inbox.
 *
 *   rank_score = compatibility × P(candidate likes actor) × novelty × responsiveness
 */
import { type RankedCandidate, type ScoredPet } from "./types";
import { haversineMiles } from "./geo";

/** Cards sharing a play style may not appear more than this many times in a row. */
export const MAX_CONSECUTIVE_PLAY_STYLE = 3;
/** At least this many cards in every window of 10 come from the exploration bucket. */
export const EXPLORATION_PER_WINDOW = 2;
export const EXPLORATION_WINDOW = 10;
/** Exploration draws from moderate-score, low-impression candidates. */
export const EXPLORATION_SCORE_RANGE: [number, number] = [40, 75];
export const EXPLORATION_MAX_IMPRESSIONS = 3;

export interface RankInput {
  actor: ScoredPet;
  scored: {
    candidate: ScoredPet;
    score: number;
    meanConfidence: number;
  }[];
  /** Impression counts per candidate pet, for the novelty demotion. */
  impressionCounts: Record<string, number>;
}

/**
 * v1 prior for P(candidate likes actor): the candidate's historical
 * right-swipe rate, discounted when the actor sits outside the distance the
 * candidate is willing to travel. V1+ replaces this with a learned
 * reciprocity model behind the same call site.
 */
export function reciprocityPrior(actor: ScoredPet, candidate: ScoredPet): number {
  const base = Math.min(1, Math.max(0.05, candidate.pet.historicalRightSwipeRate));
  const miles = haversineMiles(actor.pet.homeGeo, candidate.pet.homeGeo);
  const reachable = miles <= candidate.preference.maxTravelMiles;
  return Number((base * (reachable ? 1 : 0.5)).toFixed(4));
}

/** Mild demotion for pets already shown many times without action. */
export function novelty(impressions: number): number {
  return Number((1 / (1 + impressions / 12)).toFixed(4));
}

/**
 * Protects the scarcest resource in the system: a person who actually shows up.
 * Floored so a new owner with no history is not buried before they can build one.
 */
export function responsiveness(candidate: ScoredPet): number {
  return Number(Math.min(1, Math.max(0.4, candidate.pet.ownerResponsiveness)).toFixed(4));
}

function isExplorationCandidate(score: number, impressions: number): boolean {
  const [lo, hi] = EXPLORATION_SCORE_RANGE;
  return score >= lo && score <= hi && impressions <= EXPLORATION_MAX_IMPRESSIONS;
}

export function rankCandidates({ actor, scored, impressionCounts }: RankInput): RankedCandidate[] {
  return scored
    .map(({ candidate, score }) => {
      const impressions = impressionCounts[candidate.pet.id] ?? 0;
      const prior = reciprocityPrior(actor, candidate);
      const nov = novelty(impressions);
      const resp = responsiveness(candidate);
      const compatibility = score / 100;

      return {
        candidate,
        scoreResult: {
          score,
          featureContributions: [],
          meanConfidence: 0,
          confidenceCapped: false,
        },
        distanceMiles: haversineMiles(actor.pet.homeGeo, candidate.pet.homeGeo),
        rankScore: Number((compatibility * prior * nov * resp).toFixed(6)),
        reciprocityPrior: prior,
        novelty: nov,
        responsiveness: resp,
        isExploration: isExplorationCandidate(score, impressions),
      } satisfies RankedCandidate;
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

/**
 * Diversification pass.
 *
 * Two constraints, applied greedily over the rank-ordered list:
 *  1. No more than three consecutive cards sharing a play style.
 *  2. At least two cards in every ten drawn from the exploration bucket.
 *
 * Exploration is not charity — it is how you collect the training data that
 * lets the learned model beat the rules engine. Exploration cards are
 * deliberately indistinguishable from exploit cards in the UI (SW-212).
 */
export function diversify(ranked: RankedCandidate[]): RankedCandidate[] {
  const remaining = [...ranked];
  const output: RankedCandidate[] = [];

  const styleOf = (entry: RankedCandidate) => entry.candidate.personality.traits.play_style;

  const wouldBreakStyleRun = (entry: RankedCandidate) => {
    if (output.length < MAX_CONSECUTIVE_PLAY_STYLE) return false;
    const tail = output.slice(-MAX_CONSECUTIVE_PLAY_STYLE);
    return tail.every((t) => styleOf(t) === styleOf(entry));
  };

  while (remaining.length > 0) {
    const positionInWindow = output.length % EXPLORATION_WINDOW;
    const windowStart = output.length - positionInWindow;
    const explorationSoFar = output.slice(windowStart).filter((e) => e.isExploration).length;
    const slotsLeftInWindow = EXPLORATION_WINDOW - positionInWindow;
    const explorationDebt = EXPLORATION_PER_WINDOW - explorationSoFar;

    // Force an exploration pick only when the window would otherwise close short.
    const mustExplore = explorationDebt > 0 && slotsLeftInWindow <= explorationDebt;

    let index = remaining.findIndex(
      (entry) => (!mustExplore || entry.isExploration) && !wouldBreakStyleRun(entry),
    );
    if (index === -1) {
      index = remaining.findIndex((entry) => !mustExplore || entry.isExploration);
    }
    if (index === -1) index = 0;

    output.push(remaining[index]);
    remaining.splice(index, 1);
  }

  return output;
}
