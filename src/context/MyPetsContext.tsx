import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { getDataProvider, type Pet } from "@/lib/data";

/** @deprecated Use Pet from "@/lib/data" — ownership is now expressed by Pet.ownerId. */
export type MyPet = Pet;

/** Fields the UI supplies when adding a pet; the provider/context fills the rest. */
export type NewMyPet = Omit<Pet, "id" | "createdAt" | "ownerId" | "socialStatus" | "adoptionListing">;

interface MyPetsContextValue {
  myPets: Pet[];
  activePet: Pet | null;
  setActivePetId: (id: string) => void;
  addMyPet: (pet: NewMyPet) => void;
  removeMyPet: (id: string) => void;
}

const MyPetsContext = createContext<MyPetsContextValue | null>(null);

export function MyPetsProvider({ children }: { children: ReactNode }) {
  const provider = getDataProvider();
  const [myPets, setMyPets] = useState<Pet[]>([]);
  const [activePetId, setActivePetId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const user = await provider.getCurrentUser();
      const pets = await provider.getPetsByOwner(user.id);
      if (cancelled) return;
      setMyPets(pets);
      setActivePetId((prev) => (prev && pets.some((p) => p.id === prev) ? prev : pets[0]?.id ?? null));
    };
    load();
    const unsubscribe = provider.subscribe(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [provider]);

  const activePet = myPets.find((p) => p.id === activePetId) ?? myPets[0] ?? null;

  const addMyPet = useCallback(
    (pet: NewMyPet) => {
      void (async () => {
        const user = await provider.getCurrentUser();
        const created = await provider.createPet({
          ...pet,
          ownerId: user.id,
          socialStatus: "open-to-playdates",
        });
        setActivePetId(created.id);
      })();
    },
    [provider]
  );

  const removeMyPet = useCallback(
    (id: string) => {
      void provider.deletePet(id);
    },
    [provider]
  );

  return (
    <MyPetsContext.Provider value={{ myPets, activePet, setActivePetId, addMyPet, removeMyPet }}>
      {children}
    </MyPetsContext.Provider>
  );
}

export function useMyPets() {
  const ctx = useContext(MyPetsContext);
  if (!ctx) throw new Error("useMyPets must be used within MyPetsProvider");
  return ctx;
}
