/**
 * The social pet population for the launch metro (Ventura/LA, §13.8).
 *
 * These are *owned* pets with social profiles, not adoption listings — the
 * adoption fields inherited from `Pet` are neutral, exactly as `MyPetsContext`
 * does for the user's own pets. Personas from §3.1 are represented so the
 * matching behaviour is legible: Camila's selective dog, Theo's adolescent
 * working breed, Priya's three very different dogs, Sam's family household.
 *
 * Seeded pets carry pre-derived trait vectors. Real pets derive theirs from
 * retained quiz answers (§5.1) — see `lib/playdates/quiz.ts`.
 */
import {
  DERIVATION_VERSION,
  QUIZ_VERSION,
  type PetPersonality,
  type PetPreference,
  type PetTraitVector,
  type PlaydatePet,
  type ScoredPet,
  type TraitConfidence,
} from "@/lib/playdates/types";
import { ALL_TRAIT_DIMENSIONS } from "@/lib/playdates/quiz";

export interface PlaydateOwner {
  id: string;
  name: string;
  avatar: string;
  /** §7.1 — User gains responsiveness and no-show counters. */
  responsivenessScore: number;
  noShowCount90d: number;
  playdateOnboardedAt: string;
}

export const mockPlaydateOwners: PlaydateOwner[] = [
  {
    id: "u10",
    name: "Camila",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    responsivenessScore: 0.92,
    noShowCount90d: 0,
    playdateOnboardedAt: "2026-06-02",
  },
  {
    id: "u11",
    name: "Theo",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    responsivenessScore: 0.78,
    noShowCount90d: 0,
    playdateOnboardedAt: "2026-05-19",
  },
  {
    id: "u12",
    name: "Priya",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    responsivenessScore: 0.88,
    noShowCount90d: 0,
    playdateOnboardedAt: "2026-04-28",
  },
  {
    id: "u13",
    name: "Sam",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
    responsivenessScore: 0.7,
    noShowCount90d: 0,
    playdateOnboardedAt: "2026-06-11",
  },
  {
    id: "u14",
    name: "Marcus",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&h=100&fit=crop&crop=face",
    responsivenessScore: 0.61,
    noShowCount90d: 1,
    playdateOnboardedAt: "2026-03-14",
  },
  {
    id: "u15",
    name: "Dana",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
    responsivenessScore: 0.95,
    noShowCount90d: 0,
    playdateOnboardedAt: "2026-05-05",
  },
  {
    id: "u16",
    name: "Lena",
    avatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=100&h=100&fit=crop&crop=face",
    responsivenessScore: 0.84,
    noShowCount90d: 0,
    playdateOnboardedAt: "2026-06-20",
  },
  {
    id: "u17",
    name: "Ben",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=100&h=100&fit=crop&crop=face",
    responsivenessScore: 0.55,
    noShowCount90d: 0,
    playdateOnboardedAt: "2026-01-09",
  },
];

export function ownerName(ownerId: string): string {
  return mockPlaydateOwners.find((o) => o.id === ownerId)?.name ?? "A Derps member";
}

export function ownerAvatar(ownerId: string): string | undefined {
  return mockPlaydateOwners.find((o) => o.id === ownerId)?.avatar;
}

const photo = (id: string) => `https://images.unsplash.com/${id}?w=600&h=600&fit=crop`;

const DOG_PHOTOS = {
  cattleDog: photo("photo-1568572933382-74d440642117"),
  beagle: photo("photo-1505628346881-b72b27e84530"),
  labrador: photo("photo-1552053831-71594a27632d"),
  poodle: photo("photo-1591160690555-5debfba289f0"),
  frenchie: photo("photo-1583337130417-3346a1be7dee"),
  shepherd: photo("photo-1589941013453-ec89f33b5e95"),
  chihuahua: photo("photo-1605568427561-40dd23c2acea"),
  greyhound: photo("photo-1558788353-f76d92427f16"),
  corgi: photo("photo-1612536057832-2ff7ead58194"),
  terrier: photo("photo-1517423568366-8b83523034fd"),
  goldendoodle: photo("photo-1560807707-8cc77767d783"),
  pitbull: photo("photo-1534361960057-19889db9621e"),
  husky: photo("photo-1605897472359-85e4b94d685d"),
  spaniel: photo("photo-1591768575198-88dac53fbd0a"),
};

