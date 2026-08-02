/**
 * Venue confidence aggregation (VC-3xx) and prompt selection (VC-2xx).
 *
 * Pure functions over an immutable observation log, evaluated at read time so
 * state ages without a scheduled job (VC-304). Everything that could turn into
 * a per-user reputation lives nowhere: every observer counts exactly the same,
 * capped at 1.0, forever (VC-302, VC-410).
 */
import { venueAttributeByKey, venueAttributeDefinitions } from "@/data/venue-attributes";
import {
  type VenueAttributeAggregate,
  type VenueAttributeDefinition,
  type VenueAttributeKey,
  type VenueConfidenceState,
  type VenueObservation,
  type VenueType,
} from "./types";

const DAY_MS = 86_400_000;

/** VC-404 — a user is not re-asked about the same (venue, attribute) inside this window. */
export const REPROMPT_COOLDOWN_DAYS = 90;

/** Past this multiple of the half-life a confirmed attribute wants a refresh. */
const STALE_AFTER_HALF_LIVES = 1.5;

export function ageInDays(iso: string, now: Date): number {
  return Math.max(0, (now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

/* ------------------------------------------------------------------ *
 * §5.2 Effective weight
 * ------------------------------------------------------------------ */

interface WeightedObservation {
  observation: VenueObservation;
  weight: number;
}

/**
 * Steps 1–4: collapse to one observation per user (most recent supersedes),
 * discount co-attendees from the same meetup, decay by half-life, cap at 1.0.
 */
export function weighObservations(
  observations: VenueObservation[],
  halfLifeDays: number,
  now: Date,
): WeightedObservation[] {
  // Step 1 — one observation per user, always the most recent (VC-301).
  const latestByUser = new Map<string, VenueObservation>();
  for (const observation of observations) {
    const held = latestByUser.get(observation.userId);
    if (!held || new Date(observation.observedAt) > new Date(held.observedAt)) {
      latestByUser.set(observation.userId, observation);
    }
  }

  const collapsed = [...latestByUser.values()].sort(
    (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
  );

  // Step 3 — the first observation from a meetup counts fully, each additional
  // one from that same meetup at 0.5 (VC-303/VC-430).
  const seenMeetups = new Set<string>();

  return collapsed.map((observation) => {
    const coAttendance = seenMeetups.has(observation.meetupId) ? 0.5 : 1;
    seenMeetups.add(observation.meetupId);

    // Step 2 — recency decay.
    const decay = Math.pow(0.5, ageInDays(observation.observedAt, now) / halfLifeDays);

    // Step 4 — cap. Belt and braces: nothing above can exceed 1.0 anyway.
    const weight = Math.min(decay * coAttendance, 1);
    return { observation, weight };
  });
}

/* ------------------------------------------------------------------ *
 * §5.3 Confidence states
 * ------------------------------------------------------------------ */

function emptyAggregate(attributeKey: VenueAttributeKey): VenueAttributeAggregate {
  return {
    attributeKey,
    state: "unknown",
    value: null,
    wYes: 0,
    wNo: 0,
    wTot: 0,
    agreement: 0,
    nDistinct: 0,
    nYesUsers: 0,
    nNoUsers: 0,
    nMeetupEvents: 0,
    lastObservedAt: null,
  };
}

export function aggregateAttribute(
  observations: VenueObservation[],
  definition: VenueAttributeDefinition,
  now: Date = new Date(),
): VenueAttributeAggregate {
  const relevant = observations.filter((o) => o.attributeKey === definition.attributeKey);
  if (relevant.length === 0) return emptyAggregate(definition.attributeKey);

  const weighted = weighObservations(relevant, definition.halfLifeDays, now);

  let wYes = 0;
  let wNo = 0;
  let nYesUsers = 0;
  let nNoUsers = 0;
  let lastObservedAt: string | null = null;
  const meetupEvents = new Set<string>();

  for (const { observation, weight } of weighted) {
    // "not sure" is recorded but contributes no weight to either side (VC-110).
    if (observation.value === "yes") {
      wYes += weight;
      nYesUsers += 1;
      meetupEvents.add(observation.meetupId);
    } else if (observation.value === "no") {
      wNo += weight;
      nNoUsers += 1;
      meetupEvents.add(observation.meetupId);
    }
    if (!lastObservedAt || new Date(observation.observedAt) > new Date(lastObservedAt)) {
      lastObservedAt = observation.observedAt;
    }
  }

  const wTot = wYes + wNo;
  const nDistinct = nYesUsers + nNoUsers;
  const agreement = wTot > 0 ? Math.max(wYes, wNo) / wTot : 0;
  const value = wTot === 0 ? null : wYes >= wNo ? "yes" : "no";
  const minorityUsers = wYes >= wNo ? nNoUsers : nYesUsers;

  const base: VenueAttributeAggregate = {
    attributeKey: definition.attributeKey,
    state: "unknown",
    value,
    wYes,
    wNo,
    wTot,
    agreement,
    nDistinct,
    nYesUsers,
    nNoUsers,
    nMeetupEvents: meetupEvents.size,
    lastObservedAt,
  };

  return { ...base, state: resolveState(base, definition, minorityUsers) };
}

function resolveState(
  a: VenueAttributeAggregate,
  definition: VenueAttributeDefinition,
  minorityUsers: number,
): VenueConfidenceState {
  if (a.wTot < 0.5) return "unknown";

  if (definition.class === "safety_critical") {
    // VC-311 — one credible "no" is enough to pull the positive display, no
    // matter how many confirmations sit behind it.
    if (a.nNoUsers >= 1 && a.nYesUsers >= 1) return "disputed";
    if (a.value === "no") return a.nDistinct >= 2 ? "confirmed" : "reported";
    // VC-310 — the positive side needs more, fresher, near-unanimous evidence.
    if (a.nDistinct >= 4 && a.wTot >= 3.5 && a.agreement >= 0.9 && a.nMeetupEvents >= 2) {
      return "confirmed";
    }
    return a.nDistinct >= 4 && a.agreement >= 0.9 ? "stale" : "reported";
  }

  if (a.agreement < 0.75 && minorityUsers >= 2) return "disputed";

  // VC-431 — three people at one meetup is one observation event, not three.
  if (a.nDistinct >= 3 && a.wTot >= 2.5 && a.agreement >= 0.75 && a.nMeetupEvents >= 2) {
    return "confirmed";
  }

  // Previously confirmable, now decayed below the bar: the corroboration is
  // still there, the recency is not.
  if (a.nDistinct >= 3 && a.agreement >= 0.75 && a.nMeetupEvents >= 2 && a.wTot < 2.5) {
    return "stale";
  }

  return "reported";
}

export function isApplicable(definition: VenueAttributeDefinition, venueType: VenueType): boolean {
  return definition.enabled && definition.applicableVenueTypes.includes(venueType);
}

export function aggregateVenue(
  observations: VenueObservation[],
  venueId: string,
  venueType: VenueType,
  now: Date = new Date(),
): VenueAttributeAggregate[] {
  const forVenue = observations.filter((o) => o.venueId === venueId);
  return venueAttributeDefinitions
    .filter((definition) => isApplicable(definition, venueType))
    .map((definition) => aggregateAttribute(forVenue, definition, now));
}

/**
 * VC-313 — anything other than a positive `fenced` state is treated as
 * unfenced by venue recommendations.
 */
export function isFencedConfident(aggregates: VenueAttributeAggregate[]): boolean {
  const fenced = aggregates.find((a) => a.attributeKey === "fenced");
  return Boolean(fenced && fenced.state === "confirmed" && fenced.value === "yes");
}

/* ------------------------------------------------------------------ *
 * §4.2 Question selection
 * ------------------------------------------------------------------ */

/** Priority order: a tie-break from a fresh observer is the best answer available. */
const TIER: Record<VenueConfidenceState, number | null> = {
  disputed: 0,
  unknown: 1,
  reported: 2,
  stale: 3,
  confirmed: null,
};

export interface SelectQuestionsInput {
  observations: VenueObservation[];
  venueId: string;
  venueType: VenueType;
  userId: string;
  /** VC-210 — a user's first-ever check-in is asked at most one question. */
  firstEverCheckin: boolean;
  now?: Date;
  /** Injectable so tests are deterministic; VC-211 wants random tie-breaks in production. */
  random?: () => number;
}

export function selectQuestions({
  observations,
  venueId,
  venueType,
  userId,
  firstEverCheckin,
  now = new Date(),
  random = Math.random,
}: SelectQuestionsInput): VenueAttributeDefinition[] {
  const forVenue = observations.filter((o) => o.venueId === venueId);

  const candidates = venueAttributeDefinitions
    .filter((definition) => isApplicable(definition, venueType))
    .map((definition) => ({
      definition,
      aggregate: aggregateAttribute(forVenue, definition, now),
    }))
    .filter(({ definition, aggregate }) => {
      // VC-404 — never re-ask what this user answered here recently.
      const mine = forVenue.filter(
        (o) => o.attributeKey === definition.attributeKey && o.userId === userId,
      );
      const answeredRecently = mine.some(
        (o) => ageInDays(o.observedAt, now) < REPROMPT_COOLDOWN_DAYS,
      );
      if (answeredRecently) return false;

      // VC-405 — confirmed and fresh drops out of the pool entirely.
      if (aggregate.state === "confirmed") {
        const age = aggregate.lastObservedAt ? ageInDays(aggregate.lastObservedAt, now) : Infinity;
        if (age < definition.halfLifeDays * STALE_AFTER_HALF_LIVES) return false;
      }
      return TIER[aggregate.state] !== null || aggregate.state === "confirmed";
    })
    .map(({ definition, aggregate }) => ({
      definition,
      // A confirmed-but-past-refresh attribute sorts with the stale tier.
      tier: TIER[aggregate.state] ?? 3,
      jitter: random(),
    }));

  candidates.sort((a, b) => a.tier - b.tier || a.jitter - b.jitter);

  return candidates.slice(0, firstEverCheckin ? 1 : 2).map((c) => c.definition);
}

/* ------------------------------------------------------------------ *
 * §5.4 Display language — provenance, never a badge, never "verified".
 * ------------------------------------------------------------------ */

export function formatRecency(iso: string | null, now: Date = new Date()): string {
  if (!iso) return "";
  const days = Math.round(ageInDays(iso, now));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 45) return `${days} days ago`;
  const date = new Date(iso);
  const sameYear = date.getFullYear() === now.getFullYear();
  return sameYear
    ? `in ${date.toLocaleDateString(undefined, { month: "long" })}`
    : `in ${date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
}

export function attributeLabelFor(key: VenueAttributeKey): string {
  return venueAttributeByKey[key].questionText;
}

/**
 * VC-320/VC-323 — observer count and recency together. A count without a date
 * is misleading, so the two are never separated.
 */
export function provenanceLine(
  aggregate: VenueAttributeAggregate,
  now: Date = new Date(),
): string | null {
  const visitors = (n: number) => `${n} ${n === 1 ? "visitor" : "visitors"}`;
  const when = formatRecency(aggregate.lastObservedAt, now);

  switch (aggregate.state) {
    case "unknown":
      return null;
    case "reported":
      return `Reported by ${visitors(aggregate.nDistinct)} — not yet confirmed, last seen ${when}`;
    case "confirmed":
      return `Confirmed by ${visitors(aggregate.nDistinct)}, most recently ${when}`;
    case "disputed":
      return `Mixed reports — ${aggregate.nYesUsers} say yes, ${aggregate.nNoUsers} say no, last seen ${when}`;
    case "stale":
      return `Confirmed by ${visitors(aggregate.nDistinct)}, but not since ${when.replace(/^in /, "")}`;
  }
}

/** VC-220 — the neutral acknowledgment shown right after answering. */
export function acknowledgementLine(
  aggregate: VenueAttributeAggregate,
  attributeLabel: string,
  now: Date = new Date(),
): string {
  const lowered = attributeLabel.toLowerCase();
  if (aggregate.state === "confirmed" && aggregate.value === "yes") {
    return `Thanks. ${aggregate.nYesUsers} visitors have confirmed ${lowered} here.`;
  }
  if (aggregate.state === "disputed") {
    return `Thanks. Reports on ${lowered} are mixed here — ${aggregate.nYesUsers} yes, ${aggregate.nNoUsers} no.`;
  }
  if (aggregate.nDistinct <= 1) {
    return `Thanks. You're the first to report ${lowered} here.`;
  }
  return `Thanks. ${aggregate.nDistinct} visitors have reported on ${lowered}, most recently ${formatRecency(
    aggregate.lastObservedAt,
    now,
  )}.`;
}
