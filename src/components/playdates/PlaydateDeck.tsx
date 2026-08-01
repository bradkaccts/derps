import { useCallback, useState } from "react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { Heart, X, Sparkles, Undo2, MapPin, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CompatibilityMeter } from "./CompatibilityMeter";
import { type FeedCard, type SwipeDirection } from "@/lib/playdates/types";
import { PLAY_STYLE_LABELS, energyLabel } from "./trait-labels";

interface PlaydateDeckProps {
  cards: FeedCard[];
  onSwipe: (card: FeedCard, direction: SwipeDirection) => void;
  onUndo: () => void;
  canUndo: boolean;
  boopsRemaining: number;
  onOpenProfile: (card: FeedCard) => void;
}

/**
 * SW-201/203 — swipe left (pass), right (like), up (Boop). Every gesture has an
 * equivalent tappable button at a 44×44pt minimum: swipe is never the only
 * input path, because for a lot of people it is not an input path at all.
 */
export function PlaydateDeck({
  cards,
  onSwipe,
  onUndo,
  canUndo,
  boopsRemaining,
  onOpenProfile,
}: PlaydateDeckProps) {
  const [index, setIndex] = useState(0);
  const [exit, setExit] = useState<SwipeDirection | null>(null);

  const resolve = useCallback(
    (direction: SwipeDirection) => {
      const card = cards[index];
      if (!card) return;
      setExit(direction);
      window.setTimeout(() => {
        onSwipe(card, direction);
        setIndex((prev) => prev + 1);
        setExit(null);
      }, 260);
    },
    [cards, index, onSwipe],
  );

  const handleUndo = useCallback(() => {
    onUndo();
    setIndex((prev) => Math.max(0, prev - 1));
  }, [onUndo]);

  const visible = cards.slice(index, index + 3);
  const current = cards[index];

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <span className="animate-float text-6xl" aria-hidden>
          🎉
        </span>
        <h2 className="text-xl font-bold text-foreground">That's everyone for now!</h2>
        <p className="max-w-sm text-muted-foreground">
          You've seen every pup who cleared your filters nearby. New profiles land daily — or widen
          your travel distance to see more.
        </p>
        {canUndo && (
          <Button variant="outline" className="btn-bouncy gap-2 font-semibold" onClick={handleUndo}>
            <Undo2 className="h-4 w-4" />
            Undo my last swipe
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[560px] w-full max-w-sm">
        {visible
          .map((card, i) => (
            <SwipeCard
              key={card.petId}
              card={card}
              isTop={i === 0}
              stackIndex={i}
              exit={i === 0 ? exit : null}
              onSwipe={i === 0 ? resolve : undefined}
              onOpenProfile={onOpenProfile}
            />
          ))
          .reverse()}
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          aria-label={`Pass on ${current.name}`}
          className="btn-bouncy h-14 w-14 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
          onClick={() => resolve("pass")}
        >
          <X className="h-7 w-7" aria-hidden />
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label={
            boopsRemaining > 0
              ? `Boop ${current.name} — a super-like, ${boopsRemaining} left today`
              : "No Boops left today"
          }
          disabled={boopsRemaining === 0}
          className="btn-bouncy h-12 w-12 rounded-full border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-40"
          onClick={() => resolve("boop")}
        >
          <Sparkles className="h-6 w-6" aria-hidden />
        </Button>

        <Button
          variant="outline"
          size="icon"
          aria-label={`Like ${current.name}`}
          className="btn-bouncy h-14 w-14 rounded-full border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground"
          onClick={() => resolve("like")}
        >
          <Heart className="h-7 w-7" aria-hidden />
        </Button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {/* SW-204 — undo of the immediately preceding swipe only. */}
        <Button
          variant="ghost"
          size="sm"
          disabled={!canUndo || index === 0}
          onClick={handleUndo}
          className="min-h-[44px] gap-1.5 font-semibold text-muted-foreground"
        >
          <Undo2 className="h-4 w-4" aria-hidden />
          Undo
        </Button>
        <span className="text-xs text-muted-foreground">
          {boopsRemaining > 0 ? "1 Boop left today ✨" : "Boop used — back tomorrow"}
        </span>
      </div>
    </div>
  );
}

interface SwipeCardProps {
  card: FeedCard;
  isTop: boolean;
  stackIndex: number;
  exit: SwipeDirection | null;
  onSwipe?: (direction: SwipeDirection) => void;
  onOpenProfile: (card: FeedCard) => void;
}

function SwipeCard({ card, isTop, stackIndex, exit, onSwipe, onOpenProfile }: SwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-14, 14]);
  const likeOpacity = useTransform(x, [0, 90], [0, 1]);
  const passOpacity = useTransform(x, [-90, 0], [1, 0]);
  const boopOpacity = useTransform(y, [-90, 0], [1, 0]);

  const handleDragEnd = (_event: unknown, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.y < -threshold && Math.abs(info.offset.y) > Math.abs(info.offset.x)) {
      animate(y, -600, { duration: 0.26 });
      onSwipe?.("boop");
      return;
    }
    if (info.offset.x > threshold) {
      animate(x, 520, { duration: 0.26 });
      onSwipe?.("like");
      return;
    }
    if (info.offset.x < -threshold) {
      animate(x, -520, { duration: 0.26 });
      onSwipe?.("pass");
      return;
    }
    animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
    animate(y, 0, { type: "spring", stiffness: 500, damping: 30 });
  };

  const exitTarget =
    exit === "like"
      ? { x: 520, y: 0 }
      : exit === "pass"
        ? { x: -520, y: 0 }
        : exit === "boop"
          ? { x: 0, y: -600 }
          : null;

  return (
    <motion.div
      className={cn(
        "absolute inset-0 cursor-grab overflow-hidden rounded-2xl border border-border bg-card shadow-lg active:cursor-grabbing",
        !isTop && "pointer-events-none",
      )}
      style={{
        x: isTop ? x : 0,
        y: isTop ? y : 0,
        rotate: isTop ? rotate : 0,
        scale: 1 - stackIndex * 0.04,
        zIndex: 10 - stackIndex,
      }}
      drag={isTop ? true : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      onDragEnd={isTop ? handleDragEnd : undefined}
      animate={isTop && exitTarget ? { ...exitTarget, opacity: 0, transition: { duration: 0.26 } } : {}}
    >
      <button
        type="button"
        onClick={() => onOpenProfile(card)}
        className="block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`Open ${card.name}'s profile`}
      >
        <div className="relative h-[320px]">
          <img
            src={card.photos[0]}
            alt={`${card.name}, a ${card.breed}`}
            className="h-full w-full object-cover"
            draggable={false}
          />

          {isTop && (
            <>
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-accent/20"
                style={{ opacity: likeOpacity }}
                aria-hidden
              >
                <span className="rotate-[-12deg] text-6xl drop-shadow-lg">❤️</span>
              </motion.div>
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-destructive/20"
                style={{ opacity: passOpacity }}
                aria-hidden
              >
                <span className="rotate-[12deg] text-6xl drop-shadow-lg">✕</span>
              </motion.div>
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-primary/25"
                style={{ opacity: boopOpacity }}
                aria-hidden
              >
                <span className="text-6xl drop-shadow-lg">✨</span>
              </motion.div>
            </>
          )}

          {card.boopedYou && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground shadow">
              <Sparkles className="h-3.5 w-3.5" aria-hidden />
              Booped you!
            </div>
          )}
          {card.healthVerified && !card.boopedYou && (
            <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-xs font-bold text-primary-foreground">
              <ShieldCheck className="h-3 w-3" aria-hidden />
              Vaccines current
            </div>
          )}
        </div>
      </button>

      <div className="space-y-2.5 p-4">
        <div>
          <h3 className="text-xl font-extrabold text-foreground">{card.name}</h3>
          <p className="text-sm text-muted-foreground">
            {card.breed} · {card.age}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" aria-hidden />
            {/* SEC-803 — a band, never a distance. */}
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
          <Badge variant="secondary" className="gap-1 text-xs font-medium">
            <span aria-hidden>⚖️</span>
            {Math.round(card.traits.sizeKg)} kg
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}
