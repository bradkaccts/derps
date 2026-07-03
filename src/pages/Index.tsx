import { useState, useMemo, useEffect } from "react";
import { PawPrint, LayoutGrid, Layers, SlidersHorizontal, PlusCircle, HeartHandshake, Sparkles, MapPin, Clock, Ruler } from "lucide-react";

import { Link } from "react-router-dom";
import { mockPets, type Species, type VibeTag } from "@/data/mock-pets";
import { PetCard } from "@/components/pets/PetCard";
import { PlaydateCard } from "@/components/pets/PlaydateCard";
import { DerpyEmpty } from "@/components/ui/derpy-states";
import { VibeFilter } from "@/components/pets/VibeFilter";
import { SpeciesFilter } from "@/components/pets/SpeciesFilter";
import { SwipeCardStack } from "@/components/pets/SwipeCardStack";
import { useFavorites } from "@/context/FavoritesContext";
import { usePreferences } from "@/context/PreferencesContext";
import { useMyPets } from "@/context/MyPetsContext";
import { rankByCompatibility } from "@/lib/matching";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type ViewMode = "swipe" | "grid" | "playdates";
type SortMode = "match" | "nearest" | "newest";
type DistanceCap = 5 | 10 | 25 | 0; // 0 = any

const SORT_OPTIONS: { id: SortMode; label: string; icon: typeof Sparkles }[] = [
  { id: "match", label: "Best Match", icon: Sparkles },
  { id: "nearest", label: "Nearest", icon: MapPin },
  { id: "newest", label: "Newest", icon: Clock },
];

const DISTANCE_OPTIONS: { id: DistanceCap; label: string }[] = [
  { id: 5, label: "5km" },
  { id: 10, label: "10km" },
  { id: 25, label: "25km" },
  { id: 0, label: "Any" },
];


