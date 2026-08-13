import { Heart, MapPin, Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompatibilityMeter } from "./CompatibilityMeter";
import { PLAY_STYLE_LABELS, LIFE_STAGE_LABELS, energyLabel, sociabilityLabel } from "./trait-labels";
import { findPlaydatePet } from "@/data/mock-playdate-pets";
import { type FeedCard, type SwipeDirection } from "@/lib/playdates/types";

/**
 * The expanded profile behind a card. RE-604's gate disclosures live here in
 * full: "Milo guards toys — worth leaving toys at home" is the sentence that
 * prevents the bad afternoon that makes someone delete the app.
 */
export function PetDetailDialog({
  card,
  open,
  onOpenChange,
  onSwipe,
}: {
  card: FeedCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSwipe: (card: FeedCard, direction: SwipeDirection) => void;
}) {
  if (!card) return null;
  const pet = findPlaydatePet(card.petId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold">{card.name}</DialogTitle>
          <DialogDescription>
            {card.breed} · {card.age} · {card.distanceBand} away
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {card.photos.slice(0, 2).map((photo, index) => (
            <img
              key={photo}
              src={photo}
              alt={index === 0 ? `${card.name}, a ${card.breed}` : `${card.name}, second photo`}
              className="aspect-square w-full rounded-xl object-cover"
            />
          ))}
        </div>

        <Badge variant="secondary" className="w-fit gap-1 font-semibold">
          <span aria-hidden>✨</span> {card.archetype}
        </Badge>

        {pet?.bio && <p className="text-sm text-foreground">{pet.bio}</p>}
        {pet?.funFact && (
          <p className="rounded-xl bg-secondary/50 px-3 py-2 text-sm text-foreground">
            <span className="font-bold">Fun fact:</span> {pet.funFact}
          </p>
        )}

        <CompatibilityMeter
          score={card.score}
          reason={card.reason}
          contributions={card.contributions}
          gateDisclosures={card.gateDisclosures}
          confidenceCapped={card.confidenceCapped}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Tile label="Play style" value={PLAY_STYLE_LABELS[card.traits.playStyle].label} emoji={PLAY_STYLE_LABELS[card.traits.playStyle].emoji} />
          <Tile label="Energy" value={energyLabel(card.traits.energy)} emoji="⚡" />
          <Tile label="With dogs" value={sociabilityLabel(card.traits.sociability)} emoji="🐕" />
          <Tile label="Life stage" value={LIFE_STAGE_LABELS[card.traits.lifeStage].label} emoji={LIFE_STAGE_LABELS[card.traits.lifeStage].emoji} />
          <Tile label="Size" value={`${Math.round(card.traits.sizeKg)} kg`} emoji="⚖️" />
          <Tile label="Distance" value={card.distanceBand} emoji="📍" />
        </div>

        <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          We only ever show a distance band. Nobody on Derps — including us, in any API response —
          can work out where {card.name} lives.
        </p>

        <div className="flex gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            className="btn-bouncy min-h-[44px] flex-1 border-destructive/60 font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => onSwipe(card, "pass")}
          >
            <X className="mr-1.5 h-4 w-4" aria-hidden />
            Pass
          </Button>
          <Button
            variant="outline"
            className="btn-bouncy min-h-[48px] flex-[1.15] border-primary/60 font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => onSwipe(card, "boop")}
          >
            <Sparkles className="mr-1.5 h-5 w-5" aria-hidden />
            Boop
          </Button>
          <Button
            className="btn-bouncy min-h-[44px] flex-1 font-bold"
            onClick={() => onSwipe(card, "like")}
          >
            <Heart className="mr-1.5 h-4 w-4" aria-hidden />
            Like
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Tile({ label, value, emoji }: { label: string; value: string; emoji: string }) {
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
