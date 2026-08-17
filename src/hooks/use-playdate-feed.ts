import { useCallback, useEffect, useMemo, useState } from "react";
import { buildMockPool, mockPlaydatePets } from "@/data/mock-playdate-pets";
import { buildFeed } from "@/lib/playdates/feed";
import {
  type Deck,
  type FeedCard,
  type PetPersonality,
  type PetPreference,
  type PlaydatePet,
  type ScoredPet,
  type SwipeDirection,
} from "@/lib/playdates/types";
import { useMyPets, type MyPet } from "@/context/MyPetsContext";
import { useAuth } from "@/context/AuthContext";
import {
  useMatches,
  useMeetups,
  usePetPersonality,
  useSafety,
  useSwipes,
} from "@/context/playdates/PlaydatesProvider";
import { currentUser } from "@/data/mock-users";

/** The launch metro (§13.8). The user's own pets are anchored here. */
export const HOME_GEO = { lat: 34.2746, lng: -119.229 };

/**
 * Lift one of the user's owned pets into the shape the matching pipeline
 * consumes. The adoption-side `Pet` record is reused rather than forked (§7.1)
 * — only the social satellite fields are added on top.
 */
export function toScoredPet(
  pet: MyPet,
  personality: PetPersonality | undefined,
  preference: PetPreference,
  vaccination: PlaydatePet["vaccination"],
  ownerId?: string,
): ScoredPet | null {
  if (!personality) return null;
  return {
    pet: {
      ...pet,
      ownerId: ownerId ?? currentUser.id,
      socialStatus: "Active",
      isPlaydateActive: true,
      vaccination,
      intact: false,
      ageWeeks: 200,
      homeGeo: {
        lat: pet.latitude ?? HOME_GEO.lat,
        lng: pet.longitude ?? HOME_GEO.lng,
      },
      lastActiveAt: new Date().toISOString(),
      historicalRightSwipeRate: 0.3,
      ownerResponsiveness: 0.9,
      safetyHold: false,
    },
    personality,
    preference,
  };
}


/** Deterministic pseudo-random in [0,1) — the same pair always resolves the same way. */
function pairRoll(a: string, b: string): number {
  let hash = 2166136261;
  const key = `${a}::${b}`;
  for (let i = 0; i < key.length; i += 1) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}

export type OnboardingGate = "no_pet" | "needs_attestation" | "needs_quiz" | "ready";

export interface SwipeOutcome {
  matched: boolean;
  matchId: string | null;
  limitReached: boolean;
}

/**
 * Orchestrates the Playdates stores into a working deck.
 *
 * The stores stay dumb on purpose: cross-store choreography (a like that
 * becomes a match, a swipe that must be logged against its impression) lives
 * here, in one readable place, rather than being threaded through providers.
 */
