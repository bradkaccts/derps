/**
 * Real Derps from the database, mapped into the shapes the matching pipeline
 * already consumes.
 *
 * The scoring engine is deliberately untouched: a Derp owned by another
 * account arrives as the same `ScoredPet` a mock pet does, so ranking,
 * hard filters and explanations behave identically for both.
 */
import {
  DERIVATION_VERSION,
  QUIZ_VERSION,
  type AvailabilityWindow,
  type GuardingTrigger,
  type HardFilters,
  type LifeStage,
  type MeetupType,
  type PetPersonality,
  type PetPreference,
  type PetTraitVector,
  type PlaydatePet,
  type ScoredPet,
  type SocialStatus,
  type TraitConfidence,
} from "./types";
import { type AgeCategory, type Species, type VibeTag } from "@/data/mock-pets";

/** The launch metro (§13.8) — the fallback anchor for a Derp with no coordinates. */
export const LAUNCH_METRO = { lat: 34.2746, lng: -119.229 };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Real Derps carry database UUIDs; mock ones use `pd-*` / `my-pet-*` ids. */
export function isRealPetId(id: string | null | undefined): boolean {
  return !!id && UUID_RE.test(id);
}

export const PET_COLUMNS =
  "id, user_id, name, species, breed, age, age_category, gender, vibes, bio, fun_fact, location, photos, health_verified, created_at, latitude, longitude, is_discoverable, social_status, intact, age_weeks, vaccination_attested_at, vaccination_expires_at, last_active_at, safety_hold";

export interface RemotePetRow {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  age_category: string;
  gender: string;
  vibes: string[] | null;
  bio: string;
  fun_fact: string;
  location: string;
  photos: string[] | null;
  health_verified: boolean;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  is_discoverable: boolean;
  social_status: string;
  intact: boolean;
  age_weeks: number;
  vaccination_attested_at: string | null;
  vaccination_expires_at: string | null;
  last_active_at: string;
  safety_hold: boolean;
}

export interface RemotePersonalityRow {
  pet_id: string;
  quiz_version: string;
  derivation_version: string;
  traits: unknown;
  confidence: unknown;
  history: unknown;
  completed_at: string | null;
  updated_at: string;
}

export interface RemotePreferenceRow {
  pet_id: string;
  max_travel_miles: number;
  preferred_meetup_types: string[] | null;
  availability_windows: string[] | null;
  hard_filters: unknown;
  cross_species_opt_in: boolean;
  intact_opt_out: boolean;
}

const emptyHardFilters: HardFilters = {
  maxSizeKg: null,
  minSizeKg: null,
  excludedLifeStages: [],
  excludedGuardingTriggers: [],
};

export function rowToPlaydatePet(row: RemotePetRow): PlaydatePet {
  return {
    id: row.id,
    name: row.name,
    species: row.species as Species,
    breed: row.breed,
    age: row.age,
    ageCategory: row.age_category as AgeCategory,
    gender: row.gender as "male" | "female",
    vibes: (row.vibes ?? []) as VibeTag[],
    bio: row.bio,
    funFact: row.fun_fact,
    rehomingReason: "",
    location: row.location,
    distanceKm: 0,
    photos: row.photos ?? [],
    healthVerified: row.health_verified,
    adoptionFee: 0,
    status: "adopted",
    rehomerId: row.user_id,
    createdAt: row.created_at.slice(0, 10),

    ownerId: row.user_id,
    socialStatus: row.social_status as SocialStatus,
    isPlaydateActive: row.is_discoverable,
    vaccination:
      row.vaccination_attested_at && row.vaccination_expires_at
        ? { attestedAt: row.vaccination_attested_at, expiresAt: row.vaccination_expires_at }
        : null,
    intact: row.intact,
    ageWeeks: row.age_weeks,
    homeGeo: {
      lat: row.latitude ?? LAUNCH_METRO.lat,
      lng: row.longitude ?? LAUNCH_METRO.lng,
    },
    lastActiveAt: row.last_active_at,
    // No behavioural history yet for a real account — a neutral prior, not a guess
    // dressed up as data.
    historicalRightSwipeRate: 0.3,
    ownerResponsiveness: 0.8,
    safetyHold: row.safety_hold,
  };
}

export function rowToPersonality(row: RemotePersonalityRow): PetPersonality {
  return {
    petId: row.pet_id,
    quizVersion: row.quiz_version || QUIZ_VERSION,
    derivationVersion: row.derivation_version || DERIVATION_VERSION,
    traits: (row.traits ?? {}) as PetTraitVector,
    confidence: (row.confidence ?? {}) as TraitConfidence,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    history: [],
  };
}

export function rowToPreference(row: RemotePreferenceRow): PetPreference {
  const hard = (row.hard_filters ?? {}) as Partial<HardFilters>;
  return {
    petId: row.pet_id,
    maxTravelMiles: row.max_travel_miles,
    preferredMeetupTypes: (row.preferred_meetup_types ?? []) as MeetupType[],
    availabilityWindows: (row.availability_windows ?? []) as AvailabilityWindow[],
    hardFilters: {
      maxSizeKg: hard.maxSizeKg ?? null,
      minSizeKg: hard.minSizeKg ?? null,
      excludedLifeStages: (hard.excludedLifeStages ?? []) as LifeStage[],
      excludedGuardingTriggers: (hard.excludedGuardingTriggers ?? []) as GuardingTrigger[],
    },
    crossSpeciesOptIn: row.cross_species_opt_in,
    intactOptOut: row.intact_opt_out,
  };
}

export function defaultRemotePreference(petId: string): PetPreference {
  return {
    petId,
    maxTravelMiles: 10,
    preferredMeetupTypes: ["open_park"],
    availabilityWindows: ["sat-morning"],
    hardFilters: emptyHardFilters,
    crossSpeciesOptIn: false,
    intactOptOut: false,
  };
}

/**
 * Assemble real Derps into the pool. A Derp with no personality row is left
 * out entirely — an unquizzed pet is unscoreable (§6.2, PQ-101), and inventing
 * traits for it would poison everyone else's feed.
 */
export function buildRemotePool(
  pets: RemotePetRow[],
  personalities: RemotePersonalityRow[],
  preferences: RemotePreferenceRow[],
): ScoredPet[] {
  const personalityByPet = new Map(personalities.map((p) => [p.pet_id, p]));
  const preferenceByPet = new Map(preferences.map((p) => [p.pet_id, p]));

  return pets.flatMap((row) => {
    const personalityRow = personalityByPet.get(row.id);
    if (!personalityRow || !personalityRow.completed_at) return [];
    const preferenceRow = preferenceByPet.get(row.id);
    return [
      {
        pet: rowToPlaydatePet(row),
        personality: rowToPersonality(personalityRow),
        preference: preferenceRow
          ? rowToPreference(preferenceRow)
          : defaultRemotePreference(row.id),
      },
    ];
  });
}
