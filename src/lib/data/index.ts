import type { DerpsDataProvider } from "./provider";
import { MockProvider } from "./mock/MockProvider";

export * from "./models";
export * from "./interactions";
export type {
  DerpsDataProvider,
  HydratedInteraction,
  NewAdoptionApplication,
  NewPet,
  NewPlaydateRequest,
  PetFilters,
  Unsubscribe,
} from "./provider";
export { MockProvider } from "./mock/MockProvider";

/**
 * Provider selection.
 *
 *   VITE_DATA_MODE=mock  (default) → in-memory MockProvider
 *   VITE_DATA_MODE=live  (step 2)  → SupabaseProvider
 *
 * The app resolves this once at startup. Tests bypass the singleton and
 * construct MockProvider directly with fixture seeds.
 */
let singleton: DerpsDataProvider | null = null;

export function getDataProvider(): DerpsDataProvider {
  if (singleton) return singleton;

  const mode = import.meta.env?.VITE_DATA_MODE ?? "mock";
  switch (mode) {
    case "live":
      // Step 2: return new SupabaseProvider(...). Fail loudly until then so
      // a misconfigured env never silently serves mock data in production.
      throw new Error(
        'VITE_DATA_MODE="live" is not available yet — SupabaseProvider arrives in step 2.'
      );
    case "mock":
    default:
      singleton = new MockProvider();
      return singleton;
  }
}

/** Test-only escape hatch for injecting a fixture-seeded provider. */
export function setDataProviderForTesting(provider: DerpsDataProvider): void {
  singleton = provider;
}
