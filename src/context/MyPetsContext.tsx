import { stableContext } from "@/context/stable-context";
import {
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { type Pet, type Species, type VibeTag, type AgeCategory } from "@/data/mock-pets";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";


export interface MyPet extends Pet {
  isOwned: true;
  /** Discovery coordinates — null until the owner sets their Derpdate area. */
  latitude?: number | null;
  longitude?: number | null;
  isDiscoverable?: boolean;
}


// Guest demo Derp — signed-out visitors still get the full Derpdate experience.
const guestPet: MyPet = {
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
  // Ventura is the Playdates launch metro (§13.8), so the demo account lives there.
  location: "Ventura, CA",
  distanceKm: 0,
  photos: ["https://images.unsplash.com/photo-1612536057832-2ff7ead58194?w=600&h=600&fit=crop"],
  healthVerified: true,
  adoptionFee: 0,
  status: "adopted",
  rehomerId: "u1",
  createdAt: "2025-06-01",
  isOwned: true,
};

type PetRow = {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string;
  age: string;
  age_category: string;
  gender: string;
  vibes: string[];
  bio: string;
  fun_fact: string;
  location: string;
  photos: string[];
  health_verified: boolean;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  is_discoverable: boolean;
};


type NewPet = Omit<
  MyPet,
  "id" | "isOwned" | "status" | "adoptionFee" | "rehomerId" | "createdAt" | "rehomingReason"
>;

function rowToPet(row: PetRow): MyPet {
  return {
    id: row.id,
    name: row.name,
    species: row.species as Species,
    breed: row.breed,
    age: row.age,
    ageCategory: row.age_category as AgeCategory,
    gender: row.gender as "male" | "female",
    vibes: (row.vibes ?? []) as VibeTag[],
    bio: row.bio,
    funFact: row.fun_fact,
    rehomingReason: "",
    location: row.location,
    distanceKm: 0,
    photos: row.photos ?? [],
    healthVerified: row.health_verified,
    adoptionFee: 0,
    status: "adopted",
    rehomerId: row.user_id,
    createdAt: row.created_at.slice(0, 10),
    isOwned: true,
    latitude: row.latitude,
    longitude: row.longitude,
    isDiscoverable: row.is_discoverable,
  };
}

function petToRow(pet: NewPet, userId: string) {
  return {
    user_id: userId,
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? "",
    age: pet.age ?? "",
    age_category: pet.ageCategory ?? "young",
    gender: pet.gender ?? "male",
    vibes: pet.vibes ?? [],
    bio: pet.bio ?? "",
    fun_fact: pet.funFact ?? "",
    location: pet.location ?? "",
    photos: pet.photos ?? [],
    health_verified: pet.healthVerified ?? false,
    latitude: pet.latitude ?? LAUNCH_METRO.lat,
    longitude: pet.longitude ?? LAUNCH_METRO.lng,
  };
}

interface MyPetsContextValue {
  myPets: MyPet[];
  activePet: MyPet | null;
  setActivePetId: (id: string) => void;
  addMyPet: (pet: NewPet) => void;
  removeMyPet: (id: string) => void;
  /** Sets where this Derp is discoverable from, and whether it shows at all. */
  updatePetDiscovery: (
    id: string,
    patch: { latitude?: number; longitude?: number; isDiscoverable?: boolean },
  ) => Promise<void>;
  loadingPets: boolean;
}


const MyPetsContext = stableContext<MyPetsContextValue>("MyPetsContext");

export function MyPetsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [myPets, setMyPets] = useState<MyPet[]>([guestPet]);
  const [activePetId, setActivePetId] = useState<string>(guestPet.id);
  const [loadingPets, setLoadingPets] = useState(false);

  // Load the account's Derps and, on first sign-in, carry the guest Derp up.
  useEffect(() => {
    if (!userId) {
      setMyPets([guestPet]);
      setActivePetId(guestPet.id);
      return;
    }
    let cancelled = false;
    setLoadingPets(true);
    void (async () => {
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        setLoadingPets(false);
        return;
      }
      let rows = (data ?? []) as PetRow[];
      if (rows.length === 0) {
        const { data: created } = await supabase
          .from("pets")
          .insert(petToRow(guestPet, userId))
          .select("*")
          .single();
        if (created) rows = [created as PetRow];
      }
      if (cancelled) return;
      const pets = rows.map(rowToPet);
      setMyPets(pets);
      setActivePetId(pets[0]?.id ?? "");
      setLoadingPets(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const activePet = myPets.find((p) => p.id === activePetId) ?? myPets[0] ?? null;

  const addMyPet = useCallback(
    (pet: NewPet) => {
      if (!userId) {
        const local: MyPet = {
          ...pet,
          id: `my-pet-${Date.now()}`,
          isOwned: true,
          status: "adopted",
          adoptionFee: 0,
          rehomerId: "guest",
          createdAt: new Date().toISOString().split("T")[0],
          rehomingReason: "",
        };
        setMyPets((prev) => [...prev, local]);
        setActivePetId(local.id);
        return;
      }
      void (async () => {
        const { data } = await supabase
          .from("pets")
          .insert(petToRow(pet, userId))
          .select("*")
          .single();
        if (!data) return;
        const created = rowToPet(data as PetRow);
        setMyPets((prev) => [...prev, created]);
        setActivePetId(created.id);
      })();
    },
    [userId],
  );

  const removeMyPet = useCallback(
    (id: string) => {
      setMyPets((prev) => prev.filter((p) => p.id !== id));
      if (userId) void supabase.from("pets").delete().eq("id", id).eq("user_id", userId);
    },
    [userId],
  );

  const updatePetDiscovery = useCallback(
    async (
      id: string,
      patch: { latitude?: number; longitude?: number; isDiscoverable?: boolean },
    ) => {
      setMyPets((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                latitude: patch.latitude ?? p.latitude,
                longitude: patch.longitude ?? p.longitude,
                isDiscoverable: patch.isDiscoverable ?? p.isDiscoverable,
              }
            : p,
        ),
      );
      if (!userId) return;
      const row: {
        latitude?: number;
        longitude?: number;
        is_discoverable?: boolean;
      } = {};
      if (patch.latitude !== undefined) row.latitude = patch.latitude;
      if (patch.longitude !== undefined) row.longitude = patch.longitude;
      if (patch.isDiscoverable !== undefined) row.is_discoverable = patch.isDiscoverable;
      if (Object.keys(row).length === 0) return;
      await supabase.from("pets").update(row).eq("id", id).eq("user_id", userId);

    },
    [userId],
  );

  return (
    <MyPetsContext.Provider
      value={{
        myPets,
        activePet,
        setActivePetId,
        addMyPet,
        removeMyPet,
        updatePetDiscovery,
        loadingPets,
      }}
    >

      {children}
    </MyPetsContext.Provider>
  );
}

export function useMyPets() {
  const ctx = useContext(MyPetsContext);
  if (!ctx) throw new Error("useMyPets must be used within MyPetsProvider");
  return ctx;
}
