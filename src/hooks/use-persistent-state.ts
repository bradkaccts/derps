import { useCallback, useEffect, useRef, useState } from "react";

/**
 * State backed by localStorage.
 *
 * PQ-105 requires the quiz to be resumable across sessions and devices; on a
 * server-backed build that is a `PUT /quiz/responses` partial save. On the
 * client the honest stand-in is localStorage, kept behind this hook so the
 * swap is a one-file change.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
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

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // Quota or private-mode failures must never break the surface.
    }
  }, [value]);

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
