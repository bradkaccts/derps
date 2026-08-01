import { describe, it, expect } from "vitest";
import { playdateQuizQuestions } from "@/data/playdate-quiz";
import {
  DEFAULT_TRAITS,
  buildPersonality,
  derivePreferenceInput,
  deriveTraitVector,
  isQuizComplete,
  meanConfidence,
  reDeriveAll,
} from "@/lib/playdates/quiz";
import { DERIVATION_VERSION, QUIZ_VERSION, type QuizResponse } from "@/lib/playdates/types";

let seq = 0;
function answer(petId: string, questionKey: string, ...answerKeys: string[]): QuizResponse {
  seq += 1;
  return {
    id: `qr-${seq}`,
    petId,
    quizVersion: QUIZ_VERSION,
    questionKey,
    answerKeys,
    answeredAt: new Date().toISOString(),
  };
}

describe("quiz definition", () => {
  it("stays within the 15-question default path (UI-708)", () => {
    expect(playdateQuizQuestions.length).toBeLessThanOrEqual(15);
  });

  it("offers a non-committal option on every trait question (PQ-102)", () => {
    playdateQuizQuestions
      .filter((q) => q.kind === "trait")
      .forEach((question) => {
        expect(question.options.some((o) => o.notSure)).toBe(true);
      });
  });

  it("has unique question and answer keys", () => {
    const keys = playdateQuizQuestions.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
    playdateQuizQuestions.forEach((q) => {
      const optionKeys = q.options.map((o) => o.key);
      expect(new Set(optionKeys).size).toBe(optionKeys.length);
    });
  });
});

describe("trait derivation", () => {
  it("derives values and full confidence from decisive answers", () => {
    const responses = [
      answer("p", "park_approach", "play_bow"),
      answer("p", "favourite_move", "wrestler"),
      answer("p", "after_walk", "ready_again"),
    ];
    const { traits, confidence } = deriveTraitVector(responses);

    expect(traits.play_style).toBe("wrestler");
    expect(traits.dog_sociability).toBe(5);
    expect(traits.energy).toBe(5);
    expect(confidence.play_style).toBeGreaterThan(0);
    expect(confidence.dog_sociability).toBeGreaterThan(0);
  });

  it("lowers confidence rather than forcing a value on 'not sure yet' (PQ-102)", () => {
    const sure = deriveTraitVector([answer("p", "recall", "instant")]);
    const unsure = deriveTraitVector([answer("p", "recall", "not_sure")]);

    expect(sure.traits.recall_reliability).toBe(5);
    expect(sure.confidence.recall_reliability).toBe(1);

    expect(unsure.traits.recall_reliability).toBe(DEFAULT_TRAITS.recall_reliability);
    expect(unsure.confidence.recall_reliability).toBe(0);
  });

  it("averages numeric signals across questions that address the same dimension", () => {
    const { traits } = deriveTraitVector([
      answer("p", "after_walk", "asleep_immediately"), // energy 1
      answer("p", "play_intensity", "rowdy"), // energy 5
    ]);
    expect(traits.energy).toBe(3);
  });

  it("unions multi-select guarding triggers and treats 'nothing' as an answer", () => {
    const guards = deriveTraitVector([answer("p", "resource_guarding", "toys", "food")]);
    expect(guards.traits.resource_guarding.sort()).toEqual(["food", "toys"]);
    expect(guards.confidence.resource_guarding).toBe(1);

    const shares = deriveTraitVector([answer("p", "resource_guarding", "none")]);
    expect(shares.traits.resource_guarding).toEqual([]);
    expect(shares.confidence.resource_guarding).toBe(1);
  });

  it("is deterministic — the same answers always produce the same vector", () => {
    const responses = [
      answer("p", "park_approach", "sniff_then_decide"),
      answer("p", "favourite_move", "chaser"),
      answer("p", "size_band", "15_25"),
    ];
    expect(deriveTraitVector(responses)).toEqual(deriveTraitVector(responses));
  });

  it("reports zero confidence for dimensions with no answers at all", () => {
    const { confidence } = deriveTraitVector([]);
    expect(meanConfidence(confidence)).toBe(0);
  });
});

describe("handler preferences", () => {
  it("derives travel distance, meetup types and availability", () => {
    const prefs = derivePreferenceInput([
      answer("p", "travel_distance", "five"),
      answer("p", "preferred_meetup_types", "fenced_yard", "indoor"),
      answer("p", "availability", "sat_morning", "weekday_evening"),
    ]);

    expect(prefs.maxTravelMiles).toBe(5);
    expect(prefs.preferredMeetupTypes.sort()).toEqual(["fenced_yard", "indoor"]);
    expect(prefs.availabilityWindows).toContain("sat-morning");
    expect(prefs.availabilityWindows).toContain("tue-evening");
  });

  it("falls back to sensible defaults when handler questions are skipped", () => {
    const prefs = derivePreferenceInput([]);
    expect(prefs.preferredMeetupTypes.length).toBeGreaterThan(0);
    expect(prefs.availabilityWindows.length).toBeGreaterThan(0);
  });
});

describe("personality lifecycle", () => {
  const fullQuiz = (petId: string) =>
    playdateQuizQuestions.map((q) =>
      answer(petId, q.key, q.options.find((o) => !o.notSure)?.key ?? q.options[0].key),
    );

  it("marks the quiz complete only when every question is answered (PQ-101)", () => {
    const partial = buildPersonality("p", [answer("p", "recall", "instant")]);
    expect(isQuizComplete(partial)).toBe(false);

    const complete = buildPersonality("p", fullQuiz("p"));
    expect(isQuizComplete(complete)).toBe(true);
  });

  it("retains the previous vector as history rather than overwriting it (PQ-106)", () => {
    const first = buildPersonality("p", fullQuiz("p"));
    const retake = buildPersonality(
      "p",
      [...fullQuiz("p").filter((r) => r.questionKey !== "after_walk"), answer("p", "after_walk", "asleep_immediately")],
      first,
    );

    expect(retake.history).toHaveLength(1);
    expect(retake.history[0].traits).toEqual(first.traits);
    expect(retake.traits.energy).not.toBe(first.traits.energy);
  });

  it("re-derives stale vectors from retained raw answers (PQ-104)", () => {
    const responses = fullQuiz("p");
    const stale = { ...buildPersonality("p", responses), derivationVersion: "derive-v0" };

    const rebuilt = reDeriveAll({ p: stale }, { p: responses });

    expect(rebuilt.p.derivationVersion).toBe(DERIVATION_VERSION);
    expect(rebuilt.p.history).toHaveLength(1);
  });

  it("leaves already-current vectors untouched during a re-derivation pass", () => {
    const responses = fullQuiz("p");
    const current = buildPersonality("p", responses);
    const rebuilt = reDeriveAll({ p: current }, { p: responses });
    expect(rebuilt.p).toBe(current);
  });
});
