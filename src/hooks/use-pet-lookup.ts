import { useCallback } from "react";
import { useRemoteDerps } from "@/context/playdates/RemotePoolContext";
import { findPlaydatePet } from "@/data/mock-playdate-pets";
import type { PlaydatePet } from "@/lib/playdates/types";

/**
 * Resolves a pet id to a profile, whichever population it came from: a real
 * Derp from another account first, then the demo pets. Match and history views
 * must never drop a row just because the partner is a real pet.
 */
export function usePetLookup() {
  const { findRemotePet } = useRemoteDerps();
  return useCallback(
    (petId: string | undefined | null): PlaydatePet | undefined =>
      petId ? (findRemotePet(petId) ?? findPlaydatePet(petId)) : undefined,
    [findRemotePet],
  );
}