interface Seed {
  id: string;
  name: string;
  breed: string;
  age: string;
  ageWeeks: number;
  gender: "male" | "female";
  ownerId: string;
  neighborhood: string;
  geo: { lat: number; lng: number };
  photos: string[];
  bio: string;
  funFact: string;
  traits: PetTraitVector;
  /** Dimensions the owner answered "not sure yet" to. */
  unsure?: (typeof ALL_TRAIT_DIMENSIONS)[number][];
  preference: Omit<PetPreference, "petId">;
  intact?: boolean;
  rightSwipeRate: number;
  daysSinceActive: number;
  vaccinationExpiredDays?: number;
  safetyHold?: boolean;
}

const defaultPreference: Omit<PetPreference, "petId"> = {
  maxTravelMiles: 10,
  preferredMeetupTypes: ["open_park", "fenced_yard"],
  availabilityWindows: ["sat-morning", "sun-morning"],
  hardFilters: {
    maxSizeKg: null,
    minSizeKg: null,
    excludedLifeStages: [],
    excludedGuardingTriggers: [],
  },
  crossSpeciesOptIn: false,
  intactOptOut: false,
};

const seeds: Seed[] = [
  {
    id: "pd-bruno",
    name: "Bruno",
    breed: "Australian Cattle Dog",
    age: "18 months",
    ageWeeks: 78,
    gender: "male",
    ownerId: "u12",
    neighborhood: "Ventura",
    geo: { lat: 34.2755, lng: -119.2401 },
    photos: [DOG_PHOTOS.cattleDog, DOG_PHOTOS.shepherd],
    bio: "Bruno has one setting and it is ON. Herds skateboards, children, and the vacuum with equal commitment.",
    funFact: "Has body-slammed the same Labrador every Saturday for four months. They're best friends.",
    traits: {
      energy: 5,
      play_style: "wrestler",
      dog_sociability: 4,
      confidence: 5,
      size_kg: 20,
      life_stage: "adolescent",
      noise: 4,
      resource_guarding: [],
      recall_reliability: 3,
    },
    preference: { ...defaultPreference, maxTravelMiles: 10 },
    rightSwipeRate: 0.42,
    daysSinceActive: 0,
  },
  {
    id: "pd-nala",
    name: "Nala",
    breed: "Standard Poodle",
    age: "5 years",
    ageWeeks: 260,
    gender: "female",
    ownerId: "u12",
    neighborhood: "Ventura",
    geo: { lat: 34.2755, lng: -119.2401 },
    photos: [DOG_PHOTOS.poodle],
    bio: "Nala supervises. She will join a game if the standard of play meets her expectations, which it rarely does.",
    funFact: "Refuses to walk on wet grass but will swim in the ocean without hesitation.",
    traits: {
      energy: 3,
      play_style: "observer",
      dog_sociability: 3,
      confidence: 4,
      size_kg: 24,
      life_stage: "adult",
      noise: 1,
      resource_guarding: [],
      recall_reliability: 5,
    },
    preference: {
      ...defaultPreference,
      preferredMeetupTypes: ["on_leash_walk", "open_park"],
      availabilityWindows: ["sat-morning", "wed-midday"],
    },
    rightSwipeRate: 0.18,
    daysSinceActive: 1,
  },
  {
    id: "pd-pepper",
    name: "Pepper",
    breed: "Jack Russell Terrier",
    age: "3 years",
    ageWeeks: 156,
    gender: "female",
    ownerId: "u12",
    neighborhood: "Ventura",
    geo: { lat: 34.2755, lng: -119.2401 },
    photos: [DOG_PHOTOS.terrier],
    bio: "Pepper is small, loud, and entirely convinced she is the largest dog at the park.",
    funFact: "Once treed a squirrel and stayed there for two hours out of principle.",
    traits: {
      energy: 5,
      play_style: "chaser",
      dog_sociability: 4,
      confidence: 5,
      size_kg: 7,
      life_stage: "adult",
      noise: 5,
      resource_guarding: ["toys"],
      recall_reliability: 2,
    },
    preference: {
      ...defaultPreference,
      preferredMeetupTypes: ["fenced_yard", "open_park"],
      availabilityWindows: ["sat-morning", "sun-morning", "sat-evening"],
      hardFilters: { ...defaultPreference.hardFilters, maxSizeKg: 30 },
    },
    rightSwipeRate: 0.5,
    daysSinceActive: 0,
  },
  {
    id: "pd-mochi",
    name: "Mochi",
    breed: "Beagle",
    age: "8 years",
    ageWeeks: 416,
    gender: "female",
    ownerId: "u10",
    neighborhood: "Ventura",
    geo: { lat: 34.2782, lng: -119.2374 },
    photos: [DOG_PHOTOS.beagle],
    bio: "Mochi likes calm, older, smaller dogs and nobody else. That is not a flaw, it is a specification.",
    funFact: "Can identify a cheese wrapper opening from three rooms away.",
    traits: {
      energy: 2,
      play_style: "parallel",
      dog_sociability: 2,
      confidence: 2,
      size_kg: 11,
      life_stage: "senior",
      noise: 2,
      resource_guarding: ["food"],
      recall_reliability: 3,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 5,
      preferredMeetupTypes: ["on_leash_walk"],
      availabilityWindows: ["sat-morning", "wed-midday"],
      // Camila's hard limits, enforced as filters and not as suggestions (Story D).
      hardFilters: {
        maxSizeKg: 15,
        minSizeKg: null,
        excludedLifeStages: ["puppy", "adolescent"],
        excludedGuardingTriggers: [],
      },
    },
    rightSwipeRate: 0.09,
    daysSinceActive: 2,
  },
  {
    id: "pd-koda",
    name: "Koda",
    breed: "German Shepherd",
    age: "16 months",
    ageWeeks: 70,
    gender: "male",
    ownerId: "u11",
    neighborhood: "Ojai",
    geo: { lat: 34.2694, lng: -119.2521 },
    photos: [DOG_PHOTOS.shepherd, DOG_PHOTOS.husky],
    bio: "Koda is a working dog with an engine that will not quit. Needs a wrestling partner with equivalent stamina.",
    funFact: "Carries a log on every hike. Not a stick. A log.",
    traits: {
      energy: 5,
      play_style: "wrestler",
      dog_sociability: 4,
      confidence: 4,
      size_kg: 34,
      life_stage: "adolescent",
      noise: 3,
      resource_guarding: [],
      recall_reliability: 4,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 25,
      preferredMeetupTypes: ["open_park", "fenced_yard"],
      availabilityWindows: ["sat-morning", "sun-morning", "tue-evening"],
    },
    rightSwipeRate: 0.55,
    daysSinceActive: 0,
  },
  {
    id: "pd-biscuit",
    name: "Biscuit Jr.",
    breed: "Labrador Retriever",
    age: "3 years",
    ageWeeks: 156,
    gender: "male",
    ownerId: "u13",
    neighborhood: "Oxnard",
    geo: { lat: 34.2823, lng: -119.2196 },
    photos: [DOG_PHOTOS.labrador],
    bio: "Bombproof, friendly, and utterly unbothered. The dog you want your nervous dog to meet first.",
    funFact: "Fell asleep during his own birthday party.",
    traits: {
      energy: 3,
      play_style: "toy_focused",
      dog_sociability: 5,
      confidence: 5,
      size_kg: 30,
      life_stage: "adult",
      noise: 2,
      resource_guarding: [],
      recall_reliability: 5,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 15,
      preferredMeetupTypes: ["open_park", "on_leash_walk", "fenced_yard"],
      availabilityWindows: ["sat-morning", "sun-morning", "sat-evening"],
    },
    rightSwipeRate: 0.31,
    daysSinceActive: 1,
  },
  {
    id: "pd-olive",
    name: "Olive",
    breed: "French Bulldog",
    age: "4 years",
    ageWeeks: 208,
    gender: "female",
    ownerId: "u15",
    neighborhood: "Ventura",
    geo: { lat: 34.2688, lng: -119.2312 },
    photos: [DOG_PHOTOS.frenchie],
    bio: "Olive plays in ninety-second bursts and then requires a formal rest period.",
    funFact: "Snores loudly enough to be heard from the next room.",
    traits: {
      energy: 2,
      play_style: "parallel",
      dog_sociability: 4,
      confidence: 3,
      size_kg: 11,
      life_stage: "adult",
      noise: 3,
      resource_guarding: [],
      recall_reliability: 4,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 5,
      preferredMeetupTypes: ["on_leash_walk", "indoor"],
      availabilityWindows: ["sat-morning", "sun-morning"],
    },
    rightSwipeRate: 0.27,
    daysSinceActive: 3,
  },
  {
    id: "pd-tofu",
    name: "Tofu",
    breed: "Chihuahua Mix",
    age: "6 years",
    ageWeeks: 312,
    gender: "male",
    ownerId: "u16",
    neighborhood: "Ventura",
    geo: { lat: 34.2721, lng: -119.2598 },
    photos: [DOG_PHOTOS.chihuahua],
    bio: "Tofu is 2.8kg of opinion. Prefers dogs his own size and people who ask before picking him up.",
    funFact: "Has a dedicated hoodie for foggy mornings.",
    traits: {
      energy: 3,
      play_style: "chaser",
      dog_sociability: 3,
      confidence: 2,
      size_kg: 3,
      life_stage: "adult",
      noise: 4,
      resource_guarding: ["handler"],
      recall_reliability: 3,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 5,
      preferredMeetupTypes: ["fenced_yard", "indoor"],
      availabilityWindows: ["sat-morning", "wed-midday"],
      hardFilters: {
        maxSizeKg: 12,
        minSizeKg: null,
        excludedLifeStages: [],
        excludedGuardingTriggers: [],
      },
    },
    rightSwipeRate: 0.22,
    daysSinceActive: 4,
  },
  {
    id: "pd-scout",
    name: "Scout",
    breed: "Greyhound",
    age: "6 years",
    ageWeeks: 312,
    gender: "female",
    ownerId: "u17",
    neighborhood: "Camarillo",
    geo: { lat: 34.2601, lng: -119.2612 },
    photos: [DOG_PHOTOS.greyhound],
    bio: "Forty-five seconds of astonishing speed, followed by eighteen hours of horizontal.",
    funFact: "Sleeps on her back with all four legs in the air. Every time.",
    traits: {
      energy: 3,
      play_style: "chaser",
      dog_sociability: 4,
      confidence: 3,
      size_kg: 28,
      life_stage: "adult",
      noise: 1,
      resource_guarding: [],
      recall_reliability: 2,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 20,
      preferredMeetupTypes: ["fenced_yard"],
      availabilityWindows: ["sun-morning", "sat-evening"],
    },
    rightSwipeRate: 0.34,
    daysSinceActive: 6,
  },
  {
    id: "pd-waffles",
    name: "Waffles",
    breed: "Goldendoodle",
    age: "2 years",
    ageWeeks: 104,
    gender: "male",
    ownerId: "u14",
    neighborhood: "Oxnard",
    geo: { lat: 34.2857, lng: -119.2438 },
    photos: [DOG_PHOTOS.goldendoodle],
    bio: "Waffles believes every dog at the park has come specifically to see him, and is usually right.",
    funFact: "Learned to open the fridge. The fridge now has a lock.",
    traits: {
      energy: 4,
      play_style: "chaser",
      dog_sociability: 5,
      confidence: 4,
      size_kg: 22,
      life_stage: "adult",
      noise: 3,
      resource_guarding: [],
      recall_reliability: 3,
    },
    unsure: ["noise", "recall_reliability"],
    preference: {
      ...defaultPreference,
      maxTravelMiles: 15,
      availabilityWindows: ["sat-morning", "tue-evening", "thu-evening"],
    },
    rightSwipeRate: 0.47,
    daysSinceActive: 2,
  },
  {
    id: "pd-ziggy",
    name: "Ziggy",
    breed: "Cocker Spaniel",
    age: "5 years",
    ageWeeks: 260,
    gender: "male",
    ownerId: "u15",
    neighborhood: "Ventura",
    geo: { lat: 34.2909, lng: -119.2551 },
    photos: [DOG_PHOTOS.spaniel],
    bio: "Ziggy brings a tennis ball to every social occasion and expects it to be the centre of attention.",
    funFact: "Has buried eleven balls in the same corner of the yard.",
    traits: {
      energy: 4,
      play_style: "toy_focused",
      dog_sociability: 4,
      confidence: 3,
      size_kg: 13,
      life_stage: "adult",
      noise: 2,
      resource_guarding: ["toys"],
      recall_reliability: 4,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 10,
      availabilityWindows: ["sat-morning", "sun-morning", "wed-midday"],
    },
    rightSwipeRate: 0.29,
    daysSinceActive: 1,
  },
  {
    id: "pd-rosie",
    name: "Rosie",
    breed: "Staffordshire Mix",
    age: "4 years",
    ageWeeks: 208,
    gender: "female",
    ownerId: "u13",
    neighborhood: "Oxnard",
    geo: { lat: 34.2668, lng: -119.2178 },
    photos: [DOG_PHOTOS.pitbull],
    bio: "Rosie is a professional wrestler who checks in with her human between rounds.",
    funFact: "Sits on people. All of them. Regardless of size.",
    traits: {
      energy: 4,
      play_style: "wrestler",
      dog_sociability: 4,
      confidence: 4,
      size_kg: 26,
      life_stage: "adult",
      noise: 2,
      resource_guarding: [],
      recall_reliability: 4,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 12,
      availabilityWindows: ["sat-morning", "sat-evening", "sun-morning"],
    },
    rightSwipeRate: 0.38,
    daysSinceActive: 0,
  },
  {
    id: "pd-juniper",
    name: "Juniper",
    breed: "Border Collie",
    age: "14 weeks",
    ageWeeks: 14,
    gender: "female",
    ownerId: "u16",
    neighborhood: "Ventura",
    geo: { lat: 34.2699, lng: -119.2605 },
    photos: [DOG_PHOTOS.husky],
    bio: "Juniper is very new and very small and has opinions about everything.",
    funFact: "Barks at her own reflection, then apologises to it.",
    traits: {
      energy: 5,
      play_style: "chaser",
      dog_sociability: 5,
      confidence: 3,
      size_kg: 6,
      life_stage: "puppy",
      noise: 4,
      resource_guarding: [],
      recall_reliability: 1,
    },
    unsure: ["confidence", "noise", "recall_reliability", "dog_sociability"],
    preference: { ...defaultPreference, maxTravelMiles: 5 },
    rightSwipeRate: 0.6,
    daysSinceActive: 0,
  },
  {
    id: "pd-atlas",
    name: "Atlas",
    breed: "Great Dane",
    age: "3 years",
    ageWeeks: 156,
    gender: "male",
    ownerId: "u17",
    neighborhood: "Thousand Oaks",
    geo: { lat: 34.1901, lng: -118.8712 },
    photos: [DOG_PHOTOS.labrador],
    bio: "Atlas is 62kg of gentle confusion about why smaller dogs find him alarming.",
    funFact: "Is afraid of the ice dispenser.",
    traits: {
      energy: 2,
      play_style: "parallel",
      dog_sociability: 4,
      confidence: 3,
      size_kg: 62,
      life_stage: "adult",
      noise: 1,
      resource_guarding: [],
      recall_reliability: 4,
    },
    intact: true,
    preference: {
      ...defaultPreference,
      maxTravelMiles: 25,
      availabilityWindows: ["sun-morning"],
      preferredMeetupTypes: ["open_park", "on_leash_walk"],
    },
    rightSwipeRate: 0.25,
    daysSinceActive: 5,
  },
  {
    id: "pd-echo",
    name: "Echo",
    breed: "Siberian Husky",
    age: "2 years",
    ageWeeks: 104,
    gender: "male",
    ownerId: "u14",
    neighborhood: "Ventura",
    geo: { lat: 34.2822, lng: -119.2712 },
    photos: [DOG_PHOTOS.husky],
    bio: "Echo has a great deal to say and says it at volume. Recall is aspirational.",
    funFact: "Howls along to the smoke alarm as if invited.",
    traits: {
      energy: 5,
      play_style: "chaser",
      dog_sociability: 4,
      confidence: 4,
      size_kg: 25,
      life_stage: "adult",
      noise: 5,
      resource_guarding: [],
      recall_reliability: 1,
    },
    preference: {
      ...defaultPreference,
      maxTravelMiles: 20,
      preferredMeetupTypes: ["fenced_yard"],
      availabilityWindows: ["sat-evening", "tue-evening", "thu-evening"],
    },
    rightSwipeRate: 0.4,
    daysSinceActive: 1,
  },
  {
    id: "pd-dash",
    name: "Dash",
    breed: "Whippet",
    age: "3 years",
    ageWeeks: 156,
    gender: "male",
    ownerId: "u11",
    neighborhood: "Ojai",
    geo: { lat: 34.4502, lng: -119.2411 },
    photos: [DOG_PHOTOS.greyhound],
    // Demonstrates the vaccination hard filter — this pet is filtered out, silently.
    vaccinationExpiredDays: 40,
    bio: "Dash is fast, polite, and currently between vet appointments.",
    funFact: "Can clear a four-foot fence from standing. Please do not tell him.",
    traits: {
      energy: 4,
      play_style: "chaser",
      dog_sociability: 4,
      confidence: 3,
      size_kg: 15,
      life_stage: "adult",
      noise: 1,
      resource_guarding: [],
      recall_reliability: 3,
    },
    preference: { ...defaultPreference },
    rightSwipeRate: 0.3,
    daysSinceActive: 8,
  },
];

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();
const daysAhead = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString();

