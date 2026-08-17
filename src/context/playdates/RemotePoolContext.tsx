import { stableContext } from "@/context/stable-context";
import { useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRemotePool } from "@/hooks/use-remote-pool";
import { type PlaydatePet, type ScoredPet } from "@/lib/playdates/types";

interface RemotePoolContextValue {
  /** Other people's real, discoverable Derps, ready to be scored. */
  remotePool: ScoredPet[];
  loadingRemotePool: boolean;
  reloadRemotePool: () => Promise<void>;
  findRemotePet: (petId: string | undefined) => PlaydatePet | undefined;
}

const RemotePoolContext = stableContext<RemotePoolContextValue>("RemotePoolContext");

/**
 * One shared fetch of the real Derp population. Every surface that needs to
 * show another person's pet — the deck, a match thread, a meetup card — reads
 * from here rather than issuing its own query.
 */
export function RemotePoolProvider({ children }: { children: ReactNode }) {
  const { remotePool, loadingRemotePool, reloadRemotePool } = useRemotePool();

  const findRemotePet = useCallback(
    (petId: string | undefined) =>
      petId ? remotePool.find((entry) => entry.pet.id === petId)?.pet : undefined,
    [remotePool],
  );

  const value = useMemo(
    () => ({ remotePool, loadingRemotePool, reloadRemotePool, findRemotePet }),
    [remotePool, loadingRemotePool, reloadRemotePool, findRemotePet],
  );

  return <RemotePoolContext.Provider value={value}>{children}</RemotePoolContext.Provider>;
}

export function useRemoteDerps() {
  const ctx = useContext(RemotePoolContext);
  if (!ctx) throw new Error("useRemoteDerps must be used within RemotePoolProvider");
  return ctx;
}
