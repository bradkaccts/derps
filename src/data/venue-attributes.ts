/**
 * Venue attribute definitions (VC-112, VC-604).
 *
 * Configuration, not code: adding or retiring a question is a data edit. Only
 * attributes a person standing at the venue can answer with certainty in under
 * two seconds are eligible (VC-111) — anything requiring a walk of the
 * perimeter, a sign, or a judgement call stays out.
 */
import {
  type VenueAttributeDefinition,
  type VenueAttributeKey,
  type VenueType,
} from "@/lib/playdates/types";

const OUTDOOR: VenueType[] = ["dog_park", "public_park", "trail", "beach"];
const ALL_TYPES: VenueType[] = [
  "dog_park",
  "public_park",
  "trail",
  "beach",
  "pet_friendly_patio",
  "indoor_facility",
];

export const venueAttributeDefinitions: VenueAttributeDefinition[] = [
  {
    attributeKey: "parking",
    questionText: "Was there somewhere to park?",
    class: "standard",
    halfLifeDays: 365,
    applicableVenueTypes: ALL_TYPES,
    enabled: true,
  },
  {
    attributeKey: "restrooms",
    questionText: "Are there restrooms here?",
    class: "standard",
    halfLifeDays: 365,
    applicableVenueTypes: ALL_TYPES,
    enabled: true,
  },
  {
    attributeKey: "water",
    questionText: "Is there drinking water for dogs?",
    class: "standard",
    halfLifeDays: 180,
    applicableVenueTypes: ALL_TYPES,
    enabled: true,
  },
  {
    attributeKey: "shade",
    questionText: "Is there decent shade?",
    class: "standard",
    halfLifeDays: 365,
    applicableVenueTypes: OUTDOOR,
    enabled: true,
  },
  {
    attributeKey: "separate_small_dog_area",
    questionText: "Is there a separate small-dog area?",
    class: "standard",
    halfLifeDays: 365,
    // A beach or a trail has no such thing to observe.
    applicableVenueTypes: ["dog_park", "indoor_facility"],
    enabled: true,
  },
  {
    attributeKey: "lighting",
    questionText: "Is it lit after dark?",
    class: "standard",
    halfLifeDays: 365,
    applicableVenueTypes: OUTDOOR,
    enabled: true,
  },
  {
    // VC-310..VC-313 — asymmetric thresholds; a false positive here puts a dog
    // off-leash near traffic.
    attributeKey: "fenced",
    questionText: "Is the off-leash area fully fenced?",
    class: "safety_critical",
    halfLifeDays: 180,
    applicableVenueTypes: ["dog_park", "public_park", "indoor_facility"],
    enabled: true,
  },
];

export const venueAttributeByKey: Record<VenueAttributeKey, VenueAttributeDefinition> =
  Object.fromEntries(venueAttributeDefinitions.map((d) => [d.attributeKey, d])) as Record<
    VenueAttributeKey,
    VenueAttributeDefinition
  >;

export const venueAttributeKeys = venueAttributeDefinitions.map(
  (d) => d.attributeKey,
) as VenueAttributeKey[];
