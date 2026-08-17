import { stableContext } from "@/context/stable-context";
import { useCallback, useContext, useEffect, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { playdateEvents } from "@/lib/playdates/analytics";
import { scanMessage } from "@/lib/playdates/safety-text";
import {
  type Match,
  type MatchState,
  type MessageType,
  type PlaydateMessage,
} from "@/lib/playdates/types";
import { currentUser } from "@/data/mock-users";

/** CH-307 — a match with no message from either side expires after 7 days. */
export const MATCH_EXPIRY_DAYS = 7;
/** CH-313 — pairs with ≥2 confirmed meetups become Pals: pinned, never expiring. */
export const PALS_MEETUP_THRESHOLD = 2;

const DAY_MS = 86_400_000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY_MS).toISOString();
const daysAhead = (d: number) => new Date(Date.now() + d * DAY_MS).toISOString();

/** A match row is stored with petAId < petBId so a pair can only produce one row. */
export function orderPair(petOne: string, petTwo: string): [string, string] {
  return petOne < petTwo ? [petOne, petTwo] : [petTwo, petOne];
}

export function matchIdFor(petOne: string, petTwo: string): string {
  const [a, b] = orderPair(petOne, petTwo);
  return `match-${a}--${b}`;
}

const seededMatches: Match[] = [
  {
    id: matchIdFor("my-pet-1", "pd-koda"),
    ...(() => {
      const [petAId, petBId] = orderPair("my-pet-1", "pd-koda");
      return { petAId, petBId };
    })(),
    state: "Active",
    matchedAt: daysAgo(2),
    expiresAt: null,
    firstMessageAt: daysAgo(2),
    meetupCount: 0,
  },
  {
    id: matchIdFor("my-pet-1", "pd-biscuit"),
    ...(() => {
      const [petAId, petBId] = orderPair("my-pet-1", "pd-biscuit");
      return { petAId, petBId };
    })(),
    state: "Pals",
    matchedAt: daysAgo(38),
    expiresAt: null,
    firstMessageAt: daysAgo(37),
    meetupCount: 2,
  },
];

const seededMessages: Record<string, PlaydateMessage[]> = {
  [matchIdFor("my-pet-1", "pd-koda")]: [
    {
      id: "msg-koda-1",
      matchId: matchIdFor("my-pet-1", "pd-koda"),
      senderUserId: "u11",
      type: "text",
      body: "Nugget looks like he could actually keep up with Koda, which is a first. How is he with big adolescent dogs?",
      sentAt: daysAgo(2),
    },
    {
      id: "msg-koda-2",
      matchId: matchIdFor("my-pet-1", "pd-koda"),
      senderUserId: currentUser.id,
      type: "text",
      body: "Honestly great — he's smaller but he wrestles like he isn't. Fenced somewhere would be ideal for a first go.",
      sentAt: daysAgo(2),
    },
  ],
  [matchIdFor("my-pet-1", "pd-biscuit")]: [
    {
      id: "msg-biscuit-1",
      matchId: matchIdFor("my-pet-1", "pd-biscuit"),
      senderUserId: "u13",
      type: "text",
      body: "Same time next Saturday? Biscuit has been sulking by the front door since Tuesday.",
      sentAt: daysAgo(4),
    },
  ],
};

interface SendOptions {
  type?: MessageType;
  mediaRef?: string;
  card?: PlaydateMessage["card"];
  contactWarningAcknowledged?: boolean;
}

interface MatchContextValue {
  matches: Match[];
  getMatch: (matchId: string) => Match | undefined;
  matchesForPet: (petId: string) => Match[];
  partnerPetId: (match: Match, myPetId: string) => string;
  getThread: (matchId: string) => PlaydateMessage[];
  createMatch: (myPetId: string, otherPetId: string) => Match;
  sendMessage: (matchId: string, body: string, options?: SendOptions) => PlaydateMessage;
  /** CH-305 — incoming images stay blurred until the recipient taps to view. */
  revealImage: (matchId: string, messageId: string) => void;
  setMatchState: (matchId: string, state: MatchState) => void;
  incrementMeetupCount: (matchId: string) => void;
  /** Blocks are user-level, so closing a match closes every thread with that person. */
  closeMatchesWithPets: (petIds: string[]) => void;
  activeCount: number;
  /** Threads where the last message came from the other party. */
  awaitingReplyCount: number;
  scanDraft: typeof scanMessage;
}

const MatchContext = stableContext<MatchContextValue>("MatchContext");

