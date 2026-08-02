/**
 * Seed observation log (VC-8xx data model), stood up as mock data.
 *
 * Dates are generated relative to "now" so decay and staleness are visible in
 * the running app rather than frozen at whatever day this file was written.
 * `userId`s here are opaque on purpose — no surface ever resolves them to a
 * person (VC-324, VC-602).
 */
import { type VenueAttributeKey, type VenueObservation } from "@/lib/playdates/types";

const DAY_MS = 86_400_000;

function daysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

interface SeedRow {
  venueId: string;
  attributeKey: VenueAttributeKey;
  /** [userId, meetupId, daysAgo, value] */
  entries: [string, string, number, "yes" | "no" | "unsure"][];
}

const seed: SeedRow[] = [
  // v1 Camino Real Park — the well-covered venue.
  {
    venueId: "v1",
    attributeKey: "parking",
    entries: [
      ["o1", "s1", 12, "yes"],
      ["o2", "s2", 30, "yes"],
      ["o3", "s3", 48, "yes"],
      ["o4", "s3", 48, "yes"],
    ],
  },
  {
    venueId: "v1",
    attributeKey: "fenced",
    entries: [
      ["o1", "s1", 12, "yes"],
      ["o2", "s2", 30, "yes"],
      ["o3", "s3", 48, "yes"],
      ["o5", "s4", 60, "yes"],
      ["o6", "s5", 75, "yes"],
    ],
  },
  {
    venueId: "v1",
    attributeKey: "water",
    entries: [
      ["o2", "s2", 20, "yes"],
      ["o7", "s6", 40, "no"],
      ["o8", "s6", 40, "no"],
      ["o3", "s3", 50, "yes"],
      ["o9", "s7", 65, "yes"],
      ["o4", "s8", 70, "yes"],
    ],
  },
  {
    venueId: "v1",
    attributeKey: "restrooms",
    entries: [["o5", "s4", 22, "yes"]],
  },

  // v2 Arroyo Verde Park — shade confirmed, lighting disputed.
  {
    venueId: "v2",
    attributeKey: "shade",
    entries: [
      ["o2", "s9", 9, "yes"],
      ["o4", "s10", 26, "yes"],
      ["o6", "s11", 44, "yes"],
    ],
  },
  {
    venueId: "v2",
    attributeKey: "lighting",
    entries: [
      ["o1", "s9", 9, "no"],
      ["o3", "s10", 26, "no"],
      ["o7", "s11", 44, "yes"],
      ["o8", "s12", 55, "yes"],
    ],
  },
  {
    venueId: "v2",
    attributeKey: "parking",
    entries: [
      ["o9", "s9", 9, "yes"],
      ["o2", "s12", 55, "yes"],
    ],
  },

  // v3 — a confirmation that has aged out into stale.
  {
    venueId: "v3",
    attributeKey: "restrooms",
    entries: [
      ["o1", "s13", 520, "yes"],
      ["o4", "s14", 540, "yes"],
      ["o5", "s15", 610, "yes"],
    ],
  },
  {
    venueId: "v3",
    attributeKey: "parking",
    entries: [
      ["o6", "s13", 33, "yes"],
      ["o7", "s14", 41, "yes"],
      ["o8", "s16", 58, "yes"],
    ],
  },

  // v4 — one voice only; corroboration is structurally required.
  {
    venueId: "v4",
    attributeKey: "lighting",
    entries: [["o3", "s17", 15, "yes"]],
  },

  // v6 — fenced pulled to disputed by a single credible "no" (VC-311).
  {
    venueId: "v6",
    attributeKey: "fenced",
    entries: [
      ["o1", "s18", 20, "yes"],
      ["o2", "s19", 35, "yes"],
      ["o4", "s20", 47, "yes"],
      ["o9", "s21", 6, "no"],
    ],
  },
  {
    venueId: "v6",
    attributeKey: "water",
    entries: [
      ["o5", "s18", 20, "yes"],
      ["o6", "s19", 35, "yes"],
      ["o7", "s20", 47, "yes"],
      ["o8", "s21", 6, "unsure"],
    ],
  },
];

export const mockVenueObservations: VenueObservation[] = seed.flatMap((row) =>
  row.entries.map(([userId, meetupId, days, value]) => ({
    id: `vo-${row.venueId}-${row.attributeKey}-${userId}-${meetupId}`,
    venueId: row.venueId,
    attributeKey: row.attributeKey,
    value,
    userId,
    meetupId,
    observedAt: daysAgo(days),
  })),
);
