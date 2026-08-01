import { Link } from "react-router-dom";
import { MapPin, ShieldCheck, HeartHandshake } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Pet } from "@/data/mock-pets";
import { type MatchResult } from "@/lib/matching";
import { vibeConfig } from "@/lib/vibes";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { usePlaydates } from "@/context/PlaydateContext";
import { useMyPets } from "@/context/MyPetsContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PlaydateCardProps {
  pet: Pet;
  match: MatchResult;
}

export function PlaydateCard({ pet, match }: PlaydateCardProps) {
  const { requestPlaydate, getRequestForPet } = usePlaydates();
  const { activePet } = useMyPets();
  const existingRequest = getRequestForPet(pet.id);

  const handleRequest = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!activePet) return;
    requestPlaydate({
      myPetId: activePet.id,
      targetPetId: pet.id,
    });
    toast.success(`Derpdate request sent to ${pet.name}! 🐾`);
  };

  return (
    <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg">
      <Link to={`/pet/${pet.id}`}>
        <div className="relative aspect-square overflow-hidden">
          <img
            src={pet.photos[0]}
            alt={pet.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {/* Match score overlay */}
          <div className="absolute top-2 right-2">
            <MatchScoreBadge score={match.score} label={match.label} emoji={match.emoji} size="sm" />
          </div>
          {pet.healthVerified && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-xs font-bold text-primary-foreground">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between">
          <Link to={`/pet/${pet.id}`} className="flex-1">
            <h3 className="text-lg font-bold text-foreground">{pet.name}</h3>
            <p className="text-sm text-muted-foreground">{pet.breed} · {pet.age}</p>
          </Link>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {pet.location} · {pet.distanceKm}km
        </div>

        {/* Shared vibes highlighted */}
        <div className="flex flex-wrap gap-1">
          {pet.vibes.slice(0, 4).map((vibe) => {
            const config = vibeConfig[vibe];
            const isShared = match.sharedVibes.includes(vibe);
            return (
              <span
                key={vibe}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium border border-dashed",
                  isShared
                    ? "bg-primary/10 text-primary border-primary/40"
                    : "bg-muted/60 text-muted-foreground border-border"
                )}
              >
                <span aria-hidden>{config?.icon}</span>
                {config?.label ?? vibe}
              </span>
            );
          })}
        </div>


        {/* Request button */}
        {existingRequest ? (
          <div className="text-xs font-bold text-primary text-center py-1.5">
            ✅ Request sent!
          </div>
        ) : (
          <Button
            onClick={handleRequest}
            className="w-full gap-2 font-bold btn-bouncy"
            size="sm"
          >
            <HeartHandshake className="h-4 w-4" />
            Request Derpdate
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
