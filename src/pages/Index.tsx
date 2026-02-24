import { useState, useMemo } from "react";
import { PawPrint } from "lucide-react";
import { mockPets, type Species, type VibeTag } from "@/data/mock-pets";
import { PetCard } from "@/components/pets/PetCard";
import { VibeFilter } from "@/components/pets/VibeFilter";
import { SpeciesFilter } from "@/components/pets/SpeciesFilter";

const Index = () => {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <PawPrint className="h-7 w-7 text-primary md:hidden" />
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
            Find Your Derp
          </h1>
          <p className="text-sm text-muted-foreground">
            {filteredPets.length} adorable derps looking for a home
          </p>
        </div>
      </div>

      {/* Species Filter */}
      <div className="mb-4">
        <SpeciesFilter selected={speciesFilter} onSelect={setSpeciesFilter} />
      </div>

      {/* Vibe Filters */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-muted-foreground mb-2">✨ Filter by Vibes</h3>
        <VibeFilter selected={vibeFilters} onToggle={toggleVibe} />
      </div>

      {/* Pet Grid */}
      {filteredPets.length > 0 ? (
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
