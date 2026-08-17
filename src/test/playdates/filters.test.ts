import { describe, it, expect } from "vitest";
import { applyHardFilters } from "@/lib/playdates/filters";
import { type Block } from "@/lib/playdates/types";
import { makePet } from "./fixtures";

const noBlocks: Block[] = [];
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

describe("hard filters (§6.3)", () => {
  it("passes an ordinary compatible pair", () => {
    const outcome = applyHardFilters({
      actor: makePet(),
      candidate: makePet(),
      blocks: noBlocks,
    });
    expect(outcome.passed).toBe(true);
  });

  it("excludes cross-species unless both parties opted in", () => {
    const dog = makePet({ preference: { crossSpeciesOptIn: true } });
    const cat = makePet({ pet: { species: "cat" } });
    expect(applyHardFilters({ actor: dog, candidate: cat, blocks: noBlocks }).reason).toBe("species");

    const optedInCat = makePet({ pet: { species: "cat" }, preference: { crossSpeciesOptIn: true } });
    expect(applyHardFilters({ actor: dog, candidate: optedInCat, blocks: noBlocks }).passed).toBe(true);
  });

  it("excludes when either vaccination attestation is expired", () => {
    const expired = makePet({ pet: { vaccination: { attestedAt: daysAgo(400), expiresAt: daysAgo(5) } } });
    expect(applyHardFilters({ actor: makePet(), candidate: expired, blocks: noBlocks }).reason).toBe(
      "vaccination",
    );
  });

  it("keeps a brand-new Derp with no attestation yet in the pool", () => {
    const absent = makePet({ pet: { vaccination: null } });
    expect(applyHardFilters({ actor: absent, candidate: makePet(), blocks: noBlocks }).passed).toBe(true);
    expect(applyHardFilters({ actor: makePet(), candidate: absent, blocks: noBlocks }).passed).toBe(true);
  });

  it("excludes pets under 16 weeks entirely", () => {
    const puppy = makePet({ pet: { ageWeeks: 12 } });
    expect(applyHardFilters({ actor: makePet(), candidate: puppy, blocks: noBlocks }).reason).toBe(
      "puppy_protection",
    );
  });

  it("enforces declared size limits bidirectionally", () => {
    // Camila declares "no dogs over 15kg" — enforced as a filter, not a suggestion.
    const camila = makePet({
      traits: { size_kg: 11 },
      preference: {
        hardFilters: {
          maxSizeKg: 15,
          minSizeKg: null,
          excludedLifeStages: [],
          excludedGuardingTriggers: [],
        },
      },
    });
    const bigDog = makePet({ traits: { size_kg: 34 } });
    expect(applyHardFilters({ actor: camila, candidate: bigDog, blocks: noBlocks }).reason).toBe(
      "size_limit",
    );
    // ...and the candidate's constraints on the actor matter just as much.
    expect(applyHardFilters({ actor: bigDog, candidate: camila, blocks: noBlocks }).reason).toBe(
      "size_limit",
    );
  });

  it("enforces declared life-stage exclusions in both directions", () => {
    const noPuppies = makePet({
      preference: {
        hardFilters: {
          maxSizeKg: null,
          minSizeKg: null,
          excludedLifeStages: ["puppy", "adolescent"],
          excludedGuardingTriggers: [],
        },
      },
    });
    const adolescent = makePet({ traits: { life_stage: "adolescent" }, pet: { ageWeeks: 70 } });
    expect(applyHardFilters({ actor: noPuppies, candidate: adolescent, blocks: noBlocks }).reason).toBe(
      "life_stage_limit",
    );
  });

  it("excludes when both pets guard the same trigger, but allows differing triggers", () => {
    const toyGuarder = makePet({ traits: { resource_guarding: ["toys"] } });
    const otherToyGuarder = makePet({ traits: { resource_guarding: ["toys", "food"] } });
    const handlerGuarder = makePet({ traits: { resource_guarding: ["handler"] } });

    expect(
      applyHardFilters({ actor: toyGuarder, candidate: otherToyGuarder, blocks: noBlocks }).reason,
    ).toBe("mutual_resource_guarding");
    expect(applyHardFilters({ actor: toyGuarder, candidate: handlerGuarder, blocks: noBlocks }).passed).toBe(
      true,
    );
  });

  it("excludes two dog-selective pets from each other", () => {
    const a = makePet({ traits: { dog_sociability: 2 } });
    const b = makePet({ traits: { dog_sociability: 1 } });
    expect(applyHardFilters({ actor: a, candidate: b, blocks: noBlocks }).reason).toBe(
      "mutual_low_sociability",
    );

    // A selective dog and a bombproof one is exactly the pairing that works.
    const bombproof = makePet({ traits: { dog_sociability: 5 } });
    expect(applyHardFilters({ actor: a, candidate: bombproof, blocks: noBlocks }).passed).toBe(true);
  });

  it("honours intact opt-out in either direction", () => {
    const optedOut = makePet({ preference: { intactOptOut: true } });
    const intact = makePet({ pet: { intact: true } });
    expect(applyHardFilters({ actor: optedOut, candidate: intact, blocks: noBlocks }).reason).toBe(
      "intact_status",
    );
    expect(applyHardFilters({ actor: intact, candidate: optedOut, blocks: noBlocks }).reason).toBe(
      "intact_status",
    );
  });

  it("excludes pets under an open safety hold", () => {
    const held = makePet({ pet: { safetyHold: true } });
    expect(applyHardFilters({ actor: makePet(), candidate: held, blocks: noBlocks }).reason).toBe(
      "safety_hold",
    );
  });

  it("applies blocks at the user level, in both directions", () => {
    const priyaDog = makePet({ ownerId: "priya" });
    const other = makePet({ ownerId: "stranger" });
    const blocks: Block[] = [
      { blockerUserId: "stranger", blockedUserId: "priya", createdAt: daysAgo(1) },
    ];
    expect(applyHardFilters({ actor: priyaDog, candidate: other, blocks }).reason).toBe("block");

    // Blocking Priya blocks *all* of Priya's dogs, not just the one in the thread.
    const priyaSecondDog = makePet({ ownerId: "priya" });
    expect(applyHardFilters({ actor: priyaSecondDog, candidate: other, blocks }).reason).toBe("block");
  });
});
