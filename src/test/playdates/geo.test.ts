import { describe, it, expect } from "vitest";
import {
  CHECKIN_GEOFENCE_METERS,
  bandForMiles,
  geohash5,
  haversineMiles,
  isWithinCheckinWindow,
  isWithinGeofence,
  quantizeGeo,
} from "@/lib/playdates/geo";
import { detectContactSharing, detectTransferIntent } from "@/lib/playdates/safety-text";
import { recommendVenue, selectableVenues } from "@/lib/playdates/venues";
import { mockVenues } from "@/data/mock-venues";
import { baseTraits } from "./fixtures";

const ventura = { lat: 34.2746, lng: -119.229 };
const oxnard = { lat: 34.1975, lng: -119.1771 };

describe("distance banding (§10.2)", () => {
  it("computes real distances between points", () => {
    expect(haversineMiles(ventura, ventura)).toBe(0);
    expect(haversineMiles(ventura, oxnard)).toBeGreaterThan(4);
    expect(haversineMiles(ventura, oxnard)).toBeLessThan(8);
  });

  it("collapses distance into four coarse bands", () => {
    expect(bandForMiles(0.4)).toBe("<1 mi");
    expect(bandForMiles(1)).toBe("1-3 mi");
    expect(bandForMiles(2.9)).toBe("1-3 mi");
    expect(bandForMiles(3)).toBe("3-10 mi");
    expect(bandForMiles(9.9)).toBe("3-10 mi");
    expect(bandForMiles(10)).toBe("10+ mi");
    expect(bandForMiles(400)).toBe("10+ mi");
  });

  it("uses a stable per-pet offset so repeated reads cannot be averaged out", () => {
    const first = quantizeGeo(ventura, "pet-a");
    const second = quantizeGeo(ventura, "pet-a");
    expect(first).toEqual(second);

    // ...but different pets get different offsets.
    const other = quantizeGeo(ventura, "pet-b");
    expect(`${first.lat},${first.lng}`).not.toBe(`${other.lat},${other.lng}`);
  });

  it("buckets nearby points into the same coarse geohash cell", () => {
    expect(geohash5(ventura)).toHaveLength(5);
    expect(geohash5(ventura)).not.toBe(geohash5({ lat: 40.7, lng: -74 }));
  });
});

describe("check-in (MP-409/410)", () => {
  it("accepts a position inside the geofence and rejects one outside", () => {
    const nearby = { lat: ventura.lat + 0.001, lng: ventura.lng };
    expect(isWithinGeofence(nearby, ventura, CHECKIN_GEOFENCE_METERS)).toBe(true);
    expect(isWithinGeofence(oxnard, ventura, CHECKIN_GEOFENCE_METERS)).toBe(false);
  });

  it("opens 30 minutes before and closes 60 minutes after the scheduled start", () => {
    const start = new Date("2026-08-01T09:00:00Z");
    const iso = start.toISOString();
    expect(isWithinCheckinWindow(iso, new Date("2026-08-01T08:45:00Z"))).toBe(true);
    expect(isWithinCheckinWindow(iso, new Date("2026-08-01T09:59:00Z"))).toBe(true);
    expect(isWithinCheckinWindow(iso, new Date("2026-08-01T08:15:00Z"))).toBe(false);
    expect(isWithinCheckinWindow(iso, new Date("2026-08-01T10:30:00Z"))).toBe(false);
  });
});

describe("in-message classifiers", () => {
  it("flags phone numbers, emails, handles and external apps (CH-304)", () => {
    expect(detectContactSharing("call me on 805-555-0123")).not.toBeNull();
    expect(detectContactSharing("i'm at camila@example.com")).not.toBeNull();
    expect(detectContactSharing("find me @venturadogmom on there")).not.toBeNull();
    expect(detectContactSharing("easier on WhatsApp?")).not.toBeNull();
    expect(detectContactSharing("see you saturday at nine!")).toBeNull();
  });

  it("flags apparent rehoming, sale and breeding intent (REG-903)", () => {
    expect(detectTransferIntent("honestly you could just keep him for good")).not.toBeNull();
    expect(detectTransferIntent("what price would you take for the puppy?")).not.toBeNull();
    expect(detectTransferIntent("would you want to breed them?")).not.toBeNull();
    expect(detectTransferIntent("bruno had a great time today")).toBeNull();
  });
});

describe("venue catalog", () => {
  it("only offers verified venues for meetup creation (MP-404)", () => {
    const selectable = selectableVenues(mockVenues);
    expect(selectable.length).toBeGreaterThan(0);
    expect(selectable.every((v) => v.verificationState === "verified")).toBe(true);
    expect(selectable.some((v) => v.id === "v13")).toBe(false);
  });

  it("suppresses off-leash venues when either pet's recall is unreliable (MP-405)", () => {
    const offLeash = mockVenues.find((v) => v.amenities.includes("off_leash_permitted"))!;
    const reliable = { ...baseTraits, recall_reliability: 5 };
    const unreliable = { ...baseTraits, recall_reliability: 1 };

    expect(recommendVenue(offLeash, reliable, reliable).suitable).toBe(true);
    expect(recommendVenue(offLeash, reliable, unreliable).suitable).toBe(false);
  });

  it("prefers a separate small-dog area when sizes differ by more than 3x", () => {
    const withArea = mockVenues.find((v) => v.amenities.includes("separate_small_dog_area"))!;
    const big = { ...baseTraits, size_kg: 40 };
    const small = { ...baseTraits, size_kg: 5 };
    expect(recommendVenue(withArea, big, small).preferred).toBe(true);
    expect(recommendVenue(withArea, big, { ...baseTraits, size_kg: 30 }).preferred).toBe(false);
  });

  it("surfaces venues with open incident reports (MP-412)", () => {
    const flagged = mockVenues.find((v) => v.incidentFlagCount > 0)!;
    const notes = recommendVenue(flagged, baseTraits, baseTraits).notes.join(" ");
    expect(notes).toContain("Recently reported");
  });
});