function buildConfidence(unsure: string[] = []): TraitConfidence {
  return ALL_TRAIT_DIMENSIONS.reduce((acc, dim) => {
    acc[dim] = unsure.includes(dim) ? 0.35 : 1;
    return acc;
  }, {} as TraitConfidence);
}

export const mockPlaydatePets: PlaydatePet[] = seeds.map((seed) => ({
  // Adoption-side fields are neutral: these pets are not listed for rehoming.
  id: seed.id,
  name: seed.name,
  species: "dog",
  breed: seed.breed,
  age: seed.age,
  ageCategory: seed.ageWeeks < 26 ? "baby" : seed.ageWeeks < 104 ? "young" : seed.ageWeeks < 416 ? "adult" : "senior",
  gender: seed.gender,
  vibes: [],
  bio: seed.bio,
  funFact: seed.funFact,
  rehomingReason: "",
  location: `${seed.neighborhood}, CA`,
  distanceKm: 0,
  photos: seed.photos,
  healthVerified: true,
  adoptionFee: 0,
  status: "adopted",
  rehomerId: seed.ownerId,
  createdAt: "2026-06-01",

  // Playdates extensions (§7.1)
  ownerId: seed.ownerId,
  socialStatus: "Active",
  isPlaydateActive: true,
  vaccination: {
    attestedAt: daysAgo(200),
    expiresAt:
      seed.vaccinationExpiredDays !== undefined
        ? daysAgo(seed.vaccinationExpiredDays)
        : daysAhead(160),
  },
  intact: seed.intact ?? false,
  ageWeeks: seed.ageWeeks,
  homeGeo: seed.geo,
  lastActiveAt: daysAgo(seed.daysSinceActive),
  historicalRightSwipeRate: seed.rightSwipeRate,
  ownerResponsiveness:
    mockPlaydateOwners.find((o) => o.id === seed.ownerId)?.responsivenessScore ?? 0.7,
  safetyHold: seed.safetyHold ?? false,
}));

export const mockPlaydatePersonalities: Record<string, PetPersonality> = Object.fromEntries(
  seeds.map((seed) => [
    seed.id,
    {
      petId: seed.id,
      quizVersion: QUIZ_VERSION,
      derivationVersion: DERIVATION_VERSION,
      traits: seed.traits,
      confidence: buildConfidence(seed.unsure),
      completedAt: daysAgo(30),
      updatedAt: daysAgo(30),
      history: [],
    } satisfies PetPersonality,
  ]),
);

export const mockPlaydatePreferences: Record<string, PetPreference> = Object.fromEntries(
  seeds.map((seed) => [seed.id, { petId: seed.id, ...seed.preference } satisfies PetPreference]),
);

/** Assemble the pool the matching pipeline actually consumes. */
export function buildMockPool(): ScoredPet[] {
  return mockPlaydatePets.map((pet) => ({
    pet,
    personality: mockPlaydatePersonalities[pet.id],
    preference: mockPlaydatePreferences[pet.id],
  }));
}

export function findPlaydatePet(petId: string): PlaydatePet | undefined {
  return mockPlaydatePets.find((p) => p.id === petId);
}
