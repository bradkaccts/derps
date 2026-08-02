import { useState } from "react";
import { X, Check, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVenueConfidence } from "@/context/playdates/VenueConfidenceContext";
import { AMENITY_LABELS } from "@/lib/playdates/venues";
import {
  acknowledgementLine,
  aggregateAttribute,
} from "@/lib/playdates/venue-confidence";
import {
  type Venue,
  type VenueAttributeKey,
  type VenueObservationValue,
} from "@/lib/playdates/types";

/**
 * The check-in micro-prompt (§4).
 *
 * Rendered inline inside the check-in confirmation and nowhere else (VC-202):
 * presence is the entire trust basis for the signal, so the only place it can
 * legitimately be asked is right after a geofenced check-in. Never a modal,
 * never blocking (VC-205), one tap to dismiss (VC-203).
 */
export function VenueConfirmationPrompt({
  venue,
  meetupId,
  className,
}: {
  venue: Venue;
  meetupId: string;
  className?: string;
}) {
  const { questionsForCheckin, submitObservations, dismissPrompt, isPromptClosed, observations } =
    useVenueConfidence();
  const [answers, setAnswers] = useState<
    Partial<Record<VenueAttributeKey, VenueObservationValue>>
  >({});
  const [acknowledgement, setAcknowledgement] = useState<string | null>(null);

  const questions = questionsForCheckin({
    venueId: venue.id,
    venueType: venue.venueType,
    meetupId,
  });

  if (acknowledgement) {
    return (
      <div
        className={cn(
          "rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-foreground",
          className,
        )}
        role="status"
      >
        {acknowledgement}
      </div>
    );
  }

  // VC-212 / VC-704 — a venue with complete, fresh data asks nothing at all.
  if (isPromptClosed(meetupId) || questions.length === 0) return null;

  const answer = (attributeKey: VenueAttributeKey, value: VenueObservationValue) => {
    const next = { ...answers, [attributeKey]: value };
    setAnswers(next);

    const answered = Object.entries(next) as [VenueAttributeKey, VenueObservationValue][];
    if (answered.length < questions.length) return;

    submitObservations({
      venueId: venue.id,
      meetupId,
      answers: answered.map(([key, v]) => ({ attributeKey: key, value: v })),
    });

    // VC-220/VC-221 — the resulting venue state, never the user's own totals.
    const last = questions[questions.length - 1];
    const projected = aggregateAttribute(
      [
        ...observations.filter((o) => o.venueId === venue.id),
        ...answered.map(([key, v]) => ({
          id: `preview-${key}`,
          venueId: venue.id,
          attributeKey: key,
          value: v,
          userId: "self",
          meetupId,
          observedAt: new Date().toISOString(),
        })),
      ],
      { ...last },
    );
    setAcknowledgement(acknowledgementLine(projected, AMENITY_LABELS[last.attributeKey]));
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-secondary/40 p-3",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">While you're here 🐾</p>
          {/* VC-213 — say what the answer is for, in one line. */}
          <p className="text-xs text-muted-foreground">
            Helps other owners know what to expect at {venue.name}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dismissPrompt(meetupId)}
          aria-label="Skip these questions"
          className="btn-bouncy -mr-1 -mt-1 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-2 space-y-2">
        {questions.map((question) => (
          <div key={question.attributeKey} className="space-y-1.5">
            <p className="text-sm font-semibold text-foreground">{question.questionText}</p>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["yes", "Yes", Check],
                  ["no", "No", X],
                  ["unsure", "Not sure", HelpCircle],
                ] as const
              ).map(([value, label, Icon]) => {
                const active = answers[question.attributeKey] === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => answer(question.attributeKey, value)}
                    className={cn(
                      "btn-bouncy flex min-h-[36px] items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
