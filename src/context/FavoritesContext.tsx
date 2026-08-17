import { stableContext } from "@/context/stable-context";
import { useContext, useState, useCallback, type ReactNode } from "react";
import { mockPets, type Pet } from "@/data/mock-pets";

interface FavoritesContextValue {
  favorites: Set<string>;
  skipped: Set<string>;
  toggleFavorite: (petId: string) => void;
  addSkipped: (petId: string) => void;
  removeFavorite: (petId: string) => void;
  isFavorited: (petId: string) => boolean;
  favoritePets: Pet[];
}

const FavoritesContext = stableContext<FavoritesContextValue>("FavoritesContext");

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  const toggleFavorite = useCallback((petId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(petId)) next.delete(petId);
      else next.add(petId);
      return next;
    });
  }, []);

  const removeFavorite = useCallback((petId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.delete(petId);
      return next;
    });
  }, []);

  const addSkipped = useCallback((petId: string) => {
    setSkipped((prev) => new Set(prev).add(petId));
  }, []);

  const isFavorited = useCallback(
    (petId: string) => favorites.has(petId),
    [favorites]
  );

  const favoritePets = mockPets.filter((p) => favorites.has(p.id));

  return (
    <FavoritesContext.Provider
      value={{ favorites, skipped, toggleFavorite, addSkipped, removeFavorite, isFavorited, favoritePets }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
