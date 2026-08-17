import { CalendarCheck, CalendarX, Clock, Download, MapPin, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { mockVenues } from "@/data/mock-venues";
import { buildMeetupICS, downloadICS } from "@/lib/playdates/calendar";
import { isWithinCheckinWindow } from "@/lib/playdates/geo";
import { type Meetup } from "@/lib/playdates/types";
import { currentUser } from "@/data/mock-users";
import { toast } from "sonner";
import { VenueConfirmationPrompt } from "./VenueConfirmationPrompt";

const STATE_STYLES: Record<string, string> = {
  Proposed: "border-accent/50 bg-accent/5",
  Accepted: "border-primary/50 bg-primary/5",
  Declined: "border-border bg-muted/40",
  Cancelled: "border-border bg-muted/40",
  Completed: "border-primary/40 bg-primary/5",
  NoShow: "border-destructive/40 bg-destructive/5",
};

function formatWhen(iso: string, durationMinutes: number) {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const day = start.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  const time = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${day}, ${time}–${endTime}`;
}

/**
 * The Meetup Proposal card, rendered inline in the thread (MP-407).
 *
 * Accept / Decline / Counter-propose while it is Proposed; on acceptance it
 * offers an `.ics` (MP-408) and, inside the geofenced time window, two-sided
 * Check In (MP-409/410).
 */
export function MeetupCard({
  meetup,
  myPetName,
  partnerPetName,
  onRespond,
  onCounter,
  onCheckIn,
  onComplete,
  onPlaydateAgain,
  className,
}: {
  meetup: Meetup;
  myPetName: string;
  partnerPetName: string;
  onRespond: (response: "accept" | "decline" | "cancel") => void;
  onCounter: () => void;
  onCheckIn: () => void;
  onComplete: () => void;
  onPlaydateAgain: () => void;
  className?: string;
}) {
  const { user } = useAuth();
  const venue = mockVenues.find((v) => v.id === meetup.venueId);
  // Shared Derpdates carry a real account id; the demo population uses the mock user.
  const proposedByMe = meetup.proposedByUserId === (user?.id ?? currentUser.id);
  const myCheckin = proposedByMe ? meetup.checkinAAt : meetup.checkinBAt;
  const theirCheckin = proposedByMe ? meetup.checkinBAt : meetup.checkinAAt;
  const checkinOpen = meetup.state === "Accepted" && isWithinCheckinWindow(meetup.scheduledStart);

  const downloadInvite = () => {
    if (!venue) return;
    downloadICS(
      `derpdate-${myPetName}-${partnerPetName}`,
      buildMeetupICS({ meetup, venue, actorPetName: myPetName, partnerPetName }),
    );
    toast.success("Calendar invite downloaded 📅");
  };

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border-2 p-3.5",
        STATE_STYLES[meetup.state] ?? "border-border",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {meetup.state === "Proposed"
              ? proposedByMe
                ? "You proposed"
                : "Derpdate proposed"
              : `Derpdate ${meetup.state.toLowerCase()}`}
          </p>
          <h4 className="flex items-center gap-1.5 text-base font-extrabold text-foreground">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            {venue?.name ?? "Unknown venue"}
          </h4>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {formatWhen(meetup.scheduledStart, meetup.durationMinutes)}
          </p>
        </div>
        <Badge variant={meetup.state === "Accepted" ? "default" : "secondary"} className="shrink-0">
          {meetup.state}
        </Badge>
      </div>

      {venue && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Rules:</span> {venue.leashRules}
        </p>
      )}

      {/* Proposed — the other party accepts, declines, or counter-proposes. */}
      {meetup.state === "Proposed" && !proposedByMe && (
        <div className="flex flex-wrap gap-2">
          <Button
            className="btn-bouncy min-h-[44px] flex-1 gap-1.5 font-bold"
            onClick={() => onRespond("accept")}
          >
            <CalendarCheck className="h-4 w-4" aria-hidden />
            Accept
          </Button>
          <Button
            variant="outline"
            className="btn-bouncy min-h-[44px] gap-1.5 font-semibold"
            onClick={onCounter}
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Suggest another
          </Button>
          <Button
            variant="ghost"
            className="btn-bouncy min-h-[44px] gap-1.5 font-semibold text-muted-foreground"
            onClick={() => onRespond("decline")}
          >
            <CalendarX className="h-4 w-4" aria-hidden />
            Decline
          </Button>
        </div>
      )}

      {meetup.state === "Proposed" && proposedByMe && (
        <div className="flex items-center gap-2">
          <p className="flex-1 text-sm text-muted-foreground">
            Waiting on {partnerPetName}'s human to reply.
          </p>
          <Button
            variant="ghost"
            className="btn-bouncy min-h-[44px] font-semibold text-muted-foreground"
            onClick={() => onRespond("cancel")}
          >
            Cancel
          </Button>
        </div>
      )}

      {meetup.state === "Accepted" && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="btn-bouncy min-h-[44px] gap-1.5 font-semibold"
              onClick={downloadInvite}
            >
              <Download className="h-4 w-4" aria-hidden />
              Add to calendar
            </Button>
            <Button
              className="btn-bouncy min-h-[44px] flex-1 gap-1.5 font-bold"
              disabled={!checkinOpen || Boolean(myCheckin)}
              onClick={onCheckIn}
            >
              <Check className="h-4 w-4" aria-hidden />
              {myCheckin ? "You're checked in" : "Check in at the venue"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            {checkinOpen
              ? "Check-in opens 30 minutes before and closes an hour after the start. We only record that you're here — never where you are."
              : "Check-in unlocks 30 minutes before the start time."}
          </p>

          {myCheckin && theirCheckin && (
            <Button
              variant="outline"
              className="btn-bouncy min-h-[44px] w-full font-semibold"
              onClick={onComplete}
            >
              We're done — wrap this up
            </Button>
          )}
          {myCheckin && !theirCheckin && (
            <p className="rounded-lg bg-secondary/60 px-2 py-1.5 text-xs text-foreground">
              You're checked in. We'll ask how it went once {partnerPetName} arrives or the window
              closes.
            </p>
          )}

          {/*
            VC-201/VC-202 — presence-gated: a check-in only exists when the
            on-device geofence check passed, so this is the one surface where
            these questions can honestly be asked.
          */}
          {myCheckin && venue && (
            <VenueConfirmationPrompt venue={venue} meetupId={meetup.id} />
          )}
        </div>
      )}

      {/* FB-504 — one tap re-books the same venue for next week. */}
      {meetup.state === "Completed" && (
        <Button
          variant="outline"
          className="btn-bouncy min-h-[44px] w-full gap-1.5 font-bold"
          onClick={onPlaydateAgain}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Playdate again — same spot, next week
        </Button>
      )}
    </div>
  );
}
