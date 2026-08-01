/**
 * COMPATIBILITY SHIM — do not add data here.
 * Canonical types: src/lib/data/models.ts. Seed: src/lib/data/mock/seed.ts.
 * New code should import from "@/lib/data".
 */
export type { User, UserPreferences, SocialIntent } from "@/lib/data/models";
export { seedUsers as mockUsers, DEFAULT_USER_ID } from "@/lib/data/mock/seed";

import { seedUsers } from "@/lib/data/mock/seed";
/** @deprecated Session state now lives in the data provider (getCurrentUser). */
export const currentUser = seedUsers[0];
