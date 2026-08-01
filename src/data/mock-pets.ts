/**
 * COMPATIBILITY SHIM — do not add data here.
 *
 * Canonical types live in src/lib/data/models.ts and seed data in
 * src/lib/data/mock/seed.ts. This file re-exports them so existing imports
 * keep working during the migration. New code should import from "@/lib/data".
 */
export type {
  VibeTag,
  Species,
  AgeCategory,
  Gender,
  Pet,
  AdoptionListing,
  AdoptionStatus,
  SocialStatus,
} from "@/lib/data/models";
export { isListedForAdoption, isOpenToPlaydates } from "@/lib/data/models";
export { seedPets as mockPets } from "@/lib/data/mock/seed";
