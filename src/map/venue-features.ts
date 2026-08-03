/**
 * Product data → map features (spec §7.2).
 *
 * MAP-501 — venue coordinates are exact because venues are public places. Pet
 * and user coordinates never reach this module; approximate home position is
 * expressed as a geofence circle, not a point.
 */
import { HOME_GEO } from "@/hooks/use-playdate-feed";
import {
  AMENITY_LABELS,
  VENUE_TYPE_EMOJI,
  VENUE_TYPE_LABELS,
  type VenueResult,
} from "@/lib/playdates/venues";
import {
  type VenueAmenity,
  type VenueAttributeAggregate,
  type VenueType,
} from "@/lib/playdates/types";
import { type GeofenceCircle, type MapVenueChip, type MapVenueFeature } from "./adapter/types";

/**
 * What a Derp parent actually needs to decide on a pin, in order. Three chips
 * is the ceiling — a tooltip that lists everything is a list, not a tooltip.
 */
const CHIP_PRIORITY: VenueAmenity[] = [
  "fenced",
  "off_leash_permitted",
  "separate_small_dog_area",
  "water",
  "shade",
  "parking",
  "restrooms",
];
const MAX_CHIPS = 3;

/** First sentence only — the tooltip has one line for this, not a paragraph. */
function firstSentence(text: string) {
  const [sentence] = text.split(/(?<=\.)\s+/);
  return (sentence ?? text).trim();
}

export interface VenueFeatureOptions {
  /** Visitor confirmation state per venue, when the caller has it. */
  aggregatesFor?: (venueId: string, venueType: VenueType) => VenueAttributeAggregate[];
  /** True when the browser is in pick-a-spot mode, so the tooltip can act. */
  selectable?: boolean;
}

export function venueResultsToFeatures(
  results: VenueResult[],
  { aggregatesFor, selectable: selectMode = false }: VenueFeatureOptions = {},
): MapVenueFeature[] {
  return results.map(({ venue, distanceBand, recommendation }) => {
    const aggregates = aggregatesFor?.(venue.id, venue.venueType) ?? [];
    const suitable = recommendation ? recommendation.suitable : true;

    const amenityChips: MapVenueChip[] = CHIP_PRIORITY.filter((amenity) =>
      venue.amenities.includes(amenity),
    )
      .slice(0, MAX_CHIPS)
      .map((amenity) => {
        // VC-322 — confirmation travels as plain language, never as a score.
        const aggregate = aggregates.find((a) => a.attributeKey === amenity);
        if (aggregate?.state === "disputed") {
          return { label: AMENITY_LABELS[amenity], note: "mixed reports", tone: "mixed" as const };
        }
        if (aggregate?.state === "confirmed" && aggregate.value === "yes") {
          return {
            label: AMENITY_LABELS[amenity],
            note: `${aggregate.nDistinct} confirmed`,
            tone: "confirmed" as const,
          };
        }
        return { label: AMENITY_LABELS[amenity], tone: "plain" as const };
      });

    const hours = venue.hours && venue.hours !== "Unknown" ? venue.hours : null;

    return {
      id: venue.id,
      name: venue.name,
      lng: venue.geo.lng,
      lat: venue.geo.lat,
      glyph: VENUE_TYPE_EMOJI[venue.venueType],
      typeLabel: VENUE_TYPE_LABELS[venue.venueType],
      distanceBand,
      selectable: suitable,
      amenityChips,
      detailLine: hours ?? firstSentence(venue.leashRules),
      ...(selectMode && suitable ? { actionLabel: "Choose this spot" } : {}),
      ...(selectMode && !suitable
        ? { blockedReason: recommendation?.notes[0] ?? "Not a good fit for this pair" }
        : {}),
    };
  });
}


/** The user's rough area — a blurred circle, never a pin. */
export const HOME_AREA: GeofenceCircle = {
  center: [HOME_GEO.lng, HOME_GEO.lat],
  radiusMeters: 1200,
  label: "Your home area",
  description:
    "A blurred ~1.2 km circle around your neighbourhood. Other Derp parents only ever see this area — never your exact address.",
};


export function boundsFor(features: MapVenueFeature[], home = HOME_AREA) {
  const lngs = [home.center[0], ...features.map((f) => f.lng)];
  const lats = [home.center[1], ...features.map((f) => f.lat)];
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ] as [number, number, number, number];
}
