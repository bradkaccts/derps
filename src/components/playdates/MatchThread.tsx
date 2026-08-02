import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CalendarPlus,
  Info,
  MapPin,
  Send,
  ShieldAlert,
  Syringe,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { FEATURES } from "@/config/features";
import { currentUser } from "@/data/mock-users";
import { mockVenues } from "@/data/mock-venues";
import { ownerName } from "@/data/mock-playdate-pets";
import { scanMessage, type TextFlag } from "@/lib/playdates/safety-text";
import {
  type Match,
  type Meetup,
  type PlaydateMessage,
  type PlaydatePet,
} from "@/lib/playdates/types";
import { MeetupCard } from "./MeetupCard";
import { type MyPet } from "@/context/MyPetsContext";

interface MatchThreadProps {
  match: Match;
  myPet: MyPet;
  partner: PlaydatePet;
  messages: PlaydateMessage[];
  meetups: Meetup[];
  onSend: (body: string, acknowledgedWarning: boolean) => void;
  onProposeMeetup: () => void;
  onShareVaccination: () => void;
  onShareVenue: () => void;
  onRespondMeetup: (meetupId: string, response: "accept" | "decline" | "cancel") => void;
  onCounterMeetup: (meetupId: string) => void;
  onCheckIn: (meetupId: string) => void;
  onCompleteMeetup: (meetupId: string) => void;
  onPlaydateAgain: (meetupId: string) => void;
  onReport: () => void;
  onBlock: () => void;
}

/**
 * The relayed thread (CH-302/303).
 *
 * Scoped to the *pet pair*, not the user pair — two of Priya's dogs matching
 * with the same pet produce two distinct threads, each labelled, so nobody
 * arranges Bruno's playdate and turns up with Nala.
 *
 * No read receipts and no typing indicators (CH-311). They generate obligation
 * and anxiety, and they are a common driver of harassment in match-based
 * products. Their absence is a feature.
 */
