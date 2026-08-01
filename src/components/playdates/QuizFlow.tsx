import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { playdateQuizQuestions } from "@/data/playdate-quiz";
import { usePetPersonality } from "@/context/playdates/PlaydatesProvider";
import { QUIZ_ESTIMATED_SECONDS } from "@/data/playdate-quiz";

/**
 * The quiz is the single most important artefact in this product (§5.1): the
 * sole input to cold-start matching, the only defence against "breed =
 * personality" reasoning, and the first real interaction a new user has.
 *
 * One question per screen (UI-708), progress and a time estimate always
 * visible, and every answer saved the moment it is picked so the quiz resumes
 * exactly where it was abandoned (PQ-105).
 */
export function QuizFlow({
  petId,
  petName,
  onComplete,
}: {
  petId: string;
  petName: string;
  onComplete: () => void;
}) {
  const { getResponses, saveAnswer, submitQuiz } = usePetPersonality();
  const responses = getResponses(petId);

  const answeredKeys = useMemo(
    () => new Set(responses.map((r) => r.questionKey)),
    [responses],
  );

  // Resume at the first unanswered question rather than at the start.
  const [index, setIndex] = useState(() => {
    const firstUnanswered = playdateQuizQuestions.findIndex((q) => !answeredKeys.has(q.key));
    return firstUnanswered === -1 ? playdateQuizQuestions.length - 1 : firstUnanswered;
  });

  const question = playdateQuizQuestions[index];
  const saved = responses.find((r) => r.questionKey === question.key);
  const [multiSelection, setMultiSelection] = useState<string[]>(saved?.answerKeys ?? []);
  const [finishing, setFinishing] = useState(false);

  const total = playdateQuizQuestions.length;
  const answeredCount = answeredKeys.size;

  /*
   * Derivation has to happen *after* the final answer is committed, not in the
   * same tick that saves it — otherwise `submitQuiz` reads a response set one
   * answer short and the pet never counts as quizzed.
   */
  useEffect(() => {
    if (!finishing || answeredCount < total) return;
    submitQuiz(petId);
    setFinishing(false);
    onComplete();
  }, [finishing, answeredCount, total, submitQuiz, petId, onComplete]);
  const percent = Math.round((answeredCount / total) * 100);
  const secondsLeft = Math.max(
    10,
    Math.round(((total - answeredCount) / total) * QUIZ_ESTIMATED_SECONDS),
  );

  const goTo = (next: number) => {
    setIndex(next);
    const nextQuestion = playdateQuizQuestions[next];
    const existing = responses.find((r) => r.questionKey === nextQuestion?.key);
    setMultiSelection(existing?.answerKeys ?? []);
  };

  const advance = () => {
    if (index + 1 < total) {
      goTo(index + 1);
    } else {
      setFinishing(true);
    }
  };

  const chooseSingle = (answerKey: string) => {
    saveAnswer(petId, question.key, [answerKey]);
    advance();
  };

  const toggleMulti = (answerKey: string) => {
    setMultiSelection((prev) => {
      // "Nothing" and "not sure" are exclusive with the positive options.
      if (answerKey === "none" || answerKey === "not_sure") return [answerKey];
      const withoutExclusives = prev.filter((k) => k !== "none" && k !== "not_sure");
      return withoutExclusives.includes(answerKey)
        ? withoutExclusives.filter((k) => k !== answerKey)
        : [...withoutExclusives, answerKey];
    });
  };

  const confirmMulti = () => {
    if (multiSelection.length === 0) return;
    saveAnswer(petId, question.key, multiSelection);
    advance();
  };

  const isLast = index + 1 === total;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
          <span>
            Question {index + 1} of {total}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            about {secondsLeft}s left
          </span>
        </div>
        <Progress
          value={percent}
          aria-label={`Quiz progress: ${answeredCount} of ${total} answered`}
          className="h-2"
        />
      </div>

      <div key={question.key} className="animate-slide-up space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="space-y-1.5">
          <h2 className="text-xl font-extrabold leading-snug text-foreground">{question.prompt}</h2>
          {question.helper && (
            <p className="text-sm text-muted-foreground">{question.helper}</p>
          )}
          {question.multi && (
            <p className="text-xs font-semibold text-primary">Pick everything that applies</p>
          )}
        </div>

        <div className="flex flex-col gap-2" role={question.multi ? "group" : "radiogroup"}>
          {question.options.map((option) => {
            const selected = question.multi
              ? multiSelection.includes(option.key)
              : saved?.answerKeys.includes(option.key);
            return (
              <button
                key={option.key}
                type="button"
                role={question.multi ? "checkbox" : "radio"}
                aria-checked={Boolean(selected)}
                onClick={() =>
                  question.multi ? toggleMulti(option.key) : chooseSingle(option.key)
                }
                className={cn(
                  "btn-bouncy flex min-h-[56px] items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/40",
                  option.notSure && "border-dashed",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {option.emoji}
                </span>
                <span
                  className={cn(
                    "flex-1 font-semibold",
                    option.notSure ? "text-muted-foreground" : "text-foreground",
                  )}
                >
                  {option.label}
                </span>
                {selected && <Check className="h-5 w-5 text-primary" aria-hidden />}
              </button>
            );
          })}
        </div>

        {question.multi && (
          <Button
            className="btn-bouncy w-full font-bold"
            disabled={multiSelection.length === 0}
            onClick={confirmMulti}
          >
            {isLast ? `Finish and meet ${petName}'s Vibe Card` : "Next"}
            <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          disabled={index === 0}
          onClick={() => goTo(index - 1)}
          className="min-h-[44px] gap-1.5 font-semibold text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back
        </Button>
        <p className="text-xs text-muted-foreground">
          Saved automatically — you can close this and pick up where you left off.
        </p>
      </div>
    </div>
  );
}
