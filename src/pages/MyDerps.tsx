import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, X, MapPin, ShieldCheck, Columns2, LayoutGrid, HeartHandshake } from "lucide-react";
import { useFavorites } from "@/context/FavoritesContext";
import { usePlaydates } from "@/context/PlaydateContext";
import { vibeConfig } from "@/lib/vibes";
import { mockPets, type Pet } from "@/data/mock-pets";
import { PetCard } from "@/components/pets/PetCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type ViewMode = "grid" | "compare";

const MyDerps = () => {
  const { favoritePets, toggleFavorite, removeFavorite, isFavorited } = useFavorites();
  const { requests } = usePlaydates();
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = (petId: string) => {
    setCompareIds((prev) =>
      prev.includes(petId)
        ? prev.filter((id) => id !== petId)
        : prev.length < 3
        ? [...prev, petId]
        : prev
    );
  };

  const comparePets = favoritePets.filter((p) => compareIds.includes(p.id));

  if (favoritePets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
        <span className="text-6xl mb-4">💕</span>
        <h2 className="text-xl font-bold text-foreground mb-2">Your shortlist is empty</h2>
        <p className="text-muted-foreground mb-4">
          Heart some derps from the discovery feed to add them here!
        </p>
        <Button asChild>
          <Link to="/">🐾 Find Derps</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">My Derps</h1>
          <p className="text-sm text-muted-foreground">
            {favoritePets.length} derp{favoritePets.length !== 1 ? "s" : ""} in your shortlist 💕
          </p>
        </div>

        {/* View Toggle */}
        {favoritePets.length >= 2 && (
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                viewMode === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => {
                setViewMode("compare");
                if (compareIds.length === 0) {
                  setCompareIds(favoritePets.slice(0, 2).map((p) => p.id));
                }
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                viewMode === "compare"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Columns2 className="h-4 w-4" />
              <span className="hidden sm:inline">Compare</span>
            </button>
          </div>
        )}
      </div>

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {favoritePets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onFavorite={toggleFavorite}
              isFavorited={true}
            />
          ))}
        </div>
      ) : (
        /* Compare Mode */
        <div>
          {/* Pet selector chips */}
          <div className="mb-4">
            <p className="text-sm font-bold text-muted-foreground mb-2">
              Select up to 3 derps to compare
            </p>
            <div className="flex flex-wrap gap-2">
              {favoritePets.map((pet) => (
                <button
                  key={pet.id}
                  onClick={() => toggleCompare(pet.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold transition-all border",
                    compareIds.includes(pet.id)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-foreground border-border hover:border-primary/50"
                  )}
                >
                  <img
                    src={pet.photos[0]}
                    alt={pet.name}
                    className="h-6 w-6 rounded-full object-cover"
                  />
                  {pet.name}
                  {compareIds.includes(pet.id) && <X className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          {/* Comparison Table */}
          {comparePets.length >= 2 ? (
            <div className="overflow-x-auto">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparePets.length}, minmax(200px, 1fr))` }}>
                {comparePets.map((pet) => (
                  <CompareColumn key={pet.id} pet={pet} onRemove={removeFavorite} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-4xl mb-3">🤔</span>
              <p className="text-muted-foreground">Select at least 2 derps to compare!</p>
            </div>
          )}
        </div>
      )}

      {/* Upcoming Derpdates */}
      {requests.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <HeartHandshake className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-extrabold text-foreground">Derpdate Requests</h2>
            <Badge variant="secondary" className="text-xs">{requests.length}</Badge>
          </div>
          <div className="space-y-2">
            {requests.map((req) => {
              const pet = mockPets.find((p) => p.id === req.targetPetId);
              if (!pet) return null;
              return (
                <Link
                  key={req.id}
                  to={`/pet/${pet.id}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/30 transition-all"
                >
                  <img src={pet.photos[0]} alt={pet.name} className="h-12 w-12 rounded-full object-cover" />
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-foreground">{pet.name}</span>
                    <p className="text-xs text-muted-foreground">{pet.breed}</p>
                  </div>
                  <Badge
                    variant={req.status === "accepted" ? "default" : "secondary"}
                    className="capitalize text-xs"
                  >
                    {req.status}
                  </Badge>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function CompareColumn({ pet, onRemove }: { pet: Pet; onRemove: (id: string) => void }) {
  const compatibilityScore = Math.floor(Math.random() * 30) + 70;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Photo */}
      <Link to={`/pet/${pet.id}`}>
        <div className="aspect-square overflow-hidden">
          <img src={pet.photos[0]} alt={pet.name} className="h-full w-full object-cover hover:scale-105 transition-transform" />
        </div>
      </Link>

      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <h3 className="text-lg font-extrabold text-foreground">{pet.name}</h3>
          <p className="text-sm text-muted-foreground">{pet.breed}</p>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-sm">
          <Row label="Species" value={pet.species} />
          <Row label="Age" value={pet.age} />
          <Row label="Gender" value={pet.gender === "male" ? "♂ Male" : "♀ Female"} />
          <Row label="Distance" value={`${pet.distanceKm}km`} />
          <Row label="Health" value={pet.healthVerified ? "✅ Verified" : "⏳ Pending"} />
        </div>

        {/* Compatibility */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-semibold text-foreground">Match</span>
            <span className="font-bold text-primary">{compatibilityScore}%</span>
          </div>
          <Progress value={compatibilityScore} className="h-2" />
        </div>

        {/* Vibes */}
        <div className="flex flex-wrap gap-1">
          {pet.vibes.map((vibe) => {
            const config = vibeConfig[vibe];
            return (
              <Badge key={vibe} variant="secondary" className="text-xs gap-1 font-medium">
                <span>{config.icon}</span>
                {config.label}
              </Badge>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button asChild className="flex-1 text-xs" size="sm">
            <Link to={`/pet/${pet.id}`}>View Profile</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(pet.id)}
          >
            <Heart className="h-4 w-4 fill-current" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground capitalize">{value}</span>
    </div>
  );
}

export default MyDerps;
