import { Link } from "react-router-dom";
import { PawPrint, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMyPets } from "@/context/MyPetsContext";
import { usePetPersonality } from "@/context/playdates/PlaydatesProvider";

/**
 * UI-701 — the acting identity is a Pet, not a User (SW-205). For multi-pet
 * accounts the active pet is visible on every Playdates surface and switching
 * is one tap. Priya has to manage three social calendars; the app should not
 * make her hold which dog is "current" in her head.
 */
export function ActivePetBar({ className }: { className?: string }) {
  const { myPets, activePet, setActivePetId } = useMyPets();
  const { isComplete } = usePetPersonality();

  if (!activePet) return null;

  if (myPets.length === 1) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1.5",
          className,
        )}
      >
        <PetAvatar photo={activePet.photos[0]} name={activePet.name} active />
        <span className="text-sm font-bold text-foreground">
          Swiping as {activePet.name}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Swiping as
      </span>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Choose the active pet">
        {myPets.map((pet) => {
          const active = pet.id === activePet.id;
          return (
            <button
              key={pet.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setActivePetId(pet.id)}
              className={cn(
                "btn-bouncy flex min-h-[44px] items-center gap-2 rounded-full border-2 py-1 pl-1 pr-3 transition-all",
                active
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              <PetAvatar photo={pet.photos[0]} name={pet.name} active={active} />
              <span
                className={cn("text-sm font-bold", active ? "text-primary" : "text-foreground")}
              >
                {pet.name}
              </span>
              {active && <Check className="h-4 w-4 text-primary" aria-hidden />}
              {!isComplete(pet.id) && (
                <span className="rounded-full bg-accent/15 px-1.5 text-[10px] font-bold text-accent">
                  quiz
                </span>
              )}
            </button>
          );
        })}
        <Link
          to="/profile"
          className="btn-bouncy flex min-h-[44px] items-center gap-1.5 rounded-full border-2 border-dashed border-border px-3 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <PawPrint className="h-4 w-4" />
          Add a pet
        </Link>
      </div>
    </div>
  );
}

function PetAvatar({ photo, name, active }: { photo?: string; name: string; active: boolean }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2",
        active ? "ring-primary" : "ring-transparent",
      )}
    >
      {photo ? (
        <img src={photo} alt="" className="h-full w-full object-cover" aria-hidden />
      ) : (
        <span className="text-lg" aria-hidden>
          🐾
        </span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
