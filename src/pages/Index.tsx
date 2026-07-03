import { useState, useMemo } from "react";
import { PawPrint, LayoutGrid, Layers, SlidersHorizontal, PlusCircle, HeartHandshake } from "lucide-react";
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
import { cn } from "@/lib/utils";

type ViewMode = "swipe" | "grid" | "playdates";

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("swipe");
  const [speciesFilter, setSpeciesFilter] = useState<Species | "all">("all");
  const [vibeFilters, setVibeFilters] = useState<VibeTag[]>([]);
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
    return rankByCompatibility(activePet, filteredPets.filter((p) => p.status === "available"));
  }, [activePet, filteredPets]);

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
        ) : rankedPets.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-stagger">
            {rankedPets.map((pet) => (
              <PlaydateCard key={pet.id} pet={pet} match={pet.match} />
            ))}
          </div>
        ) : (
          <DerpyEmpty
            title="No matches found!"
            message="Try adjusting your filters to find derpdate buddies for your pet."
          />
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
