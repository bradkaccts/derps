import { stableContext } from "@/context/stable-context";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { usePersistentState } from "@/hooks/use-persistent-state";

import { supabase } from "@/integrations/supabase/client";
import { fireAndForget } from "@/lib/supabase-fire";
import { useAuth } from "@/context/AuthContext";
import { playdateEvents } from "@/lib/playdates/analytics";
import { scanMessage } from "@/lib/playdates/safety-text";
import { isRealPetId } from "@/lib/playdates/remote-pets";
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

/** Real matches carry a database UUID; the demo population uses `match-*` ids. */
export function isRemoteMatchId(matchId: string): boolean {
  return isRealPetId(matchId);
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

interface MatchRow {
  id: string;
  pet_a_id: string;
  pet_b_id: string;
  user_a_id: string;
  user_b_id: string;
  state: string;
  matched_at: string;
  expires_at: string | null;
  meetup_count: number;
  first_message_at: string | null;
}

interface MessageRow {
  id: string;
  match_id: string;
  sender_user_id: string;
  body: string;
  type: string;
  sent_at: string;
}

const sel = (s: string): string => s;

function rowToMatch(row: MatchRow): Match {
  return {
    id: row.id,
    petAId: row.pet_a_id,
    petBId: row.pet_b_id,
    state: row.state as MatchState,
    matchedAt: row.matched_at,
    expiresAt: row.expires_at,
    firstMessageAt: row.first_message_at,
    meetupCount: row.meetup_count,
  };
}

function rowToMessage(row: MessageRow): PlaydateMessage {
  return {
    id: row.id,
    matchId: row.match_id,
    senderUserId: row.sender_user_id,
    type: row.type as MessageType,
    body: row.body,
    sentAt: row.sent_at,
  };
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
  /** A real match that just landed from the other side, for the celebration. */
  newRemoteMatch: Match | null;
  clearNewRemoteMatch: () => void;
  /** The latest message delivered from the other person, for notifications. */
  incomingMessage: PlaydateMessage | null;
  clearIncomingMessage: () => void;

  refreshRemoteMatches: () => Promise<void>;
}

const MatchContext = stableContext<MatchContextValue>("MatchContext");

export function MatchProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [localMatches, setMatches] = usePersistentState<Match[]>(
    "derps.playdates.matches",
    seededMatches,
  );
  const [threads, setThreads] = usePersistentState<Record<string, PlaydateMessage[]>>(
    "derps.playdates.threads",
    seededMessages,
  );

  const [remoteMatches, setRemoteMatches] = useState<Match[]>([]);
  const [remoteThreads, setRemoteThreads] = useState<Record<string, PlaydateMessage[]>>({});
  const [newRemoteMatch, setNewRemoteMatch] = useState<Match | null>(null);
  const [incomingMessage, setIncomingMessage] = useState<PlaydateMessage | null>(null);

  /** Message ids already delivered to this session, so a re-pull isn't "new". */
  const seenMessageIds = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  /* ---------------- Real matches and threads ---------------- */

  const refreshRemoteMatches = useCallback(async () => {
    if (!userId) {
      setRemoteMatches([]);
      setRemoteThreads({});
      seenMessageIds.current = new Set();
      primed.current = false;
      return;
    }
    const { data } = await supabase
      .from("matches")
      .select(
        sel(
          "id, pet_a_id, pet_b_id, user_a_id, user_b_id, state, matched_at, expires_at, meetup_count, first_message_at",
        ),
      )
      .order("matched_at", { ascending: false })
      .returns<MatchRow[]>();

    const rows = data ?? [];
    setRemoteMatches(rows.map(rowToMatch));

    if (rows.length === 0) {
      setRemoteThreads({});
      primed.current = true;
      return;
    }
    const { data: messages } = await supabase
      .from("match_messages")
      .select(sel("id, match_id, sender_user_id, body, type, sent_at"))
      .in(
        "match_id",
        rows.map((r) => r.id),
      )
      .order("sent_at", { ascending: true })
      .returns<MessageRow[]>();

    const grouped: Record<string, PlaydateMessage[]> = {};
    let latestFromPartner: PlaydateMessage | null = null;
    (messages ?? []).forEach((row) => {
      const message = rowToMessage(row);
      (grouped[row.match_id] ??= []).push(message);
      const isNew = !seenMessageIds.current.has(message.id);
      seenMessageIds.current.add(message.id);
      if (isNew && primed.current && message.senderUserId !== userId) {
        latestFromPartner = message;
      }
    });
    setRemoteThreads(grouped);
    primed.current = true;
    if (latestFromPartner) setIncomingMessage(latestFromPartner);

  }, [userId]);

  useEffect(() => {
    void refreshRemoteMatches();
  }, [refreshRemoteMatches]);

  // Live delivery: a match created by the other person's boop, and their replies.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const channel = supabase
      .channel(`derpdate-matches-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "matches" },
        (payload) => {
          const match = rowToMatch(payload.new as MatchRow);
          setRemoteMatches((prev) =>
            prev.some((m) => m.id === match.id) ? prev : [match, ...prev],
          );
          setNewRemoteMatch(match);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches" },
        (payload) => {
          const match = rowToMatch(payload.new as MatchRow);
          setRemoteMatches((prev) => prev.map((m) => (m.id === match.id ? match : m)));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_messages" },
        (payload) => {
          const message = rowToMessage(payload.new as MessageRow);
          if (seenMessageIds.current.has(message.id)) return;
          seenMessageIds.current.add(message.id);
          setRemoteThreads((prev) => {
            const existing = prev[message.matchId] ?? [];
            if (existing.some((m) => m.id === message.id)) return prev;
            return { ...prev, [message.matchId]: [...existing, message] };
          });
          if (message.senderUserId !== userId) {
            setIncomingMessage(message);
          }
        },
      )
      .subscribe((status) => {
        if (cancelled) return;
        if (status === "SUBSCRIBED") {
          // Catch anything the partner sent while the socket was down.
          void refreshRemoteMatches();
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          retry = setTimeout(() => {
            if (!cancelled) void refreshRemoteMatches();
          }, 4000);
        }
      });

    // Sockets die when a phone sleeps or a tab is backgrounded; re-pull on return.
    const resync = () => {
      if (document.visibilityState === "visible") void refreshRemoteMatches();
    };
    document.addEventListener("visibilitychange", resync);
    window.addEventListener("online", resync);

    /* Realtime is the fast path, not the guarantee: a websocket can be blocked
       by a network or drop a row silently. This poll makes delivery certain. */
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void refreshRemoteMatches();
    }, 8000);

    return () => {
      cancelled = true;
      if (retry) clearTimeout(retry);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", resync);
      window.removeEventListener("online", resync);
      void supabase.removeChannel(channel);
    };
  }, [userId, refreshRemoteMatches]);


  const matches = useMemo(() => {
    const seen = new Set(remoteMatches.map((m) => m.id));
    return [...remoteMatches, ...localMatches.filter((m) => !seen.has(m.id))];
  }, [remoteMatches, localMatches]);

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

  const getThread = useCallback(
    (matchId: string) =>
      isRemoteMatchId(matchId) ? (remoteThreads[matchId] ?? []) : (threads[matchId] ?? []),
    [threads, remoteThreads],
  );

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
      const remote = isRemoteMatchId(matchId);
      const senderId = remote && userId ? userId : currentUser.id;

      const message: PlaydateMessage = {
        id: `msg-${Date.now()}`,
        matchId,
        senderUserId: senderId,
        type: options.type ?? "text",
        body,
        mediaRef: options.mediaRef,
        revealed: options.mediaRef ? true : undefined,
        card: options.card,
        sentAt: now,
        contactWarningAcknowledged: options.contactWarningAcknowledged,
      };

      const isFirst = getThread(matchId).length === 0;

      if (remote && userId) {
        // Optimistic: the row echoes back through realtime and replaces this one
        // by id once the insert returns.
        setRemoteThreads((prev) => ({
          ...prev,
          [matchId]: [...(prev[matchId] ?? []), message],
        }));
        void (async () => {
          const { data, error } = await supabase
            .from("match_messages")
            .insert({
              match_id: matchId,
              sender_user_id: userId,
              body,
              type: options.type ?? "text",
            })
            .select(sel("id, match_id, sender_user_id, body, type, sent_at"))
            .maybeSingle<MessageRow>();
          if (error || !data) {
            // Nothing reached the other person — say so instead of faking delivery.
            setRemoteThreads((prev) => ({
              ...prev,
              [matchId]: (prev[matchId] ?? []).filter((m) => m.id !== message.id),
            }));
            toast.error("That message didn't send. Check your connection and try again.");
            return;
          }
          const saved = rowToMessage(data);
          setRemoteThreads((prev) => ({
            ...prev,
            [matchId]: (prev[matchId] ?? []).map((m) => (m.id === message.id ? saved : m)),
          }));
          if (isFirst) {

            await supabase
              .from("matches")
              .update({ first_message_at: now, expires_at: null })
              .eq("id", matchId);
            setRemoteMatches((prev) =>
              prev.map((m) =>
                m.id === matchId ? { ...m, firstMessageAt: now, expiresAt: null } : m,
              ),
            );
          }
        })();
      } else {
        setThreads((prev) => ({ ...prev, [matchId]: [...(prev[matchId] ?? []), message] }));
        // A message cancels expiry: the match is now a conversation.
        setMatches((prev) =>
          prev.map((m) =>
            m.id === matchId && !m.firstMessageAt
              ? { ...m, firstMessageAt: now, expiresAt: null }
              : m,
          ),
        );
      }

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
    [getThread, setThreads, setMatches, userId],
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
      if (isRemoteMatchId(matchId)) {
        setRemoteMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, state } : m)));
        fireAndForget(supabase.from("matches").update({ state }).eq("id", matchId), "match state");
        return;
      }
      setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, state } : m)));
    },
    [setMatches],
  );

  const incrementMeetupCount = useCallback(
    (matchId: string) => {
      const bump = (m: Match): Match => {
        const meetupCount = m.meetupCount + 1;
        const state: MatchState =
          meetupCount >= PALS_MEETUP_THRESHOLD && m.state === "Active" ? "Pals" : m.state;
        return { ...m, meetupCount, state, expiresAt: state === "Pals" ? null : m.expiresAt };
      };

      if (isRemoteMatchId(matchId)) {
        setRemoteMatches((prev) => {
          const next = prev.map((m) => (m.id === matchId ? bump(m) : m));
          const updated = next.find((m) => m.id === matchId);
          if (updated) {
            fireAndForget(
              supabase
                .from("matches")
                .update({
                  meetup_count: updated.meetupCount,
                  state: updated.state,
                  expires_at: updated.expiresAt,
                })
                .eq("id", matchId),
              "meetup count",
            );
          }
          return next;
        });
        return;
      }
      setMatches((prev) => prev.map((m) => (m.id === matchId ? bump(m) : m)));
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
      setRemoteMatches((prev) => {
        const affected = prev.filter((m) => ids.has(m.petAId) || ids.has(m.petBId));
        affected.forEach((m) => {
          fireAndForget(supabase.from("matches").update({ state: "Blocked" }).eq("id", m.id), "block match");
        });
        return prev.map((m) =>
          ids.has(m.petAId) || ids.has(m.petBId) ? { ...m, state: "Blocked" as MatchState } : m,
        );
      });
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
        const thread = isRemoteMatchId(match.id)
          ? (remoteThreads[match.id] ?? [])
          : (threads[match.id] ?? []);
        const last = thread[thread.length - 1];
        const me = isRemoteMatchId(match.id) ? userId : currentUser.id;
        return Boolean(last) && last.senderUserId !== me;
      }).length,
    [matches, threads, remoteThreads, userId],
  );

  const clearNewRemoteMatch = useCallback(() => setNewRemoteMatch(null), []);
  const clearIncomingMessage = useCallback(() => setIncomingMessage(null), []);

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
      newRemoteMatch,
      clearNewRemoteMatch,
      incomingMessage,
      clearIncomingMessage,
      refreshRemoteMatches,
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
      newRemoteMatch,
      clearNewRemoteMatch,
      incomingMessage,
      clearIncomingMessage,
      refreshRemoteMatches,
    ],
  );

  return <MatchContext.Provider value={value}>{children}</MatchContext.Provider>;
}

export function useMatches() {
  const ctx = useContext(MatchContext);
  if (!ctx) throw new Error("useMatches must be used within MatchProvider");
  return ctx;
}
