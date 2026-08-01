/**
 * Instrumentation & the domain event bus (§6.7, §13.5).
 *
 * Non-negotiable, ships with the MVP: you cannot train a model on data you did
 * not log, and you cannot retroactively log impressions. Every mutating action
 * publishes one typed event; consumers (analytics, feature pipeline,
 * notifications, TrustScore) subscribe rather than querying production tables.
 *
 * In this client build the bus is in-memory. The event shapes are the contract
 * that survives when it is backed by a real broker.
 */
import {
  FEATURE_VERSION,
  MODEL_VERSION,
  type FeatureContribution,
  type FeedbackOverall,
  type Impression,
  type SwipeDirection,
} from "./types";

export type PlaydateEvent =
  | {
      type: "impression.logged";
      impressionId: string;
      actorPetId: string;
      candidatePetId: string;
      rankPosition: number;
      score: number;
      strategyId: string;
      at: string;
    }
  | {
      type: "swipe.recorded";
      swipeId: string;
      actorPetId: string;
      targetPetId: string;
      direction: SwipeDirection;
      impressionId: string;
      at: string;
    }
  | { type: "swipe.undone"; swipeId: string; actorPetId: string; at: string }
  | {
      type: "match.created";
      matchId: string;
      petAId: string;
      petBId: string;
      impressionId: string | null;
      at: string;
    }
  | { type: "match.expired"; matchId: string; at: string }
  | { type: "message.sent"; matchId: string; messageId: string; isFirst: boolean; at: string }
  | { type: "meetup.proposed"; meetupId: string; matchId: string; venueId: string; at: string }
  | { type: "meetup.accepted"; meetupId: string; at: string }
  | { type: "meetup.declined"; meetupId: string; at: string }
  | { type: "meetup.cancelled"; meetupId: string; at: string }
  | { type: "meetup.checkin"; meetupId: string; party: "a" | "b"; withinGeofence: boolean; at: string }
  | {
      type: "feedback.submitted";
      meetupId: string;
      overall: FeedbackOverall;
      subjectPetId: string;
      at: string;
    }
  | { type: "quiz.completed"; petId: string; quizVersion: string; at: string }
  | { type: "report.filed"; reportId: string; category: string; at: string }
  | { type: "block.created"; blockerUserId: string; blockedUserId: string; at: string }
  | { type: "transfer_intent.detected"; matchId: string; at: string }
  | { type: "contact_share.warned"; matchId: string; proceeded: boolean; at: string };

type Listener = (event: PlaydateEvent) => void;

const listeners = new Set<Listener>();
const log: PlaydateEvent[] = [];
const MAX_LOG = 500;

export const playdateEvents = {
  publish(event: PlaydateEvent) {
    log.push(event);
    if (log.length > MAX_LOG) log.shift();
    listeners.forEach((listener) => listener(event));
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  /** Read-only tail, used by the in-app instrumentation inspector. */
  recent(limit = 50): PlaydateEvent[] {
    return log.slice(-limit).reverse();
  },
  clear() {
    log.length = 0;
  },
};

let impressionSeq = 0;

export function createImpression(params: {
  actorPetId: string;
  candidatePetId: string;
  rankPosition: number;
  score: number;
  featureVector: FeatureContribution[];
  strategyId: string;
}): Impression {
  impressionSeq += 1;
  const shownAt = new Date().toISOString();
  return {
    id: `imp-${Date.now().toString(36)}-${impressionSeq}`,
    actorPetId: params.actorPetId,
    candidatePetId: params.candidatePetId,
    rankPosition: params.rankPosition,
    score: params.score,
    featureVector: params.featureVector,
    featureVersion: FEATURE_VERSION,
    modelVersion: MODEL_VERSION,
    strategyId: params.strategyId,
    shownAt,
    dwellMs: null,
  };
}
