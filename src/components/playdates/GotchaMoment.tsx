import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfettiExplosion } from "@/components/ui/confetti";

/**
 * UI-710 — the celebratory "Gotcha Moment" on a mutual match: both pets' hero
 * images and exactly one primary action, Say Hi. UI-709 — the Wag haptic fires
 * here and on a new message, and never for system or marketing notifications.
 */
export function GotchaMoment({
  open,
  myPetName,
  myPetPhoto,
  partnerName,
  partnerPhoto,
  matchId,
  onClose,
}: {
  open: boolean;
  myPetName: string;
  myPetPhoto?: string;
  partnerName: string;
  partnerPhoto?: string;
  matchId: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    // The "Wag" haptic. Guarded because vibrate is unsupported on iOS Safari
    // and is a no-op rather than a failure everywhere else.
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([14, 40, 14, 40, 20]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border-2 border-primary/30 text-center">
        {open && <ConfettiExplosion />}

        <DialogTitle className="text-2xl font-extrabold text-foreground">
          It's a Derpdate! 🎉
        </DialogTitle>
        <DialogDescription className="text-muted-foreground">
          {myPetName} and {partnerName} both said yes.
        </DialogDescription>

        <div className="flex items-center justify-center gap-3 py-2">
          <HeroImage src={myPetPhoto} name={myPetName} />
          <span className="animate-heart-pop text-3xl" aria-hidden>
            💚
          </span>
          <HeroImage src={partnerPhoto} name={partnerName} />
        </div>

        {/* Exactly one primary action. */}
        <Button asChild className="btn-bouncy w-full font-bold" onClick={onClose}>
          <Link to={matchId ? `/playdates/matches/${matchId}` : "/playdates/matches"}>
            Say Hi 👋
          </Link>
        </Button>
        <button
          type="button"
          onClick={onClose}
          className="min-h-[44px] text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          Keep swiping
        </button>
      </DialogContent>
    </Dialog>
  );
}

function HeroImage({ src, name }: { src?: string; name: string }) {
  return (
    <span className="animate-bounce-in flex h-24 w-24 items-center justify-center overflow-hidden rounded-full ring-4 ring-primary/40">
      {src ? (
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-4xl" aria-hidden>
          🐾
        </span>
      )}
    </span>
  );
}
