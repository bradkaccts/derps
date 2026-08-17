import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MapPin, MessageCircle, Sparkles, X } from "lucide-react";
import { useMyPets } from "@/context/MyPetsContext";
import { useMatches, useSwipes } from "@/context/playdates/PlaydatesProvider";
import { useRemoteDerps } from "@/context/playdates/RemotePoolContext";
import { findPlaydatePet, ownerName } from "@/data/mock-playdate-pets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DerpyEmpty } from "@/components/ui/derpy-states";
import { cn } from "@/lib/utils";
import type { PlaydatePet, Swipe } from "@/lib/playdates/types";

type Filter = "all" | "boop" | "like" | "pass" | "matched";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "boop", label: "Booped" },
  { key: "like", label: "Hearted" },
  { key: "pass", label: "Passed" },
  { key: "matched", label: "Matched" },
];

interface HistoryRow {
  swipe: Swipe;
  pet: PlaydatePet;
  matchId: string | null;
  matchLabel: string | null;
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Every call the active Derp has made, newest first. Passes are included on
 * purpose — "wait, who was that one I skipped?" is the whole reason this page
 * exists — and a match badge is stamped on the ones that landed.
 */
const PlaydateHistory = () => {
  const { activePet } = useMyPets();
  const { swipes } = useSwipes();
  const { matchesForPet, partnerPetId } = useMatches();
  const { findRemotePet } = useRemoteDerps();
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo<HistoryRow[]>(() => {
    if (!activePet) return [];

    const matchByPet = new Map<string, { id: string; label: string }>();
    matchesForPet(activePet.id).forEach((match) => {
      const partner = partnerPetId(match, activePet.id);
      if (match.state === "Expired" || match.state === "Closed") return;
      matchByPet.set(partner, {
        id: match.id,
        label: match.state === "Pals" ? "Pals" : "Matched",
      });
    });

    // One row per pet: the latest call wins, so an undo-and-redo doesn't double up.
    const latest = new Map<string, Swipe>();
    swipes
      .filter((s) => s.actorPetId === activePet.id)
      .forEach((s) => latest.set(s.targetPetId, s));

    return [...latest.values()]
      .map((swipe) => {
        const pet = findRemotePet(swipe.targetPetId) ?? findPlaydatePet(swipe.targetPetId);
        const match = matchByPet.get(swipe.targetPetId);
        return pet
          ? { swipe, pet, matchId: match?.id ?? null, matchLabel: match?.label ?? null }
          : null;
      })
      .filter((row): row is HistoryRow => row !== null)
      .sort((a, b) => b.swipe.createdAt.localeCompare(a.swipe.createdAt));
  }, [activePet, swipes, matchesForPet, partnerPetId, findRemotePet]);

  const counts = useMemo(
    () => ({
      all: rows.length,
      boop: rows.filter((r) => r.swipe.direction === "boop").length,
      like: rows.filter((r) => r.swipe.direction === "like").length,
      pass: rows.filter((r) => r.swipe.direction === "pass").length,
      matched: rows.filter((r) => r.matchLabel).length,
    }),
    [rows],
  );

  const visible = useMemo(
    () =>
      filter === "all"
        ? rows
        : filter === "matched"
          ? rows.filter((r) => r.matchLabel)
          : rows.filter((r) => r.swipe.direction === filter),
    [rows, filter],
  );

  if (!activePet) {
    return (
      <div className="mx-auto max-w-3xl p-4 md:p-6">
        <DerpyEmpty
          title="Add your pet first"
          message="Swipe history is kept per Derp, so we need to know who's been swiping."
          emoji="🐕"
        >
          <Button asChild className="btn-bouncy mt-4 font-bold">
            <Link to="/profile">Go to Profile</Link>
          </Button>
        </DerpyEmpty>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-foreground md:text-3xl">Swipe History</h1>
        <p className="text-sm text-muted-foreground">
          Every Derp {activePet.name} has seen and decided on 🐾
        </p>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40",
            )}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <DerpyEmpty
          title={rows.length === 0 ? "Nothing here yet" : "Nothing in this pile"}
          message={
            rows.length === 0
              ? `Once ${activePet.name} starts swiping, every call shows up here.`
              : "Try another filter to see the rest of the history."
          }
          emoji="🗂️"
        >
          {rows.length === 0 && (
            <Button asChild className="btn-bouncy mt-4 font-bold">
              <Link to="/playdates">Start swiping</Link>
            </Button>
          )}
        </DerpyEmpty>
      ) : (
        <div className="space-y-3">
          {visible.map(({ swipe, pet, matchId, matchLabel }) => {
            const passed = swipe.direction === "pass";
            const body = (
              <>
                <img
                  src={pet.photos[0]}
                  alt={pet.name}
                  className={cn(
                    "h-14 w-14 shrink-0 rounded-full border-2 border-border object-cover",
                    passed && "opacity-60 grayscale",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-bold text-foreground">{pet.name}</span>
                    {swipe.direction === "boop" && (
                      <Badge className="gap-1 text-[10px]">
                        <Sparkles className="h-3 w-3" /> Booped
                      </Badge>
                    )}
                    {swipe.direction === "like" && (
                      <Badge variant="secondary" className="gap-1 text-[10px]">
                        <Heart className="h-3 w-3" /> Hearted
                      </Badge>
                    )}
                    {passed && (
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <X className="h-3 w-3" /> Passed
                      </Badge>
                    )}
                    {matchLabel && (
                      <Badge variant="default" className="text-[10px]">
                        {matchLabel}
                      </Badge>
                    )}
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {pet.location} · with {ownerName(pet.ownerId)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {relativeTime(swipe.createdAt)}
                    {swipe.scoreAtImpression != null && ` · ${swipe.scoreAtImpression}% match`}
                  </p>
                </div>
                {matchId && <MessageCircle className="h-5 w-5 shrink-0 text-primary" />}
              </>
            );

            const className =
              "flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors";

            return matchId ? (
              <Link
                key={swipe.id}
                to={`/playdates/matches/${matchId}`}
                className={cn(className, "hover:border-primary/40")}
              >
                {body}
              </Link>
            ) : (
              <div key={swipe.id} className={className}>
                {body}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PlaydateHistory;
