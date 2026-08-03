import { describe, expect, it } from "vitest";
import {
  areaSearchThresholdMiles,
  shouldOfferAreaSearch,
} from "@/lib/playdates/map-search-area";

const origin = { lat: 34.2746, lng: -119.229 };

describe("map area search drift", () => {
  it("uses a floor threshold when zoomed in tight", () => {
    expect(areaSearchThresholdMiles(origin.lat, 18)).toBe(0.5);
  });

  it("scales the threshold with the visible width", () => {
    expect(areaSearchThresholdMiles(origin.lat, 11, 640)).toBeGreaterThan(1);
    expect(areaSearchThresholdMiles(origin.lat, 11)).toBeGreaterThan(
      areaSearchThresholdMiles(origin.lat, 13),
    );
  });

  it("stays hidden for small nudges", () => {
    expect(
      shouldOfferAreaSearch({
        origin,
        center: { lat: origin.lat + 0.002, lng: origin.lng },
        zoom: 11,
      }),
    ).toBe(false);
  });

  it("offers a re-search once the map moves a viewport quarter away", () => {
    expect(
      shouldOfferAreaSearch({
        origin,
        center: { lat: origin.lat + 0.25, lng: origin.lng + 0.25 },
        zoom: 11,
      }),
    ).toBe(true);
  });
});
