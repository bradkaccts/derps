import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, MessageCircle, Sparkles } from "lucide-react";
import { useMyPets } from "@/context/MyPetsContext";
import { useMatches } from "@/context/playdates/PlaydatesProvider";
import { findPlaydatePet, ownerName } from "@/data/mock-playdate-pets";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DerpyEmpty } from "@/components/ui/derpy-states";
import { cn } from "@/lib/utils";

/**
 * Release 1 — "My Derp Friends" lists the pets your pet has matched with
 * through Derpdates, scoped to the active pet.
 */
const MyDerps = () => {
  const { activePet } = useMyPets();
  const { matchesForPet, partnerPetId, getThread } = useMatches();

  const friends = useMemo(() => {
    if (!activePet) return [];
    return matchesForPet(activePet.id)
      .filter((m) => m.state === "Active" || m.state === "Pals")
      .map((match) => {
        const partner = findPlaydatePet(partnerPetId(match, activePet.id));
        const thread = getThread(match.id);
        return { match, partner, lastMessage: thread[thread.length - 1] };
      })
      .filter((row) => row.partner)
      .sort((a, b) => Number(b.match.state === "Pals") - Number(a.match.state === "Pals"));
  }, [activePet, matchesForPet, partnerPetId, getThread]);

  if (!activePet) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <DerpyEmpty
          title="Add your pet first"
          message="Derpdates matches pet to pet, so we need to know who's making friends."
          emoji="🐕"
        >
          <Button asChild className="btn-bouncy mt-4 font-bold">
            <Link to="/profile">Go to Profile</Link>
          </Button>
        </DerpyEmpty>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <DerpyEmpty
          title="No Derp friends yet"
          message={`Start swiping to find nearby buddies for ${activePet.name}.`}
          emoji="🐾"
        >
          <Button asChild className="btn-bouncy mt-4 font-bold">
            <Link to="/playdates">Find Derpdates</Link>
          </Button>
        </DerpyEmpty>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">My Derp Friends</h1>
        <p className="text-sm text-muted-foreground">
          {friends.length} friend{friends.length !== 1 ? "s" : ""} for {activePet.name} 💕
        </p>
      </div>

      <div className="space-y-3">
        {friends.map(({ match, partner, lastMessage }) => (
          <Link
            key={match.id}
            to={`/playdates/matches/${match.id}`}
            className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
          >
            <img
              src={partner!.photos[0]}
              alt={partner!.name}
              className="h-14 w-14 shrink-0 rounded-full border-2 border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-bold text-foreground">{partner!.name}</span>
                <Badge
                  variant={match.state === "Pals" ? "default" : "secondary"}
                  className={cn("text-[10px]")}
                >
                  {match.state === "Pals" ? "Pals" : "Matched"}
                </Badge>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {partner!.location} · with {ownerName(partner!.ownerId)}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {lastMessage ? lastMessage.body : "Say hi to start planning a Derpdate!"}
              </p>
            </div>
            {match.state === "Pals" ? (
              <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            ) : (
              <MessageCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MyDerps;
