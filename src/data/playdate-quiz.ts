/**
 * The Pet Personality Quiz (§5.1) — canine v1.
 *
 * 15 questions in the default path (UI-708), one per screen, ~90 seconds.
 * Every question describes *observable behaviour*, never an abstraction:
 * "How social is your dog?" is unanswerable and invites self-flattery.
 * "A dog you've never met walks straight up to yours — what happens?" is not.
 *
 * Every question offers a non-committal option (PQ-102) which contributes no
 * value and lowers that dimension's confidence instead of forcing a guess.
 */
import { type QuizQuestion } from "@/lib/playdates/types";

const NOT_SURE = {
  key: "not_sure",
  label: "I honestly don't know yet",
  emoji: "🤔",
  notSure: true,
} as const;

export const playdateQuizQuestions: QuizQuestion[] = [
  {
    key: "park_approach",
    kind: "trait",
    prompt: "A dog you've never met walks straight up to yours at the park. What happens?",
    dimensions: ["confidence", "dog_sociability"],
    options: [
      {
        key: "play_bow",
        label: "Play bow, instantly",
        emoji: "🙇",
        signals: { confidence: 5, dog_sociability: 5 },
      },
      {
        key: "sniff_then_decide",
        label: "Sniff, then decide",
        emoji: "👃",
        signals: { confidence: 3, dog_sociability: 4 },
      },
      {
        key: "freeze_or_hide",
        label: "Freeze, or move behind me",
        emoji: "🫥",
        signals: { confidence: 1, dog_sociability: 2 },
      },
      {
        key: "tells_them_off",
        label: "Tells them off",
        emoji: "😤",
        signals: { confidence: 4, dog_sociability: 2 },
      },
      NOT_SURE,
    ],
  },
  {
    key: "after_walk",
    kind: "trait",
    prompt: "You get home from a solid 30-minute walk. Your dog…",
    dimensions: ["energy"],
    options: [
      {
        key: "ready_again",
        label: "Brings the leash back. Round two?",
        emoji: "🌀",
        signals: { energy: 5 },
      },
      { key: "settles_soon", label: "Pesters for ten minutes, then settles", emoji: "🐕", signals: { energy: 4 } },
      { key: "naps", label: "Naps, wakes up for dinner", emoji: "😴", signals: { energy: 3 } },
      {
        key: "asleep_immediately",
        label: "Asleep before I get my shoes off",
        emoji: "🛌",
        signals: { energy: 1 },
      },
      NOT_SURE,
    ],
  },
  {
    key: "favourite_move",
    kind: "trait",
    prompt: "At the park, your dog's signature move is…",
    dimensions: ["play_style"],
    options: [
      {
        key: "wrestler",
        label: "Full-contact wrestling",
        emoji: "🤼",
        signals: { play_style: "wrestler" },
      },
      { key: "chaser", label: "Chase, or be chased", emoji: "💨", signals: { play_style: "chaser" } },
      {
        key: "toy_focused",
        label: "Guards the ball like it's treasure",
        emoji: "🎾",
        signals: { play_style: "toy_focused" },
      },
      {
        key: "parallel",
        label: "Sniffs nearby, doing their own thing",
        emoji: "🌿",
        signals: { play_style: "parallel" },
      },
      {
        key: "observer",
        label: "Watches the chaos from my feet",
        emoji: "👀",
        signals: { play_style: "observer" },
      },
      NOT_SURE,
    ],
  },
  {
    key: "group_greeting",
    kind: "trait",
    prompt: "Three dogs come over at once. Your dog…",
    dimensions: ["dog_sociability", "confidence"],
    options: [
      {
        key: "delighted",
        label: "Delighted. The more the better",
        emoji: "🎉",
        signals: { dog_sociability: 5, confidence: 5 },
      },
      {
        key: "handles_it",
        label: "Handles it, but checks in with me",
        emoji: "🙂",
        signals: { dog_sociability: 4, confidence: 3 },
      },
      {
        key: "overwhelmed",
        label: "Gets overwhelmed and disengages",
        emoji: "😰",
        signals: { dog_sociability: 2, confidence: 2 },
      },
      {
        key: "needs_space",
        label: "Needs space immediately",
        emoji: "🛑",
        signals: { dog_sociability: 1, confidence: 2 },
      },
      NOT_SURE,
    ],
  },
  {
    key: "dog_selectivity",
    kind: "trait",
    prompt: "Honestly — how many dogs does yours actually like?",
    helper: "There is no wrong answer here. Selective dogs get better matches, not fewer.",
    dimensions: ["dog_sociability"],
    options: [
      { key: "everyone", label: "Everyone. Every single one", emoji: "💕", signals: { dog_sociability: 5 } },
      { key: "most", label: "Most of them", emoji: "😊", signals: { dog_sociability: 4 } },
      { key: "some", label: "Some. It depends on the dog", emoji: "🤷", signals: { dog_sociability: 3 } },
      { key: "a_few", label: "A specific few", emoji: "🫂", signals: { dog_sociability: 2 } },
      { key: "very_few", label: "Almost none, and I know exactly which", emoji: "🎯", signals: { dog_sociability: 1 } },
      NOT_SURE,
    ],
  },
  {
    key: "loud_noise",
    kind: "trait",
    prompt: "A skateboard clatters past on the sidewalk. Your dog…",
    dimensions: ["confidence"],
    options: [
      { key: "ignores", label: "Doesn't even look up", emoji: "😎", signals: { confidence: 5 } },
      { key: "looks_moves_on", label: "Looks, then moves on", emoji: "👌", signals: { confidence: 4 } },
      { key: "startles_recovers", label: "Startles, recovers in a minute", emoji: "😬", signals: { confidence: 2 } },
      { key: "wants_home", label: "Wants to go home now", emoji: "🏠", signals: { confidence: 1 } },
      NOT_SURE,
    ],
  },
  {
    key: "size_band",
    kind: "trait",
    prompt: "Roughly how much does your dog weigh?",
    helper: "Size is a real safety input, so we ask directly rather than guessing from breed.",
    dimensions: ["size_kg"],
    options: [
      { key: "under_7", label: "Under 7 kg — pocket sized", emoji: "🐁", signals: { size_kg: 5 } },
      { key: "7_15", label: "7–15 kg", emoji: "🐕", signals: { size_kg: 11 } },
      { key: "15_25", label: "15–25 kg", emoji: "🦮", signals: { size_kg: 20 } },
      { key: "25_40", label: "25–40 kg", emoji: "🐕‍🦺", signals: { size_kg: 32 } },
      { key: "over_40", label: "Over 40 kg — a small horse", emoji: "🐎", signals: { size_kg: 48 } },
      NOT_SURE,
    ],
  },
  {
    key: "life_stage",
    kind: "trait",
    prompt: "Where's your dog in life?",
    dimensions: ["life_stage"],
    options: [
      { key: "puppy", label: "Puppy — under 6 months", emoji: "🍼", signals: { life_stage: "puppy" } },
      {
        key: "adolescent",
        label: "Adolescent — 6 months to 2 years",
        emoji: "🌀",
        signals: { life_stage: "adolescent" },
      },
      { key: "adult", label: "Adult — 2 to 8 years", emoji: "🐾", signals: { life_stage: "adult" } },
      { key: "senior", label: "Senior — 8 years and up", emoji: "👴", signals: { life_stage: "senior" } },
      NOT_SURE,
    ],
  },
  {
    key: "vocal",
    kind: "trait",
    prompt: "During play, your dog is…",
    dimensions: ["noise"],
    options: [
      { key: "silent", label: "Completely silent", emoji: "🤐", signals: { noise: 1 } },
      { key: "occasional", label: "The occasional excited yap", emoji: "🗣️", signals: { noise: 3 } },
      { key: "shrieky", label: "Loud enough that people stare", emoji: "📢", signals: { noise: 5 } },
      NOT_SURE,
    ],
  },
  {
    key: "resource_guarding",
    kind: "trait",
    prompt: "Is there anything your dog would rather another dog didn't come near?",
    helper: "Select everything that applies. This is used to keep meetups safe, never to rank you down.",
    dimensions: ["resource_guarding"],
    multi: true,
    options: [
      { key: "none", label: "Nothing — shares happily", emoji: "🤝", signals: { resource_guarding: [] } },
      { key: "toys", label: "Toys and balls", emoji: "🎾", signals: { resource_guarding: ["toys"] } },
      { key: "food", label: "Food and treats", emoji: "🍖", signals: { resource_guarding: ["food"] } },
      { key: "handler", label: "Me — gets protective", emoji: "🧍", signals: { resource_guarding: ["handler"] } },
      NOT_SURE,
    ],
  },
  {
    key: "recall",
    kind: "trait",
    prompt: "Off leash, mid-sprint, you call your dog's name. Honestly?",
    dimensions: ["recall_reliability"],
    options: [
      { key: "instant", label: "Comes back immediately, every time", emoji: "🎯", signals: { recall_reliability: 5 } },
      { key: "usually", label: "Usually — unless there's a squirrel", emoji: "🐿️", signals: { recall_reliability: 4 } },
      { key: "eventually", label: "Eventually, on their own schedule", emoji: "🕰️", signals: { recall_reliability: 2 } },
      { key: "never_off_leash", label: "We don't do off leash yet", emoji: "🦮", signals: { recall_reliability: 1 } },
      NOT_SURE,
    ],
  },
  {
    key: "play_intensity",
    kind: "trait",
    prompt: "Your dog's play gets…",
    dimensions: ["energy", "play_style"],
    options: [
      { key: "rowdy", label: "Rowdy. Body slams are affection", emoji: "💥", signals: { energy: 5, play_style: "wrestler" } },
      { key: "zoomy", label: "Fast. It's all running", emoji: "🏃", signals: { energy: 4, play_style: "chaser" } },
      { key: "gentle", label: "Gentle. Lots of pausing", emoji: "🫧", signals: { energy: 2, play_style: "parallel" } },
      { key: "brief", label: "Brief, then done", emoji: "⏱️", signals: { energy: 2, play_style: "observer" } },
      NOT_SURE,
    ],
  },
  {
    key: "preferred_meetup_types",
    kind: "handler",
    prompt: "Where would a first meetup actually work for you?",
    helper: "Pick everything that works. We only propose meetups at verified public venues.",
    dimensions: [],
    multi: true,
    options: [
      {
        key: "on_leash_walk",
        label: "A leashed walk",
        emoji: "🦮",
        preference: { preferredMeetupTypes: ["on_leash_walk"] },
      },
      {
        key: "fenced_yard",
        label: "Somewhere fully fenced",
        emoji: "🚧",
        preference: { preferredMeetupTypes: ["fenced_yard"] },
      },
      {
        key: "open_park",
        label: "An open park",
        emoji: "🌳",
        preference: { preferredMeetupTypes: ["open_park"] },
      },
      {
        key: "indoor",
        label: "An indoor facility",
        emoji: "🏠",
        preference: { preferredMeetupTypes: ["indoor"] },
      },
    ],
  },
  {
    key: "availability",
    kind: "handler",
    prompt: "When are you realistically free?",
    helper: "Used to find people whose schedule overlaps yours — a mismatch never hides a good pair, it just ranks lower.",
    dimensions: [],
    multi: true,
    options: [
      { key: "sat_morning", label: "Saturday mornings", emoji: "🌅", preference: { availabilityWindows: ["sat-morning"] } },
      { key: "sun_morning", label: "Sunday mornings", emoji: "☀️", preference: { availabilityWindows: ["sun-morning"] } },
      { key: "weekday_evening", label: "Weekday evenings", emoji: "🌆", preference: { availabilityWindows: ["tue-evening", "thu-evening"] } },
      { key: "weekday_midday", label: "Weekday middays", emoji: "🕛", preference: { availabilityWindows: ["wed-midday"] } },
      { key: "sat_evening", label: "Saturday evenings", emoji: "🌙", preference: { availabilityWindows: ["sat-evening"] } },
    ],
  },
  {
    key: "travel_distance",
    kind: "handler",
    prompt: "How far would you travel for a really good match?",
    dimensions: [],
    options: [
      { key: "two", label: "Walking distance — 2 miles", emoji: "🚶", preference: { maxTravelMiles: 2 } },
      { key: "five", label: "A short drive — 5 miles", emoji: "🚗", preference: { maxTravelMiles: 5 } },
      { key: "ten", label: "Across town — 10 miles", emoji: "🛣️", preference: { maxTravelMiles: 10 } },
      { key: "twenty_five", label: "For the right dog — 25 miles", emoji: "🗺️", preference: { maxTravelMiles: 25 } },
    ],
  },
];

export const TRAIT_QUESTION_COUNT = playdateQuizQuestions.filter((q) => q.kind === "trait").length;
export const QUIZ_ESTIMATED_SECONDS = 90;

export function findQuestion(key: string): QuizQuestion | undefined {
  return playdateQuizQuestions.find((q) => q.key === key);
}
