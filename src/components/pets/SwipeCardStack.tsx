import { useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, animate, PanInfo } from "framer-motion";
import { Heart, X, MapPin, ShieldCheck } from "lucide-react";
import { type Pet } from "@/data/mock-pets";
import { vibeConfig } from "@/lib/vibes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DerpyEmpty } from "@/components/ui/derpy-states";
import { Link } from "react-router-dom";

interface SwipeCardStackProps {
  pets: Pet[];
  onSwipeRight: (petId: string) => void;
  onSwipeLeft: (petId: string) => void;
}

export function SwipeCardStack({ pets, onSwipeRight, onSwipeLeft }: SwipeCardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | null>(null);

  const handleSwipe = useCallback(
    (direction: "left" | "right") => {
      if (currentIndex >= pets.length) return;
      const pet = pets[currentIndex];
      setExitDirection(direction);
      setTimeout(() => {
        if (direction === "right") onSwipeRight(pet.id);
        else onSwipeLeft(pet.id);
        setCurrentIndex((prev) => prev + 1);
        setExitDirection(null);
      }, 300);
    },
    [currentIndex, pets, onSwipeRight, onSwipeLeft]
  );

  if (currentIndex >= pets.length) {
    return (
      <DerpyEmpty
        title="You've seen all the derps!"
        message="Check your shortlist or switch to Browse All for more."
        emoji="🎉"
      />
    );
  }

  // Show up to 3 cards stacked
  const visiblePets = pets.slice(currentIndex, currentIndex + 3);

  return (
    <div className="flex flex-col items-center">
      {/* Card Stack */}
      <div className="relative w-full max-w-sm h-[480px]">
        {visiblePets
          .map((pet, i) => (
            <SwipeCard
              key={pet.id}
              pet={pet}
              isTop={i === 0}
              stackIndex={i}
              onSwipe={i === 0 ? handleSwipe : undefined}
              exitDirection={i === 0 ? exitDirection : null}
            />
          ))
          .reverse()}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-6 mt-6">
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full border-2 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground btn-bouncy"
          onClick={() => handleSwipe("left")}
        >
          <X className="h-7 w-7" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 rounded-full border-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground btn-bouncy"
          onClick={() => handleSwipe("right")}
        >
          <Heart className="h-7 w-7" />
        </Button>
      </div>
    </div>
  );
}

interface SwipeCardProps {
  pet: Pet;
  isTop: boolean;
  stackIndex: number;
  onSwipe?: (direction: "left" | "right") => void;
  exitDirection: "left" | "right" | null;
}

function SwipeCard({ pet, isTop, stackIndex, onSwipe, exitDirection }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const heartOpacity = useTransform(x, [0, 80], [0, 1]);
  const skipOpacity = useTransform(x, [-80, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    if (info.offset.x > threshold) {
      animate(x, 500, { duration: 0.3 });
      onSwipe?.("right");
    } else if (info.offset.x < -threshold) {
      animate(x, -500, { duration: 0.3 });
      onSwipe?.("left");
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
    }
  };

  const exitX = exitDirection === "right" ? 500 : exitDirection === "left" ? -500 : 0;

  return (
    <motion.div
      className={cn(
        "absolute inset-0 rounded-2xl overflow-hidden bg-card shadow-lg border border-border cursor-grab active:cursor-grabbing",
        !isTop && "pointer-events-none"
      )}
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        scale: 1 - stackIndex * 0.04,
        y: stackIndex * 8,
        zIndex: 10 - stackIndex,
      }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={isTop ? handleDragEnd : undefined}
      animate={
        isTop && exitDirection
          ? { x: exitX, opacity: 0, transition: { duration: 0.3 } }
          : {}
      }
    >
      {/* Photo */}
      <Link to={`/pet/${pet.id}`} className="block">
        <div className="relative h-[320px]">
          <img
            src={pet.photos[0]}
            alt={pet.name}
            className="h-full w-full object-cover"
            draggable={false}
          />

          {/* Swipe Overlays */}
          {isTop && (
            <>
              <motion.div
                className="absolute inset-0 bg-accent/20 flex items-center justify-center"
                style={{ opacity: heartOpacity }}
              >
                <span className="text-6xl rotate-[-12deg] font-extrabold text-accent drop-shadow-lg">
                  ❤️
                </span>
              </motion.div>
              <motion.div
                className="absolute inset-0 bg-destructive/20 flex items-center justify-center"
                style={{ opacity: skipOpacity }}
              >
                <span className="text-6xl rotate-[12deg] font-extrabold text-destructive drop-shadow-lg">
                  ✕
                </span>
              </motion.div>
            </>
          )}

          {/* Badges */}
          {pet.healthVerified && (
            <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-primary/90 px-2 py-0.5 text-xs font-bold text-primary-foreground">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-foreground">{pet.name}</h3>
            <p className="text-sm text-muted-foreground">
              {pet.breed} · {pet.age}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3" />
          {pet.location} · {pet.distanceKm}km
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {pet.vibes.slice(0, 3).map((vibe) => {
            const config = vibeConfig[vibe];
            return (
              <Badge key={vibe} variant="secondary" className="text-xs gap-1 font-medium">
                <span>{config?.icon}</span>
                {config?.label}
              </Badge>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
