import { useState, useMemo } from "react";
import { PawPrint, LayoutGrid, Layers } from "lucide-react";
import { mockPets, type Species, type VibeTag } from "@/data/mock-pets";
import { PetCard } from "@/components/pets/PetCard";
import { VibeFilter } from "@/components/pets/VibeFilter";
import { SpeciesFilter } from "@/components/pets/SpeciesFilter";
import { SwipeCardStack } from "@/components/pets/SwipeCardStack";
import { cn } from "@/lib/utils";

type ViewMode = "swipe" | "grid";

const Index = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("swipe");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [speciesFilter, setSpeciesFilter] = useState<Species | "all">("all");
  const [vibeFilters, setVibeFilters] = useState<VibeTag[]>([]);

  const toggleFavorite = (petId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  };

  const toggleVibe = (vibe: VibeTag) => {
    setVibeFilters((prev) =>
      prev.includes(vibe) ? prev.filter((v) => v !== vibe) : [...prev, vibe]
    );
  };

  const filteredPets = useMemo(() => {
    return mockPets.filter((pet) => {
      if (speciesFilter !== "all" && pet.species !== speciesFilter) return false;
      if (vibeFilters.length > 0 && !vibeFilters.some((v) => pet.vibes.includes(v)))
        return false;
      return true;
    });
  }, [speciesFilter, vibeFilters]);

  // For swipe mode, only show available pets not yet swiped
  const swipePets = useMemo(() => {
    return filteredPets.filter(
      (pet) => pet.status === "available" && !favorites.has(pet.id) && !skipped.has(pet.id)
    );
  }, [filteredPets, favorites, skipped]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <PawPrint className="h-7 w-7 text-primary md:hidden" />
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
              {viewMode === "swipe" ? "New Arrivals" : "Browse All"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {viewMode === "swipe"
                ? "Swipe right to heart, left to skip 💕"
                : `${filteredPets.length} adorable derps looking for a home`}
            </p>
          </div>
        </div>

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
        </div>
      </div>

      {/* Filters (Grid mode shows all, Swipe mode shows species only) */}
      <div className="mb-4">
        <SpeciesFilter selected={speciesFilter} onSelect={setSpeciesFilter} />
      </div>

      {viewMode === "grid" && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-muted-foreground mb-2">✨ Filter by Vibes</h3>
          <VibeFilter selected={vibeFilters} onToggle={toggleVibe} />
        </div>
      )}

      {/* Content */}
      {viewMode === "swipe" ? (
        <SwipeCardStack
          pets={swipePets}
          onSwipeRight={(id) => toggleFavorite(id)}
          onSwipeLeft={(id) => setSkipped((prev) => new Set(prev).add(id))}
        />
      ) : filteredPets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPets.map((pet) => (
            <PetCard
              key={pet.id}
              pet={pet}
              onFavorite={toggleFavorite}
              isFavorited={favorites.has(pet.id)}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <span className="text-6xl mb-4">🐾</span>
          <h2 className="text-xl font-bold text-foreground mb-2">No derps found!</h2>
          <p className="text-muted-foreground">
            Try adjusting your filters — every derp deserves a chance!
          </p>
        </div>
      )}
    </div>
  );
};

export default Index;
