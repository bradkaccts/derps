import { stableContext } from "@/context/stable-context";
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { fireAndForget } from "@/lib/supabase-fire";
import { useAuth } from "@/context/AuthContext";
import { isRemoteMatchId } from "./MatchContext";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { playdateEvents } from "@/lib/playdates/analytics";
import { isWithinCheckinWindow } from "@/lib/playdates/geo";
import { trustSignalForCompletedMeetup, trustSignalForNoShow } from "@/lib/playdates/trust";
import { useSafety } from "./SafetyContext";
import {
  type FeedbackOverall,
  type FeedbackTag,
  type Meetup,
  type MeetupFeedback,
  type MeetupState,
  type Venue,
} from "@/lib/playdates/types";
import { currentUser } from "@/data/mock-users";
import { matchIdFor } from "./MatchContext";

const DAY_MS = 86_400_000;
const daysAgo = (d: number) => new Date(Date.now() - d * DAY_MS).toISOString();
const daysAhead = (d: number, hour = 9) => {
  const date = new Date(Date.now() + d * DAY_MS);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
};

const seededMeetups: Meetup[] = [
  {
    // Theo proposed; awaiting the user's Accept / Decline / Counter (MP-407).
    id: "meetup-koda-1",
    matchId: matchIdFor("my-pet-1", "pd-koda"),
    venueId: "v1",
    proposedByUserId: "u11",
    scheduledStart: daysAhead(2, 9),
    durationMinutes: 60,
    state: "Proposed",
    checkinAAt: null,
    checkinBAt: null,
    recurrenceRule: null,
  },
  {
    // Completed with Biscuit Jr. — the private feedback prompt is pending.
    id: "meetup-biscuit-2",
    matchId: matchIdFor("my-pet-1", "pd-biscuit"),
    venueId: "v6",
    proposedByUserId: currentUser.id,
    scheduledStart: daysAgo(4),
    durationMinutes: 60,
    state: "Completed",
    checkinAAt: daysAgo(4),
    checkinBAt: daysAgo(4),
    recurrenceRule: null,
  },
];

export interface ProposeMeetupInput {
  matchId: string;
  venueId: string;
  scheduledStart: string;
  durationMinutes: number;
}

interface MeetupContextValue {
  meetups: Meetup[];
  feedback: MeetupFeedback[];
  venueSuggestions: Partial<Venue>[];
  getMeetup: (meetupId: string) => Meetup | undefined;
  meetupsForMatch: (matchId: string) => Meetup[];
  upcomingMeetups: () => Meetup[];
  proposeMeetup: (input: ProposeMeetupInput) => Meetup;
  respondToMeetup: (meetupId: string, response: "accept" | "decline" | "cancel") => void;
  counterPropose: (meetupId: string, input: Omit<ProposeMeetupInput, "matchId">) => Meetup;
  checkIn: (meetupId: string, party: "a" | "b", withinGeofence: boolean) => void;
  canCheckIn: (meetup: Meetup, now?: Date) => boolean;
  completeMeetup: (meetupId: string, partnerUserId: string) => void;
  reportNoShow: (meetupId: string, absentUserId: string) => void;
  submitFeedback: (params: {
    meetupId: string;
    subjectPetId: string;
    overall: FeedbackOverall;
    tags: FeedbackTag[];
    freeText?: string;
  }) => void;
  /** FB-501 — meetups completed but not yet rated by this user. */
  pendingFeedback: () => Meetup[];
  hasSubmittedFeedback: (meetupId: string) => boolean;
  /** FB-504 — both sides said "great": one tap re-books the same venue next week. */
  playdateAgain: (meetupId: string) => Meetup | null;
  suggestVenue: (suggestion: Partial<Venue>) => void;
}

const MeetupContext = stableContext<MeetupContextValue>("MeetupContext");

interface MeetupRow {
  id: string;
  match_id: string;
  venue_id: string;
  proposed_by_user_id: string;
  scheduled_start: string;
  duration_minutes: number;
  state: string;
  checkin_a_at: string | null;
  checkin_b_at: string | null;
  recurrence_rule: string | null;
}

