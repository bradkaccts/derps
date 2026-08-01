/**
 * Stage 1 — candidate generation (§6.2).
 *
 * Cheap, recall-oriented, index-driven. In production this is a PostGIS
 * `ST_DWithin` over a GIST-indexed geography column plus a Redis-backed
 * "already swiped" set; here it is the same shape over in-memory collections
 * so the stage boundary — and its exclusion semantics — stay honest.
 */
import { haversineMiles } from "./geo";
import { isQuizComplete } from "./quiz";
import { type Block, type CandidateSet, type ScoredPet, type Swipe } from "./types";

export const CANDIDATE_CAP = 500;
export const MIN_VIABLE_CANDIDATES = 25;
export const RADIUS_WIDEN_FACTOR = 1.5;
export const RADIUS_CEILING_MILES = 50;
export const PET_ACTIVE_WINDOW_DAYS = 30;
/** SW-206 — a passed pet is not re-served to the same actor for 30 days. */
export const PASS_COOLDOWN_DAYS = 30;
/** SW-206 — passed twice means never again. */
export const PERMANENT_PASS_THRESHOLD = 2;

const DAY_MS = 86_400_000;

export interface CandidateInput {
  actor: ScoredPet;
  pool: ScoredPet[];
  swipes: Swipe[];
  blocks: Block[];
  matchedPetIds: Set<string>;
  now?: Date;
}

/**
 * Eligibility (§6.2). An unquizzed pet is unscoreable — letting it in poisons
 * the feed for everyone else, which is why PQ-101 is a gate and not a nudge.
 */
export function isEligible(pet: ScoredPet, now: Date): boolean {
  if (pet.pet.socialStatus !== "Active") return false;
  if (!pet.pet.isPlaydateActive) return false;
  if (pet.pet.safetyHold) return false;
  if (!isQuizComplete(pet.personality)) return false;
  if (!pet.pet.vaccination) return false;
  if (new Date(pet.pet.vaccination.expiresAt).getTime() <= now.getTime()) return false;
  const lastActive = new Date(pet.pet.lastActiveAt).getTime();
  return now.getTime() - lastActive <= PET_ACTIVE_WINDOW_DAYS * DAY_MS;
}

/** SW-206 — pass cooldown and the permanent two-pass exclusion. */
export function isSuppressedBySwipeHistory(
  actorPetId: string,
  candidatePetId: string,
  swipes: Swipe[],
  now: Date,
): boolean {
  const relevant = swipes.filter(
    (s) => s.actorPetId === actorPetId && s.targetPetId === candidatePetId,
  );
  if (relevant.length === 0) return false;

  // Any like or boop removes the pet from the deck outright — it is now
  // either a pending like or a match, and neither belongs in the deck.
  if (relevant.some((s) => s.direction !== "pass")) return true;

  const passes = relevant.filter((s) => s.direction === "pass");
  if (passes.length >= PERMANENT_PASS_THRESHOLD) return true;

  return passes.some(
    (s) => now.getTime() - new Date(s.createdAt).getTime() < PASS_COOLDOWN_DAYS * DAY_MS,
  );
}

function isBlocked(actor: ScoredPet, candidate: ScoredPet, blocks: Block[]): boolean {
  return blocks.some(
    (b) =>
      (b.blockerUserId === actor.pet.ownerId && b.blockedUserId === candidate.pet.ownerId) ||
      (b.blockerUserId === candidate.pet.ownerId && b.blockedUserId === actor.pet.ownerId),
  );
}

function collect(input: CandidateInput, radiusMiles: number, now: Date): ScoredPet[] {
  const { actor, pool, swipes, blocks, matchedPetIds } = input;

  return pool
    .filter((candidate) => {
      if (candidate.pet.id === actor.pet.id) return false;
      // Same owner — Priya's dogs do not date each other.
      if (candidate.pet.ownerId === actor.pet.ownerId) return false;
      if (!isEligible(candidate, now)) return false;
      if (matchedPetIds.has(candidate.pet.id)) return false;
      if (isBlocked(actor, candidate, blocks)) return false;
      if (isSuppressedBySwipeHistory(actor.pet.id, candidate.pet.id, swipes, now)) return false;
      return haversineMiles(actor.pet.homeGeo, candidate.pet.homeGeo) <= radiusMiles;
    })
    .map((candidate) => ({
      candidate,
      // Cheap recency + proximity heuristic, applied before any scoring runs.
      heuristic:
        haversineMiles(actor.pet.homeGeo, candidate.pet.homeGeo) -
        (now.getTime() - new Date(candidate.pet.lastActiveAt).getTime()) / DAY_MS / 10,
    }))
    .sort((a, b) => a.heuristic - b.heuristic)
    .slice(0, CANDIDATE_CAP)
    .map((entry) => entry.candidate);
}

/**
 * Generate candidates, widening the radius stepwise if the set is too thin.
 * Widening is always reported so the UI can label it ("No matches within
 * 10 mi — showing 25 mi"). A hard filter is never relaxed to fill a deck.
 */
export function generateCandidates(input: CandidateInput): CandidateSet {
  const now = input.now ?? new Date();
  const requestedRadiusMiles = input.actor.preference.maxTravelMiles;

  let radiusMiles = requestedRadiusMiles;
  let candidates = collect(input, radiusMiles, now);

  while (candidates.length < MIN_VIABLE_CANDIDATES && radiusMiles < RADIUS_CEILING_MILES) {
    radiusMiles = Math.min(RADIUS_CEILING_MILES, radiusMiles * RADIUS_WIDEN_FACTOR);
    candidates = collect(input, radiusMiles, now);
  }

  return {
    candidates,
    radiusMiles: Math.round(radiusMiles),
    widened: Math.round(radiusMiles) > Math.round(requestedRadiusMiles),
    requestedRadiusMiles,
  };
}
