import { describe, expect, it } from "vitest";
import { canTransition, assertTransition, TERMINAL_STATUSES } from "../interactions";
import { MockProvider } from "../mock/MockProvider";
import { seedPets, seedUsers } from "../mock/seed";

describe("interaction state machine", () => {
  it("allows the happy-path playdate lifecycle", () => {
    expect(canTransition("playdate", "requested", "accepted")).toBe(true);
    expect(canTransition("playdate", "accepted", "scheduled")).toBe(true);
    expect(canTransition("playdate", "scheduled", "completed")).toBe(true);
  });

  it("allows declining a playdate at any pre-terminal stage", () => {
    expect(canTransition("playdate", "requested", "declined")).toBe(true);
    expect(canTransition("playdate", "accepted", "declined")).toBe(true);
    expect(canTransition("playdate", "scheduled", "declined")).toBe(true);
  });

  it("rejects skipping playdate stages", () => {
    expect(canTransition("playdate", "requested", "scheduled")).toBe(false);
    expect(canTransition("playdate", "requested", "completed")).toBe(false);
  });

  it("rejects transitions out of terminal states", () => {
    for (const terminal of TERMINAL_STATUSES) {
      expect(canTransition("playdate", terminal, "requested")).toBe(false);
      expect(canTransition("adoption-application", terminal, "submitted")).toBe(false);
    }
  });

  it("rejects adoption statuses on playdates and vice versa", () => {
    expect(canTransition("playdate", "requested", "shortlisted")).toBe(false);
    expect(canTransition("adoption-application", "submitted", "scheduled")).toBe(false);
  });

  it("allows the happy-path adoption lifecycle", () => {
    expect(canTransition("adoption-application", "draft", "submitted")).toBe(true);
    expect(canTransition("adoption-application", "submitted", "under-review")).toBe(true);
    expect(canTransition("adoption-application", "under-review", "shortlisted")).toBe(true);
    expect(canTransition("adoption-application", "shortlisted", "approved")).toBe(true);
    expect(canTransition("adoption-application", "approved", "completed")).toBe(true);
  });

  it("assertTransition throws with a helpful message", () => {
    expect(() => assertTransition("playdate", "completed", "requested")).toThrow(
      /Illegal playdate transition/
    );
  });
});

describe("MockProvider", () => {
  const freshProvider = () => new MockProvider();

  it("seeds users and pets", async () => {
    const provider = freshProvider();
    expect(await provider.listUsers()).toHaveLength(seedUsers.length);
    expect(await provider.getPets()).toHaveLength(seedPets.length);
  });

  it("defaults the current user to Felix and can switch personas", async () => {
    const provider = freshProvider();
    expect((await provider.getCurrentUser()).id).toBe("u1");
    await provider.setCurrentUser("u2");
    expect((await provider.getCurrentUser()).name).toBe("Fiona Rehomer");
  });

  it("filters pets by playdate openness and adoption listing", async () => {
    const provider = freshProvider();
    const social = await provider.getPets({ openToPlaydates: true });
    expect(social.every((p) => p.socialStatus === "open-to-playdates")).toBe(true);

    const listed = await provider.getPets({ listedForAdoption: true });
    expect(listed.every((p) => p.adoptionListing !== undefined)).toBe(true);
    // Nugget (Felix's own dog) is not listed
    expect(listed.find((p) => p.id === "my-pet-1")).toBeUndefined();
  });

  it("returns clones — callers cannot mutate the store", async () => {
    const provider = freshProvider();
    const [pet] = await provider.getPets();
    pet.name = "HACKED";
    const [petAgain] = await provider.getPets();
    expect(petAgain.name).not.toBe("HACKED");
  });

  it("runs a full two-sided playdate lifecycle", async () => {
    const provider = freshProvider();

    // Felix requests a playdate: Nugget ↔ Biscuit (owned by Fiona)
    const created = await provider.createPlaydateRequest({
      requesterUserId: "u1",
      requesterPetId: "my-pet-1",
      targetPetId: "p1",
      message: "Nugget would love a park date!",
    });
    expect(created.status).toBe("requested");
    expect(created.targetUserId).toBe("u2"); // derived from pet ownership

    // Fiona sees it too — same record, both sides
    const fionasView = await provider.getInteractionsForUser("u2", "playdate");
    expect(fionasView.map((i) => i.id)).toContain(created.id);
    expect(fionasView[0].requesterPet?.name).toBe("Nugget");
    expect(fionasView[0].targetPet?.name).toBe("Biscuit");

    // Accept → schedule → complete, with system messages accruing
    await provider.updateInteractionStatus(created.id, "accepted");
    await provider.schedulePlaydate(created.id, {
      date: "2026-08-08",
      time: "10:00",
      location: "Laurelhurst Park",
    });
    const completed = await provider.updateInteractionStatus(created.id, "completed");
    expect(completed.status).toBe("completed");
    const systemMessages = completed.messages.filter((m) => m.senderId === "system");
    expect(systemMessages.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects illegal transitions", async () => {
    const provider = freshProvider();
    const created = await provider.createPlaydateRequest({
      requesterUserId: "u1",
      requesterPetId: "my-pet-1",
      targetPetId: "p1",
    });
    await expect(provider.updateInteractionStatus(created.id, "completed")).rejects.toThrow(
      /Illegal playdate transition/
    );
  });

  it("rejects playdate requests to pets that are not social", async () => {
    const provider = new MockProvider({
      pets: seedPets.map((p) => (p.id === "p1" ? { ...p, socialStatus: "not-social" as const } : p)),
    });
    await expect(
      provider.createPlaydateRequest({ requesterUserId: "u1", requesterPetId: "my-pet-1", targetPetId: "p1" })
    ).rejects.toThrow(/not open to playdates/);
  });

  it("creates adoption applications only for listed pets", async () => {
    const provider = freshProvider();
    const screeningAnswers = {
      homeType: "Apartment",
      hasYard: false,
      otherPets: "None",
      children: "None",
      experience: "First-time",
      hoursAlone: "2-4 hours",
      reason: "Companionship",
    };
    // Nugget is not listed → rejected
    await expect(
      provider.createAdoptionApplication({ requesterUserId: "u2", targetPetId: "my-pet-1", screeningAnswers })
    ).rejects.toThrow(/not listed for adoption/);
    // Biscuit is listed → accepted
    const app = await provider.createAdoptionApplication({
      requesterUserId: "u1",
      targetPetId: "p1",
      screeningAnswers,
    });
    expect(app.type).toBe("adoption-application");
    expect(app.status).toBe("submitted");
  });

  it("notifies subscribers on mutation and honors unsubscribe", async () => {
    const provider = freshProvider();
    let calls = 0;
    const unsubscribe = provider.subscribe(() => calls++);
    await provider.toggleFavorite("u1", "p1");
    expect(calls).toBe(1);
    unsubscribe();
    await provider.toggleFavorite("u1", "p2");
    expect(calls).toBe(1);
  });
});
