/**
 * Product data → map features (spec §7.2).
 *
 * MAP-501 — venue coordinates are exact because venues are public places. Pet
 * and user coordinates never reach this module; approximate home position is
 * expressed as a geofence circle, not a point.
 */
import { HOME_GEO } from "@/hooks/use-playdate-feed";
import { VENUE_TYPE_EMOJI, VENUE_TYPE_LABELS, type VenueResult } from "@/lib/playdates/venues";
import { type GeofenceCircle, type MapVenueFeature } from "./adapter/types";

export function venueResultsToFeatures(results: VenueResult[]): MapVenueFeature[] {
  return results.map(({ venue, distanceBand, recommendation }) => ({
    id: venue.id,
    name: venue.name,
    lng: venue.geo.lng,
    lat: venue.geo.lat,
    glyph: VENUE_TYPE_EMOJI[venue.venueType],
    typeLabel: VENUE_TYPE_LABELS[venue.venueType],
    distanceBand,
    selectable: recommendation ? recommendation.suitable : true,
  }));
}

/** The user's rough area — a blurred circle, never a pin. */
export const HOME_AREA: GeofenceCircle = {
  center: [HOME_GEO.lng, HOME_GEO.lat],
  radiusMeters: 1200,
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
