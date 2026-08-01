/**
 * Trait derivation (§5.1, PQ-103/104).
 *
 * Raw answers are the source of truth and are persisted separately from the
 * derived vector. Vectors are reconstructible artefacts: when the derivation
 * logic changes we bump `derivationVersion` and re-derive every stored vector
 * from the retained answers, without re-quizzing a single user. This is the
 * difference between being able to iterate on the model and being frozen by
 * your own data.
 */
import { playdateQuizQuestions } from "@/data/playdate-quiz";
import {
  DERIVATION_VERSION,
  QUIZ_VERSION,
  type GuardingTrigger,
  type HandlerPreferenceInput,
  type LifeStage,
  type PetPersonality,
  type PetTraitVector,
  type PlayStyle,
  type QuizQuestion,
  type QuizResponse,
  type TraitConfidence,
  type TraitDimension,
} from "./types";

export const ALL_TRAIT_DIMENSIONS: TraitDimension[] = [
  "energy",
  "play_style",
  "dog_sociability",
  "confidence",
  "size_kg",
  "life_stage",
  "noise",
  "resource_guarding",
  "recall_reliability",
];

/**
 * Neutral defaults used where a dimension has no signal. They are deliberately
 * mid-scale: an unknown dimension should neither help nor hurt a pairing, and
 * the confidence penalty (§6.4) is what actually communicates the uncertainty.
 */
export const DEFAULT_TRAITS: PetTraitVector = {
  energy: 3,
  play_style: "parallel",
  dog_sociability: 3,
  confidence: 3,
  size_kg: 15,
  life_stage: "adult",
  noise: 3,
  resource_guarding: [],
  recall_reliability: 3,
};

export const ZERO_CONFIDENCE: TraitConfidence = ALL_TRAIT_DIMENSIONS.reduce((acc, dim) => {
  acc[dim] = 0;
  return acc;
}, {} as TraitConfidence);

export const DEFAULT_HANDLER_PREFERENCES: HandlerPreferenceInput = {
  maxTravelMiles: 10,
  preferredMeetupTypes: ["open_park"],
  availabilityWindows: ["sat-morning"],
};

interface Accumulator {
  numeric: Partial<Record<TraitDimension, number[]>>;
  playStyles: PlayStyle[];
  lifeStages: LifeStage[];
  guarding: Set<GuardingTrigger>;
  guardingAnswered: boolean;
  /** Answered-with-a-value count per dimension, used for confidence. */
  answered: Partial<Record<TraitDimension, number>>;
  /** Total questions that address the dimension. */
  asked: Partial<Record<TraitDimension, number>>;
}

function emptyAccumulator(): Accumulator {
  return {
    numeric: {},
    playStyles: [],
    lifeStages: [],
    guarding: new Set(),
    guardingAnswered: false,
    answered: {},
    asked: {},
  };
}

function mode<T extends string>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  let best = values[0];
  let bestCount = 0;
  counts.forEach((count, value) => {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  });
  return best;
}

const average = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

/**
 * Derive a trait vector plus per-dimension confidence from raw answers.
 * Pure and deterministic — the same answers always produce the same vector,
 * which is what makes a batch re-derivation job safe to run.
 */
export function deriveTraitVector(
  responses: QuizResponse[],
  questions: QuizQuestion[] = playdateQuizQuestions,
): { traits: PetTraitVector; confidence: TraitConfidence } {
  const acc = emptyAccumulator();
  const byKey = new Map(responses.map((r) => [r.questionKey, r]));

  questions
    .filter((q) => q.kind === "trait")
    .forEach((question) => {
      question.dimensions.forEach((dim) => {
        acc.asked[dim] = (acc.asked[dim] ?? 0) + 1;
      });

      const response = byKey.get(question.key);
      if (!response) return;

      const chosen = question.options.filter((o) => response.answerKeys.includes(o.key));
      // PQ-102 — a "not sure yet" answer counts as asked but never as answered.
      const informative = chosen.filter((o) => !o.notSure);
      if (informative.length === 0) return;

      question.dimensions.forEach((dim) => {
        acc.answered[dim] = (acc.answered[dim] ?? 0) + 1;
      });

      informative.forEach((option) => {
        const signals = option.signals;
        if (!signals) return;

        (["energy", "dog_sociability", "confidence", "size_kg", "noise", "recall_reliability"] as const).forEach(
          (dim) => {
            const value = signals[dim];
            if (typeof value === "number") {
              acc.numeric[dim] = [...(acc.numeric[dim] ?? []), value];
            }
          },
        );

        if (signals.play_style) acc.playStyles.push(signals.play_style);
        if (signals.life_stage) acc.lifeStages.push(signals.life_stage);
        if (signals.resource_guarding) {
          acc.guardingAnswered = true;
          signals.resource_guarding.forEach((trigger) => acc.guarding.add(trigger));
        }
      });
    });

  const numericOrDefault = (dim: TraitDimension, fallback: number) => {
    const values = acc.numeric[dim];
    return values && values.length > 0 ? Number(average(values).toFixed(2)) : fallback;
  };

  const traits: PetTraitVector = {
    energy: numericOrDefault("energy", DEFAULT_TRAITS.energy),
    play_style: mode(acc.playStyles) ?? DEFAULT_TRAITS.play_style,
    dog_sociability: numericOrDefault("dog_sociability", DEFAULT_TRAITS.dog_sociability),
    confidence: numericOrDefault("confidence", DEFAULT_TRAITS.confidence),
    size_kg: numericOrDefault("size_kg", DEFAULT_TRAITS.size_kg),
    life_stage: mode(acc.lifeStages) ?? DEFAULT_TRAITS.life_stage,
    noise: numericOrDefault("noise", DEFAULT_TRAITS.noise),
    resource_guarding: [...acc.guarding],
    recall_reliability: numericOrDefault("recall_reliability", DEFAULT_TRAITS.recall_reliability),
  };

  const confidence = ALL_TRAIT_DIMENSIONS.reduce((out, dim) => {
    const asked = acc.asked[dim] ?? 0;
    const answered = acc.answered[dim] ?? 0;
    out[dim] = asked === 0 ? 0 : Number((answered / asked).toFixed(2));
    return out;
  }, {} as TraitConfidence);

  // "Nothing bothers my dog" is a real answer, not an absence of one.
  if (acc.guardingAnswered) confidence.resource_guarding = 1;

  return { traits, confidence };
}

