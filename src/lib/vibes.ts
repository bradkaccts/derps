import { type VibeTag } from "@/data/mock-pets";

interface VibeConfig {
  label: string;
  icon: string;
}

export const vibeConfig: Record<VibeTag, VibeConfig> = {
  "low-energy": { label: "Low Energy", icon: "🌙" },
  "high-energy": { label: "High Energy", icon: "⚽" },
  "good-with-pets": { label: "Pet Friendly", icon: "🛡️" },
  "kid-friendly": { label: "Kid Friendly", icon: "🐾" },
  independent: { label: "Independent", icon: "😎" },
  cuddly: { label: "Cuddly", icon: "🤗" },
  playful: { label: "Playful", icon: "🎾" },
  calm: { label: "Calm", icon: "☮️" },
  adventurous: { label: "Adventurous", icon: "🏔️" },
  quirky: { label: "Quirky", icon: "🤪" },
};

export const allVibes = Object.keys(vibeConfig) as VibeTag[];
