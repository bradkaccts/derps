/**
 * The token contract (spec §4.2) — the only place tokens become cartography.
 *
 * Every colour in the generated style resolves through this file. No layer
 * module may hardcode a colour; if a role is missing here, add it here.
 */
import { hsl, ramps, themes, type Hsl, type ThemeName } from "@/design-tokens/tokens";

export interface CartographicPalette {
  /** Page behind everything, including where no tiles have loaded. */
  background: string;
  land: string;
  landcoverGrass: string;
  landcoverWood: string;
  parkFill: string;
  parkOutline: string;
  water: string;
  waterway: string;
  buildingFill: string;
  buildingOutline: string;
  majorFill: string;
  majorCasing: string;
  minorFill: string;
  minorCasing: string;
  pathFill: string;
  railFill: string;
  boundary: string;
  label: string;
  labelHalo: string;
  labelMinor: string;
  /** Derps-owned overlay roles — venue pins, selection, geofence. */
  venuePin: string;
  venuePinSelected: string;
  venuePinDisabled: string;
  cluster: string;
  clusterText: string;
  geofenceFill: string;
  geofenceLine: string;
  home: string;
}

const raw: Record<ThemeName, Record<keyof CartographicPalette, [Hsl, number?]>> = {
  day: {
    background: [ramps.cream[100]],
    land: [ramps.cream[100]],
    landcoverGrass: [ramps.sage[100], 0.55],
    landcoverWood: [ramps.sage[200], 0.5],
    parkFill: [ramps.sage[100], 0.75],
    parkOutline: [ramps.sage[400], 0.6],
    water: [ramps.water[200]],
    waterway: [ramps.water[300]],
    buildingFill: [ramps.sand[100]],
    buildingOutline: [ramps.sand[200]],
    majorFill: [ramps.cream[50]],
    majorCasing: [ramps.sand[200]],
    minorFill: [ramps.cream[100]],
    minorCasing: [ramps.sand[100]],
    pathFill: [ramps.sand[300], 0.8],
    railFill: [ramps.sand[300]],
    boundary: [ramps.sand[400], 0.6],
    label: [ramps.ink[400]],
    labelHalo: [ramps.cream[50]],
    labelMinor: [ramps.ink[200]],
    venuePin: [ramps.terracotta[400]],
    venuePinSelected: [ramps.sage[500]],
    venuePinDisabled: [ramps.sand[300]],
    cluster: [ramps.sage[400]],
    clusterText: [ramps.cream[100]],
    geofenceFill: [ramps.sage[400], 0.14],
    geofenceLine: [ramps.sage[400], 0.7],
    home: [ramps.sage[400]],
  },
  night: {
    background: [themes.night.background],
    land: [themes.night.background],
    landcoverGrass: [ramps.sage[600], 0.5],
    landcoverWood: [ramps.sage[600], 0.7],
    parkFill: [ramps.sage[600], 0.55],
    parkOutline: [ramps.sage[500], 0.7],
    water: [ramps.water[500]],
    waterway: [ramps.water[400]],
    buildingFill: [[20, 15, 18]],
    buildingOutline: [[20, 15, 24]],
    majorFill: [[20, 14, 26]],
    majorCasing: [[20, 14, 32]],
    minorFill: [[20, 15, 20]],
    minorCasing: [[20, 15, 24]],
    pathFill: [[20, 12, 30]],
    railFill: [[20, 12, 30]],
    boundary: [[30, 12, 45], 0.6],
    label: [ramps.ink[100]],
    labelHalo: [themes.night.background],
    labelMinor: [[30, 15, 60]],
    venuePin: [[16, 55, 58]],
    venuePinSelected: [[150, 45, 60]],
    venuePinDisabled: [[20, 12, 34]],
    cluster: [[150, 35, 44]],
    clusterText: [ramps.ink[100]],
    geofenceFill: [[150, 35, 50], 0.18],
    geofenceLine: [[150, 35, 55], 0.8],
    home: [[150, 35, 55]],
  },
  contrast: {
    background: [themes.contrast.background],
    land: [themes.contrast.background],
    landcoverGrass: [ramps.sage[200], 0.6],
    landcoverWood: [ramps.sage[300], 0.6],
    parkFill: [ramps.sage[200], 0.75],
    parkOutline: [ramps.sage[600]],
    water: [ramps.water[300]],
    waterway: [ramps.water[400]],
    buildingFill: [[30, 20, 92]],
    buildingOutline: [themes.contrast.border],
    majorFill: [[0, 0, 100]],
    majorCasing: [themes.contrast.foreground],
    minorFill: [[0, 0, 100]],
    minorCasing: [themes.contrast.border],
    pathFill: [themes.contrast.border],
    railFill: [themes.contrast.foreground],
    boundary: [themes.contrast.foreground, 0.8],
    label: [themes.contrast.foreground],
    labelHalo: [[0, 0, 100]],
    labelMinor: [themes.contrast.mutedForeground],
    venuePin: [ramps.terracotta[500]],
    venuePinSelected: [ramps.sage[600]],
    venuePinDisabled: [[20, 10, 55]],
    cluster: [ramps.sage[600]],
    clusterText: [[0, 0, 100]],
    geofenceFill: [ramps.sage[600], 0.2],
    geofenceLine: [ramps.sage[600]],
    home: [ramps.sage[600]],
  },
};

/** Underlying HSL triples, kept for the automated contrast tests (§11.4). */
export function paletteSource(variant: ThemeName) {
  return raw[variant];
}

export function paletteFor(variant: ThemeName): CartographicPalette {
  const entries = Object.entries(raw[variant]).map(([role, [colour, alpha]]) => [
    role,
    hsl(colour, alpha),
  ]);
  return Object.fromEntries(entries) as CartographicPalette;
}

export const typography = {
  labelFont: ["Derps Sans Regular"],
  labelFontBold: ["Derps Sans Bold"],
} as const;
