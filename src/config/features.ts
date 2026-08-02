/**
 * Release-scope feature flags.
 *
 * Release 1 is Derpdates-only: pet-to-pet matching for nearby pets.
 * The adoption product (listings, browsing, applications, adoption chat)
 * stays in the codebase but is hidden from the interface. Flip `adoption`
 * back to `true` to restore every adoption surface at once.
 */
export const FEATURES = {
  adoption: false,
} as const;
