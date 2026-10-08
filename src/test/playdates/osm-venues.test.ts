import { describe, expect, it } from "vitest";
import { cellKey, isCellFresh, mapOsmElement, mapOsmElements } from "../../../supabase/functions/discover-venues/osm";
import { recommendVenue } from "@/lib/playdates/venues";
import { rowToVenue } from "@/lib/playdates/venue-store";

describe("OSM venue mapping", () => {
  it("maps a fenced dog park", () => {
    const row = mapOsmElement({ type: "way", id: 1, center: { lat: 1, lon: 2 }, tags: { leisure: "dog_park", name: "Bark Yard", barrier: "fence", drinking_water: "yes" } });
    expect(row?.venue_type).toBe("dog_park");
    expect(row?.amenities).toEqual(expect.arrayContaining(["fenced", "water", "off_leash_permitted"]));
    expect(row?.verification_state).toBe("discovered");
  });
  it("excludes dog=no, private and unnamed places", () => {
    expect(mapOsmElement({ type: "node", id: 2, lat: 1, lon: 1, tags: { leisure: "park", name: "X", dog: "no" } })).toBeNull();
    expect(mapOsmElement({ type: "node", id: 3, lat: 1, lon: 1, tags: { leisure: "dog_park", name: "X", access: "private" } })).toBeNull();
    expect(mapOsmElement({ type: "node", id: 4, lat: 1, lon: 1, tags: { leisure: "dog_park" } })).toBeNull();
  });
  it("requires parks to explicitly allow dogs", () => {
    expect(mapOsmElement({ type: "node", id: 5, lat: 1, lon: 1, tags: { leisure: "park", name: "P" } })).toBeNull();
    expect(mapOsmElement({ type: "node", id: 6, lat: 1, lon: 1, tags: { leisure: "park", name: "P", dog: "leashed" } })?.venue_type).toBe("public_park");
  });
  it("dedupes by osm id", () => {
    const el = { type: "node" as const, id: 7, lat: 1, lon: 1, tags: { leisure: "dog_park", name: "D" } };
    expect(mapOsmElements([el, el])).toHaveLength(1);
  });
});

describe("discovery cell caching", () => {
  it("groups nearby points into one cell", () => {
    expect(cellKey(34.271, -119.241)).toBe(cellKey(34.279, -119.249));
  });
  it("refreshes after 30 days", () => {
    const now = Date.now();
    expect(isCellFresh(new Date(now - 5 * 86_400_000).toISOString(), now)).toBe(true);
    expect(isCellFresh(new Date(now - 31 * 86_400_000).toISOString(), now)).toBe(false);
    expect(isCellFresh(null, now)).toBe(false);
  });
});

describe("map-data fencing is never trusted on its own", () => {
  it("treats a discovered 'fenced' spot as unfenced without visitor confirmation", () => {
    const row = mapOsmElement({ type: "way", id: 8, center: { lat: 1, lon: 2 }, tags: { leisure: "dog_park", name: "F", barrier: "fence" } })!;
    const venue = rowToVenue({ ...row, id: "x", verified_at: null, incident_flag_count: 0 });
    const pet = { recall_reliability: 3, size_kg: 10 } as never;
    const rec = recommendVenue(venue, pet, pet, { confirmedFenced: false, disputed: false });
    expect(rec.notes.some((n) => n.includes("Unfenced"))).toBe(true);
  });
});
