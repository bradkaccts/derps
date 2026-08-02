import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { mockVenueObservations } from "@/data/mock-venue-observations";
import { currentUser } from "@/data/mock-users";
import {
  aggregateVenue,
  selectQuestions,
  type SelectQuestionsInput,
} from "@/lib/playdates/venue-confidence";
import {
  type VenueAttributeAggregate,
  type VenueAttributeDefinition,
  type VenueAttributeKey,
  type VenueObservation,
  type VenueObservationValue,
  type VenueType,
} from "@/lib/playdates/types";

/**
 * The observation store behind venue confirmation signals.
 *
 * On a server-backed build this is `GET /v1/meetups/{id}/venue-prompt`,
 * `POST /v1/meetups/{id}/venue-observations` and
 * `GET /v1/venues/{id}/attributes` (§9). Keeping the aggregation in pure
 * functions and the persistence behind this provider makes that swap a
 * two-file change.
 *
 * Nothing here counts anything per user beyond supersession: there is no
 * contribution total to read, because none is kept (VC-420/VC-421).
 */
interface VenueConfidenceValue {
  observations: VenueObservation[];
  /** Per-attribute aggregate state for a venue, decayed as of now (VC-304). */
  attributeStates: (venueId: string, venueType: VenueType) => VenueAttributeAggregate[];
  /** 0–2 questions, or none when the venue has nothing worth asking (VC-212). */
  questionsForCheckin: (params: {
    venueId: string;
    venueType: VenueType;
    meetupId: string;
  }) => VenueAttributeDefinition[];
  submitObservations: (params: {
    venueId: string;
    meetupId: string;
    answers: { attributeKey: VenueAttributeKey; value: VenueObservationValue }[];
  }) => void;
  dismissPrompt: (meetupId: string) => void;
  /** VC-204 — a dismissed or answered prompt never comes back for that meetup. */
  isPromptClosed: (meetupId: string) => boolean;
}

const VenueConfidenceContext = createContext<VenueConfidenceValue | null>(null);

export function VenueConfidenceProvider({ children }: { children: ReactNode }) {
  const [observations, setObservations] = usePersistentState<VenueObservation[]>(
    "derps.venue-observations",
    mockVenueObservations,
  );
  const [closedPrompts, setClosedPrompts] = usePersistentState<string[]>(
    "derps.venue-prompts-closed",
    [],
  );

  const attributeStates = useCallback(
    (venueId: string, venueType: VenueType) => aggregateVenue(observations, venueId, venueType),
    [observations],
  );

  const questionsForCheckin = useCallback(
    ({ venueId, venueType, meetupId }: { venueId: string; venueType: VenueType; meetupId: string }) => {
      const mine = observations.filter((o) => o.userId === currentUser.id);
      const input: SelectQuestionsInput = {
        observations,
        venueId,
        venueType,
        userId: currentUser.id,
        firstEverCheckin: mine.length === 0,
        // Stable per meetup so a re-render doesn't reshuffle the card the user
        // is looking at, random across meetups per VC-211.
        random: seededRandom(meetupId + venueId),
      };
      return selectQuestions(input);
    },
    [observations],
  );

  const submitObservations: VenueConfidenceValue["submitObservations"] = useCallback(
    ({ venueId, meetupId, answers }) => {
      const observedAt = new Date().toISOString();
      setObservations((prev) => {
        // VC-701 — idempotent per (meetup, attribute): a resubmission replaces
        // rather than duplicates. Older observations by this user at this venue
        // stay in the log and are superseded at aggregation time (VC-601).
        const next = prev.filter(
          (o) =>
            !(
              o.meetupId === meetupId &&
              o.userId === currentUser.id &&
              answers.some((a) => a.attributeKey === o.attributeKey)
            ),
        );
        return [
          ...next,
          ...answers.map(({ attributeKey, value }) => ({
            id: `vo-${venueId}-${attributeKey}-${currentUser.id}-${meetupId}`,
            venueId,
            attributeKey,
            value,
            userId: currentUser.id,
            meetupId,
            observedAt,
          })),
        ];
      });
      setClosedPrompts((prev) => (prev.includes(meetupId) ? prev : [...prev, meetupId]));
    },
    [setObservations, setClosedPrompts],
  );

  const dismissPrompt = useCallback(
    (meetupId: string) => {
      // VC-203 — dismissal costs the user nothing and produces no follow-up.
      setClosedPrompts((prev) => (prev.includes(meetupId) ? prev : [...prev, meetupId]));
    },
    [setClosedPrompts],
  );

  const isPromptClosed = useCallback(
    (meetupId: string) => closedPrompts.includes(meetupId),
    [closedPrompts],
  );

  const value = useMemo(
    () => ({
      observations,
      attributeStates,
      questionsForCheckin,
      submitObservations,
      dismissPrompt,
      isPromptClosed,
    }),
    [
      observations,
      attributeStates,
      questionsForCheckin,
      submitObservations,
      dismissPrompt,
      isPromptClosed,
    ],
  );

  return (
    <VenueConfidenceContext.Provider value={value}>{children}</VenueConfidenceContext.Provider>
  );
}

export function useVenueConfidence() {
  const ctx = useContext(VenueConfidenceContext);
  if (!ctx) throw new Error("useVenueConfidence must be used within VenueConfidenceProvider");
  return ctx;
}

/** Deterministic per-key shuffle source, so tie-breaks are stable within a card. */
function seededRandom(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i += 1) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