export function MatchProvider({ children }: { children: ReactNode }) {
  const [matches, setMatches] = usePersistentState<Match[]>(
    "derps.playdates.matches",
    seededMatches,
  );
  const [threads, setThreads] = usePersistentState<Record<string, PlaydateMessage[]>>(
    "derps.playdates.threads",
    seededMessages,
  );

  /* CH-307 — sweep expired matches. Running this on mount keeps the inbox
     honest without a scheduler: a match nobody spoke in is not a relationship. */
  useEffect(() => {
    setMatches((prev) => {
      let changed = false;
      const next = prev.map((match) => {
        if (match.state !== "Active" || match.firstMessageAt) return match;
        if (!match.expiresAt) return match;
        if (new Date(match.expiresAt).getTime() > Date.now()) return match;
        changed = true;
        playdateEvents.publish({
          type: "match.expired",
          matchId: match.id,
          at: new Date().toISOString(),
        });
        return { ...match, state: "Expired" as MatchState };
      });
      return changed ? next : prev;
    });
  }, [setMatches]);

  const getMatch = useCallback(
    (matchId: string) => matches.find((m) => m.id === matchId),
    [matches],
  );

  const matchesForPet = useCallback(
    (petId: string) =>
      matches
        .filter(
          (m) =>
            (m.petAId === petId || m.petBId === petId) &&
            m.state !== "Expired" &&
            m.state !== "Blocked",
        )
        // Pals threads are pinned to the top.
        .sort((a, b) => {
          if (a.state === "Pals" && b.state !== "Pals") return -1;
          if (b.state === "Pals" && a.state !== "Pals") return 1;
          return new Date(b.matchedAt).getTime() - new Date(a.matchedAt).getTime();
        }),
    [matches],
  );

  const partnerPetId = useCallback(
    (match: Match, myPetId: string) => (match.petAId === myPetId ? match.petBId : match.petAId),
    [],
  );

  const getThread = useCallback((matchId: string) => threads[matchId] ?? [], [threads]);

  const createMatch = useCallback(
    (myPetId: string, otherPetId: string) => {
      const [petAId, petBId] = orderPair(myPetId, otherPetId);
      const id = matchIdFor(myPetId, otherPetId);
      const now = new Date().toISOString();

      const match: Match = {
        id,
        petAId,
        petBId,
        state: "Active",
        matchedAt: now,
        expiresAt: daysAhead(MATCH_EXPIRY_DAYS),
        firstMessageAt: null,
        meetupCount: 0,
      };

      setMatches((prev) => (prev.some((m) => m.id === id) ? prev : [match, ...prev]));
      playdateEvents.publish({
        type: "match.created",
        matchId: id,
        petAId,
        petBId,
        impressionId: null,
        at: now,
      });
      return match;
    },
    [setMatches],
  );

  const sendMessage = useCallback(
    (matchId: string, body: string, options: SendOptions = {}) => {
      const now = new Date().toISOString();
      const message: PlaydateMessage = {
        id: `msg-${Date.now()}`,
        matchId,
        senderUserId: currentUser.id,
        type: options.type ?? "text",
        body,
        mediaRef: options.mediaRef,
        revealed: options.mediaRef ? true : undefined,
        card: options.card,
        sentAt: now,
        contactWarningAcknowledged: options.contactWarningAcknowledged,
      };

      const isFirst = (threads[matchId] ?? []).length === 0;
      setThreads((prev) => ({ ...prev, [matchId]: [...(prev[matchId] ?? []), message] }));

      // A message cancels expiry: the match is now a conversation.
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId && !m.firstMessageAt
            ? { ...m, firstMessageAt: now, expiresAt: null }
            : m,
        ),
      );

      playdateEvents.publish({
        type: "message.sent",
        matchId,
        messageId: message.id,
        isFirst,
        at: now,
      });

      if (options.contactWarningAcknowledged) {
        playdateEvents.publish({ type: "contact_share.warned", matchId, proceeded: true, at: now });
      }

      return message;
    },
    [threads, setThreads, setMatches],
  );

  const revealImage = useCallback(
    (matchId: string, messageId: string) => {
      setThreads((prev) => ({
        ...prev,
        [matchId]: (prev[matchId] ?? []).map((m) =>
          m.id === messageId ? { ...m, revealed: true } : m,
        ),
      }));
    },
    [setThreads],
  );

  const setMatchState = useCallback(
    (matchId: string, state: MatchState) => {
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, state } : m)));
    },
    [setMatches],
  );

  const incrementMeetupCount = useCallback(
    (matchId: string) => {
      setMatches((prev) =>
        prev.map((m) => {
          if (m.id !== matchId) return m;
          const meetupCount = m.meetupCount + 1;
          const state: MatchState =
            meetupCount >= PALS_MEETUP_THRESHOLD && m.state === "Active" ? "Pals" : m.state;
          return { ...m, meetupCount, state, expiresAt: state === "Pals" ? null : m.expiresAt };
        }),
      );
    },
    [setMatches],
  );

  const closeMatchesWithPets = useCallback(
    (petIds: string[]) => {
      const ids = new Set(petIds);
      setMatches((prev) =>
        prev.map((m) =>
          ids.has(m.petAId) || ids.has(m.petBId) ? { ...m, state: "Blocked" as MatchState } : m,
        ),
      );
    },
    [setMatches],
  );

  const activeCount = useMemo(
    () => matches.filter((m) => m.state === "Active" || m.state === "Pals").length,
    [matches],
  );

  const awaitingReplyCount = useMemo(
    () =>
      matches.filter((match) => {
        if (match.state !== "Active" && match.state !== "Pals") return false;
        const thread = threads[match.id] ?? [];
        const last = thread[thread.length - 1];
        return Boolean(last) && last.senderUserId !== currentUser.id;
      }).length,
    [matches, threads],
  );

  const value = useMemo(
    () => ({
      matches,
      getMatch,
      matchesForPet,
      partnerPetId,
      getThread,
      createMatch,
      sendMessage,
      revealImage,
      setMatchState,
      incrementMeetupCount,
      closeMatchesWithPets,
      activeCount,
      awaitingReplyCount,
      scanDraft: scanMessage,
    }),
    [
      matches,
      getMatch,
      matchesForPet,
      partnerPetId,
      getThread,
      createMatch,
      sendMessage,
      revealImage,
      setMatchState,
      incrementMeetupCount,
      closeMatchesWithPets,
      activeCount,
      awaitingReplyCount,
    ],
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatches() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatches must be used within MatchProvider");
  return ctx;
}
