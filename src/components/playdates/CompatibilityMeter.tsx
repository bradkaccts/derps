import { Info, ShieldAlert } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { type FeatureContribution } from "@/lib/playdates/types";

/**
 * UI-702 — the compatibility score is rendered as a labelled visual meter with
 * its reason string, never as a bare number. UI-705 — the meter never relies
 * on colour alone: the numeral, the band label and the fill all carry it.
 */

export interface ScoreBand {
  label: string;
  emoji: string;
  tone: string;
}

/**
 * Band thresholds are calibrated against the scorer's *actual* distribution,
 * not against a naive 0–100 intuition. Because §6.4 multiplies five sub-1
 * factors, a random pair of dogs lands around 25 — which is the product's
 * whole premise: a dog park is a random-assignment experiment and most
 * pairings are mediocre. Across the seeded metro the spread runs p50≈25,
 * p90≈48, max≈76, and the deck surfaces the top of that tail.
 *
 * These move when §6.8 fits the weights against real outcomes. They are
 * presentation, never scoring — the number itself is untouched.
 */
export function bandForScore(score: number): ScoreBand {
  if (score >= 65) return { label: "Outstanding match", emoji: "💚", tone: "text-primary" };
  if (score >= 45) return { label: "Strong match", emoji: "🎾", tone: "text-primary" };
  if (score >= 25) return { label: "Worth a sniff", emoji: "👃", tone: "text-accent" };
  return { label: "Long shot", emoji: "🤷", tone: "text-muted-foreground" };
}

interface CompatibilityMeterProps {
  score: number;
  reason: string;
  contributions?: FeatureContribution[];
  gateDisclosures?: string[];
  confidenceCapped?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function CompatibilityMeter({
  score,
  reason,
  contributions,
  gateDisclosures = [],
  confidenceCapped = false,
  size = "md",
  className,
}: CompatibilityMeterProps) {
  const band = bandForScore(score);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-extrabold tabular-nums",
            band.tone,
            size === "sm" ? "text-lg" : "text-2xl",
          )}
        >
          {score}
        </span>
        <span className={cn("font-bold text-foreground", size === "sm" ? "text-xs" : "text-sm")}>
          {band.emoji} {band.label}
        </span>
        {contributions && contributions.length > 0 && (
          <Popover>
            <PopoverTrigger
              aria-label="Why this score"
              className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Info className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-80 rounded-2xl border-2 border-primary/20 p-4 shadow-lg"
            >
              <ScoreBreakdown
                score={score}
                contributions={contributions}
                confidenceCapped={confidenceCapped}
              />
            </PopoverContent>
          </Popover>
        )}
      </div>

      <Progress
        value={score}
        aria-label={`Compatibility ${score} out of 100 — ${band.label}`}
        className="h-2"
      />

      <p className={cn("text-muted-foreground", size === "sm" ? "text-xs" : "text-sm")}>{reason}</p>

      {/* RE-604 — where a soft gate materially reduced the score, say so plainly. */}
      {gateDisclosures.map((disclosure) => (
        <p
          key={disclosure}
          className="flex items-start gap-1.5 rounded-lg bg-secondary/60 px-2 py-1.5 text-xs font-medium text-foreground"
        >
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" aria-hidden />
          {disclosure}
        </p>
      ))}
    </div>
  );
}

/** RE-601 — per-dimension contributions, shown honestly rather than as a black box. */
export function ScoreBreakdown({
  score,
  contributions,
  confidenceCapped,
}: {
  score: number;
  contributions: FeatureContribution[];
  confidenceCapped?: boolean;
}) {
  const traits = contributions
    .filter((c) => c.kind === "trait")
    .sort((a, b) => b.contribution - a.contribution);
  const gates = contributions.filter((c) => c.kind === "gate" && c.subScore < 1);
  const modifiers = contributions.filter((c) => c.kind === "modifier" && c.subScore < 1);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-bold text-foreground">How we got to {score}</p>
        <p className="text-xs text-muted-foreground">
          Every score is built from these parts — no black boxes.
        </p>
      </div>

      <ul className="space-y-1.5">
        {traits.map((c) => (
          <li key={c.dimension} className="flex items-center gap-2 text-xs">
            <span className="w-28 shrink-0 font-semibold text-foreground">{c.label}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${Math.round(c.subScore * 100)}%` }}
              />
            </span>
            <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
              {Math.round(c.subScore * 100)}
            </span>
          </li>
        ))}
      </ul>

      {(gates.length > 0 || modifiers.length > 0) && (
        <div className="space-y-1 border-t border-border pt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            What held it back
          </p>
          {[...gates, ...modifiers].map((c) => (
            <p key={c.dimension} className="flex justify-between text-xs text-muted-foreground">
              <span>{c.label}</span>
              <span className="tabular-nums">×{c.subScore.toFixed(2)}</span>
            </p>
          ))}
        </div>
      )}

      {confidenceCapped && (
        <p className="rounded-lg bg-secondary/60 px-2 py-1.5 text-xs text-foreground">
          One of these profiles is still new, so we've kept this score conservative rather than
          quoting a confident number we can't back up.
        </p>
      )}
    </div>
  );
}
