/**
 * MAP-701 — "Search this area" drift detection.
 *
 * The button should only appear once the map has genuinely moved somewhere
 * else, not on every nudge. "Somewhere else" is defined relative to what the
 * user can see: a quarter of the visible map width, with a small floor so the
 * button never flickers at high zoom.
 */
import { haversineMiles } from "./geo";
import { type GeoPoint } from "./types";

/** Web-mercator ground resolution at the equator, metres per pixel at z0. */
const EQUATOR_M_PER_PX = 156543.03392;
const METERS_PER_MILE = 1609.344;

export function viewportWidthMiles(lat: number, zoom: number, widthPx: number): number {
  const mPerPx = (EQUATOR_M_PER_PX * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;
  return (mPerPx * widthPx) / METERS_PER_MILE;
}

export function areaSearchThresholdMiles(
  lat: number,
  zoom: number,
  widthPx = 640,
  minMiles = 0.5,
): number {
  return Math.max(minMiles, viewportWidthMiles(lat, zoom, widthPx) * 0.25);
}

export function shouldOfferAreaSearch({
  origin,
  center,
  zoom,
  widthPx = 640,
  minMiles = 0.5,
}: {
  origin: GeoPoint;
  center: GeoPoint;
  zoom: number;
  widthPx?: number;
  minMiles?: number;
}): boolean {
  const drift = haversineMiles(origin, center);
  return drift > areaSearchThresholdMiles(center.lat, zoom, widthPx, minMiles);
}
