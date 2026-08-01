import {
  DERIVATION_VERSION,
  QUIZ_VERSION,
  type GeoPoint,
  type PetPersonality,
  type PetPreference,
  type PetTraitVector,
  type PlaydatePet,
  type ScoredPet,
  type TraitConfidence,
} from "@/lib/playdates/types";
import { ALL_TRAIT_DIMENSIONS } from "@/lib/playdates/quiz";

const VENTURA: GeoPoint = { lat: 34.2746, lng: -119.2290 };

export const baseTraits: PetTraitVector = {
  energy: 3,
  play_style: "parallel",
  dog_sociability: 4,
  confidence: 3,
  size_kg: 20,
  life_stage: "adult",
  noise: 3,
  resource_guarding: [],
  recall_reliability: 4,
};

export function confidenceOf(value: number): TraitConfidence {
  return ALL_TRAIT_DIMENSIONS.reduce((acc, dim) => {
    acc[dim] = value;
    return acc;
  }, {} as TraitConfidence);
}

const daysAhead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();
const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export interface PetOverrides {
  id?: string;
  ownerId?: string;
  traits?: Partial<PetTraitVector>;
  confidence?: number;
  preference?: Partial<PetPreference>;
  pet?: Partial<PlaydatePet>;
  geo?: GeoPoint;
  quizComplete?: boolean;
}

let seq = 0;

export function makePet(overrides: PetOverrides = {}): ScoredPet {
  seq += 1;
  const id = overrides.id ?? `test-pet-${seq}`;
  const ownerId = overrides.ownerId ?? `owner-${id}`;
  const traits: PetTraitVector = { ...baseTraits, ...overrides.traits };

  const pet: PlaydatePet = {
    id,
    name: id,
    species: "dog",
    breed: "Test Breed",
    age: "3 years",
    ageCategory: "adult",
    gender: "female",
    vibes: [],
    bio: "",
    funFact: "",
    rehomingReason: "",
    location: "Ventura, CA",
    distanceKm: 0,
    photos: ["photo.jpg"],
    healthVerified: true,
    adoptionFee: 0,
    status: "adopted",
    rehomerId: ownerId,
    createdAt: "2026-01-01",
    ownerId,
    socialStatus: "Active",
    isPlaydateActive: true,
    vaccination: { attestedAt: daysAgo(30), expiresAt: daysAhead(200) },
    intact: false,
    ageWeeks: 200,
    homeGeo: overrides.geo ?? VENTURA,
    lastActiveAt: daysAgo(1),
    historicalRightSwipeRate: 0.3,
    ownerResponsiveness: 0.8,
    safetyHold: false,
    ...overrides.pet,
  };

  const personality: PetPersonality = {
    petId: id,
    quizVersion: QUIZ_VERSION,
    derivationVersion: DERIVATION_VERSION,
    traits,
    confidence: confidenceOf(overrides.confidence ?? 1),
    completedAt: overrides.quizComplete === false ? null : daysAgo(10),
    updatedAt: daysAgo(10),
    history: [],
  };

  const preference: PetPreference = {
    petId: id,
    maxTravelMiles: 10,
    preferredMeetupTypes: ["open_park"],
    availabilityWindows: ["sat-morning"],
    hardFilters: {
      maxSizeKg: null,
      minSizeKg: null,
      excludedLifeStages: [],
      excludedGuardingTriggers: [],
    },
    crossSpeciesOptIn: false,
    intactOptOut: false,
    ...overrides.preference,
  };

  return { pet, personality, preference };
}

/** A point roughly `miles` east of Ventura, for distance-sensitive tests. */
export function pointMilesAway(miles: number): GeoPoint {
  return { lat: VENTURA.lat, lng: VENTURA.lng + miles / 57.3 };
}
