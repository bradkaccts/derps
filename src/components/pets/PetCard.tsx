import { Heart, MapPin, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type Pet } from "@/data/mock-pets";
import { vibeConfig } from "@/lib/vibes";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

interface PetCardProps {
  pet: Pet;
  onFavorite?: (petId: string) => void;
  isFavorited?: boolean;
}

export function PetCard({ pet, onFavorite, isFavorited = false }: PetCardProps) {
  const [hovered, setHovered] = useState(false);
  const [heartPop, setHeartPop] = useState(false);

  const handleFavorite = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setHeartPop(true);
    onFavorite?.(pet.id);
    setTimeout(() => setHeartPop(false), 400);
  }, [onFavorite, pet.id]);

  return (
    <Card
      className={cn(
        "group overflow-hidden transition-all duration-300 hover:shadow-lg cursor-pointer",
        hovered && "animate-wiggle"
      )}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link to={`/pet/${pet.id}`}>
        <div className="relative aspect-square overflow-hidden">
          <img
            src={pet.photos[0]}
            alt={pet.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {pet.healthVerified && (
            <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-xs font-bold text-primary-foreground">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </div>
          )}
          {pet.adoptionListing?.status === "pending" && (
            <div className="absolute top-2 right-2 rounded-full bg-accent/90 px-2 py-0.5 text-xs font-bold text-accent-foreground">
              Pending
            </div>
          )}
        </div>
      </Link>
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <Link to={`/pet/${pet.id}`} className="flex-1">
            <h3 className="text-lg font-bold text-foreground">{pet.name}</h3>
            <p className="text-sm text-muted-foreground">{pet.breed} · {pet.age}</p>
            {pet.adoptionListing && (
              <p className="text-sm font-bold text-primary">${pet.adoptionListing.fee}</p>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 btn-bouncy"
            onClick={handleFavorite}
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-colors",
                isFavorited ? "fill-accent text-accent" : "text-muted-foreground",
                heartPop && "animate-heart-pop"
              )}
            />
          </Button>
        </div>
        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {pet.location} · {pet.distanceKm}km
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {pet.vibes.slice(0, 3).map((vibe) => {
            const config = vibeConfig[vibe];
            return (
              <Badge key={vibe} variant="secondary" className="text-xs gap-1 font-medium">
                <span>{config?.icon}</span>
                {config?.label ?? vibe}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
