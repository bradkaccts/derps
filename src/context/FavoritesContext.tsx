import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { getDataProvider, type Pet } from "@/lib/data";

interface FavoritesContextValue {
  favorites: Set<string>;
  /** Session-only swipe skips (intentionally not persisted). */
  skipped: Set<string>;
  toggleFavorite: (petId: string) => void;
  addSkipped: (petId: string) => void;
  removeFavorite: (petId: string) => void;
  isFavorited: (petId: string) => boolean;
  favoritePets: Pet[];
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const provider = getDataProvider();
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const user = await provider.getCurrentUser();
      const [favs, pets] = await Promise.all([provider.getFavorites(user.id), provider.getPets()]);
      if (cancelled) return;
      setUserId(user.id);
      setFavorites(new Set(favs));
      setAllPets(pets);
    };
    load();
    const unsubscribe = provider.subscribe(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [provider]);

  const toggleFavorite = useCallback(
    (petId: string) => {
      // Optimistic local update; provider notification reconciles.
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(petId)) next.delete(petId);
        else next.add(petId);
        return next;
      });
      void provider.toggleFavorite(userId, petId);
    },
    [provider, userId]
  );

  const removeFavorite = useCallback(
    (petId: string) => {
      if (favorites.has(petId)) toggleFavorite(petId);
    },
    [favorites, toggleFavorite]
  );

  const addSkipped = useCallback((petId: string) => {
    setSkipped((prev) => new Set(prev).add(petId));
  }, []);

  const isFavorited = useCallback((petId: string) => favorites.has(petId), [favorites]);

  const favoritePets = allPets.filter((p) => favorites.has(p.id));

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
