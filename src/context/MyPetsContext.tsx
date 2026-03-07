import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { type Pet, type Species, type VibeTag } from "@/data/mock-pets";

export interface MyPet extends Pet {
  isOwned: true;
}

// Default pet for Felix the adopter
const felixPet: MyPet = {
  id: "my-pet-1",
  name: "Nugget",
  species: "dog",
  breed: "Corgi Mix",
  age: "2 years",
  ageCategory: "young",
  gender: "male",
  vibes: ["playful", "high-energy", "cuddly", "good-with-pets"],
  bio: "Nugget is a wiggle-butt extraordinaire who loves making new friends at the park.",
  funFact: "Does a full-body shake every time he meets a new dog.",
  rehomingReason: "",
  location: "Portland, OR",
  distanceKm: 0,
  photos: ["https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=600&h=600&fit=crop"],
  healthVerified: true,
  adoptionFee: 0,
  status: "adopted",
  rehomerId: "u1",
  createdAt: "2025-06-01",
  isOwned: true,
};

interface MyPetsContextValue {
  myPets: MyPet[];
  activePet: MyPet | null;
  setActivePetId: (id: string) => void;
  addMyPet: (pet: Omit<MyPet, "id" | "isOwned" | "status" | "adoptionFee" | "rehomerId" | "createdAt" | "rehomingReason">) => void;
  removeMyPet: (id: string) => void;
}

const MyPetsContext = createContext<MyPetsContextValue | null>(null);

export function MyPetsProvider({ children }: { children: ReactNode }) {
  const [myPets, setMyPets] = useState<MyPet[]>([felixPet]);
  const [activePetId, setActivePetId] = useState<string>(felixPet.id);

  const activePet = myPets.find((p) => p.id === activePetId) ?? myPets[0] ?? null;

  const addMyPet = useCallback(
    (pet: Omit<MyPet, "id" | "isOwned" | "status" | "adoptionFee" | "rehomerId" | "createdAt" | "rehomingReason">) => {
      const newPet: MyPet = {
        ...pet,
        id: `my-pet-${Date.now()}`,
        isOwned: true,
        status: "adopted",
        adoptionFee: 0,
        rehomerId: "u1",
        createdAt: new Date().toISOString().split("T")[0],
        rehomingReason: "",
      };
      setMyPets((prev) => [...prev, newPet]);
      setActivePetId(newPet.id);
    },
    []
  );

  const removeMyPet = useCallback((id: string) => {
    setMyPets((prev) => prev.filter((p) => p.id !== id));
  }, []);

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
