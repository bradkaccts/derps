import { useState } from "react";
import { ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { type ReportCategory } from "@/lib/playdates/types";

const CATEGORIES: { value: ReportCategory; label: string; description: string }[] = [
  {
    value: "harassment",
    label: "Harassment or abuse",
    description: "Messages that are threatening, sexual, or persistent after being asked to stop.",
  },
  {
    value: "misrepresentation",
    label: "This isn't the pet in the profile",
    description: "The dog who showed up was not the dog in the photos.",
  },
  {
    value: "incident",
    label: "A bite, injury, or aggression",
    description:
      "We suspend both pets' matching immediately, preserve the thread, and a person reviews it within the hour.",
  },
  { value: "scam", label: "Scam or money request", description: "Nobody on Derps should ever ask you for money." },
  { value: "other", label: "Something else", description: "Tell us what happened." },
];

/**
 * CH-306 — Block and Report reachable in two taps from any thread. Block is
 * immediate, silent, bidirectional, and applied at the User level.
 *
 * §9.1 — the safety surface drops the whimsy and switches to a calm, plain,
 * serious register. Tone follows stakes.
 */
export function ReportDialog({
  open,
  onOpenChange,
  subjectName,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectName: string;
  onSubmit: (input: { category: ReportCategory; details: string; alsoBlock: boolean }) => void;
}) {
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);

  const submit = () => {
    if (!category) return;
    onSubmit({ category, details, alsoBlock });
    setCategory(null);
    setDetails("");
    onOpenChange(false);
  };

  const isIncident = category === "incident";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Report {subjectName}</DialogTitle>
          <DialogDescription>
            Reports are reviewed by a person. Nothing you write here is shown to the person you're
            reporting.
          </DialogDescription>
        </DialogHeader>

        <fieldset className="space-y-2" role="radiogroup" aria-label="Reason for reporting">
          {CATEGORIES.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={category === option.value}
              onClick={() => setCategory(option.value)}
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                category === option.value
                  ? "border-foreground bg-muted"
                  : "border-border hover:border-foreground/40",
              )}
            >
              <p className="text-sm font-semibold text-foreground">{option.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
            </button>
          ))}
        </fieldset>

        {isIncident && (
          <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
            <div className="space-y-1 text-xs text-foreground">
              <p className="font-semibold">If anyone is hurt, get medical care first.</p>
              <p>
                Dog bites are reportable to your local animal control agency in most of California.
                Derps does not decide who was at fault — we record what happened, pause both pets'
                matching, and keep the record for you.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="report-details" className="text-sm font-semibold">
            What happened?
          </Label>
          <Textarea
            id="report-details"
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            rows={4}
            placeholder="Dates, what was said or done, anything else that helps."
          />
        </div>

        <label className="flex items-start gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={alsoBlock}
            onChange={(event) => setAlsoBlock(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
          />
          <span>
            Also block this person. They won't be told, and none of their pets will appear for any
            of yours again.
          </span>
        </label>

        <Button
          variant="destructive"
          className="min-h-[44px] w-full font-semibold"
          disabled={!category}
          onClick={submit}
        >
          Submit report
        </Button>
      </DialogContent>
    </Dialog>
  );
}
