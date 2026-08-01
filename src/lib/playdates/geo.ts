/**
 * Geo helpers (§10.2, SEC-801/803).
 *
 * The rule this module exists to enforce: precise coordinates are readable by
 * the scoring pipeline and by nothing else. Everything that crosses into the
 * UI is a `DistanceBand`. Sub-mile precision plus a few observations
 * trilaterates a home address, which is the most exploited vector in every
 * location-based matching product ever shipped.
 */
import { type DistanceBand, type GeoPoint } from "./types";

const EARTH_RADIUS_MILES = 3958.8;
const METERS_PER_MILE = 1609.344;

const toRadians = (deg: number) => (deg * Math.PI) / 180;

export function haversineMiles(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  return haversineMiles(a, b) * METERS_PER_MILE;
}

/** SEC-803 — the only distance representation any UI surface may receive. */
export function bandForMiles(miles: number): DistanceBand {
  if (miles < 1) return "<1 mi";
  if (miles < 3) return "1-3 mi";
  if (miles < 10) return "3-10 mi";
  return "10+ mi";
}

/** Ordering helper for "nearest first" sorts that must not read raw distance. */
export const DISTANCE_BAND_ORDER: DistanceBand[] = ["<1 mi", "1-3 mi", "3-10 mi", "10+ mi"];

/** Deterministic 32-bit hash — gives each pet a *stable* jitter offset. */
function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const QUANTIZE_GRID_DEGREES = 0.02; // ~1.4 miles of latitude
const JITTER_DEGREES = 0.012;

/**
 * Quantise a precise point for any derived output (display banding, coarse
 * bucketing). The offset is stable per pet: random jitter re-rolled on every
 * read is defeated by averaging repeated observations.
 */
export function quantizeGeo(point: GeoPoint, petId: string): GeoPoint {
  const hash = hashString(petId);
  const latOffset = ((hash % 1000) / 1000 - 0.5) * 2 * JITTER_DEGREES;
  const lngOffset = (((hash >> 10) % 1000) / 1000 - 0.5) * 2 * JITTER_DEGREES;

  const snap = (value: number) =>
    Math.round(value / QUANTIZE_GRID_DEGREES) * QUANTIZE_GRID_DEGREES;

  return {
    lat: snap(point.lat + latOffset),
    lng: snap(point.lng + lngOffset),
  };
}

const GEOHASH_ALPHABET = "0123456789bcdefghjkmnpqrstuvwxyz";

/**
 * Precomputed coarse bucket (§13.2) — cheap cache keys and index buckets
 * without touching the precise column. 5 characters is roughly a 3-mile cell.
 */
export function geohash5(point: GeoPoint): string {
  let latRange: [number, number] = [-90, 90];
  let lngRange: [number, number] = [-180, 180];
  let hash = "";
  let bits = 0;
  let bitCount = 0;
  let even = true;

  while (hash.length < 5) {
    if (even) {
      const mid = (lngRange[0] + lngRange[1]) / 2;
      if (point.lng > mid) {
        bits = (bits << 1) | 1;
        lngRange = [mid, lngRange[1]];
      } else {
        bits <<= 1;
        lngRange = [lngRange[0], mid];
      }
    } else {
      const mid = (latRange[0] + latRange[1]) / 2;
      if (point.lat > mid) {
        bits = (bits << 1) | 1;
        latRange = [mid, latRange[1]];
      } else {
        bits <<= 1;
        latRange = [latRange[0], mid];
      }
    }
    even = !even;
    bitCount += 1;
    if (bitCount === 5) {
      hash += GEOHASH_ALPHABET[bits];
      bits = 0;
      bitCount = 0;
    }
  }
  return hash;
}

/**
 * MP-409/410 — check-in geofence. In a real client this is evaluated
 * on-device and only the boolean plus the venue id are transmitted; the
 * server never learns where the user physically is.
 */
export const CHECKIN_GEOFENCE_METERS = 300;
export const CHECKIN_WINDOW_BEFORE_MINUTES = 30;
export const CHECKIN_WINDOW_AFTER_MINUTES = 60;

export function isWithinGeofence(
  userPoint: GeoPoint,
  venuePoint: GeoPoint,
  radiusMeters = CHECKIN_GEOFENCE_METERS,
): boolean {
  return haversineMeters(userPoint, venuePoint) <= radiusMeters;
}

export function isWithinCheckinWindow(scheduledStart: string, now: Date = new Date()): boolean {
  const start = new Date(scheduledStart).getTime();
  const opens = start - CHECKIN_WINDOW_BEFORE_MINUTES * 60_000;
  const closes = start + CHECKIN_WINDOW_AFTER_MINUTES * 60_000;
  const t = now.getTime();
  return t >= opens && t <= closes;
}
