import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

type Row = { id?: string } & Record<string, unknown>;

/**
 * Merge a guest session into the account copy.
 *
 * Boops, passes, likes and matches are append-only logs, so the safe union is
 * "everything the account already has, plus anything the guest did that the
 * account has never seen". Non-array shapes (quiz answers, preferences) keep
 * the account copy — it is the authoritative one.
 */
function mergeRemoteAndLocal<T>(remote: T, local: T): T {
  if (!Array.isArray(remote) || !Array.isArray(local)) return remote;
  const seen = new Set(
    (remote as Row[]).map((item, i) =>
      item && typeof item === "object" ? (item.id ?? JSON.stringify(item)) : `${i}:${String(item)}`,
    ),
  );
  const extras = (local as Row[]).filter((item) => {
    const key =
      item && typeof item === "object" ? (item.id ?? JSON.stringify(item)) : String(item);
    return !seen.has(key);
  });
  return (extras.length ? [...(remote as Row[]), ...extras] : remote) as T;
}

/**
 * State that follows the person, not the browser.
 *
 * Signed out: localStorage, so guests keep full run of the app (quiz, feed,
 * shortlist) with nothing lost — and it is still there after a sign-out.
 * Signed in: mirrored to the account in the `user_state` table, so the same
 * Derps, swipes and matches show up on any device and survive a refresh.
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

  const push = useCallback((uid: string, next: T) => {
    return supabase.from("user_state").upsert(
      {
        user_id: uid,
        key: keyRef.current,
        data: { v: next } as unknown as Record<string, never>,
      },
      { onConflict: "user_id,key" },
    );
  }, []);

  // Pull the account copy on sign-in, merging in anything done as a guest.
  // `hydratedFor` only flips once the round-trip is done, so a swipe made
  // mid-hydration can never overwrite the account with a stale local copy.
  const hydratedFor = useRef<string | null>(null);
  const hydratingFor = useRef<string | null>(null);
  useEffect(() => {
    if (!userId) {
      hydratedFor.current = null;
      hydratingFor.current = null;
      return;
    }
    if (hydratedFor.current === userId || hydratingFor.current === userId) return;
    hydratingFor.current = userId;

    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("user_state")
        .select("data")
        .eq("user_id", userId)
        .eq("key", keyRef.current)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        hydratingFor.current = null;
        return;
      }

      const remote = (data as { data?: { v?: T } } | null)?.data;
      if (remote && "v" in remote) {
        const merged = mergeRemoteAndLocal(remote.v as T, valueRef.current);
        setValue(merged);
        hydratedFor.current = userId;
        hydratingFor.current = null;
        if (merged !== remote.v) await push(userId, merged);
        return;
      }
      // Nothing stored yet — carry the guest session up into the account.
      await push(userId, valueRef.current);
      hydratedFor.current = userId;
      hydratingFor.current = null;
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, push]);

  // Push changes, debounced so a burst of swipes is one write.
  const pendingRef = useRef(false);
  useEffect(() => {
    if (!userId || hydratedFor.current !== userId) return;
    pendingRef.current = true;
    const timer = window.setTimeout(() => {
      pendingRef.current = false;
      void push(userId, value);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [value, userId, push]);

  // A refresh or tab close must not eat the last swipe sitting in the debounce.
  useEffect(() => {
    if (!userId) return;
    const flush = () => {
      if (!pendingRef.current || hydratedFor.current !== userId) return;
      pendingRef.current = false;
      void push(userId, valueRef.current);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      flush();
    };
  }, [userId, push]);

  const reset = useCallback(() => {
    setValue(initialValue);
    pendingRef.current = false;
    try {
      window.localStorage.removeItem(keyRef.current);
    } catch {
      /* no-op */
    }
    // Clearing has to reach the account too, or the next load pulls it back.
    if (userId && hydratedFor.current === userId) void push(userId, initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, push]);

  return [value, setValue, reset] as const;
}
