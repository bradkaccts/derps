import { Share2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { deriveVibeArchetype } from "@/lib/playdates/vibe-card";
import { meanConfidence } from "@/lib/playdates/quiz";
import { type PetPersonality } from "@/lib/playdates/types";
import { PLAY_STYLE_LABELS, LIFE_STAGE_LABELS, energyLabel, sociabilityLabel } from "./trait-labels";
import { toast } from "sonner";

/**
 * PQ-108 — the shareable Vibe Card. This is the payoff that makes a
 * behavioural assessment feel worth taking, and it is why quiz completion
 * clears 80% instead of stalling at question four.
 */
export function VibeCardView({
  petName,
  petPhoto,
  personality,
  onRetake,
  className,
}: {
  petName: string;
  petPhoto?: string;
  personality: PetPersonality;
  onRetake?: () => void;
  className?: string;
}) {
  const archetype = deriveVibeArchetype(personality.traits);
  const confidence = meanConfidence(personality.confidence);
  const traits = personality.traits;

  const share = async () => {
    const text = `${petName} is ${archetype.title} ${archetype.emoji} — ${archetype.tagline}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${petName}'s Vibe Card`, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Vibe Card copied — go show someone 🐾");
    } catch {
      toast.error("Couldn't share that one. Try again?");
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "animate-bounce-in relative overflow-hidden rounded-3xl border-2 border-primary/25 bg-gradient-to-br p-6 text-center shadow-lg",
          archetype.gradient,
        )}
      >
        <span className="animate-float mb-2 block text-6xl" aria-hidden>
          {archetype.emoji}
        </span>
        {petPhoto && (
          <img
            src={petPhoto}
            alt={petName}
            className="mx-auto mb-3 h-24 w-24 rounded-full object-cover ring-4 ring-card"
          />
        )}
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">{petName} is</p>
        <h2 className="text-3xl font-extrabold leading-tight text-foreground">{archetype.title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-sm text-foreground/80">{archetype.tagline}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <TraitTile label="Play style" value={PLAY_STYLE_LABELS[traits.play_style].label} emoji={PLAY_STYLE_LABELS[traits.play_style].emoji} />
        <TraitTile label="Energy" value={energyLabel(traits.energy)} emoji="⚡" />
        <TraitTile label="With other dogs" value={sociabilityLabel(traits.dog_sociability)} emoji="🐕" />
        <TraitTile label="Life stage" value={LIFE_STAGE_LABELS[traits.life_stage].label} emoji={LIFE_STAGE_LABELS[traits.life_stage].emoji} />
        <TraitTile label="Size" value={`${Math.round(traits.size_kg)} kg`} emoji="⚖️" />
        <TraitTile
          label="Recall"
          value={traits.recall_reliability >= 4 ? "Reliable" : traits.recall_reliability >= 3 ? "Patchy" : "On leash"}
          emoji="🎯"
        />
      </div>

      {traits.resource_guarding.length > 0 && (
        <p className="rounded-xl bg-secondary/60 px-3 py-2 text-sm text-foreground">
          <span className="font-bold">Heads up we'll share:</span> {petName} guards{" "}
          {traits.resource_guarding.join(" and ")}. We use this to keep meetups safe — it never
          ranks {petName} down.
        </p>
      )}

      {confidence < 0.8 && (
        <p className="rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          You answered "not sure yet" on a few things, so we'll keep {petName}'s scores modest until
          we learn more. Nothing to fix — just come back and update it whenever you know.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={share} variant="outline" className="btn-bouncy min-h-[44px] gap-2 font-semibold">
          <Share2 className="h-4 w-4" aria-hidden />
          Share this card
        </Button>
        {onRetake && (
          <Button
            onClick={onRetake}
            variant="ghost"
            className="btn-bouncy min-h-[44px] gap-2 font-semibold text-muted-foreground"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Retake the quiz
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Quiz {personality.quizVersion} · derivation {personality.derivationVersion}
        {personality.history.length > 0 && ` · ${personality.history.length} earlier version(s) kept`}
      </p>
    </div>
  );
}

function TraitTile({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-2.5">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        <span aria-hidden>{emoji}</span>
        {label}
      </p>
      <p className="text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

export function VibeBadge({ personality }: { personality: PetPersonality }) {
  const archetype = deriveVibeArchetype(personality.traits);
  return (
    <Badge variant="secondary" className="gap-1 font-semibold">
      <span aria-hidden>{archetype.emoji}</span>
      {archetype.title}
    </Badge>
  );
}
