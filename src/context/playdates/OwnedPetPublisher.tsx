import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/context/AuthContext";
import { useMyPets } from "@/context/MyPetsContext";
import { usePetPersonality } from "./PetPersonalityContext";
import { isRealPetId } from "@/lib/playdates/remote-pets";

/**
 * Publishes the parts of your Derp other people's feeds need to score it:
 * the quiz-derived trait vector, the handler preferences, and the vaccination
 * attestation. Without this, a real account is invisible to every other real
 * account — the profile exists, but nothing can rank it.
 *
 * Everything published here is already shown on the Derp's public card. Raw
 * quiz answers stay private.
 */
export function OwnedPetPublisher() {
  const { user } = useAuth();
  const { myPets } = useMyPets();
  const { getPersonality, getPreference, getAttestation } = usePetPersonality();

  const userId = user?.id ?? null;

  // A cheap signature so the effect only fires when something publishable moved.
  const signature = myPets
    .filter((pet) => isRealPetId(pet.id))
    .map((pet) => {
      const personality = getPersonality(pet.id);
      const preference = getPreference(pet.id);
      const attestation = getAttestation(pet.id);
      return [
        pet.id,
        personality?.updatedAt ?? "",
        personality?.completedAt ?? "",
        preference.maxTravelMiles,
        preference.availabilityWindows.join(","),
        preference.preferredMeetupTypes.join(","),
        preference.crossSpeciesOptIn,
        preference.intactOptOut,
        JSON.stringify(preference.hardFilters),
        attestation?.expiresAt ?? "",
      ].join("|");
    })
    .join("~");

  useEffect(() => {
    if (!userId) return;
    const pets = myPets.filter((pet) => isRealPetId(pet.id));
    if (pets.length === 0) return;

    let cancelled = false;
    void (async () => {
      for (const pet of pets) {
        if (cancelled) return;
        const personality = getPersonality(pet.id);
        const preference = getPreference(pet.id);
        const attestation = getAttestation(pet.id);

        if (personality?.completedAt) {
          await supabase.from("pet_personalities").upsert(
            {
              pet_id: pet.id,
              user_id: userId,
              quiz_version: personality.quizVersion,
              derivation_version: personality.derivationVersion,
              traits: personality.traits as unknown as Json,
              confidence: personality.confidence as unknown as Json,
              completed_at: personality.completedAt,
            },
            { onConflict: "pet_id" },
          );
        }

        await supabase.from("pet_preferences").upsert(
          {
            pet_id: pet.id,
            user_id: userId,
            max_travel_miles: preference.maxTravelMiles,
            preferred_meetup_types: preference.preferredMeetupTypes,
            availability_windows: preference.availabilityWindows,
            hard_filters: preference.hardFilters as unknown as Json,
            cross_species_opt_in: preference.crossSpeciesOptIn,
            intact_opt_out: preference.intactOptOut,
          },
          { onConflict: "pet_id" },
        );

        await supabase
          .from("pets")
          .update({
            vaccination_attested_at: attestation?.attestedAt ?? null,
            vaccination_expires_at: attestation?.expiresAt ?? null,
            last_active_at: new Date().toISOString(),
          })
          .eq("id", pet.id)
          .eq("user_id", userId);
      }
    })();

    return () => {
      cancelled = true;
    };
    // `signature` is the real dependency; the getters are stable per render pass.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, signature]);

  return null;
}
