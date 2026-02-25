import { cn } from "@/lib/utils";

interface DerpyLoaderProps {
  message?: string;
  className?: string;
}

const derps = ["🐶", "🐱", "🐦", "🦎", "🐰"];

export function DerpyLoader({ message = "Sniffing out the best derps…", className }: DerpyLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center gap-4", className)}>
      <div className="flex gap-2">
        {derps.map((emoji, i) => (
          <span
            key={i}
            className="text-3xl animate-float"
            style={{ animationDelay: `${i * 0.3}s` }}
          >
            {emoji}
          </span>
        ))}
      </div>
      <p className="text-sm font-semibold text-muted-foreground animate-pulse-soft">
        {message}
      </p>
    </div>
  );
}

export function DerpyEmpty({
  title = "No derps found!",
  message = "Try adjusting your filters — every derp deserves a chance!",
  emoji = "🐾",
  className,
  children,
}: {
  title?: string;
  message?: string;
  emoji?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
      <span className="text-6xl mb-4 animate-float">{emoji}</span>
      <h2 className="text-xl font-bold text-foreground mb-2 animate-slide-up">{title}</h2>
      <p className="text-muted-foreground animate-slide-up" style={{ animationDelay: "0.1s" }}>
        {message}
      </p>
      {children}
    </div>
  );
}
