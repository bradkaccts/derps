import type {
  Interaction,
  InteractionStatus,
  InteractionType,
  Pet,
  PlaydateSchedule,
  ScreeningAnswers,
  User,
} from "./models";

/**
 * The single seam between the UI and any data backend.
 *
 * Implementations:
 *  - MockProvider (this step): in-memory, seeded, instant — powers dev mode
 *    and unit tests forever.
 *  - SupabaseProvider (step 2): same contract against Postgres + realtime.
 *
 * Rules for this interface:
 *  - All methods async, even when the mock answers synchronously, so the UI
 *    is honest about network reality from day one.
 *  - Returns normalized models; UI-friendly joins are provided explicitly
 *    (HydratedInteraction) rather than leaking display data into records.
 *  - Mutations return the updated entity so optimistic UI / cache updates
 *    are trivial with TanStack Query later.
 */

export interface PetFilters {
  species?: Pet["species"] | "all";
  vibes?: Pet["vibes"];
  maxDistanceKm?: number;
  /** Only pets whose owner is open to playdates. */
  openToPlaydates?: boolean;
  /** Only pets with an active adoption listing (phase 2 surface). */
  listedForAdoption?: boolean;
}

/** An Interaction joined with the entities the UI actually renders. */
export interface HydratedInteraction extends Interaction {
  requesterPet?: Pet;
  targetPet?: Pet;
  requesterUser?: User;
  targetUser?: User;
}

export interface NewPlaydateRequest {
  requesterUserId: string;
  requesterPetId: string;
  targetPetId: string;
  message?: string;
}

export interface NewAdoptionApplication {
  requesterUserId: string;
  targetPetId: string;
  screeningAnswers: ScreeningAnswers;
}

export type NewPet = Omit<Pet, "id" | "createdAt">;

/** Unsubscribe function returned by subscribe(). */
export type Unsubscribe = () => void;

export interface DerpsDataProvider {
  // --- session -------------------------------------------------------------
  /** The signed-in user. Mock: the active dev persona. */
  getCurrentUser(): Promise<User>;
  /** Dev-persona switcher (mock). Supabase impl maps this to auth session change. */
  setCurrentUser(userId: string): Promise<User>;
  listUsers(): Promise<User[]>;
  getUser(userId: string): Promise<User | undefined>;

  // --- pets ----------------------------------------------------------------
  getPets(filters?: PetFilters): Promise<Pet[]>;
  getPet(petId: string): Promise<Pet | undefined>;
  /** Pets owned by a user (the "My Derps" surface). */
  getPetsByOwner(ownerId: string): Promise<Pet[]>;
  createPet(pet: NewPet): Promise<Pet>;
  updatePet(petId: string, patch: Partial<Omit<Pet, "id" | "createdAt">>): Promise<Pet>;
  deletePet(petId: string): Promise<void>;

  // --- favorites -----------------------------------------------------------
  getFavorites(userId: string): Promise<string[]>;
  toggleFavorite(userId: string, petId: string): Promise<string[]>;

  // --- interactions (playdates now, adoption applications behind flag) -----
  createPlaydateRequest(req: NewPlaydateRequest): Promise<Interaction>;
  createAdoptionApplication(req: NewAdoptionApplication): Promise<Interaction>;
  /** All interactions where the user is requester or target. */
  getInteractionsForUser(userId: string, type?: InteractionType): Promise<HydratedInteraction[]>;
  getInteraction(id: string): Promise<HydratedInteraction | undefined>;
  /** Validates against the state machine in interactions.ts; throws on illegal moves. */
  updateInteractionStatus(id: string, status: InteractionStatus): Promise<Interaction>;
  schedulePlaydate(id: string, schedule: PlaydateSchedule): Promise<Interaction>;
  sendInteractionMessage(id: string, senderId: string, text: string): Promise<Interaction>;

  // --- change notification -------------------------------------------------
  /**
   * Fires after any mutation. Mock: synchronous fan-out; Supabase: realtime
   * channel. Coarse-grained on purpose — fine-grained invalidation arrives
   * with TanStack Query adoption.
   */
  subscribe(listener: () => void): Unsubscribe;
}
