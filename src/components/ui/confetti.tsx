import { useEffect, useState } from "react";

const CONFETTI_COLORS = [
  "hsl(150, 30%, 42%)", // primary
  "hsl(16, 60%, 55%)",  // accent
  "hsl(30, 60%, 92%)",  // secondary
  "hsl(45, 90%, 65%)",  // gold
  "hsl(200, 70%, 55%)", // blue
  "hsl(340, 60%, 60%)", // pink
];

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  shape: "circle" | "square" | "triangle";
}

export function ConfettiExplosion({ onComplete }: { onComplete?: () => void }) {
  const [particles] = useState<Particle[]>(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      size: Math.random() * 8 + 4,
      delay: Math.random() * 0.5,
      duration: Math.random() * 1.5 + 1.5,
      shape: (["circle", "square", "triangle"] as const)[Math.floor(Math.random() * 3)],
    }))
  );

  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 3000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute top-0"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.shape !== "triangle" ? p.color : "transparent",
            borderRadius: p.shape === "circle" ? "50%" : "0",
            borderLeft: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : undefined,
            borderRight: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : undefined,
            borderBottom: p.shape === "triangle" ? `${p.size}px solid ${p.color}` : undefined,
            animation: `confetti-fall ${p.duration}s ${p.delay}s ease-in forwards`,
          }}
        />
      ))}
    </div>
  );
}
