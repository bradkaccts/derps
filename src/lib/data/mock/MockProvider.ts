import type {
  Interaction,
  InteractionMessage,
  InteractionStatus,
  InteractionType,
  Pet,
  PlaydateSchedule,
  User,
} from "../models";
import {
  INITIAL_STATUS,
  STATUS_SYSTEM_MESSAGES,
  assertTransition,
} from "../interactions";
import type {
  DerpsDataProvider,
  HydratedInteraction,
  NewAdoptionApplication,
  NewPet,
  NewPlaydateRequest,
  PetFilters,
  Unsubscribe,
} from "../provider";
import { DEFAULT_USER_ID, seedInteractions, seedPets, seedUsers } from "./seed";

let idCounter = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${idCounter++}`;

const clone = <T>(value: T): T => structuredClone(value);

/**
 * In-memory DerpsDataProvider.
 *
 * - Powers dev mode (VITE_DATA_MODE=mock, the default) and all unit tests.
 * - Enforces the interaction state machine exactly as the DB will in step 2,
 *   so illegal transitions fail identically in tests and production.
 * - Returns deep clones so callers can never mutate the "database" directly.
 * - `seed` injection lets tests start from any fixture state.
 */
export class MockProvider implements DerpsDataProvider {
  private users: User[];
  private pets: Pet[];
  private interactions: Interaction[];
  private favorites = new Map<string, Set<string>>(); // userId -> petIds
  private currentUserId: string;
  private listeners = new Set<() => void>();

  constructor(seed?: {
    users?: User[];
    pets?: Pet[];
    interactions?: Interaction[];
    currentUserId?: string;
  }) {
    this.users = clone(seed?.users ?? seedUsers);
    this.pets = clone(seed?.pets ?? seedPets);
    this.interactions = clone(seed?.interactions ?? seedInteractions);
    this.currentUserId = seed?.currentUserId ?? DEFAULT_USER_ID;
  }

  // --- session -------------------------------------------------------------

  async getCurrentUser(): Promise<User> {
    const user = this.users.find((u) => u.id === this.currentUserId);
    if (!user) throw new Error(`Current user ${this.currentUserId} not found`);
    return clone(user);
  }

  async setCurrentUser(userId: string): Promise<User> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error(`User ${userId} not found`);
    this.currentUserId = userId;
    this.notify();
    return clone(user);
  }

  async listUsers(): Promise<User[]> {
    return clone(this.users);
  }

  async getUser(userId: string): Promise<User | undefined> {
    return clone(this.users.find((u) => u.id === userId));
  }

  // --- pets ----------------------------------------------------------------

  async getPets(filters?: PetFilters): Promise<Pet[]> {
    let result = this.pets;
    if (filters) {
      result = result.filter((pet) => {
        if (filters.species && filters.species !== "all" && pet.species !== filters.species) return false;
        if (filters.vibes?.length && !filters.vibes.some((v) => pet.vibes.includes(v))) return false;
        if (filters.maxDistanceKm !== undefined && pet.distanceKm > filters.maxDistanceKm) return false;
        if (filters.openToPlaydates && pet.socialStatus !== "open-to-playdates") return false;
        if (
          filters.listedForAdoption &&
          (!pet.adoptionListing || pet.adoptionListing.status === "adopted")
        )
          return false;
        return true;
      });
    }
    return clone(result);
  }

  async getPet(petId: string): Promise<Pet | undefined> {
    return clone(this.pets.find((p) => p.id === petId));
  }

  async getPetsByOwner(ownerId: string): Promise<Pet[]> {
    return clone(this.pets.filter((p) => p.ownerId === ownerId));
  }

  async createPet(pet: NewPet): Promise<Pet> {
    const created: Pet = {
      ...clone(pet),
      id: nextId("pet"),
      createdAt: new Date().toISOString().split("T")[0],
    };
    this.pets.push(created);
    this.notify();
    return clone(created);
  }

  async updatePet(petId: string, patch: Partial<Omit<Pet, "id" | "createdAt">>): Promise<Pet> {
    const pet = this.pets.find((p) => p.id === petId);
    if (!pet) throw new Error(`Pet ${petId} not found`);
    Object.assign(pet, clone(patch));
    this.notify();
    return clone(pet);
  }

  async deletePet(petId: string): Promise<void> {
    this.pets = this.pets.filter((p) => p.id !== petId);
    this.notify();
  }

  // --- favorites -----------------------------------------------------------

  async getFavorites(userId: string): Promise<string[]> {
    return [...(this.favorites.get(userId) ?? [])];
  }

  async toggleFavorite(userId: string, petId: string): Promise<string[]> {
    const set = this.favorites.get(userId) ?? new Set<string>();
    if (set.has(petId)) set.delete(petId);
    else set.add(petId);
    this.favorites.set(userId, set);
    this.notify();
    return [...set];
  }

  // --- interactions --------------------------------------------------------

  async createPlaydateRequest(req: NewPlaydateRequest): Promise<Interaction> {
    const targetPet = this.pets.find((p) => p.id === req.targetPetId);
    if (!targetPet) throw new Error(`Target pet ${req.targetPetId} not found`);
    if (targetPet.socialStatus !== "open-to-playdates") {
      throw new Error(`${targetPet.name} is not open to playdates`);
    }
    const now = new Date().toISOString();
    const interaction: Interaction = {
      id: nextId("pd"),
      type: "playdate",
      requesterUserId: req.requesterUserId,
      targetUserId: targetPet.ownerId,
      requesterPetId: req.requesterPetId,
      targetPetId: req.targetPetId,
      status: INITIAL_STATUS.playdate,
      createdAt: now,
      updatedAt: now,
      messages: req.message
        ? [{ id: nextId("msg"), senderId: req.requesterUserId, text: req.message, timestamp: now }]
        : [],
    };
    this.interactions.push(interaction);
    this.notify();
    return clone(interaction);
  }

  async createAdoptionApplication(req: NewAdoptionApplication): Promise<Interaction> {
    const targetPet = this.pets.find((p) => p.id === req.targetPetId);
    if (!targetPet) throw new Error(`Target pet ${req.targetPetId} not found`);
    if (!targetPet.adoptionListing || targetPet.adoptionListing.status === "adopted") {
      throw new Error(`${targetPet.name} is not listed for adoption`);
    }
    const now = new Date().toISOString();
    const interaction: Interaction = {
      id: nextId("app"),
      type: "adoption-application",
      requesterUserId: req.requesterUserId,
      targetUserId: targetPet.ownerId,
      targetPetId: req.targetPetId,
      status: INITIAL_STATUS["adoption-application"],
      createdAt: now,
      updatedAt: now,
      messages: [],
      screeningAnswers: clone(req.screeningAnswers),
    };
    this.interactions.push(interaction);
    this.notify();
    return clone(interaction);
  }

  async getInteractionsForUser(
    userId: string,
    type?: InteractionType
  ): Promise<HydratedInteraction[]> {
    return this.interactions
      .filter(
        (i) =>
          (i.requesterUserId === userId || i.targetUserId === userId) &&
          (type === undefined || i.type === type)
      )
      .map((i) => this.hydrate(i));
  }

  async getInteraction(id: string): Promise<HydratedInteraction | undefined> {
    const found = this.interactions.find((i) => i.id === id);
    return found ? this.hydrate(found) : undefined;
  }

  async updateInteractionStatus(id: string, status: InteractionStatus): Promise<Interaction> {
    const interaction = this.requireInteraction(id);
    assertTransition(interaction.type, interaction.status, status);
    interaction.status = status;
    interaction.updatedAt = new Date().toISOString();
    const systemText = STATUS_SYSTEM_MESSAGES[interaction.type][status];
    if (systemText) {
      interaction.messages.push(this.systemMessage(systemText));
    }
    this.notify();
    return clone(interaction);
  }

  async schedulePlaydate(id: string, schedule: PlaydateSchedule): Promise<Interaction> {
    const interaction = this.requireInteraction(id);
    if (interaction.type !== "playdate") {
      throw new Error(`Interaction ${id} is not a playdate`);
    }
    assertTransition("playdate", interaction.status, "scheduled");
    interaction.status = "scheduled";
    interaction.schedule = clone(schedule);
    interaction.updatedAt = new Date().toISOString();
    interaction.messages.push(
      this.systemMessage(
        `📅 Scheduled for ${schedule.date} at ${schedule.time} — ${schedule.location}`
      )
    );
    this.notify();
    return clone(interaction);
  }

  async sendInteractionMessage(id: string, senderId: string, text: string): Promise<Interaction> {
    const interaction = this.requireInteraction(id);
    interaction.messages.push({
      id: nextId("msg"),
      senderId,
      text,
      timestamp: new Date().toISOString(),
    });
    interaction.updatedAt = new Date().toISOString();
    this.notify();
    return clone(interaction);
  }

  // --- change notification -------------------------------------------------

  subscribe(listener: () => void): Unsubscribe {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- internals -----------------------------------------------------------

  private requireInteraction(id: string): Interaction {
    const interaction = this.interactions.find((i) => i.id === id);
    if (!interaction) throw new Error(`Interaction ${id} not found`);
    return interaction;
  }

  private hydrate(interaction: Interaction): HydratedInteraction {
    return {
      ...clone(interaction),
      requesterPet: clone(this.pets.find((p) => p.id === interaction.requesterPetId)),
      targetPet: clone(this.pets.find((p) => p.id === interaction.targetPetId)),
      requesterUser: clone(this.users.find((u) => u.id === interaction.requesterUserId)),
      targetUser: clone(this.users.find((u) => u.id === interaction.targetUserId)),
    };
  }

  private systemMessage(text: string): InteractionMessage {
    return { id: nextId("msg"), senderId: "system", text, timestamp: new Date().toISOString() };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
