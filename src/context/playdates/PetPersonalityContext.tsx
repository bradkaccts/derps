import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { playdateQuizQuestions } from "@/data/playdate-quiz";
import {
  mockPlaydatePersonalities,
  mockPlaydatePreferences,
} from "@/data/mock-playdate-pets";
import { playdateEvents } from "@/lib/playdates/analytics";
import {
  buildPersonality,
  derivePreferenceInput,
  isQuizComplete,
  quizProgress,
} from "@/lib/playdates/quiz";
import { proposeTraitAdjustments, type TraitAdjustmentProposal } from "@/lib/playdates/trust";
import {
  QUIZ_VERSION,
  type HardFilters,
  type MeetupFeedback,
  type PetPersonality,
  type PetPreference,
  type QuizResponse,
  type TraitDimension,
  type VaccinationAttestation,
} from "@/lib/playdates/types";

/**
 * Attestation is the MVP choice over document upload (§16.3): frictionless and
 * unverifiable, versus trustworthy and a meaningful drop-off risk. A verified
 * badge is the optional upgrade, not the gate.
 */
export const ATTESTATION_VALID_DAYS = 365;

const emptyHardFilters: HardFilters = {
  maxSizeKg: null,
  minSizeKg: null,
  excludedLifeStages: [],
  excludedGuardingTriggers: [],
};

function defaultPreference(petId: string): PetPreference {
  return {
    petId,
    maxTravelMiles: 10,
    preferredMeetupTypes: ["open_park"],
    availabilityWindows: ["sat-morning"],
    hardFilters: emptyHardFilters,
    crossSpeciesOptIn: false,
    intactOptOut: false,
  };
}

interface PetPersonalityContextValue {
  getResponses: (petId: string) => QuizResponse[];
  getPersonality: (petId: string) => PetPersonality | undefined;
  getPreference: (petId: string) => PetPreference;
  isComplete: (petId: string) => boolean;
  progressFor: (petId: string) => ReturnType<typeof quizProgress>;
  /** PQ-105 — partial save; the quiz resumes exactly where it was left. */
  saveAnswer: (petId: string, questionKey: string, answerKeys: string[]) => void;
  /** Derives the vector and handler preferences, and marks the quiz complete. */
  submitQuiz: (petId: string) => PetPersonality;
  retakeQuiz: (petId: string) => void;
  updateHardFilters: (petId: string, partial: Partial<HardFilters>) => void;
  updatePreference: (petId: string, partial: Partial<Omit<PetPreference, "petId" | "hardFilters">>) => void;
  /** PQ-109 — proposals only; never applied silently. */
  adjustmentProposals: (petId: string, feedback: MeetupFeedback[]) => TraitAdjustmentProposal[];
  applyAdjustment: (petId: string, dimension: TraitDimension, value: number) => void;
  /** Onboarding gate: a pet needs a current attestation to enter the feed. */
  getAttestation: (petId: string) => VaccinationAttestation | null;
  attestVaccination: (petId: string) => void;
  revokeAttestation: (petId: string) => void;
}

const PetPersonalityContext = createContext<PetPersonalityContextValue | null>(null);

