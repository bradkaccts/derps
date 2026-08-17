import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MessageCircle, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DerpyEmpty } from "@/components/ui/derpy-states";
import { ActivePetBar } from "@/components/playdates/ActivePetBar";
import { MatchThread } from "@/components/playdates/MatchThread";
import { MeetupComposer } from "@/components/playdates/MeetupComposer";
import { FeedbackDialog } from "@/components/playdates/FeedbackDialog";
import { ReportDialog } from "@/components/playdates/ReportDialog";
import { useMyPets } from "@/context/MyPetsContext";
import { useAuth } from "@/context/AuthContext";
import { currentUser } from "@/data/mock-users";
import {
  useMatches,
  useMeetups,
  usePetPersonality,
  useSafety,
} from "@/context/playdates/PlaydatesProvider";
import { mockPlaydatePersonalities, ownerName } from "@/data/mock-playdate-pets";
import { usePetLookup } from "@/hooks/use-pet-lookup";
import { mockVenues } from "@/data/mock-venues";
import { isWithinGeofence } from "@/lib/playdates/geo";
import { type Match } from "@/lib/playdates/types";
import { toast } from "sonner";

/**
 * Phase 3 & 4 — Connect and Meet.
 *
 * The list is scoped to the active pet: Bruno's friends are not Nala's
 * friends, and conflating them is how somebody arranges one dog's playdate and
 * turns up with another.
 */
