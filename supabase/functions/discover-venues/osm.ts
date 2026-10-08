/**
 * Pure OpenStreetMap → venue mapping, shared by the discover-venues function
 * and its unit tests. No runtime-specific imports.
 */
export interface OsmElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface DiscoveredVenueRow {
  osm_id: string;
  name: string;
  lat: number;
  lng: number;
  venue_type: "dog_park" | "public_park" | "trail" | "beach";
  amenities: string[];
  leash_rules: string;
  hours: string;
  source: "osm";
  verification_state: "discovered";
  neighborhood: string;
}

export const CELL_DEGREES = 0.1;
export const CELL_TTL_DAYS = 30;

export function cellKey(lat: number, lng: number): string {
  const a = Math.floor(lat / CELL_DEGREES);
  const b = Math.floor(lng / CELL_DEGREES);
  return `${a}:${b}`;
}

export function isCellFresh(fetchedAt: string | null | undefined, now = Date.now()): boolean {
  if (!fetchedAt) return false;
  return now - new Date(fetchedAt).getTime() < CELL_TTL_DAYS * 86_400_000;
}

export function buildOverpassQuery(lat: number, lng: number, radiusMeters: number): string {
  const around = `(around:${Math.round(radiusMeters)},${lat},${lng})`;
  return `[out:json][timeout:20];
(
  nwr["leisure"="dog_park"]${around};
  nwr["leisure"="park"]["dog"~"^(yes|leashed|designated|unleashed)$"]${around};
  nwr["highway"~"^(path|footway|track)$"]["name"]["dog"~"^(yes|leashed|designated|unleashed)$"]${around};
  nwr["natural"="beach"]["dog"~"^(yes|leashed|designated|unleashed)$"]${around};
);
out center tags 200;`;
}

const DOG_OK = new Set(["yes", "leashed", "designated", "unleashed"]);

export function mapOsmElement(el: OsmElement): DiscoveredVenueRow | null {
  const tags = el.tags ?? {};
  const name = tags.name?.trim();
  if (!name) return null;
  if (tags.dog === "no") return null;
  if (tags.access === "private" || tags.access === "no") return null;
  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  let venue_type: DiscoveredVenueRow["venue_type"];
  if (tags.leisure === "dog_park") venue_type = "dog_park";
  else if (tags.natural === "beach") venue_type = "beach";
  else if (tags.highway) venue_type = "trail";
  else if (tags.leisure === "park") venue_type = "public_park";
  else return null;
  if (venue_type !== "dog_park" && !DOG_OK.has(tags.dog ?? "")) return null;

  const amenities: string[] = [];
  if (tags.barrier === "fence" || tags.fenced === "yes" || tags.fence === "yes") amenities.push("fenced");
  if (venue_type === "dog_park" || tags.dog === "unleashed") amenities.push("off_leash_permitted");
  if (tags.drinking_water === "yes" || tags["drinking_water:dog"] === "yes") amenities.push("water");
  if (tags.lit === "yes") amenities.push("lighting");
  if (tags.toilets === "yes") amenities.push("restrooms");
  if (tags.parking === "yes" || tags.parking === "surface") amenities.push("parking");
  if (tags.shade === "yes") amenities.push("shade");

  const leash_rules =
    tags.dog === "leashed"
      ? "Leashes required (from public map data)."
      : amenities.includes("off_leash_permitted")
        ? "Off-leash may be permitted — check posted signs."
        : "Check posted signs for leash rules.";

  return {
    osm_id: `${el.type}/${el.id}`,
    name,
    lat,
    lng,
    venue_type,
    amenities,
    leash_rules,
    hours: tags.opening_hours ?? "Unknown",
    source: "osm",
    verification_state: "discovered",
    neighborhood: tags["addr:city"] ?? "",
  };
}

export function mapOsmElements(elements: OsmElement[]): DiscoveredVenueRow[] {
  const seen = new Set<string>();
  const out: DiscoveredVenueRow[] = [];
  for (const el of elements) {
    const row = mapOsmElement(el);
    if (!row || seen.has(row.osm_id)) continue;
    seen.add(row.osm_id);
    out.push(row);
  }
  return out;
}