const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("swipe");
  const [speciesFilter, setSpeciesFilter] = useState<Species | "all">("all");
  const [vibeFilters, setVibeFilters] = useState<VibeTag[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>("match");
  const [distanceCap, setDistanceCap] = useState<DistanceCap>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { favorites, skipped, toggleFavorite, addSkipped, isFavorited } = useFavorites();
  const { applyPreferences, activeFilterCount } = usePreferences();
  const { myPets, activePet, setActivePetId } = useMyPets();

  const toggleVibe = (vibe: VibeTag) => {
    setVibeFilters((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const filteredPets = useMemo(() => {
    const preFiltered = applyPreferences(mockPets);
    return preFiltered.filter((pet) => {
      if (speciesFilter !== "all" && pet.species !== speciesFilter) return false;
      if (vibeFilters.length > 0 && !vibeFilters.some((v) => pet.vibes.includes(v)))
        return false;
      return true;
    });
  }, [speciesFilter, vibeFilters, applyPreferences]);

  const swipePets = useMemo(() => {
    return filteredPets.filter(
      (pet) => pet.status === "available" && !favorites.has(pet.id) && !skipped.has(pet.id)
    );
  }, [filteredPets, favorites, skipped]);

  const rankedPets = useMemo(() => {
    if (!activePet) return [];
    const candidates = filteredPets.filter(
      (p) => p.status === "available" && (distanceCap === 0 || p.distanceKm <= distanceCap)
    );
    const ranked = rankByCompatibility(activePet, candidates);
    if (sortMode === "nearest") {
      return [...ranked].sort((a, b) => a.distanceKm - b.distanceKm);
    }
    if (sortMode === "newest") {
      return [...ranked].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return ranked;
  }, [activePet, filteredPets, sortMode, distanceCap]);

  useEffect(() => {
    setIsRefreshing(true);
    const timer = setTimeout(() => setIsRefreshing(false), 450);
    return () => clearTimeout(timer);
  }, [sortMode, distanceCap]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PawPrint className="h-7 w-7 text-primary md:hidden" />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
              {viewMode === "swipe" ? "New Arrivals" : viewMode === "playdates" ? "Derpdates" : "Browse All"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === "swipe"
                ? "Swipe right to heart, left to skip 💕"
                : viewMode === "playdates"
                ? activePet
                  ? `Finding nearby Derpdate buddies for ${activePet.name} 🐾`
                  : "Register your pet to find matches!"
                : `${filteredPets.length} adorable derps looking for a home`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Link
              to="/profile"
              className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <Badge variant="default" className="h-5 px-1.5 text-xs">
                {activeFilterCount}
              </Badge>
            </Link>
          )}

          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setViewMode("swipe")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                viewMode === "swipe"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="h-4 w-4" />
              <span className="hidden sm:inline">Swipe</span>
            </button>
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
              onClick={() => setViewMode("playdates")}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors",
                viewMode === "playdates"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HeartHandshake className="h-4 w-4" />
              <span className="hidden sm:inline">Derpdates</span>
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <SpeciesFilter selected={speciesFilter} onSelect={setSpeciesFilter} />
      </div>

      {viewMode === "grid" && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-muted-foreground mb-2">✨ Filter by Vibes</h3>
          <VibeFilter selected={vibeFilters} onToggle={toggleVibe} />
        </div>
      )}

      {viewMode === "swipe" ? (
        <SwipeCardStack
          pets={swipePets}
          onSwipeRight={(id) => toggleFavorite(id)}
          onSwipeLeft={(id) => addSkipped(id)}
        />
      ) : viewMode === "playdates" ? (
        !activePet ? (
          <DerpyEmpty
            title="No pet registered!"
            message="Add your pet in your Profile to start finding derpdate matches."
          >
            <Link to="/profile" className="text-sm font-semibold text-primary hover:underline mt-2">
              Go to Profile →
            </Link>
          </DerpyEmpty>
        ) : (
          <>
            {myPets.length > 1 && (
              <div className="mb-4">
                <h3 className="text-sm font-bold text-muted-foreground mb-2">
                  🐾 Finding matches for
                </h3>
                <div className="flex flex-wrap gap-2">
                  {myPets.map((pet) => {
                    const isActive = pet.id === activePet.id;
                    return (
                      <button
                        key={pet.id}
                        onClick={() => setActivePetId(pet.id)}
                        aria-pressed={isActive}
                        className={cn(
                          "flex items-center gap-2 rounded-full border-2 pl-1 pr-3 py-1 transition-all btn-bouncy",
                          isActive
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:border-primary/40"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2",
                            isActive ? "ring-primary" : "ring-transparent"
                          )}
                        >
                          {pet.photos?.[0] ? (
                            <img
                              src={pet.photos[0]}
                              alt={pet.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-lg">🐾</span>
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-sm font-bold",
                            isActive ? "text-primary" : "text-foreground"
                          )}
                        >
                          {pet.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sort + distance controls */}
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-border bg-card/50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Sort by
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map(({ id, label, icon: Icon }) => {
                    const isActive = sortMode === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setSortMode(id)}
                        aria-pressed={isActive}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-all btn-bouncy",
                          isActive
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <Ruler className="h-3 w-3" /> Within
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DISTANCE_OPTIONS.map(({ id, label }) => {
                    const isActive = distanceCap === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setDistanceCap(id)}
                        aria-pressed={isActive}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-bold transition-all btn-bouncy",
                          isActive
                            ? "border-accent bg-accent text-accent-foreground shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {rankedPets.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
                {rankedPets.map((pet) => (
                  <PlaydateCard key={pet.id} pet={pet} match={pet.match} />
                ))}
              </div>
            ) : (
              <DerpyEmpty
                title="No matches found!"
                message="Try widening the distance or clearing filters to find more derpdate buddies."
              />
            )}
          </>
        )

      ) : filteredPets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
          {filteredPets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onFavorite={toggleFavorite}
              isFavorited={isFavorited(pet.id)}
            />
          ))}
          <Link
            to="/create-listing"
            className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 p-8 text-center transition-all hover:border-primary/60 hover:bg-primary/10 btn-bouncy"
          >
            <PlusCircle className="h-10 w-10 text-primary" />
            <span className="text-lg font-bold text-foreground">Rehome a Pet</span>
            <span className="text-sm text-muted-foreground">List your pet and find them a loving home</span>
          </Link>
        </div>
      ) : (
        <DerpyEmpty
          title="No derps found!"
          message="Try adjusting your filters — every derp deserves a chance!"
        >
          {activeFilterCount > 0 && (
            <Link
              to="/profile"
              className="text-sm font-semibold text-primary hover:underline mt-2"
            >
              Update your preferences →
            </Link>
          )}
        </DerpyEmpty>
      )}
    </div>
  );
};

export default Index;
