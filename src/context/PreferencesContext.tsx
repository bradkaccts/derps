import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type Species, type VibeTag, type AgeCategory, type Pet } from "@/data/mock-pets";

export interface AdopterPreferences {
  species: Species[];
  vibesWanted: VibeTag[];
  vibesExcluded: VibeTag[];
  ageCategories: AgeCategory[];
  genders: ("male" | "female")[];
  maxAdoptionFee: number;
  maxDistanceKm: number;
  healthVerifiedOnly: boolean;
}

const defaultPreferences: AdopterPreferences = {
  species: [],
  vibesWanted: [],
  vibesExcluded: [],
  ageCategories: [],
  genders: [],
  maxAdoptionFee: 500,
  maxDistanceKm: 50,
  healthVerifiedOnly: false,
};

interface PreferencesContextValue {
  preferences: AdopterPreferences;
  updatePreferences: (partial: Partial<AdopterPreferences>) => void;
  resetPreferences: () => void;
  applyPreferences: (pets: Pet[]) => Pet[];
  activeFilterCount: number;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [preferences, setPreferences] = useState<AdopterPreferences>(defaultPreferences);

  const updatePreferences = useCallback((partial: Partial<AdopterPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...partial }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(defaultPreferences);
  }, []);

  const applyPreferences = useCallback(
    (pets: Pet[]) => {
      return pets.filter((pet) => {
        if (preferences.species.length > 0 && !preferences.species.includes(pet.species))
          return false;
        if (
          preferences.vibesWanted.length > 0 &&
          !preferences.vibesWanted.some((v) => pet.vibes.includes(v))
        )
          return false;
        if (
          preferences.vibesExcluded.length > 0 &&
          preferences.vibesExcluded.some((v) => pet.vibes.includes(v))
        )
          return false;
        if (
          preferences.ageCategories.length > 0 &&
          !preferences.ageCategories.includes(pet.ageCategory)
        )
          return false;
        if (preferences.genders.length > 0 && !preferences.genders.includes(pet.gender))
          return false;
        if (pet.adoptionFee > preferences.maxAdoptionFee) return false;
        if (pet.distanceKm > preferences.maxDistanceKm) return false;
        if (preferences.healthVerifiedOnly && !pet.healthVerified) return false;
        return true;
      });
    },
    [preferences]
  );

  const activeFilterCount =
    (preferences.species.length > 0 ? 1 : 0) +
    (preferences.vibesWanted.length > 0 ? 1 : 0) +
    (preferences.vibesExcluded.length > 0 ? 1 : 0) +
    (preferences.ageCategories.length > 0 ? 1 : 0) +
    (preferences.genders.length > 0 ? 1 : 0) +
    (preferences.maxAdoptionFee < 500 ? 1 : 0) +
    (preferences.maxDistanceKm < 50 ? 1 : 0) +
    (preferences.healthVerifiedOnly ? 1 : 0);

  return (
    <PreferencesContext.Provider
      value={{ preferences, updatePreferences, resetPreferences, applyPreferences, activeFilterCount }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within PreferencesProvider");
  return ctx;
}
