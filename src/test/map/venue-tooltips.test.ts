import { describe, expect, it } from "vitest";
import { venueResultsToFeatures } from "@/map/venue-features";
import { type VenueResult } from "@/lib/playdates/venues";
import { type Venue, type VenueAttributeAggregate } from "@/lib/playdates/types";

const venue: Venue = {
  id: "v1",
  name: "Camino Real Park",
  geo: { lat: 34.27, lng: -119.24 },
  venueType: "dog_park",
  amenities: ["fenced", "water", "shade", "parking", "restrooms"],
  leashRules: "Off-leash permitted inside the fenced enclosure only. Clean up after your dog.",
  hours: "6:00am – 10:00pm daily",
  source: "staff",
  verificationState: "verified",
  verifiedAt: "2026-01-01T00:00:00.000Z",
  incidentFlagCount: 0,
  neighborhood: "Ventura",
};

const aggregate = (
  attributeKey: VenueAttributeAggregate["attributeKey"],
  state: VenueAttributeAggregate["state"],
  value: VenueAttributeAggregate["value"],
  nDistinct = 5,
): VenueAttributeAggregate => ({
  attributeKey,
  state,
  value,
  wYes: 0,
  wNo: 0,
  wTot: 0,
  agreement: 0,
  nDistinct,
  nYesUsers: 0,
  nNoUsers: 0,
  nMeetupEvents: 0,
  lastObservedAt: null,
});

const result = (overrides: Partial<VenueResult> = {}): VenueResult => ({
  venue,
  distanceBand: "<1 mi",
  recommendation: null,
  ...overrides,
});

describe("venue tooltip features", () => {
  it("carries at most three prioritised amenity chips with confirmation language", () => {
    const [feature] = venueResultsToFeatures([result()], {
      aggregatesFor: () => [
        aggregate("fenced", "confirmed", "yes", 5),
        aggregate("water", "disputed", "no"),
      ],
    });

    expect(feature.amenityChips).toEqual([
      { label: "Fully fenced", note: "5 confirmed", tone: "confirmed" },
      { label: "Water", note: "mixed reports", tone: "mixed" },
      { label: "Shade", tone: "plain" },
    ]);
  });

  it("prefers hours for the detail line and falls back to one sentence of rules", () => {
    const [withHours] = venueResultsToFeatures([result()]);
    expect(withHours.detailLine).toBe("6:00am – 10:00pm daily");

    const [withoutHours] = venueResultsToFeatures([
      result({ venue: { ...venue, hours: "Unknown" } }),
    ]);
    expect(withoutHours.detailLine).toBe(
      "Off-leash permitted inside the fenced enclosure only.",
    );
  });

  it("offers an action only in pick-a-spot mode", () => {
    const [browsing] = venueResultsToFeatures([result()]);
    expect(browsing.actionLabel).toBeUndefined();

    const [picking] = venueResultsToFeatures([result()], { selectable: true });
    expect(picking.actionLabel).toBe("Choose this spot");
  });

  it("replaces the action with the reason when the pair can't meet there", () => {
    const [blocked] = venueResultsToFeatures(
      [
        result({
          recommendation: { suitable: false, preferred: false, notes: ["Recall is too shaky for off-leash"] },
        }),
      ],
      { selectable: true },
    );

    expect(blocked.actionLabel).toBeUndefined();
    expect(blocked.blockedReason).toBe("Recall is too shaky for off-leash");
    expect(blocked.selectable).toBe(false);
  });
});
