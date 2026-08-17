import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HeartHandshake, Layers, LayoutGrid, Sparkles, Syringe, MapPin, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DerpyEmpty } from "@/components/ui/derpy-states";
import { ActivePetBar } from "@/components/playdates/ActivePetBar";
import { HardFilterSheet } from "@/components/playdates/HardFilterSheet";
import { PlaydateDeck } from "@/components/playdates/PlaydateDeck";
import { PlaydateBrowseGrid } from "@/components/playdates/PlaydateBrowseGrid";
import { GotchaMoment } from "@/components/playdates/GotchaMoment";
import { PetDetailDialog } from "@/components/playdates/PetDetailDialog";
import { usePlaydateFeed, usePlaydatePartner } from "@/hooks/use-playdate-feed";
import { usePetPersonality, useMatches } from "@/context/playdates/PlaydatesProvider";

import { cn } from "@/lib/utils";
import { type FeedCard, type SwipeDirection } from "@/lib/playdates/types";
import { toast } from "sonner";

type ViewMode = "swipe" | "browse";

const PlaydatesFeed = () => {
  const navigate = useNavigate();
  const { attestVaccination } = usePetPersonality();
  const { newRemoteMatch, clearNewRemoteMatch, partnerPetId } = useMatches();

  const {
    activePet,
    gate,
    deck,
    swipe,
    undo,
    lastSwipe,
    boopsRemaining,
    likesRemaining,
    pendingFeedbackCount,
  } = usePlaydateFeed();

  const [view, setView] = useState<ViewMode>("swipe");
  const [detailCard, setDetailCard] = useState<FeedCard | null>(null);
  const [matchCelebration, setMatchCelebration] = useState<{
    partnerName: string;
    partnerPhoto?: string;
    matchId: string | null;
  } | null>(null);

  const handleSwipe = useCallback(
    (card: FeedCard, direction: SwipeDirection) => {
      const outcome = swipe(card, direction);

      if (outcome.limitReached) {
        toast.info(
          direction === "boop"
            ? "That's your Boop for today — they're rare on purpose ✨"
            : "You've hit today's like limit. Back tomorrow with fresh paws 🐾",
        );
        return;
      }

      if (outcome.matched) {
        setMatchCelebration({
          partnerName: card.name,
          partnerPhoto: card.photos[0],
          matchId: outcome.matchId,
        });
        return;
      }

      // A real Derp's human has to answer before it's a match.
      if (outcome.sentToRealDerp) {
        toast.success(
          direction === "boop"
            ? `Boop sent to ${card.name} ✨ We'll ping you if they boop back.`
            : `Heart sent to ${card.name} 💛 We'll ping you if it's mutual.`,
        );
        return;
      }

      if (direction === "boop") toast.success(`Boop sent to ${card.name} ✨`);
    },
    [swipe],
  );

  /* A match made by the other person's swipe arrives over realtime, so the
     celebration is triggered by the match landing, not by our own swipe. */
  const incomingPartnerId =
    newRemoteMatch && activePet ? partnerPetId(newRemoteMatch, activePet.id) : undefined;
  const incomingPartner = usePlaydatePartner(incomingPartnerId);

  useEffect(() => {
    if (!newRemoteMatch) return;
    setMatchCelebration({
      partnerName: incomingPartner?.name ?? "your new pal",
      partnerPhoto: incomingPartner?.photos[0],
      matchId: newRemoteMatch.id,
    });
    clearNewRemoteMatch();
  }, [newRemoteMatch, incomingPartner, clearNewRemoteMatch]);


  /* ---------------- Onboarding gates (Stage A, §4.1) ---------------- */

  if (gate === "no_pet") {
    return (
      <PageShell>
        <DerpyEmpty
          title="Add your pet to start"
          message="Derpdates matches pet to pet, so we need to know who's swiping before anything else happens."
          emoji="🐕"
        >
          <Button asChild className="btn-bouncy mt-4 font-bold">
            <Link to="/profile">Add my pet →</Link>
          </Button>
        </DerpyEmpty>
      </PageShell>
    );
  }

  if (gate === "needs_attestation" && activePet) {
    return (
      <PageShell>
        <ActivePetBar className="mb-6" />
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border-2 border-primary/25 bg-card p-6 text-center">
          <Syringe className="mx-auto h-10 w-10 text-primary" aria-hidden />
          <h2 className="text-xl font-extrabold text-foreground">
            One thing before {activePet.name} meets anyone
          </h2>
          <p className="text-sm text-muted-foreground">
            Confirm {activePet.name}'s vaccinations are current. Everyone in Derpdates does this —
            it's the reason it's safe to say yes to a stranger's dog.
          </p>
          <Button
            className="btn-bouncy w-full font-bold"
            onClick={() => {
              attestVaccination(activePet.id);
              toast.success("Thanks — that's on file for a year 💚");
            }}
          >
            {activePet.name}'s vaccinations are up to date
          </Button>
          <p className="text-xs text-muted-foreground">
            We take your word for it today. You can upload records later for a verified badge.
          </p>
        </div>
      </PageShell>
    );
  }

  if (gate === "needs_quiz" && activePet) {
    return (
      <PageShell>
        <ActivePetBar className="mb-6" />
        <div className="mx-auto max-w-md space-y-4 rounded-2xl border-2 border-primary/25 bg-card p-6 text-center">
          <span className="animate-float block text-5xl" aria-hidden>
            🧠
          </span>
          <h2 className="text-xl font-extrabold text-foreground">
            What's {activePet.name} actually like?
          </h2>
          <p className="text-sm text-muted-foreground">
            Fifteen quick questions about what {activePet.name} <em>does</em> — not what breed they
            are. About ninety seconds, and it's the whole reason the matches are any good.
          </p>
          <Button
            className="btn-bouncy w-full font-bold"
            onClick={() => navigate(`/playdates/quiz/${activePet.id}`)}
          >
            Take the quiz →
          </Button>
          <p className="text-xs text-muted-foreground">
            Nobody enters the deck unquizzed — in either direction. An unmeasured dog can't be
            matched safely.
          </p>
        </div>
      </PageShell>
    );
  }

  /* ---------------- The deck ---------------- */

  const cards = deck?.cards ?? [];

  return (
    <PageShell>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-foreground md:text-3xl">
            <HeartHandshake className="h-7 w-7 text-primary md:hidden" aria-hidden />
            Derpdates
          </h1>
          <p className="text-sm text-muted-foreground">
            Pups near you, ranked by how well they'd actually get on.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activePet && <HardFilterSheet petId={activePet.id} petName={activePet.name} />}
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <ViewButton active={view === "swipe"} onClick={() => setView("swipe")} icon={Layers} label="Swipe" />
            <ViewButton active={view === "browse"} onClick={() => setView("browse")} icon={LayoutGrid} label="Browse" />
          </div>
        </div>
      </div>

      <ActivePetBar className="mb-4" />

      {pendingFeedbackCount > 0 && (
        <Link
          to="/playdates/matches"
          className="mb-4 flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/5 px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-accent/10"
        >
          <Sparkles className="h-4 w-4 text-accent" aria-hidden />
          How did your last Derpdate go? {pendingFeedbackCount} quick question
          {pendingFeedbackCount === 1 ? "" : "s"} →
        </Link>
      )}

      {/* §6.2 — widening is labelled, never silent. */}
      {deck?.widened && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-sm text-foreground">
          <Radar className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          Not many pups within {deck.requestedRadiusMiles} mi — showing {deck.radiusMiles} mi
          instead. Your limits haven't changed.
        </p>
      )}

      {likesRemaining <= 10 && likesRemaining > 0 && (
        <p className="mb-4 rounded-xl bg-secondary/60 px-3 py-2 text-sm text-muted-foreground">
          {likesRemaining} likes left today — we cap them to keep the feed real.
        </p>
      )}

      {cards.length === 0 ? (
        <EmptyDeck />
      ) : view === "swipe" ? (
        <PlaydateDeck
          cards={cards}
          onSwipe={handleSwipe}
          onUndo={undo}
          canUndo={Boolean(lastSwipe)}
          boopsRemaining={boopsRemaining}
          onOpenProfile={setDetailCard}
        />
      ) : (
        <PlaydateBrowseGrid
          cards={cards}
          onSwipe={handleSwipe}
          onOpenProfile={setDetailCard}
          boopsRemaining={boopsRemaining}
        />
      )}

      <PetDetailDialog
        card={detailCard}
        open={Boolean(detailCard)}
        onOpenChange={(open) => !open && setDetailCard(null)}
        onSwipe={(card, direction) => {
          setDetailCard(null);
          handleSwipe(card, direction);
        }}
      />

      {activePet && (
        <GotchaMoment
          open={Boolean(matchCelebration)}
          myPetName={activePet.name}
          myPetPhoto={activePet.photos[0]}
          partnerName={matchCelebration?.partnerName ?? ""}
          partnerPhoto={matchCelebration?.partnerPhoto}
          matchId={matchCelebration?.matchId ?? null}
          onClose={() => setMatchCelebration(null)}
        />
      )}
    </PageShell>
  );
};

function PageShell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-6xl p-4 md:p-6">{children}</div>;
}

/** UI-711 — an empty state always offers a concrete next action, never a dead end. */
function EmptyDeck() {
  return (
    <DerpyEmpty
      title="Nobody new right now"
      message="Everyone nearby who clears your limits has been seen. Here's what actually helps:"
      emoji="🔭"
    >
      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Widen how far you'll travel, loosen a size or age limit, or check back tomorrow — new pups
          join daily.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline" className="btn-bouncy font-semibold">
            <Link to="/playdates/venues">
              <MapPin className="mr-1.5 h-4 w-4" aria-hidden />
              Browse dog parks
            </Link>
          </Button>
          <Button asChild className="btn-bouncy font-semibold">
            <Link to="/playdates/matches">See my matches</Link>
          </Button>
        </div>
      </div>
    </DerpyEmpty>
  );
}

function ViewButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Layers;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-[40px] items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default PlaydatesFeed;
