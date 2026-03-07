import { type Pet, type VibeTag } from "@/data/mock-pets";

export interface MatchResult {
  score: number;
  label: string;
  emoji: string;
  sharedVibes: VibeTag[];
}

const ENERGY_TIERS: Record<string, number> = {
  "high-energy": 3,
  "playful": 2.5,
  "adventurous": 2.5,
  "calm": 1,
  "low-energy": 0,
  "independent": 1,
  "cuddly": 1.5,
};

function getEnergyLevel(vibes: VibeTag[]): number {
  const scores = vibes.map((v) => ENERGY_TIERS[v] ?? 1.5).filter(Boolean);
  return scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 1.5;
}

const AGE_ORDER = { baby: 0, young: 1, adult: 2, senior: 3 } as const;

export function calculateMatchScore(petA: Pet, petB: Pet): MatchResult {
  // 1. Vibe overlap (35%)
  const sharedVibes = petA.vibes.filter((v) => petB.vibes.includes(v));
  const allVibes = new Set([...petA.vibes, ...petB.vibes]);
  const vibeScore = allVibes.size > 0 ? (sharedVibes.length / allVibes.size) * 100 : 50;

  // 2. Energy alignment (20%)
  const energyA = getEnergyLevel(petA.vibes);
  const energyB = getEnergyLevel(petB.vibes);
  const energyDiff = Math.abs(energyA - energyB);
  const energyScore = Math.max(0, 100 - energyDiff * 33);

  // 3. Species compatibility (15%)
  let speciesScore = 50;
  if (petA.species === petB.species) {
    speciesScore = 100;
  } else if (
    petA.vibes.includes("good-with-pets") || petB.vibes.includes("good-with-pets")
  ) {
    speciesScore = 80;
  }

  // 4. Location proximity (20%) — capped at 50km
  const avgDist = (petA.distanceKm + petB.distanceKm) / 2;
  const distScore = Math.max(0, 100 - (avgDist / 50) * 100);

  // 5. Age compatibility (10%)
  const ageDiff = Math.abs(AGE_ORDER[petA.ageCategory] - AGE_ORDER[petB.ageCategory]);
  const ageScore = ageDiff === 0 ? 100 : ageDiff === 1 ? 60 : 20;

  const score = Math.round(
    vibeScore * 0.35 +
    energyScore * 0.20 +
    speciesScore * 0.15 +
    distScore * 0.20 +
    ageScore * 0.10
  );

  const clampedScore = Math.min(100, Math.max(0, score));

  let label: string;
  let emoji: string;
  if (clampedScore >= 90) {
    label = "Perfect Playdate!";
    emoji = "💕";
  } else if (clampedScore >= 70) {
    label = "Great Match!";
    emoji = "🎾";
  } else if (clampedScore >= 50) {
    label = "Worth a Sniff";
    emoji = "👃";
  } else {
    label = "Unlikely Pals";
    emoji = "🤷";
  }

  return { score: clampedScore, label, emoji, sharedVibes };
}

export function rankByCompatibility(myPet: Pet, candidates: Pet[]): (Pet & { match: MatchResult })[] {
  return candidates
    .filter((p) => p.id !== myPet.id)
    .map((p) => ({ ...p, match: calculateMatchScore(myPet, p) }))
    .sort((a, b) => b.match.score - a.match.score);
}
