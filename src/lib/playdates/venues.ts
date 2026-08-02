/**
 * Venue directory & meetup logistics (§5.4).
 *
 * The map is a *curated venue directory*, not a free-form map. Users cannot
 * drop arbitrary pins and cannot propose a private address. Every meetup in
 * this product happens at a public, verified, third-place venue — this is the
 * central safety control of the entire product (§10.3), which is why
 * `selectableVenues` filters on `verificationState` rather than trusting
 * callers to remember.
 */
import { bandForMiles, haversineMiles } from "./geo";
import {
  type DistanceBand,
  type GeoPoint,
  type PetTraitVector,
  type Venue,
  type VenueAmenity,
  type VenueType,
} from "./types";

export interface VenueFilters {
  types: VenueType[];
  amenities: VenueAmenity[];
  maxMiles: number;
}

export const emptyVenueFilters: VenueFilters = { types: [], amenities: [], maxMiles: 25 };

export interface VenueResult {
  venue: Venue;
  distanceBand: DistanceBand;
  /** Populated when the venue is being viewed in the context of a matched pair. */
  recommendation: VenueRecommendation | null;
}

export interface VenueRecommendation {
  suitable: boolean;
  /** Ranked ahead of equally-suitable venues when true. */
  preferred: boolean;
  notes: string[];
}

/** MP-404 — a meetup may only ever be created at a verified catalog venue. */
export function selectableVenues(venues: Venue[]): Venue[] {
  return venues.filter((v) => v.verificationState === "verified");
}

export function filterVenues(
  venues: Venue[],
  origin: GeoPoint,
  filters: VenueFilters,
): VenueResult[] {
  return venues
    .map((venue) => ({ venue, miles: haversineMiles(origin, venue.geo) }))
    .filter(({ venue, miles }) => {
      if (miles > filters.maxMiles) return false;
      if (filters.types.length > 0 && !filters.types.includes(venue.venueType)) return false;
      if (filters.amenities.length > 0) {
        return filters.amenities.every((amenity) => venue.amenities.includes(amenity));
      }
      return true;
    })
    .sort((a, b) => a.miles - b.miles)
    .map(({ venue, miles }) => ({
      venue,
      distanceBand: bandForMiles(miles),
      recommendation: null,
    }));
}

/**
 * MP-405 — recommend venues appropriate to the matched pair.
 *
 * Two rules with teeth: suppress off-leash venues when either pet's recall is
 * unreliable, and prefer venues with a separate small-dog area when the size
 * gap is more than 3×.
 */
export function recommendVenue(
  venue: Venue,
  petA: PetTraitVector,
  petB: PetTraitVector,
  /**
   * VC-313 — when visitor confirmation is available it supersedes the static
   * amenity flag, and anything short of a confirmed "yes" is treated as
   * unfenced. Omitted means "no signal", which falls back to the flag.
   */
  fencedConfirmation?: { confirmedFenced: boolean; disputed: boolean },
): VenueRecommendation {
  const notes: string[] = [];
  let suitable = true;
  let preferred = false;

  const offLeash = venue.amenities.includes("off_leash_permitted");
  const weakestRecall = Math.min(petA.recall_reliability, petB.recall_reliability);
  if (offLeash && weakestRecall <= 2) {
    suitable = false;
    notes.push("Off-leash, and recall isn't reliable yet for one of these two.");
  }

  const heavier = Math.max(petA.size_kg, petB.size_kg);
  const lighter = Math.max(0.5, Math.min(petA.size_kg, petB.size_kg));
  if (heavier / lighter > 3) {
    if (venue.amenities.includes("separate_small_dog_area")) {
      preferred = true;
      notes.push("Has a separate small-dog area — a good call for this size gap.");
    } else {
      notes.push("Big size difference: keep an eye out, there's no small-dog area here.");
    }
  }

  const fenced = fencedConfirmation
    ? fencedConfirmation.confirmedFenced
    : venue.amenities.includes("fenced");
  if (!fenced && weakestRecall <= 3) {
    notes.push(
      fencedConfirmation?.disputed
        ? "Visitors disagree about whether this is fully fenced — treat it as unfenced and keep leashes on."
        : "Unfenced — leashes on until everyone settles.",
    );
  }

  // MP-412 — venue-level safety context.
  if (venue.incidentFlagCount > 0) {
    notes.push(
      `Recently reported: ${venue.incidentFlagCount} open incident ${venue.incidentFlagCount === 1 ? "report" : "reports"} at this venue.`,
    );
  }

  return { suitable, preferred, notes };
}

export function rankVenuesForPair(
  results: VenueResult[],
  petA: PetTraitVector,
  petB: PetTraitVector,
): VenueResult[] {
  return results
    .map((result) => ({
      ...result,
      recommendation: recommendVenue(result.venue, petA, petB),
    }))
    .sort((a, b) => {
      const score = (r: VenueResult) =>
        (r.recommendation?.suitable ? 2 : 0) + (r.recommendation?.preferred ? 1 : 0);
      return score(b) - score(a);
    });
}

export const VENUE_TYPE_LABELS: Record<VenueType, string> = {
  dog_park: "Dog park",
  public_park: "Public park",
  trail: "Trail",
  beach: "Beach",
  pet_friendly_patio: "Pet-friendly patio",
  indoor_facility: "Indoor facility",
};

export const VENUE_TYPE_EMOJI: Record<VenueType, string> = {
  dog_park: "🐕",
  public_park: "🌳",
  trail: "🥾",
  beach: "🏖️",
  pet_friendly_patio: "☕",
  indoor_facility: "🏠",
};

export const AMENITY_LABELS: Record<VenueAmenity, string> = {
  fenced: "Fully fenced",
  off_leash_permitted: "Off-leash allowed",
  separate_small_dog_area: "Small-dog area",
  water: "Water",
  shade: "Shade",
  parking: "Parking",
  restrooms: "Restrooms",
  lighting: "Lit after dark",
};

export const AMENITY_EMOJI: Record<VenueAmenity, string> = {
  fenced: "🚧",
  off_leash_permitted: "🦮",
  separate_small_dog_area: "🐁",
  water: "💧",
  shade: "⛱️",
  parking: "🅿️",
  restrooms: "🚻",
  lighting: "💡",
};
