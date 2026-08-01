/**
 * Canonical domain models for Derps.
 *
 * Design principles (see docs/adr in repo history / FRD):
 * 1. Social-first: a Pet is a persistent "digital passport" owned by a user.
 *    Adoption is an OPTIONAL listing attached to a pet — not a property of it.
 * 2. Polymorphic users: a user can be a socializer, adopter and rehomer
 *    simultaneously (boolean capability flags, not a single role enum).
 * 3. Generalized interactions: playdates today and adoption applications
 *    tomorrow share one normalized Interaction record (type discriminant),
 *    one status state-machine, and one message thread.
 *
 * These types are backend-agnostic. The Supabase schema in step 2 mirrors
 * them 1:1; the mock provider implements them in memory today.
 */

// ---------------------------------------------------------------------------
// Shared vocabulary
// ---------------------------------------------------------------------------

export type VibeTag =
  | "low-energy"
  | "high-energy"
  | "good-with-pets"
  | "kid-friendly"
  | "independent"
  | "cuddly"
  | "playful"
  | "calm"
  | "adventurous"
  | "quirky";

export type Species = "dog" | "cat" | "bird" | "reptile" | "small-animal";

export type AgeCategory = "baby" | "young" | "adult" | "senior";

export type Gender = "male" | "female";

// ---------------------------------------------------------------------------
// Pet — the digital passport
// ---------------------------------------------------------------------------

/** Whether the pet's owner is open to social features for this pet. */
export type SocialStatus = "open-to-playdates" | "not-social";

/** Adoption lifecycle for a pet that has an active/past listing. */
export type AdoptionStatus = "available" | "pending" | "adopted";

/**
 * Present only when the owner has listed this pet for rehoming.
 * Kept as a nested object so the social MVP can ignore it entirely and the
 * phase-2 backend can move it to its own table without touching Pet consumers.
 */
export interface AdoptionListing {
  status: AdoptionStatus;
  fee: number;
  rehomingReason: string;
  listedAt: string; // ISO date
}

export interface Pet {
  id: string;
  /** Current owner (was `rehomerId` — a pet always has an owner, listed or not). */
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  age: string;
  ageCategory: AgeCategory;
  gender: Gender;
  vibes: VibeTag[];
  bio: string;
  funFact: string;
  /**
   * Public, privacy-safe location label (e.g. "Portland, OR").
   * Exact coordinates are a backend-only concern (RLS-protected, step 2).
   */
  location: string;
  /** Approximate distance from the current viewer. Mock-computed for now. */
  distanceKm: number;
  photos: string[];
  healthVerified: boolean;
  socialStatus: SocialStatus;
  createdAt: string; // ISO date
  /** Present only if this pet is (or was) listed for adoption. */
  adoptionListing?: AdoptionListing;
}

/** Convenience guards so UI code reads clearly. */
export const isListedForAdoption = (pet: Pet): boolean =>
  pet.adoptionListing !== undefined && pet.adoptionListing.status !== "adopted";

export const isOpenToPlaydates = (pet: Pet): boolean =>
  pet.socialStatus === "open-to-playdates";

// ---------------------------------------------------------------------------
// User — polymorphic capabilities
// ---------------------------------------------------------------------------

export type SocialIntent = "playdates" | "walking-buddies" | "sitter-swaps";

export interface UserPreferences {
  species: Species[];
  energyLevel: "low" | "medium" | "high" | "any";
  /** What social activities this user is open to. */
  openTo: SocialIntent[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  /** Capability flags — a user can hold any combination (FRD: polymorphic model). */
  isSocializer: boolean;
  isAdopter: boolean;
  isRehomer: boolean;
  isAdmin: boolean;
  location: string;
  homeType: string;
  familySize: number;
  hasYard: boolean;
  /** Aggregated 0-100 score. Fed by completed interactions + verification (step 5). */
  trustScore: number;
  verified: boolean;
  preferences: UserPreferences;
}

// ---------------------------------------------------------------------------
// Interaction — the generalized bridge between two users (and their pets)
// ---------------------------------------------------------------------------

export type InteractionType = "playdate" | "adoption-application";

/**
 * Union of both lifecycles. Which statuses are valid, and which transitions
 * are legal, depends on InteractionType — see `interactions.ts` for the
 * state machine. Shared terminal/mid states intentionally overlap.
 */
export type InteractionStatus =
  // playdate lifecycle
  | "requested"
  | "accepted"
  | "scheduled"
  // adoption lifecycle
  | "draft"
  | "submitted"
  | "under-review"
  | "shortlisted"
  | "approved"
  // shared terminal states
  | "completed"
  | "declined";

export interface InteractionMessage {
  id: string;
  /** "system" for lifecycle announcements, otherwise a User id. */
  senderId: string;
  text: string;
  timestamp: string; // ISO datetime
}

export interface PlaydateSchedule {
  date: string;
  time: string;
  location: string;
}

/** Adoption screening answers (unchanged shape from ApplicationContext). */
export interface ScreeningAnswers {
  homeType: string;
  hasYard: boolean;
  otherPets: string;
  children: string;
  experience: string;
  hoursAlone: string;
  reason: string;
}

/** Post-interaction feedback; feeds TrustScore (roadmap step 5). */
export interface InteractionRating {
  byUserId: string;
  stars: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string;
}

/**
 * Normalized: stores only IDs. Display data (names, photos) is hydrated at
 * read time — see HydratedInteraction in provider.ts. This is what lets the
 * same record work when either party views it, and maps 1:1 to a DB row.
 */
export interface Interaction {
  id: string;
  type: InteractionType;
  /** The user who initiated (playdate requester / adoption applicant). */
  requesterUserId: string;
  /** The user on the receiving end (target pet's owner). */
  targetUserId: string;
  /** Requester's own pet. Required for playdates; absent for adoptions. */
  requesterPetId?: string;
  /** The pet this interaction is about. */
  targetPetId: string;
  status: InteractionStatus;
  createdAt: string;
  updatedAt: string;
  messages: InteractionMessage[];
  /** Playdate-only. */
  schedule?: PlaydateSchedule;
  /** Adoption-only. */
  screeningAnswers?: ScreeningAnswers;
  /** Populated after completion. */
  ratings?: InteractionRating[];
}
