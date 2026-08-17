import { stableContext } from "@/context/stable-context";
import { useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { playdateEvents } from "@/lib/playdates/analytics";
import { type FeedCard, type Impression, type Swipe, type SwipeDirection } from "@/lib/playdates/types";

/** SW-208 — anti-spam and anti-scraping control, with a friendly limit screen. */
export const DAILY_LIKE_LIMIT = 100;
/** SW-209 — Boop is limited in supply; scarcity is what makes it mean something. */
export const DAILY_BOOP_LIMIT = 1;

const DAY_MS = 86_400_000;

interface SwipeContextValue {
  swipes: Swipe[];
  impressions: Impression[];
  impressionCounts: Record<string, number>;
  recordSwipe: (actorPetId: string, card: FeedCard, direction: SwipeDirection) => Swipe;
  /** SW-204 — undo of the immediately preceding swipe only. */
  undoLastSwipe: (actorPetId: string) => Swipe | null;
  lastSwipeFor: (actorPetId: string) => Swipe | null;
  logImpressions: (impressions: Impression[]) => void;
  likesRemaining: (actorPetId: string) => number;
  boopsRemaining: (actorPetId: string) => number;
  hasSwiped: (actorPetId: string, targetPetId: string) => boolean;
  likedPetIds: (actorPetId: string) => string[];
  /** Pets that have booped this pet — surfaced at the top of the deck. */
  boopedBy: (actorPetId: string) => Set<string>;
  registerIncomingBoop: (actorPetId: string, fromPetId: string) => void;
  resetSwipes: () => void;
}

const SwipeContext = stableContext<SwipeContextValue>("SwipeContext");

export function SwipeProvider({ children }: { children: ReactNode }) {
  const [swipes, setSwipes, resetSwipes] = usePersistentState<Swipe[]>("derps.playdates.swipes", []);
  const [impressions, setImpressions] = usePersistentState<Impression[]>(
    "derps.playdates.impressions",
    [],
  );
  const [incomingBoops, setIncomingBoops] = usePersistentState<Record<string, string[]>>(
    "derps.playdates.incomingBoops",
    {},
  );

  const impressionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    impressions.forEach((impression) => {
      counts[impression.candidatePetId] = (counts[impression.candidatePetId] ?? 0) + 1;
    });
    return counts;
  }, [impressions]);

  const countSince = useCallback(
    (actorPetId: string, direction: SwipeDirection) => {
      const cutoff = Date.now() - DAY_MS;
      return swipes.filter(
        (s) =>
          s.actorPetId === actorPetId &&
          s.direction === direction &&
          new Date(s.createdAt).getTime() >= cutoff,
      ).length;
    },
    [swipes],
  );

  const likesRemaining = useCallback(
    (actorPetId: string) => Math.max(0, DAILY_LIKE_LIMIT - countSince(actorPetId, "like")),
    [countSince],
  );

  const boopsRemaining = useCallback(
    (actorPetId: string) => Math.max(0, DAILY_BOOP_LIMIT - countSince(actorPetId, "boop")),
    [countSince],
  );

  const recordSwipe = useCallback(
    (actorPetId: string, card: FeedCard, direction: SwipeDirection) => {
      // RE-611 — every swipe is joinable back to the impression that produced it.
      const swipe: Swipe = {
        id: `sw-${Date.now()}-${card.petId}`,
        actorPetId,
        targetPetId: card.petId,
        direction,
        impressionId: card.impressionId,
        scoreAtImpression: card.score,
        featureVersion: card.featureVersion,
        modelVersion: card.modelVersion,
        strategyId: card.strategyId,
        createdAt: new Date().toISOString(),
      };
      setSwipes((prev) => [...prev, swipe]);
      playdateEvents.publish({
        type: "swipe.recorded",
        swipeId: swipe.id,
        actorPetId,
        targetPetId: card.petId,
        direction,
        impressionId: card.impressionId,
        at: swipe.createdAt,
      });
      return swipe;
    },
    [setSwipes],
  );

  const lastSwipeFor = useCallback(
    (actorPetId: string) => {
      for (let i = swipes.length - 1; i >= 0; i -= 1) {
        if (swipes[i].actorPetId === actorPetId) return swipes[i];
      }
      return null;
    },
    [swipes],
  );

  const undoLastSwipe = useCallback(
    (actorPetId: string) => {
      const last = lastSwipeFor(actorPetId);
      if (!last) return null;
      setSwipes((prev) => prev.filter((s) => s.id !== last.id));
      playdateEvents.publish({
        type: "swipe.undone",
        swipeId: last.id,
        actorPetId,
        at: new Date().toISOString(),
      });
      return last;
    },
    [lastSwipeFor, setSwipes],
  );

  const logImpressions = useCallback(
    (batch: Impression[]) => {
      if (batch.length === 0) return;
      // Retention: 90 days hot in production; here we keep the tail bounded.
      setImpressions((prev) => [...prev, ...batch].slice(-400));
    },
    [setImpressions],
  );

  const hasSwiped = useCallback(
    (actorPetId: string, targetPetId: string) =>
      swipes.some((s) => s.actorPetId === actorPetId && s.targetPetId === targetPetId),
    [swipes],
  );

  const likedPetIds = useCallback(
    (actorPetId: string) =>
      swipes
        .filter((s) => s.actorPetId === actorPetId && s.direction !== "pass")
        .map((s) => s.targetPetId),
    [swipes],
  );

  const boopedBy = useCallback(
    (actorPetId: string) => new Set(incomingBoops[actorPetId] ?? []),
    [incomingBoops],
  );

  const registerIncomingBoop = useCallback(
    (actorPetId: string, fromPetId: string) => {
      setIncomingBoops((prev) => {
        const existing = prev[actorPetId] ?? [];
        if (existing.includes(fromPetId)) return prev;
        return { ...prev, [actorPetId]: [...existing, fromPetId] };
      });
    },
    [setIncomingBoops],
  );

  const value = useMemo(
    () => ({
      swipes,
      impressions,
      impressionCounts,
      recordSwipe,
      undoLastSwipe,
      lastSwipeFor,
      logImpressions,
      likesRemaining,
      boopsRemaining,
      hasSwiped,
      likedPetIds,
      boopedBy,
      registerIncomingBoop,
      resetSwipes,
    }),
    [
      swipes,
      impressions,
      impressionCounts,
      recordSwipe,
      undoLastSwipe,
      lastSwipeFor,
      logImpressions,
      likesRemaining,
      boopsRemaining,
      hasSwiped,
      likedPetIds,
      boopedBy,
      registerIncomingBoop,
      resetSwipes,
    ],
  );

  return <SwipeContext.Provider value={value}>{children}</SwipeContext.Provider>;
}

export function useSwipes() {
  const ctx = useContext(SwipeContext);
  if (!ctx) throw new Error("useSwipes must be used within SwipeProvider");
  return ctx;
}