export function MatchThread(props: MatchThreadProps) {
  const {
    match,
    myPet,
    partner,
    messages,
    meetups,
    onSend,
    onProposeMeetup,
    onShareVaccination,
    onShareVenue,
    onRespondMeetup,
    onCounterMeetup,
    onCheckIn,
    onCompleteMeetup,
    onPlaydateAgain,
    onReport,
    onBlock,
  } = props;

  const [draft, setDraft] = useState("");
  const [flags, setFlags] = useState<TextFlag[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const activeMeetup = useMemo(
    () => meetups.find((m) => m.state === "Proposed" || m.state === "Accepted") ?? meetups[0],
    [meetups],
  );

  const attemptSend = () => {
    const text = draft.trim();
    if (!text) return;

    // CH-304 / REG-903 — non-blocking interstitials. The user may always
    // proceed; blocking outright just teaches people to move off-platform.
    const detected = scanMessage(text);
    if (detected.length > 0 && flags.length === 0) {
      setFlags(detected);
      return;
    }

    onSend(text, flags.length > 0);
    setDraft("");
    setFlags([]);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Button asChild variant="ghost" size="icon" className="md:hidden" aria-label="Back to matches">
          <Link to="/playdates/matches">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>

        <img
          src={partner.photos[0]}
          alt=""
          aria-hidden
          className="h-11 w-11 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-extrabold text-foreground">
            {myPet.name} &amp; {partner.name}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {/* CH-303 — first name only, ever. No phone, email, or last name. */}
            {partner.breed} · with {ownerName(partner.ownerId)}
          </p>
        </div>

        {match.state === "Pals" && (
          <Badge className="gap-1 font-bold">
            <span aria-hidden>🤝</span> Pals
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Safety options">
              <ShieldAlert className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onReport}>
              <ShieldAlert className="mr-2 h-4 w-4" aria-hidden />
              Report {ownerName(partner.ownerId)}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onBlock} className="text-destructive focus:text-destructive">
              <Ban className="mr-2 h-4 w-4" aria-hidden />
              Block — silent and immediate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        <p className="mx-auto max-w-md rounded-xl bg-secondary/50 px-3 py-2 text-center text-xs text-muted-foreground">
          This chat is relayed. Phone numbers, emails and last names are never shared here — you can
          walk away at any point with nothing to undo.
        </p>

        {activeMeetup && (
          <MeetupCard
            meetup={activeMeetup}
            myPetName={myPet.name}
            partnerPetName={partner.name}
            onRespond={(response) => onRespondMeetup(activeMeetup.id, response)}
            onCounter={() => onCounterMeetup(activeMeetup.id)}
            onCheckIn={() => onCheckIn(activeMeetup.id)}
            onComplete={() => onCompleteMeetup(activeMeetup.id)}
            onPlaydateAgain={() => onPlaydateAgain(activeMeetup.id)}
            className="mx-auto max-w-md"
          />
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} partnerName={partner.name} />
        ))}

        <div ref={endRef} />
      </div>

      {flags.length > 0 && (
        <div className="space-y-2 border-t border-accent/40 bg-accent/5 p-4">
          {flags.map((flag) => (
            <div key={flag.kind} className="flex gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              <div className="space-y-1">
                <p className="text-sm font-bold text-foreground">{flag.title}</p>
                <p className="text-xs text-muted-foreground">{flag.body}</p>
                {flag.kind === "transfer_intent" && FEATURES.adoption && (
                  <Link
                    to="/create-listing"
                    className="inline-block text-xs font-bold text-primary hover:underline"
                  >
                    Open the Adoption flow →
                  </Link>
                )}
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button size="sm" className="min-h-[44px] font-semibold" onClick={attemptSend}>
              Send anyway
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[44px] font-semibold"
              onClick={() => setFlags([])}
            >
              Let me edit it
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-border bg-card p-3">
        {/* CH-308 — structured message actions, inline. */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          <ActionChip icon={CalendarPlus} label="Propose Derpdate" onClick={onProposeMeetup} />
          <ActionChip icon={MapPin} label="Share a venue" onClick={onShareVenue} />
          <ActionChip icon={Syringe} label="Send vaccination card" onClick={onShareVaccination} />
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            attemptSend();
          }}
        >
          <label htmlFor="thread-input" className="sr-only">
            Message about {myPet.name} and {partner.name}
          </label>
          <Input
            id="thread-input"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (flags.length > 0) setFlags([]);
            }}
            placeholder={`Message about ${myPet.name} & ${partner.name}…`}
            className="min-h-[44px] flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Send message"
            disabled={!draft.trim()}
            className="btn-bouncy h-11 w-11 shrink-0"
          >
            <Send className="h-5 w-5" aria-hidden />
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message, partnerName }: { message: PlaydateMessage; partnerName: string }) {
  const mine = message.senderUserId === currentUser.id;

  if (message.card?.kind === "venue_share") {
    const sharedVenueId = message.card.venueId;
    const venue = mockVenues.find((v) => v.id === sharedVenueId);
    return (
      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className="max-w-[85%] rounded-2xl border border-border bg-card p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Venue shared
          </p>
          <p className="flex items-center gap-1.5 font-bold text-foreground">
            <MapPin className="h-4 w-4 text-primary" aria-hidden />
            {venue?.name ?? "A venue"}
          </p>
          <p className="text-xs text-muted-foreground">{venue?.leashRules}</p>
        </div>
      </div>
    );
  }

  if (message.card?.kind === "vaccination") {
    return (
      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <div className="max-w-[85%] rounded-2xl border border-primary/40 bg-primary/5 p-3">
          <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Syringe className="h-4 w-4 text-primary" aria-hidden />
            Vaccination attestation shared
          </p>
          <p className="text-xs text-muted-foreground">
            Current through {new Date(message.card.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    );
  }

  if (message.type === "image") {
    return (
      <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
        <BlurredImage message={message} mine={mine} partnerName={partnerName} />
      </div>
    );
  }

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5",
          mine ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
        )}
      >
        <p className="whitespace-pre-wrap text-sm">{message.body}</p>
        <time
          className={cn("mt-0.5 block text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}
          dateTime={message.sentAt}
        >
          {new Date(message.sentAt).toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
}

/** CH-305 — incoming images are blurred until the recipient chooses to view. */
function BlurredImage({
  message,
  mine,
  partnerName,
}: {
  message: PlaydateMessage;
  mine: boolean;
  partnerName: string;
}) {
  const [revealed, setRevealed] = useState(mine || Boolean(message.revealed));

  return (
    <div className="max-w-[70%] overflow-hidden rounded-2xl border border-border">
      <div className="relative">
        <img
          src={message.mediaRef}
          alt={mine ? "Photo you sent" : `Photo from ${partnerName}'s human`}
          className={cn("h-48 w-full object-cover transition", !revealed && "blur-xl")}
        />
        {!revealed && (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background/40 text-sm font-bold text-foreground"
          >
            <span aria-hidden>👀</span>
            Tap to view
          </button>
        )}
      </div>
    </div>
  );
}

function ActionChip({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof MapPin;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-bouncy flex min-h-[36px] items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:border-primary/50 hover:text-primary"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
