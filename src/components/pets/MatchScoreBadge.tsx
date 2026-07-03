import { cn } from "@/lib/utils";

interface MatchScoreBadgeProps {
  score: number;
  label: string;
  emoji: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function MatchScoreBadge({ score, label, emoji, size = "md", className }: MatchScoreBadgeProps) {
  const dims = size === "sm" ? "h-12 w-12" : size === "lg" ? "h-20 w-20" : "h-16 w-16";
  const textSize = size === "sm" ? "text-sm" : size === "lg" ? "text-2xl" : "text-lg";
  const strokeWidth = size === "sm" ? 3 : 4;
  const radius = size === "sm" ? 20 : size === "lg" ? 36 : 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 90 ? "text-primary" :
    score >= 70 ? "text-primary" :
    score >= 50 ? "text-accent" :
    "text-muted-foreground";

  const svgSize = size === "sm" ? 48 : size === "lg" ? 80 : 64;
  const center = svgSize / 2;

  const labelSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div
        className={cn(
          "relative rounded-full bg-card shadow-md ring-1 ring-border",
          dims
        )}
      >
        <svg width={svgSize} height={svgSize} className="rotate-[-90deg]">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className={cn(color, "transition-all duration-700 ease-out")}
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center font-extrabold", textSize, color)}>
          {score}
        </span>
      </div>
      <span
        className={cn(
          "rounded-full bg-card/95 backdrop-blur px-2 py-0.5 font-bold text-foreground shadow-sm ring-1 ring-border/60 whitespace-nowrap",
          labelSize
        )}
      >
        {emoji} {label}
      </span>
    </div>
  );
}
