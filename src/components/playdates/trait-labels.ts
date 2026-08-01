import {
  type LifeStage,
  type MeetupType,
  type PlayStyle,
  type FeedbackTag,
} from "@/lib/playdates/types";

/**
 * UI-704 — all iconography carries a descriptive label and a text alternative.
 * Emoji are decorative here; the label is the accessible name.
 */
export const PLAY_STYLE_LABELS: Record<PlayStyle, { label: string; emoji: string }> = {
  wrestler: { label: "Wrestler", emoji: "🤼" },
  chaser: { label: "Chaser", emoji: "💨" },
  toy_focused: { label: "Toy-focused", emoji: "🎾" },
  parallel: { label: "Parallel player", emoji: "🌿" },
  observer: { label: "Observer", emoji: "👀" },
};

export const LIFE_STAGE_LABELS: Record<LifeStage, { label: string; emoji: string }> = {
  puppy: { label: "Puppy", emoji: "🍼" },
  adolescent: { label: "Adolescent", emoji: "🌀" },
  adult: { label: "Adult", emoji: "🐾" },
  senior: { label: "Senior", emoji: "👴" },
};

export const MEETUP_TYPE_LABELS: Record<MeetupType, { label: string; emoji: string }> = {
  on_leash_walk: { label: "Leashed walk", emoji: "🦮" },
  fenced_yard: { label: "Fenced space", emoji: "🚧" },
  open_park: { label: "Open park", emoji: "🌳" },
  indoor: { label: "Indoor", emoji: "🏠" },
};

export const FEEDBACK_TAG_LABELS: Record<FeedbackTag, string> = {
  too_rough: "Too rough",
  too_shy: "Too shy",
  great_energy_match: "Great energy match",
  guarded_resources: "Guarded resources",
  owner_was_great: "Owner was great",
  didnt_show: "Didn't show",
};

const ENERGY_WORDS = ["Couch potato", "Couch potato", "Low-key", "Steady", "Busy", "Perpetual motion"];

export function energyLabel(energy: number): string {
  return ENERGY_WORDS[Math.min(5, Math.max(1, Math.round(energy)))];
}

const SOCIABILITY_WORDS = ["", "Very selective", "Selective", "Warms up", "Friendly", "Loves everyone"];

export function sociabilityLabel(value: number): string {
  return SOCIABILITY_WORDS[Math.min(5, Math.max(1, Math.round(value)))];
}
