import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import {
  buildRemotePool,
  PET_COLUMNS,
  type RemotePersonalityRow,
  type RemotePetRow,
  type RemotePreferenceRow,
} from "@/lib/playdates/remote-pets";
import { type ScoredPet } from "@/lib/playdates/types";

const sel = (s: string): string => s;

/**
 * Every other person's discoverable Derp, ready to be scored.
 *
 * Guests get this too: browsing is open, so a signed-out visitor sees the same
 * real neighbourhood a signed-in one does. Only the actions on top are gated.
 */
export function useRemotePool() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [pool, setPool] = useState<ScoredPet[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    let petQuery = supabase
      .from("pets")
      .select(sel(PET_COLUMNS))
      .eq("is_discoverable", true)
      .eq("safety_hold", false)
      .limit(500);
    if (userId) petQuery = petQuery.neq("user_id", userId);

    const { data: petData, error } = await petQuery.returns<RemotePetRow[]>();
    if (error || !petData || petData.length === 0) {
      setPool([]);
      setLoading(false);
      return;
    }

    const ids = petData.map((p) => p.id);
    const [{ data: personalities }, { data: preferences }] = await Promise.all([
      supabase
        .from("pet_personalities")
        .select(
          sel("pet_id, quiz_version, derivation_version, traits, confidence, history, completed_at, updated_at"),
        )
        .in("pet_id", ids)
        .returns<RemotePersonalityRow[]>(),
      supabase
        .from("pet_preferences")
        .select(
          sel("pet_id, max_travel_miles, preferred_meetup_types, availability_windows, hard_filters, cross_species_opt_in, intact_opt_out"),
        )
        .in("pet_id", ids)
        .returns<RemotePreferenceRow[]>(),
    ]);

    setPool(buildRemotePool(petData, personalities ?? [], preferences ?? []));
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { remotePool: pool, loadingRemotePool: loading, reloadRemotePool: load };
}