export function usePlaydateFeed() {
  const { activePet, myPets, setActivePetId } = useMyPets();
  const { requireAuth } = useAuth();
  const personality = usePetPersonality();
  const swipeStore = useSwipes();
  const matchStore = useMatches();
  const meetupStore = useMeetups();
  const safety = useSafety();

  const [deckVersion, setDeckVersion] = useState(0);

  const actor = useMemo(() => {
    if (!activePet) return null;
    const attestation = personality.getAttestation(activePet.id);
    return toScoredPet(
      activePet,
      personality.getPersonality(activePet.id),
      personality.getPreference(activePet.id),
      attestation,
    );
  }, [activePet, personality]);

  const gate: OnboardingGate = useMemo(() => {
    if (!activePet) return "no_pet";
    const attestation = personality.getAttestation(activePet.id);
    const current = attestation && new Date(attestation.expiresAt).getTime() > Date.now();
    if (!current) return "needs_attestation";
    // PQ-101 — no quiz, no feed, in either direction.
    if (!personality.isComplete(activePet.id)) return "needs_quiz";
    return "ready";
  }, [activePet, personality]);

  const pool = useMemo<ScoredPet[]>(() => buildMockPool(), []);

  const matchedPetIds = useMemo(() => {
    if (!activePet) return new Set<string>();
    return new Set(
      matchStore
        .matchesForPet(activePet.id)
        .map((match) => matchStore.partnerPetId(match, activePet.id)),
    );
  }, [activePet, matchStore]);

  const result = useMemo(() => {
    if (!actor || gate !== "ready") return null;
    void deckVersion;
    return buildFeed({
      actor,
      pool,
      swipes: swipeStore.swipes,
      blocks: safety.blocks,
      matchedPetIds,
      impressionCounts: swipeStore.impressionCounts,
      boopedBy: swipeStore.boopedBy(actor.pet.id),
    });
    // `impressionCounts` intentionally excluded: it changes as a *result* of
    // serving the deck, and including it would rebuild the deck on every serve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actor, gate, pool, swipeStore.swipes, safety.blocks, matchedPetIds, deckVersion]);

  const deck: Deck | null = result?.deck ?? null;

  // RE-610 — impressions are logged the moment the deck is served. You cannot
  // retroactively log an impression, so this is not deferred to render.
  useEffect(() => {
    if (result?.impressions.length) swipeStore.logImpressions(result.impressions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const swipe = useCallback(
    (card: FeedCard, direction: SwipeDirection): SwipeOutcome => {
      if (!actor) return { matched: false, matchId: null, limitReached: false };

      // Passing is free for guests; a heart or a boop reaches another human,
      // so it needs an account (Tier 0).
      if (
        direction !== "pass" &&
        !requireAuth(
          direction === "boop"
            ? "Boops go straight to another Derp's human."
            : "Hearts are saved to your account so we can find your match.",
        )
      ) {
        return { matched: false, matchId: null, limitReached: false };
      }

      if (direction === "like" && swipeStore.likesRemaining(actor.pet.id) === 0) {
        return { matched: false, matchId: null, limitReached: true };
      }
      if (direction === "boop" && swipeStore.boopsRemaining(actor.pet.id) === 0) {
        return { matched: false, matchId: null, limitReached: true };
      }

      swipeStore.recordSwipe(actor.pet.id, card, direction);

      if (direction === "pass") return { matched: false, matchId: null, limitReached: false };

      /*
       * A match requires a mutual like (CH-301). With no second live client,
       * the counterparty's decision is modelled from the same reciprocity prior
       * the ranker uses, resolved deterministically per pair so a pet's answer
       * never changes between an undo and a re-swipe.
       */
      const candidate = pool.find((p) => p.pet.id === card.petId);
      const prior = candidate?.pet.historicalRightSwipeRate ?? 0.3;
      const threshold = Math.min(0.85, prior + (direction === "boop" ? 0.5 : 0.22));
      const mutual = pairRoll(actor.pet.id, card.petId) < threshold;

      if (!mutual) return { matched: false, matchId: null, limitReached: false };

      const match = matchStore.createMatch(actor.pet.id, card.petId);
      return { matched: true, matchId: match.id, limitReached: false };
    },
    [actor, pool, swipeStore, matchStore, requireAuth],
  );

  const undo = useCallback(() => {
    if (!actor) return null;
    const undone = swipeStore.undoLastSwipe(actor.pet.id);
    setDeckVersion((v) => v + 1);
    return undone;
  }, [actor, swipeStore]);

  const refresh = useCallback(() => setDeckVersion((v) => v + 1), []);

  return {
    actor,
    activePet,
    myPets,
    setActivePetId,
    gate,
    deck,
    pool,
    swipe,
    undo,
    refresh,
    likesRemaining: actor ? swipeStore.likesRemaining(actor.pet.id) : 0,
    boopsRemaining: actor ? swipeStore.boopsRemaining(actor.pet.id) : 0,
    lastSwipe: actor ? swipeStore.lastSwipeFor(actor.pet.id) : null,
    pendingFeedbackCount: meetupStore.pendingFeedback().length,
  };
}

/** Look up a pet from the social population, for chat and meetup surfaces. */
export function usePlaydatePartner(petId: string | undefined): PlaydatePet | undefined {
  return useMemo(() => mockPlaydatePets.find((p) => p.id === petId), [petId]);
}