const PlaydateMatches = () => {
  const { matchId } = useParams<{ matchId?: string }>();
  const navigate = useNavigate();
  const { activePet } = useMyPets();
  const matchStore = useMatches();
  const meetupStore = useMeetups();
  const safety = useSafety();
  const { getPersonality } = usePetPersonality();
  const lookupPet = usePetLookup();
  const { user } = useAuth();

  const [composerOpen, setComposerOpen] = useState(false);
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const matches = useMemo(
    () => (activePet ? matchStore.matchesForPet(activePet.id) : []),
    [activePet, matchStore],
  );
  const selected = matchId ? matchStore.getMatch(matchId) : undefined;
  const partnerId =
    selected && activePet ? matchStore.partnerPetId(selected, activePet.id) : undefined;
  const partner = lookupPet(partnerId);

  const pairTraits = useMemo((): [
    ReturnType<typeof getPersonality>,
    ReturnType<typeof getPersonality>,
  ] | undefined => {
    if (!activePet || !partnerId) return undefined;
    const mine = getPersonality(activePet.id);
    const theirs = mockPlaydatePersonalities[partnerId];
    return mine && theirs ? [mine, theirs] : undefined;
  }, [activePet, partnerId, getPersonality]);

  const meetups = selected ? meetupStore.meetupsForMatch(selected.id) : [];

  /**
   * MP-410 — the geofence is evaluated here, on the device. Only the boolean
   * and the venue id ever leave: the raw coordinate is not transmitted, logged,
   * or stored, which is why this returns a `boolean` and not a position.
   */
  const evaluateGeofence = useCallback(async (venueId: string): Promise<boolean> => {
    const venue = mockVenues.find((v) => v.id === venueId);
    if (!venue) return false;
    if (typeof navigator === "undefined" || !navigator.geolocation) return true;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve(
            isWithinGeofence(
              { lat: position.coords.latitude, lng: position.coords.longitude },
              venue.geo,
            ),
          ),
        // Permission denied or unavailable: we cannot verify, so we accept the
        // check-in rather than block a real meetup on a browser prompt.
        () => resolve(true),
        { timeout: 5000 },
      );
    });
  }, []);

  const handleCheckIn = useCallback(
    async (meetupId: string) => {
      const meetup = meetupStore.getMeetup(meetupId);
      if (!meetup) return;
      const within = await evaluateGeofence(meetup.venueId);
      if (!within) {
        toast.error("You'll need to be at the venue to check in.");
        return;
      }
      // The proposer holds the "a" slot on the shared row; the invitee holds "b".
      const me = user?.id ?? currentUser.id;
      meetupStore.checkIn(meetupId, meetup.proposedByUserId === me ? "a" : "b", true);
      toast.success("Checked in! Have a good one 🐾");
    },
    [meetupStore, evaluateGeofence, user],
  );

  const handleBlock = useCallback(() => {
    if (!partner) return;
    safety.blockUser(partner.ownerId);
    // Block is user-level: every thread with that person closes, not just this one.
    const theirPets = matches
      .map((m) => (activePet ? matchStore.partnerPetId(m, activePet.id) : ""))
      .filter((id) => lookupPet(id)?.ownerId === partner.ownerId);
    matchStore.closeMatchesWithPets(theirPets);
    toast.success("Blocked. They won't be told, and you won't see each other again.");
    navigate("/playdates/matches");
  }, [partner, safety, matches, activePet, matchStore, navigate, lookupPet]);

  if (!activePet) {
    return (
      <div className="mx-auto max-w-5xl p-4 md:p-6">
        <DerpyEmpty
          title="Add a pet first"
          message="Matches belong to a pet, not an account — add yours and we'll get started."
          emoji="🐾"
        >
          <Button asChild className="btn-bouncy mt-4 font-bold">
            <Link to="/profile">Add my pet →</Link>
          </Button>
        </DerpyEmpty>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className={cn("mb-4", selected && "hidden md:block")}>
        <h1 className="text-2xl font-extrabold text-foreground md:text-3xl">Derpdate matches</h1>
        <p className="text-sm text-muted-foreground">
          Both of you said yes. No unsolicited messages exist on Derps.
        </p>
        <ActivePetBar className="mt-3" />
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        <aside className={cn("space-y-2", selected && "hidden md:block")}>
          {matches.length === 0 ? (
            <DerpyEmpty
              title="No matches yet"
              message="Swipe on a few pups — a match only happens when you both say yes."
              emoji="💚"
            >
              <Button asChild className="btn-bouncy mt-4 font-bold">
                <Link to="/playdates">Open the deck →</Link>
              </Button>
            </DerpyEmpty>
          ) : (
            matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                myPetId={activePet.id}
                myPetName={activePet.name}
                active={match.id === matchId}
              />
            ))
          )}
        </aside>

        <section
          className={cn(
            "min-h-[560px] overflow-hidden rounded-2xl border border-border bg-background",
            !selected && "hidden md:flex md:items-center md:justify-center",
          )}
        >
          {selected && partner ? (
            <MatchThread
              match={selected}
              myPet={activePet}
              partner={partner}
              messages={matchStore.getThread(selected.id)}
              meetups={meetups}
              onSend={(body, acknowledged) =>
                matchStore.sendMessage(selected.id, body, {
                  contactWarningAcknowledged: acknowledged,
                })
              }
              onProposeMeetup={() => {
                if (safety.meetupProposalsRestricted) {
                  toast.error("Meetup proposals are paused on your account pending review.");
                  return;
                }
                setComposerOpen(true);
              }}
              onShareVenue={() => navigate("/playdates/venues")}
              onShareVaccination={() => {
                matchStore.sendMessage(selected.id, "Shared a vaccination card", {
                  type: "card",
                  card: {
                    kind: "vaccination",
                    petId: activePet.id,
                    expiresAt: new Date(Date.now() + 200 * 86_400_000).toISOString(),
                  },
                });
                toast.success("Vaccination card shared 💉");
              }}
              onRespondMeetup={(id, response) => {
                meetupStore.respondToMeetup(id, response);
                if (response === "accept") {
                  toast.success("Accepted! Add it to your calendar from the card.");
                }
              }}
              onCounterMeetup={() => setComposerOpen(true)}
              onCheckIn={handleCheckIn}
              onCompleteMeetup={(id) => {
                const meetup = meetupStore.getMeetup(id);
                meetupStore.completeMeetup(id, partner.ownerId);
                matchStore.incrementMeetupCount(selected.id);
                if (meetup) setFeedbackFor(id);
              }}
              onPlaydateAgain={(id) => {
                const next = meetupStore.playdateAgain(id);
                if (next) toast.success("Same spot, next week — sent for confirmation 🎾");
              }}
              onReport={() => setReportOpen(true)}
              onBlock={handleBlock}
            />
          ) : (
            <p className="p-8 text-center text-muted-foreground">
              Pick a match to open the conversation.
            </p>
          )}
        </section>
      </div>

      {selected && partner && (
        <>
          <MeetupComposer
            open={composerOpen}
            onOpenChange={setComposerOpen}
            partnerName={partner.name}
            pairTraits={
              pairTraits ? [pairTraits[0]!.traits, pairTraits[1]!.traits] : undefined
            }
            onPropose={({ venueId, scheduledStart, durationMinutes }) => {
              const meetup = meetupStore.proposeMeetup({
                matchId: selected.id,
                venueId,
                scheduledStart,
                durationMinutes,
              });
              matchStore.sendMessage(selected.id, "Proposed a Derpdate", {
                type: "card",
                card: { kind: "meetup_proposal", meetupId: meetup.id },
              });
              toast.success("Proposal sent 📅");
            }}
          />

          <ReportDialog
            open={reportOpen}
            onOpenChange={setReportOpen}
            subjectName={ownerName(partner.ownerId)}
            onSubmit={({ category, details, alsoBlock }) => {
              safety.fileReport({
                subjectUserId: partner.ownerId,
                subjectPetId: partner.id,
                category,
                contextRef: selected.id,
              });
              void details;
              if (alsoBlock) handleBlock();
              toast.success("Report received. A person will review it.");
            }}
          />
        </>
      )}

      {/* FB-501 — the private prompt, after a confirmed meetup. */}
      <FeedbackDialog
        open={Boolean(feedbackFor)}
        onOpenChange={(open) => !open && setFeedbackFor(null)}
        partnerPetName={partner?.name ?? "them"}
        onSubmit={({ overall, tags, freeText }) => {
          if (!feedbackFor || !partner) return;
          meetupStore.submitFeedback({
            meetupId: feedbackFor,
            subjectPetId: partner.id,
            overall,
            tags,
            freeText,
          });
          setFeedbackFor(null);
          toast.success(
            overall === "great"
              ? "Noted — we'll look for more like that one 💚"
              : "Thanks. That stays between us and shapes what we show you next.",
          );
        }}
      />
    </div>
  );
};

function MatchRow({
  match,
  myPetId,
  myPetName,
  active,
}: {
  match: Match;
  myPetId: string;
  myPetName: string;
  active: boolean;
}) {
  const { partnerPetId, getThread } = useMatches();
  const lookupPet = usePetLookup();
  const partner = lookupPet(partnerPetId(match, myPetId));
  const thread = getThread(match.id);
  const last = thread[thread.length - 1];

  if (!partner) return null;

  return (
    <Link
      to={`/playdates/matches/${match.id}`}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-3 transition-colors",
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40",
      )}
    >
      <img src={partner.photos[0]} alt="" aria-hidden className="h-12 w-12 rounded-full object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 truncate font-bold text-foreground">
          {myPetName} &amp; {partner.name}
          {match.state === "Pals" && (
            <Badge variant="secondary" className="shrink-0 text-[10px] font-bold">
              🤝 Pals
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {last ? last.body : "Matched — say hello 👋"}
        </p>
      </div>
      {thread.length === 0 ? (
        <Sparkles className="h-4 w-4 shrink-0 text-accent" aria-label="New match" />
      ) : (
        <MessageCircle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      )}
    </Link>
  );
}

export default PlaydateMatches;