function rowToMeetup(row: MeetupRow): Meetup {
  return {
    id: row.id,
    matchId: row.match_id,
    venueId: row.venue_id,
    proposedByUserId: row.proposed_by_user_id,
    scheduledStart: row.scheduled_start,
    durationMinutes: row.duration_minutes,
    state: row.state as MeetupState,
    checkinAAt: row.checkin_a_at,
    checkinBAt: row.checkin_b_at,
    recurrenceRule: row.recurrence_rule,
  };
}

export function MeetupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [localMeetups, setLocalMeetups] = usePersistentState<Meetup[]>(
    "derps.playdates.meetups",
    seededMeetups,
  );
  const [remoteMeetups, setRemoteMeetups] = useState<Meetup[]>([]);
  const [feedback, setFeedback] = usePersistentState<MeetupFeedback[]>(
    "derps.playdates.feedback",
    [],
  );
  const [venueSuggestions, setVenueSuggestions] = usePersistentState<Partial<Venue>[]>(
    "derps.playdates.venueSuggestions",
    [],
  );
  const { addTrustSignal } = useSafety();

  /* Real Derpdates live on the shared `meetups` table, so a proposal made by
     one human shows up on the other human's account. RLS keeps a row visible
     to the two people in the match and nobody else. */
  const refreshRemoteMeetups = useCallback(async () => {
    if (!userId) {
      setRemoteMeetups([]);
      return;
    }
    const { data } = await supabase
      .from("meetups")
      .select(
        "id, match_id, venue_id, proposed_by_user_id, scheduled_start, duration_minutes, state, checkin_a_at, checkin_b_at, recurrence_rule",
      )
      .order("scheduled_start", { ascending: false })
      .returns<MeetupRow[]>();
    setRemoteMeetups((data ?? []).map(rowToMeetup));
  }, [userId]);

  useEffect(() => {
    void refreshRemoteMeetups();
  }, [refreshRemoteMeetups]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`derpdate-meetups-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetups" }, () => {
        void refreshRemoteMeetups();
      })
      .subscribe();

    const resync = () => {
      if (document.visibilityState === "visible") void refreshRemoteMeetups();
    };
    document.addEventListener("visibilitychange", resync);
    // Realtime is the fast path, not the guarantee — the poll makes it certain.
    const poll = setInterval(resync, 8000);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", resync);
      void supabase.removeChannel(channel);
    };
  }, [userId, refreshRemoteMeetups]);

  const meetups = useMemo(() => {
    const seen = new Set(remoteMeetups.map((m) => m.id));
    return [...remoteMeetups, ...localMeetups.filter((m) => !seen.has(m.id))];
  }, [remoteMeetups, localMeetups]);

  const isRemote = useCallback(
    (meetupId: string) => remoteMeetups.some((m) => m.id === meetupId),
    [remoteMeetups],
  );

  /** Applies a change to whichever store owns the meetup, and syncs the row. */
  const patchMeetup = useCallback(
    (
      meetupId: string,
      patch: Partial<Meetup>,
      row: {
        state?: string;
        checkin_a_at?: string;
        checkin_b_at?: string;
        scheduled_start?: string;
      },
    ) => {
      if (isRemote(meetupId)) {
        setRemoteMeetups((prev) =>
          prev.map((m) => (m.id === meetupId ? { ...m, ...patch } : m)),
        );
        fireAndForget(supabase.from("meetups").update(row).eq("id", meetupId), "meetup update");
        return;
      }
      setLocalMeetups((prev) => prev.map((m) => (m.id === meetupId ? { ...m, ...patch } : m)));
    },
    [isRemote, setLocalMeetups],
  );

  const getMeetup = useCallback((id: string) => meetups.find((m) => m.id === id), [meetups]);


  const meetupsForMatch = useCallback(
    (matchId: string) =>
      meetups
        .filter((m) => m.matchId === matchId)
        .sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()),
    [meetups],
  );

  const upcomingMeetups = useCallback(
    () =>
      meetups
        .filter(
          (m) =>
            (m.state === "Accepted" || m.state === "Proposed") &&
            new Date(m.scheduledStart).getTime() > Date.now() - 2 * 60 * 60_000,
        )
        .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime()),
    [meetups],
  );

  const proposeMeetup = useCallback(
    (input: ProposeMeetupInput) => {
      // A Derpdate on a real match is a shared row, so both humans see it.
      const shared = isRemoteMatchId(input.matchId) && Boolean(userId);
      const meetup: Meetup = {
        id: shared ? crypto.randomUUID() : `meetup-${Date.now()}`,
        matchId: input.matchId,
        venueId: input.venueId,
        proposedByUserId: shared ? userId! : currentUser.id,
        scheduledStart: input.scheduledStart,
        durationMinutes: input.durationMinutes,
        state: "Proposed",
        checkinAAt: null,
        checkinBAt: null,
        recurrenceRule: null,
      };
      if (shared) {
        setRemoteMeetups((prev) => [meetup, ...prev]);
        fireAndForget(
          supabase.from("meetups").insert({
            id: meetup.id,
            match_id: meetup.matchId,
            venue_id: meetup.venueId,
            proposed_by_user_id: meetup.proposedByUserId,
            scheduled_start: meetup.scheduledStart,
            duration_minutes: meetup.durationMinutes,
            state: meetup.state,
          }),
          "meetup insert",
        );
      } else {
        setLocalMeetups((prev) => [meetup, ...prev]);
      }
      playdateEvents.publish({
        type: "meetup.proposed",
        meetupId: meetup.id,
        matchId: input.matchId,
        venueId: input.venueId,
        at: new Date().toISOString(),
      });
      return meetup;
    },
    [setLocalMeetups, userId],
  );

  const setState = useCallback(
    (meetupId: string, state: MeetupState) => {
      patchMeetup(meetupId, { state }, { state });
    },
    [patchMeetup],
  );

  const respondToMeetup = useCallback(
    (meetupId: string, response: "accept" | "decline" | "cancel") => {
      const stateByResponse: Record<typeof response, MeetupState> = {
        accept: "Accepted",
        decline: "Declined",
        cancel: "Cancelled",
      };
      setState(meetupId, stateByResponse[response]);
      const at = new Date().toISOString();
      if (response === "accept") playdateEvents.publish({ type: "meetup.accepted", meetupId, at });
      if (response === "decline") playdateEvents.publish({ type: "meetup.declined", meetupId, at });
      if (response === "cancel") playdateEvents.publish({ type: "meetup.cancelled", meetupId, at });
    },
    [setState],
  );

  const counterPropose = useCallback(
    (meetupId: string, input: Omit<ProposeMeetupInput, "matchId">) => {
      const original = meetups.find((m) => m.id === meetupId);
      setState(meetupId, "Declined");
      return proposeMeetup({
        matchId: original?.matchId ?? "",
        venueId: input.venueId,
        scheduledStart: input.scheduledStart,
        durationMinutes: input.durationMinutes,
      });
    },
    [meetups, proposeMeetup, setState],
  );

  /**
   * MP-409/410 — the geofence is evaluated on-device; only the boolean and the
   * venue id are recorded. The raw coordinate never leaves the device, so the
   * server never learns where the user physically is.
   */
  const checkIn = useCallback(
    (meetupId: string, party: "a" | "b", withinGeofence: boolean) => {
      if (!withinGeofence) return;
      const at = new Date().toISOString();
      patchMeetup(
        meetupId,
        party === "a" ? { checkinAAt: at } : { checkinBAt: at },
        party === "a" ? { checkin_a_at: at } : { checkin_b_at: at },
      );
      playdateEvents.publish({ type: "meetup.checkin", meetupId, party, withinGeofence, at });
    },
    [patchMeetup],
  );

  const canCheckIn = useCallback(
    (meetup: Meetup, now: Date = new Date()) =>
      meetup.state === "Accepted" && isWithinCheckinWindow(meetup.scheduledStart, now),
    [],
  );

  const completeMeetup = useCallback(
    (meetupId: string, partnerUserId: string) => {
      setState(meetupId, "Completed");
      addTrustSignal(trustSignalForCompletedMeetup(currentUser.id, meetupId));
      void partnerUserId;
    },
    [setState, addTrustSignal],
  );

  const reportNoShow = useCallback(
    (meetupId: string, absentUserId: string) => {
      setState(meetupId, "NoShow");
      addTrustSignal(trustSignalForNoShow(absentUserId, meetupId));
    },
    [setState, addTrustSignal],
  );

  const submitFeedback = useCallback(
    (params: {
      meetupId: string;
      subjectPetId: string;
      overall: FeedbackOverall;
      tags: FeedbackTag[];
      freeText?: string;
    }) => {
      const entry: MeetupFeedback = {
        id: `fb-${Date.now()}`,
        meetupId: params.meetupId,
        authorUserId: currentUser.id,
        subjectPetId: params.subjectPetId,
        overall: params.overall,
        tags: params.tags,
        // FB-503 — free text is routed to Trust & Safety only. It is stored on
        // the record and is never rendered on any user-facing surface.
        freeText: params.freeText ?? "",
        createdAt: new Date().toISOString(),
      };
      setFeedback((prev) => [entry, ...prev]);
      playdateEvents.publish({
        type: "feedback.submitted",
        meetupId: params.meetupId,
        overall: params.overall,
        subjectPetId: params.subjectPetId,
        at: entry.createdAt,
      });
    },
    [setFeedback],
  );

  const hasSubmittedFeedback = useCallback(
    (meetupId: string) =>
      feedback.some((f) => f.meetupId === meetupId && f.authorUserId === currentUser.id),
    [feedback],
  );

  const pendingFeedback = useCallback(
    () => meetups.filter((m) => m.state === "Completed" && !hasSubmittedFeedback(m.id)),
    [meetups, hasSubmittedFeedback],
  );

  const playdateAgain = useCallback(
    (meetupId: string) => {
      const original = meetups.find((m) => m.id === meetupId);
      if (!original) return null;
      const nextWeek = new Date(original.scheduledStart);
      nextWeek.setDate(nextWeek.getDate() + 7);
      // Pre-filled with the same venue and a next-week slot — one tap, not a form.
      return proposeMeetup({
        matchId: original.matchId,
        venueId: original.venueId,
        scheduledStart: nextWeek.toISOString(),
        durationMinutes: original.durationMinutes,
      });
    },
    [meetups, proposeMeetup],
  );

  const suggestVenue = useCallback(
    (suggestion: Partial<Venue>) => {
      // MP-406 — submissions enter a moderation queue and never appear live.
      setVenueSuggestions((prev) => [
        { ...suggestion, verificationState: "pending", source: "user_submitted" },
        ...prev,
      ]);
    },
    [setVenueSuggestions],
  );

  const value = useMemo(
    () => ({
      meetups,
      feedback,
      venueSuggestions,
      getMeetup,
      meetupsForMatch,
      upcomingMeetups,
      proposeMeetup,
      respondToMeetup,
      counterPropose,
      checkIn,
      canCheckIn,
      completeMeetup,
      reportNoShow,
      submitFeedback,
      pendingFeedback,
      hasSubmittedFeedback,
      playdateAgain,
      suggestVenue,
    }),
    [
      meetups,
      feedback,
      venueSuggestions,
      getMeetup,
      meetupsForMatch,
      upcomingMeetups,
      proposeMeetup,
      respondToMeetup,
      counterPropose,
      checkIn,
      canCheckIn,
      completeMeetup,
      reportNoShow,
      submitFeedback,
      pendingFeedback,
      hasSubmittedFeedback,
      playdateAgain,
      suggestVenue,
    ],
  );

  return <MeetupContext.Provider value={value}>{children}</MeetupContext.Provider>;
}

export function useMeetups() {
  const ctx = useContext(MeetupContext);
  if (!ctx) throw new Error("useMeetups must be used within MeetupProvider");
  return ctx;
}
