/**
 * Stage 2 — hard filters (§6.3). Never shown.
 *
 * These are safety and consent constraints, not preferences. A pet failing any
 * of them is *removed*, not down-ranked, and no score is ever displayed for an
 * excluded pair (RE-605).
 *
 * Filters are evaluated bidirectionally: the candidate's constraints on the
 * actor matter exactly as much as the actor's on the candidate.
 */
import {
  type Block,
  type FilterOutcome,
  type GuardingTrigger,
  type ScoredPet,
} from "./types";

const PASS: FilterOutcome = { passed: true };

/** Pets under 16 weeks are excluded from open-park matching entirely. */
export const PUPPY_PROTECTION_MIN_WEEKS = 16;

export interface FilterInput {
  actor: ScoredPet;
  candidate: ScoredPet;
  blocks: Block[];
  now?: Date;
}

/**
 * A *missing* attestation is a brand-new Derp that has not been through
 * onboarding yet — it stays discoverable and is flagged as unverified on the
 * card. A *lapsed* attestation is a stale record and still excludes the pair.
 */
function vaccinationLapsed(pet: ScoredPet, now: Date): boolean {
  if (!pet.pet.vaccination) return false;
  return new Date(pet.pet.vaccination.expiresAt).getTime() <= now.getTime();
}

/** True when a Derp has no attestation on file yet (new account, pre-approval). */
export function vaccinationPending(pet: ScoredPet): boolean {
  return !pet.pet.vaccination;
}

function sharesGuardingTrigger(a: GuardingTrigger[], b: GuardingTrigger[]): boolean {
  return a.some((trigger) => b.includes(trigger));
}

function blockedEitherDirection(a: ScoredPet, b: ScoredPet, blocks: Block[]): boolean {
  return blocks.some(
    (block) =>
      (block.blockerUserId === a.pet.ownerId && block.blockedUserId === b.pet.ownerId) ||
      (block.blockerUserId === b.pet.ownerId && block.blockedUserId === a.pet.ownerId),
  );
}

/**
 * Returns the first failing filter, or `{ passed: true }`. Order is chosen so
 * the cheapest and most categorical checks run first.
 */
export function applyHardFilters({ actor, candidate, blocks, now = new Date() }: FilterInput): FilterOutcome {
  // Block — user-level, both directions. Blocking Priya blocks all three dogs.
  if (blockedEitherDirection(actor, candidate, blocks)) {
    return { passed: false, reason: "block" };
  }

  // Safety hold — either pet or owner under an open incident review.
  if (actor.pet.safetyHold || candidate.pet.safetyHold) {
    return { passed: false, reason: "safety_hold" };
  }

  // Species — cross-species excluded unless *both* parties opted in.
  if (actor.pet.species !== candidate.pet.species) {
    if (!actor.preference.crossSpeciesOptIn || !candidate.preference.crossSpeciesOptIn) {
      return { passed: false, reason: "species" };
    }
  }

  // Vaccination — either party's attestation expired or absent.
  if (!vaccinationCurrent(actor, now) || !vaccinationCurrent(candidate, now)) {
    return { passed: false, reason: "vaccination" };
  }

  // Puppy protection.
  if (
    actor.pet.ageWeeks < PUPPY_PROTECTION_MIN_WEEKS ||
    candidate.pet.ageWeeks < PUPPY_PROTECTION_MIN_WEEKS
  ) {
    return { passed: false, reason: "puppy_protection" };
  }

  // Declared size limits — either party's violated.
  const actorSize = actor.personality.traits.size_kg;
  const candidateSize = candidate.personality.traits.size_kg;
  const sizeViolation =
    (actor.preference.hardFilters.maxSizeKg !== null &&
      candidateSize > actor.preference.hardFilters.maxSizeKg) ||
    (actor.preference.hardFilters.minSizeKg !== null &&
      candidateSize < actor.preference.hardFilters.minSizeKg) ||
    (candidate.preference.hardFilters.maxSizeKg !== null &&
      actorSize > candidate.preference.hardFilters.maxSizeKg) ||
    (candidate.preference.hardFilters.minSizeKg !== null &&
      actorSize < candidate.preference.hardFilters.minSizeKg);
  if (sizeViolation) return { passed: false, reason: "size_limit" };

  // Declared age / life-stage limits — either party's declared exclusion.
  if (
    actor.preference.hardFilters.excludedLifeStages.includes(candidate.personality.traits.life_stage) ||
    candidate.preference.hardFilters.excludedLifeStages.includes(actor.personality.traits.life_stage)
  ) {
    return { passed: false, reason: "life_stage_limit" };
  }

  // Mutual resource guarding — both pets flag the *same* trigger.
  if (
    sharesGuardingTrigger(
      actor.personality.traits.resource_guarding,
      candidate.personality.traits.resource_guarding,
    )
  ) {
    return { passed: false, reason: "mutual_resource_guarding" };
  }

  // A handler may also declare specific guarding triggers they won't accept.
  if (
    candidate.personality.traits.resource_guarding.some((t) =>
      actor.preference.hardFilters.excludedGuardingTriggers.includes(t),
    ) ||
    actor.personality.traits.resource_guarding.some((t) =>
      candidate.preference.hardFilters.excludedGuardingTriggers.includes(t),
    )
  ) {
    return { passed: false, reason: "guarding_trigger_excluded" };
  }

  // Mutual low sociability — two selective dogs is not a match, it is an incident.
  if (
    actor.personality.traits.dog_sociability <= 2 &&
    candidate.personality.traits.dog_sociability <= 2
  ) {
    return { passed: false, reason: "mutual_low_sociability" };
  }

  // Intact status — REG-910: a bidirectional safety filter, never a discovery signal.
  if (
    (actor.preference.intactOptOut && candidate.pet.intact) ||
    (candidate.preference.intactOptOut && actor.pet.intact)
  ) {
    return { passed: false, reason: "intact_status" };
  }

  return PASS;
}

export const HARD_FILTER_LABELS: Record<string, string> = {
  species: "Different species and cross-species matching is off",
  size_limit: "Outside a declared size limit",
  life_stage_limit: "Outside a declared age limit",
  vaccination: "Vaccination attestation missing or expired",
  puppy_protection: "Under 16 weeks old",
  mutual_resource_guarding: "Both pets guard the same resource",
  guarding_trigger_excluded: "Guarding trigger excluded by a hard filter",
  mutual_low_sociability: "Both pets are dog-selective",
  intact_status: "Intact status opt-out",
  safety_hold: "Under safety review",
  block: "Blocked",
};