export function PetPersonalityProvider({ children }: { children: ReactNode }) {
  const [responses, setResponses] = usePersistentState<Record<string, QuizResponse[]>>(
    "derps.playdates.quizResponses",
    {},
  );
  const [ownPersonalities, setOwnPersonalities] = usePersistentState<Record<string, PetPersonality>>(
    "derps.playdates.personalities",
    {},
  );
  const [ownPreferences, setOwnPreferences] = usePersistentState<Record<string, PetPreference>>(
    "derps.playdates.preferences",
    {},
  );
  const [attestations, setAttestations] = usePersistentState<
    Record<string, VaccinationAttestation>
  >("derps.playdates.attestations", {});

  const getResponses = useCallback((petId: string) => responses[petId] ?? [], [responses]);

  const getPersonality = useCallback(
    (petId: string) => ownPersonalities[petId] ?? mockPlaydatePersonalities[petId],
    [ownPersonalities],
  );

  const getPreference = useCallback(
    (petId: string) =>
      ownPreferences[petId] ?? mockPlaydatePreferences[petId] ?? defaultPreference(petId),
    [ownPreferences],
  );

  const isComplete = useCallback(
    (petId: string) => isQuizComplete(getPersonality(petId)),
    [getPersonality],
  );

  const progressFor = useCallback(
    (petId: string) => quizProgress(getResponses(petId)),
    [getResponses],
  );

  const saveAnswer = useCallback(
    (petId: string, questionKey: string, answerKeys: string[]) => {
      setResponses((prev) => {
        const existing = prev[petId] ?? [];
        const record: QuizResponse = {
          id: `qr-${petId}-${questionKey}`,
          petId,
          quizVersion: QUIZ_VERSION,
          questionKey,
          answerKeys,
          answeredAt: new Date().toISOString(),
        };
        return {
          ...prev,
          // Raw answers are the source of truth; re-answering replaces the row
          // for that question and nothing else.
          [petId]: [...existing.filter((r) => r.questionKey !== questionKey), record],
        };
      });
    },
    [setResponses],
  );

  const submitQuiz = useCallback(
    (petId: string) => {
      const petResponses = responses[petId] ?? [];
      const personality = buildPersonality(petId, petResponses, ownPersonalities[petId]);
      const derived = derivePreferenceInput(petResponses);

      setOwnPersonalities((prev) => ({ ...prev, [petId]: personality }));
      setOwnPreferences((prev) => ({
        ...prev,
        [petId]: {
          ...(prev[petId] ?? defaultPreference(petId)),
          maxTravelMiles: derived.maxTravelMiles,
          preferredMeetupTypes: derived.preferredMeetupTypes,
          availabilityWindows: derived.availabilityWindows,
        },
      }));

      playdateEvents.publish({
        type: "quiz.completed",
        petId,
        quizVersion: QUIZ_VERSION,
        at: new Date().toISOString(),
      });

      return personality;
    },
    [responses, ownPersonalities, setOwnPersonalities, setOwnPreferences],
  );

  const retakeQuiz = useCallback(
    (petId: string) => {
      setResponses((prev) => ({ ...prev, [petId]: [] }));
      // The vector itself is left in place until the retake is submitted, so a
      // half-finished retake never drops the pet out of the feed.
    },
    [setResponses],
  );

  const updateHardFilters = useCallback(
    (petId: string, partial: Partial<HardFilters>) => {
      setOwnPreferences((prev) => {
        const current = prev[petId] ?? mockPlaydatePreferences[petId] ?? defaultPreference(petId);
        return {
          ...prev,
          [petId]: { ...current, hardFilters: { ...current.hardFilters, ...partial } },
        };
      });
    },
    [setOwnPreferences],
  );

  const updatePreference = useCallback(
    (petId: string, partial: Partial<Omit<PetPreference, "petId" | "hardFilters">>) => {
      setOwnPreferences((prev) => {
        const current = prev[petId] ?? mockPlaydatePreferences[petId] ?? defaultPreference(petId);
        return { ...prev, [petId]: { ...current, ...partial } };
      });
    },
    [setOwnPreferences],
  );

  const adjustmentProposals = useCallback(
    (petId: string, feedback: MeetupFeedback[]) => {
      const personality = getPersonality(petId);
      if (!personality) return [];
      return proposeTraitAdjustments(petId, personality.traits, feedback);
    },
    [getPersonality],
  );

  const applyAdjustment = useCallback(
    (petId: string, dimension: TraitDimension, value: number) => {
      setOwnPersonalities((prev) => {
        const current = prev[petId] ?? mockPlaydatePersonalities[petId];
        if (!current) return prev;
        return {
          ...prev,
          [petId]: {
            ...current,
            traits: { ...current.traits, [dimension]: value },
            updatedAt: new Date().toISOString(),
            history: [
              ...current.history,
              {
                traits: current.traits,
                confidence: current.confidence,
                derivationVersion: current.derivationVersion,
                replacedAt: new Date().toISOString(),
              },
            ],
          },
        };
      });
    },
    [setOwnPersonalities],
  );

  const getAttestation = useCallback(
    (petId: string) => attestations[petId] ?? null,
    [attestations],
  );

  const attestVaccination = useCallback(
    (petId: string) => {
      const now = new Date();
      const expires = new Date(now.getTime() + ATTESTATION_VALID_DAYS * 86_400_000);
      setAttestations((prev) => ({
        ...prev,
        [petId]: { attestedAt: now.toISOString(), expiresAt: expires.toISOString() },
      }));
    },
    [setAttestations],
  );

  const revokeAttestation = useCallback(
    (petId: string) => {
      setAttestations((prev) => {
        const next = { ...prev };
        delete next[petId];
        return next;
      });
    },
    [setAttestations],
  );

  const value = useMemo(
    () => ({
      getResponses,
      getPersonality,
      getPreference,
      isComplete,
      progressFor,
      saveAnswer,
      submitQuiz,
      retakeQuiz,
      updateHardFilters,
      updatePreference,
      adjustmentProposals,
      applyAdjustment,
      getAttestation,
      attestVaccination,
      revokeAttestation,
    }),
    [
      getResponses,
      getPersonality,
      getPreference,
      isComplete,
      progressFor,
      saveAnswer,
      submitQuiz,
      retakeQuiz,
      updateHardFilters,
      updatePreference,
      adjustmentProposals,
      applyAdjustment,
      getAttestation,
      attestVaccination,
      revokeAttestation,
    ],
  );

  return <PetPersonalityContext.Provider value={value}>{children}</PetPersonalityContext.Provider>;
}

export function usePetPersonality() {
  const ctx = useContext(PetPersonalityContext);
  if (!ctx) throw new Error("usePetPersonality must be used within PetPersonalityProvider");
  return ctx;
}

export const totalQuizQuestions = playdateQuizQuestions.length;
