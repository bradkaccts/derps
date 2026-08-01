import { useState } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { FEEDBACK_TAG_LABELS } from "./trait-labels";
import { type FeedbackOverall, type FeedbackTag } from "@/lib/playdates/types";

const OVERALL_OPTIONS: { value: FeedbackOverall; label: string; emoji: string }[] = [
  { value: "great", label: "Great", emoji: "🎉" },
  { value: "fine", label: "Fine", emoji: "🙂" },
  { value: "not_a_fit", label: "Not a fit", emoji: "😕" },
];

const TAG_OPTIONS = Object.keys(FEEDBACK_TAG_LABELS) as FeedbackTag[];

/**
 * FB-501 — after a confirmed meetup each owner is prompted privately for
 * structured feedback.
 *
 * FB-502 — it is never visible to the other party, in raw or aggregate form.
 * Honest feedback requires that; retaliation risk forbids the alternative. The
 * promise is stated on the form itself, because a promise nobody sees does not
 * change what people write.
 */
export function FeedbackDialog({
  open,
  onOpenChange,
  partnerPetName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerPetName: string;
  onSubmit: (input: { overall: FeedbackOverall; tags: FeedbackTag[]; freeText: string }) => void;
}) {
  const [overall, setOverall] = useState<FeedbackOverall | null>(null);
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [freeText, setFreeText] = useState("");

  const submit = () => {
    if (!overall) return;
    onSubmit({ overall, tags, freeText });
    setOverall(null);
    setTags([]);
    setFreeText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold">
            How did it go with {partnerPetName}?
          </DialogTitle>
          <DialogDescription className="flex items-start gap-1.5">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Completely private. {partnerPetName}'s human never sees any of this — not the rating,
            not the tags, not a summary. It only helps us find better matches for you.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-foreground">Overall</legend>
          <div className="flex gap-2">
            {OVERALL_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={overall === option.value}
                onClick={() => setOverall(option.value)}
                className={cn(
                  "btn-bouncy flex min-h-[64px] flex-1 flex-col items-center justify-center gap-1 rounded-xl border-2 py-2 font-bold transition-all",
                  overall === option.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40",
                )}
              >
                <span className="text-2xl" aria-hidden>
                  {option.emoji}
                </span>
                <span className="text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-bold text-foreground">Anything specific?</legend>
          <div className="flex flex-wrap gap-1.5">
            {TAG_OPTIONS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  role="checkbox"
                  aria-checked={active}
                  onClick={() =>
                    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
                  }
                  className={cn(
                    "btn-bouncy min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                    active
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {FEEDBACK_TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="space-y-1.5">
          <Label htmlFor="feedback-text" className="text-sm font-bold">
            Anything our safety team should know?
          </Label>
          <Textarea
            id="feedback-text"
            value={freeText}
            onChange={(event) => setFreeText(event.target.value)}
            placeholder="Optional. This goes to Trust & Safety only and is never shown to anyone else."
            rows={3}
          />
        </div>

        <Button
          className="btn-bouncy min-h-[44px] w-full font-bold"
          disabled={!overall}
          onClick={submit}
        >
          Send private feedback
        </Button>
      </DialogContent>
    </Dialog>
  );
}
