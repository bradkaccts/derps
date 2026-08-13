import { Heart, MapPin, Sparkles, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompatibilityMeter } from "./CompatibilityMeter";
import { PLAY_STYLE_LABELS, energyLabel } from "./trait-labels";
import { type FeedCard, type SwipeDirection } from "@/lib/playdates/types";

/**
 * SW-211 — the same ranked candidates, as a grid. For desktop, and for the
 * substantial number of people who simply dislike swipe interfaces and will
 * otherwise not use the product at all.
 */
export function PlaydateBrowseGrid({
  cards,
  onSwipe,
  onOpenProfile,
  boopsRemaining,
}: {
  cards: FeedCard[];
  onSwipe: (card: FeedCard, direction: SwipeDirection) => void;
  onOpenProfile: (card: FeedCard) => void;
  boopsRemaining: number;
}) {
  return (
    <div className="animate-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.petId} className="group overflow-hidden transition-all hover:shadow-lg">
          <button
            type="button"
            onClick={() => onOpenProfile(card)}
            className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`Open ${card.name}'s profile`}
          >
            <div className="relative aspect-square overflow-hidden">
              <img
                src={card.photos[0]}
                alt={`${card.name}, a ${card.breed}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {card.boopedYou && (
                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Booped you
                </span>
              )}
            </div>
          </button>

          <CardContent className="space-y-2.5 p-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">{card.name}</h3>
              <p className="text-sm text-muted-foreground">
                {card.breed} · {card.age}
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" aria-hidden />
                {card.distanceBand} away
              </p>
            </div>

            <CompatibilityMeter
              score={card.score}
              reason={card.reason}
              contributions={card.contributions}
              gateDisclosures={card.gateDisclosures}
              confidenceCapped={card.confidenceCapped}
              size="sm"
            />

            <div className="flex flex-wrap gap-1">
              <Badge variant="secondary" className="gap-1 text-xs font-medium">
                <span aria-hidden>{PLAY_STYLE_LABELS[card.traits.playStyle].emoji}</span>
                {PLAY_STYLE_LABELS[card.traits.playStyle].label}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs font-medium">
                <span aria-hidden>⚡</span>
                {energyLabel(card.traits.energy)}
              </Badge>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                aria-label={`Pass on ${card.name}`}
                className="btn-bouncy min-h-[44px] flex-1 border-destructive/60 font-semibold text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => onSwipe(card, "pass")}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={boopsRemaining === 0}
                aria-label={`Boop ${card.name}`}
                className="btn-bouncy min-h-[48px] flex-[1.3] border-primary/60 font-semibold text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
                onClick={() => onSwipe(card, "boop")}
              >
                <Sparkles className="h-5 w-5" aria-hidden />
              </Button>
              <Button
                size="sm"
                aria-label={`Like ${card.name}`}
                className="btn-bouncy min-h-[44px] flex-1 gap-1.5 font-bold"
                onClick={() => onSwipe(card, "like")}
              >
                <Heart className="h-4 w-4" aria-hidden />
                Like
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
