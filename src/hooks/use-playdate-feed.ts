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
  useRemoteDerps,
  useSafety,
  useSwipes,
} from "@/context/playdates/PlaydatesProvider";
import { isRealPetId } from "@/lib/playdates/remote-pets";
import { supabase } from "@/integrations/supabase/client";
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
  /** The heart/boop reached a real account; a match waits on their answer. */
  sentToRealDerp?: boolean;
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
  const { requireAuth, user } = useAuth();
  const personality = usePetPersonality();
  const swipeStore = useSwipes();
  const matchStore = useMatches();
  const meetupStore = useMeetups();
  const safety = useSafety();
  const { remotePool } = useRemoteDerps();

  const [deckVersion, setDeckVersion] = useState(0);

  const actor = useMemo(() => {
    if (!activePet) return null;
    const attestation = personality.getAttestation(activePet.id);
    return toScoredPet(
      activePet,
      personality.getPersonality(activePet.id),
      personality.getPreference(activePet.id),
      attestation,
      user?.id,
    );
  }, [activePet, personality, user?.id]);

  const gate: OnboardingGate = useMemo(() => {
    if (!activePet) return "no_pet";
    const attestation = personality.getAttestation(activePet.id);
    const current = attestation && new Date(attestation.expiresAt).getTime() > Date.now();
    if (!current) return "needs_attestation";
    // PQ-101 — no quiz, no feed, in either direction.
    if (!personality.isComplete(activePet.id)) return "needs_quiz";
    return "ready";
  }, [activePet, personality]);

  // Real Derps first, then the demo population so a thin local area still has
  // a deck worth swiping.
  const pool = useMemo<ScoredPet[]>(() => [...remotePool, ...buildMockPool()], [remotePool]);


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
       * A real Derp gets a real swipe row. The match is then decided by the
       * database trigger when — and only when — the other person swipes back,
       * so nothing is faked and no celebration fires early.
       */
      if (isRealPetId(card.petId) && isRealPetId(actor.pet.id) && user) {
        void supabase.from("swipes").upsert(
          {
            actor_user_id: user.id,
            actor_pet_id: actor.pet.id,
            target_pet_id: card.petId,
            direction,
            score_at_impression: Math.round(card.score ?? 0),
          },
          { onConflict: "actor_pet_id,target_pet_id" },
        );
        return { matched: false, matchId: null, limitReached: false, sentToRealDerp: true };
      }

      /*
       * Mock population only: with no second live client, the counterparty's
       * decision is modelled from the same reciprocity prior the ranker uses,
       * resolved deterministically per pair so a pet's answer never changes
       * between an undo and a re-swipe.
       */
      const candidate = pool.find((p) => p.pet.id === card.petId);
      const prior = candidate?.pet.historicalRightSwipeRate ?? 0.3;
      const threshold = Math.min(0.85, prior + (direction === "boop" ? 0.5 : 0.22));
      const mutual = pairRoll(actor.pet.id, card.petId) < threshold;

      if (!mutual) return { matched: false, matchId: null, limitReached: false };

      const match = matchStore.createMatch(actor.pet.id, card.petId);
      return { matched: true, matchId: match.id, limitReached: false };
    },
    [actor, pool, swipeStore, matchStore, requireAuth, user],
  );


  const undo = useCallback(() => {
    if (!actor) return null;
    if (!actor) return null;
    const undone = swipeStore.undoLastSwipe(actor.pet.id);
    // An undo has to reach the other side too, or the swipe still counts there.
    if (undone && isRealPetId(undone.targetPetId) && isRealPetId(actor.pet.id)) {
      void supabase
        .from("swipes")
        .delete()
        .eq("actor_pet_id", actor.pet.id)
        .eq("target_pet_id", undone.targetPetId);
    }
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
