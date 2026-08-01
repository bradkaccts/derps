/**
 * The Vibe Card (PQ-108).
 *
 * On quiz completion the owner gets a shareable illustrated archetype derived
 * from the trait vector. It is the payoff that makes a behavioural assessment
 * feel like a BuzzFeed quiz, and it is the reason completion rates clear 80%.
 */
import { type PetTraitVector, type PlayStyle } from "./types";

export interface VibeArchetype {
  key: string;
  title: string;
  emoji: string;
  tagline: string;
  /** Tailwind gradient classes for the shareable card face. */
  gradient: string;
}

const ARCHETYPES: Record<string, VibeArchetype> = {
  enthusiastic_menace: {
    key: "enthusiastic_menace",
    title: "The Enthusiastic Menace",
    emoji: "🌪️",
    tagline: "Zero volume control, infinite goodwill. Needs a wrestling partner with stamina.",
    gradient: "from-accent/25 via-accent/10 to-primary/15",
  },
  dignified_observer: {
    key: "dignified_observer",
    title: "The Dignified Observer",
    emoji: "🧐",
    tagline: "Supervises play from a respectful distance. Judges, but kindly.",
    gradient: "from-primary/20 via-secondary/40 to-muted",
  },
  velcro_diplomat: {
    key: "velcro_diplomat",
    title: "The Velcro Diplomat",
    emoji: "🤝",
    tagline: "Gets on with everyone, checks in with you every ninety seconds.",
    gradient: "from-primary/25 via-primary/10 to-secondary/40",
  },
  ball_is_life: {
    key: "ball_is_life",
    title: "Ball Is Life",
    emoji: "🎾",
    tagline: "The toy is the point. The other dog is optional. Bring two balls.",
    gradient: "from-accent/20 via-secondary/40 to-primary/15",
  },
  gentle_soul: {
    key: "gentle_soul",
    title: "The Gentle Soul",
    emoji: "🫧",
    tagline: "Soft, careful, easily overwhelmed. Deserves a calm, patient friend.",
    gradient: "from-secondary/50 via-muted to-primary/10",
  },
  sprint_specialist: {
    key: "sprint_specialist",
    title: "The Sprint Specialist",
    emoji: "💨",
    tagline: "Chase is the only game. Will run rings around anything with legs.",
    gradient: "from-accent/25 via-primary/10 to-secondary/40",
  },
  selective_gentleman: {
    key: "selective_gentleman",
    title: "The Selective Type",
    emoji: "🎯",
    tagline: "Has three friends and that is a complete social calendar. Quality over quantity.",
    gradient: "from-muted via-secondary/40 to-primary/15",
  },
  couch_ambassador: {
    key: "couch_ambassador",
    title: "The Couch Ambassador",
    emoji: "🛋️",
    tagline: "Enthusiastically horizontal. Will meet you at the park, briefly.",
    gradient: "from-secondary/50 via-muted to-accent/10",
  },
};

const STYLE_DEFAULT: Record<PlayStyle, string> = {
  wrestler: "enthusiastic_menace",
  chaser: "sprint_specialist",
  toy_focused: "ball_is_life",
  parallel: "velcro_diplomat",
  observer: "dignified_observer",
};

/**
 * Deterministic: the same vector always produces the same card, so the
 * archetype is stable across re-derivations unless the traits actually moved.
 */
export function deriveVibeArchetype(traits: PetTraitVector): VibeArchetype {
  const { energy, dog_sociability: soc, confidence, play_style: style } = traits;

  if (soc <= 2) return ARCHETYPES.selective_gentleman;
  if (confidence <= 2 && energy <= 3) return ARCHETYPES.gentle_soul;
  if (energy <= 2) return ARCHETYPES.couch_ambassador;
  if (energy >= 4.5 && style === "wrestler") return ARCHETYPES.enthusiastic_menace;
  if (soc >= 4.5 && confidence >= 4) return ARCHETYPES.velcro_diplomat;

  return ARCHETYPES[STYLE_DEFAULT[style]] ?? ARCHETYPES.velcro_diplomat;
}

export const allArchetypes = Object.values(ARCHETYPES);

/**
 * PQ-111 — the AI Bio-Generator drafts a playdate bio from the trait vector.
 * Generated text is always an *editable draft*, never auto-published, which is
 * why this returns a string for a form field rather than writing anywhere.
 */
export function draftPlaydateBio(name: string, traits: PetTraitVector): string {
  const archetype = deriveVibeArchetype(traits);
  const energyWord =
    traits.energy >= 4.5 ? "never runs out of battery" : traits.energy <= 2 ? "runs on nap time" : "has a sensible off switch";
  const styleWord = {
    wrestler: "plays with his whole body",
    chaser: "would chase anything that moves",
    toy_focused: "brings a toy to every introduction",
    parallel: "prefers to sniff alongside a friend",
    observer: "likes to watch before joining in",
  }[traits.play_style];
  const socialWord =
    traits.dog_sociability >= 4
      ? "makes friends fast"
      : traits.dog_sociability <= 2
        ? "is choosy, and the right friend is worth the wait"
        : "warms up after a proper hello";

  return `${name} is ${archetype.title.replace(/^The /, "").toLowerCase()} — ${energyWord}, ${styleWord}, and ${socialWord}. Looking for someone to do laps with.`;
}
