import { type Species } from "@/data/mock-pets";
import { cn } from "@/lib/utils";

const speciesOptions: { value: Species | "all"; label: string; emoji: string }[] = [
  { value: "all", label: "All", emoji: "🌟" },
  { value: "dog", label: "Dogs", emoji: "🐕" },
  { value: "cat", label: "Cats", emoji: "🐈" },
  { value: "bird", label: "Birds", emoji: "🦜" },
  { value: "reptile", label: "Reptiles", emoji: "🦎" },
  { value: "small-animal", label: "Small", emoji: "🐰" },
];

interface SpeciesFilterProps {
  selected: Species | "all";
  onSelect: (species: Species | "all") => void;
}

export function SpeciesFilter({ selected, onSelect }: SpeciesFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {speciesOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={cn(
            "flex flex-col items-center gap-1 rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0",
            selected === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          <span className="text-2xl">{opt.emoji}</span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
