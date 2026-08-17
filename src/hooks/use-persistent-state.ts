import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * State that follows the person, not the browser.
 *
 * Signed out: localStorage, so guests keep full run of the app (quiz, feed,
 * shortlist) with nothing lost.
 * Signed in: mirrored to the account in the `user_state` table, so the same
 * Derps and matches show up on any device. On first sign-in, whatever the guest
 * built locally is merged up if the account has nothing stored for that key.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? initialValue : (JSON.parse(stored) as T);
    } catch {
      return initialValue;
    }
  });

  const keyRef = useRef(key);
  keyRef.current = key;
  const valueRef = useRef(value);
  valueRef.current = value;

  // Local cache always stays warm — it is the guest store and the offline copy.
  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // Quota or private-mode failures must never break the surface.
    }
  }, [value]);

  // Pull the account copy on sign-in (and push the guest copy if the account
  // has nothing yet).
  const hydratedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId) {
      hydratedFor.current = null;
      return;
    }
    if (hydratedFor.current === userId) return;
    hydratedFor.current = userId;

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("user_state")
        .select("data")
        .eq("user_id", userId)
        .eq("key", keyRef.current)
        .maybeSingle();
      if (cancelled || error) return;

      const remote = (data as { data?: { v?: T } } | null)?.data;
      if (remote && "v" in remote) {
        setValue(remote.v as T);
        return;
      }
      // Nothing stored yet — carry the guest session up into the account.
      await supabase.from("user_state").upsert(
        { user_id: userId, key: keyRef.current, data: { v: valueRef.current } },
        { onConflict: "user_id,key" },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Push changes, debounced so a burst of swipes is one write.
  useEffect(() => {
    if (!userId || hydratedFor.current !== userId) return;
    const timer = window.setTimeout(() => {
      void supabase.from("user_state").upsert(
        { user_id: userId, key: keyRef.current, data: { v: value } },
        { onConflict: "user_id,key" },
      );
    }, 600);
    return () => window.clearTimeout(timer);
  }, [value, userId]);

  const reset = useCallback(() => {
    setValue(initialValue);
    try {
      window.localStorage.removeItem(keyRef.current);
    } catch {
      /* no-op */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [value, setValue, reset] as const;
}
