/**
 * Explainability (§6.6).
 *
 * Reason strings are *templated from the score's own contributions*, never
 * free-form generated text (RE-603). That guarantees the sentence on the card
 * is arithmetically true, and it keeps latency stable and predictable.
 */
import {
  GUARDING_GATE,
  PLAY_STYLE_MATRIX,
  TRAIT_WEIGHTS,
  type WeightedDimension,
} from "./scoring";
import {
  type DistanceBand,
  type FeatureContribution,
  type PetTraitVector,
  type PlayStyle,
} from "./types";

const PLAY_STYLE_NOUNS: Record<PlayStyle, string> = {
  wrestler: "wrestlers",
  chaser: "chasers",
  toy_focused: "toy fanatics",
  parallel: "parallel players",
  observer: "observers",
};

const PLAY_STYLE_ADJECTIVES: Record<PlayStyle, string> = {
  wrestler: "a wrestler",
  chaser: "a chaser",
  toy_focused: "toy-focused",
  parallel: "a parallel player",
  observer: "an observer",
};

const ENERGY_WORDS = ["", "couch potato", "low-key", "steady", "busy", "perpetual motion"];

/** A contributor only earns a clause if it beat this fraction of its own weight. */
const STRONG_SUBSCORE = 0.75;

function phraseFor(
  dimension: WeightedDimension,
  actor: PetTraitVector,
  candidate: PetTraitVector,
): string | null {
  switch (dimension) {
    case "play_style": {
      if (actor.play_style === candidate.play_style) {
        return `Both ${PLAY_STYLE_NOUNS[actor.play_style]}`;
      }
      return `${PLAY_STYLE_ADJECTIVES[candidate.play_style]} to your ${PLAY_STYLE_ADJECTIVES[actor.play_style].replace(/^an? /, "")}`;
    }
    case "energy": {
      const level = ENERGY_WORDS[Math.round((actor.energy + candidate.energy) / 2)] ?? "matching";
      return `matching ${level} energy`;
    }
    case "confidence":
      return "similar confidence around new dogs";
    case "size_kg":
      return "a safe size match";
    case "life_stage":
      return actor.life_stage === candidate.life_stage
        ? `both ${actor.life_stage}s`
        : "compatible life stages";
    case "noise":
      return "the same volume setting";
    case "handler_pref_overlap":
      return "you both like the same kind of meetup";
    default:
      return null;
  }
}

/** Sentence-cases the first clause without touching the rest. */
function joinClauses(clauses: string[]): string {
  if (clauses.length === 0) return "Worth a sniff";
  const [first, ...rest] = clauses;
  const head = first.charAt(0).toUpperCase() + first.slice(1);
  return rest.length > 0 ? `${head} with ${rest.join(" and ")}` : head;
}

/**
 * RE-602 — every card displays a reason built from the top two positive
 * contributors, plus the distance band.
 */
export function buildReasonString(
  contributions: FeatureContribution[],
  actorTraits: PetTraitVector,
  candidateTraits: PetTraitVector,
  distanceBand: DistanceBand,
): string {
  const clauses = contributions
    .filter((c) => c.kind === "trait" && c.subScore >= STRONG_SUBSCORE)
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((c) => phraseFor(c.dimension as WeightedDimension, actorTraits, candidateTraits))
    .filter((clause): clause is string => Boolean(clause));

  return `${joinClauses(clauses)} · ${distanceBand} away`;
}

/**
 * RE-604 — where a soft gate materially reduced the score, say so plainly.
 * This is a feature, not a wart: it prevents the exact failure mode (a bad
 * surprise at the park) that makes people quit.
 */
export function buildGateDisclosures(
  contributions: FeatureContribution[],
  candidateName: string,
  candidateTraits: PetTraitVector,
  actorTraits: PetTraitVector,
): string[] {
  const disclosures: string[] = [];
  const gate = (dimension: string) =>
    contributions.find((c) => c.kind === "gate" && c.dimension === dimension)?.subScore ?? 1;

  if (gate("guarding_gate") <= GUARDING_GATE) {
    const guarder =
      candidateTraits.resource_guarding.length > 0
        ? { name: candidateName, traits: candidateTraits }
        : { name: "Your pup", traits: actorTraits };
    const triggers = guarder.traits.resource_guarding.join(" and ");
    disclosures.push(
      `${guarder.name} guards ${triggers} — worth leaving ${triggers === "handler" ? "the treats" : triggers} at home.`,
    );
  }

  if (gate("sociability_gate") < 0.6) {
    const shyer =
      candidateTraits.dog_sociability <= actorTraits.dog_sociability ? candidateName : "Your pup";
    disclosures.push(`${shyer} is selective about dogs — a quiet first meetup will go better.`);
  }

  if (gate("confidence_gate") < 1) {
    disclosures.push("One of these two is much bolder than the other — take introductions slowly.");
  }

  const modifier = (dimension: string) =>
    contributions.find((c) => c.kind === "modifier" && c.dimension === dimension)?.subScore ?? 1;

  if (modifier("availability_overlap") <= 0.5) {
    disclosures.push("Your usual free times don't overlap much — worth checking before proposing.");
  }

  if (modifier("confidence_penalty") < 0.95) {
    disclosures.push(
      "One of these profiles is still new, so this score is an estimate rather than a promise.",
    );
  }

  return disclosures;
}

/** Sanity check used by the scorer's tests: complementarity, not similarity. */
export function playStyleCompatibility(a: PlayStyle, b: PlayStyle): number {
  return PLAY_STYLE_MATRIX[a][b];
}

export const TRAIT_WEIGHT_TOTAL = Object.values(TRAIT_WEIGHTS).reduce((a, b) => a + b, 0);