export function derivePreferenceInput(
  responses: QuizResponse[],
  questions: QuizQuestion[] = playdateQuizQuestions,
): HandlerPreferenceInput {
  const result: HandlerPreferenceInput = {
    maxTravelMiles: DEFAULT_HANDLER_PREFERENCES.maxTravelMiles,
    preferredMeetupTypes: [],
    availabilityWindows: [],
  };
  const byKey = new Map(responses.map((r) => [r.questionKey, r]));

  questions
    .filter((q) => q.kind === "handler")
    .forEach((question) => {
      const response = byKey.get(question.key);
      if (!response) return;
      question.options
        .filter((o) => response.answerKeys.includes(o.key) && !o.notSure)
        .forEach((option) => {
          const pref = option.preference;
          if (!pref) return;
          if (typeof pref.maxTravelMiles === "number") result.maxTravelMiles = pref.maxTravelMiles;
          if (pref.preferredMeetupTypes) {
            result.preferredMeetupTypes = [
              ...new Set([...result.preferredMeetupTypes, ...pref.preferredMeetupTypes]),
            ];
          }
          if (pref.availabilityWindows) {
            result.availabilityWindows = [
              ...new Set([...result.availabilityWindows, ...pref.availabilityWindows]),
            ];
          }
        });
    });

  if (result.preferredMeetupTypes.length === 0) {
    result.preferredMeetupTypes = [...DEFAULT_HANDLER_PREFERENCES.preferredMeetupTypes];
  }
  if (result.availabilityWindows.length === 0) {
    result.availabilityWindows = [...DEFAULT_HANDLER_PREFERENCES.availabilityWindows];
  }
  return result;
}

/** Mean confidence across dimensions — the input to the §6.4 confidence penalty. */
export function meanConfidence(confidence: TraitConfidence): number {
  const values = ALL_TRAIT_DIMENSIONS.map((dim) => confidence[dim] ?? 0);
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(3));
}

/**
 * PQ-101 — a pet cannot enter the swipe feed, in either direction, until its
 * quiz is complete. An unquizzed pet is unscoreable, and letting it in poisons
 * the feed for everyone else.
 */
export function isQuizComplete(personality: PetPersonality | undefined): boolean {
  return Boolean(personality?.completedAt);
}

export function quizProgress(responses: QuizResponse[], questions = playdateQuizQuestions) {
  const answeredKeys = new Set(responses.map((r) => r.questionKey));
  const answered = questions.filter((q) => answeredKeys.has(q.key)).length;
  return {
    answered,
    total: questions.length,
    percent: Math.round((answered / questions.length) * 100),
    remainingSeconds: Math.max(0, Math.round(((questions.length - answered) / questions.length) * 90)),
  };
}

export function buildPersonality(
  petId: string,
  responses: QuizResponse[],
  previous?: PetPersonality,
): PetPersonality {
  const { traits, confidence } = deriveTraitVector(responses);
  const now = new Date().toISOString();
  const complete = responses.length >= playdateQuizQuestions.length;

  // PQ-106 — the previous vector is retained as history, never overwritten.
  const history = previous
    ? [
        ...previous.history,
        {
          traits: previous.traits,
          confidence: previous.confidence,
          derivationVersion: previous.derivationVersion,
          replacedAt: now,
        },
      ]
    : [];

  return {
    petId,
    quizVersion: QUIZ_VERSION,
    derivationVersion: DERIVATION_VERSION,
    traits,
    confidence,
    completedAt: complete ? (previous?.completedAt ?? now) : null,
    updatedAt: now,
    history,
  };
}

/**
 * PQ-104 — offline batch re-derivation. Called when `derivationVersion`
 * increments; rebuilds every vector from stored raw answers.
 */
export function reDeriveAll(
  personalities: Record<string, PetPersonality>,
  responsesByPet: Record<string, QuizResponse[]>,
): Record<string, PetPersonality> {
  const out: Record<string, PetPersonality> = {};
  Object.entries(personalities).forEach(([petId, personality]) => {
    if (personality.derivationVersion === DERIVATION_VERSION) {
      out[petId] = personality;
      return;
    }
    out[petId] = buildPersonality(petId, responsesByPet[petId] ?? [], personality);
  });
  return out;
}
