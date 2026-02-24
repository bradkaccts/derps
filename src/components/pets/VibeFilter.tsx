import { type VibeTag } from "@/data/mock-pets";
import { vibeConfig, allVibes } from "@/lib/vibes";
import { cn } from "@/lib/utils";

interface VibeFilterProps {
  selected: VibeTag[];
  onToggle: (vibe: VibeTag) => void;
}

export function VibeFilter({ selected, onToggle }: VibeFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {allVibes.map((vibe) => {
        const config = vibeConfig[vibe];
        const isActive = selected.includes(vibe);
        return (
          <button
            key={vibe}
            onClick={() => onToggle(vibe)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold transition-all",
              isActive
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            <span className="text-base">{config.icon}</span>
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
