/**
 * Derps design tokens — the single machine-readable source of truth.
 *
 * Spec §4.2 (the token contract): the map style is generated from these
 * values, so the map cannot drift out of sync with the product. Colours are
 * stored as HSL triples because that is the form the CSS custom properties in
 * `index.css` take; formatters below produce both the CSS-variable form
 * (`"30 100% 97%"`) and the CSS-colour form MapLibre parses (`"hsl(30, 100%, 97%)"`).
 *
 * This module has no dependencies and must never import from `src/map-style`
 * or `src/map`. The design system does not know a map exists.
 */

export type Hsl = readonly [h: number, s: number, l: number];

/** `"30 100% 97%"` — the shape Tailwind's `hsl(var(--x))` pattern expects. */
export function tokenVar([h, s, l]: Hsl): string {
  return `${h} ${s}% ${l}%`;
}

/** `"hsl(30, 100%, 97%)"` — comma form, which every CSS colour parser accepts. */
export function hsl([h, s, l]: Hsl, alpha?: number): string {
  return alpha === undefined
    ? `hsl(${h}, ${s}%, ${l}%)`
    : `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}

/** Relative luminance of an HSL colour, for the automated contrast checks (§11.4). */
export function luminance([h, s, l]: Hsl): number {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lN - c / 2;
  const [r, g, b] = (
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x]
  ).map((v) => {
    const channel = v + m;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: Hsl, b: Hsl): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* ------------------------------------------------------------------ *
 * Ramps — warm creams, sage greens, terracotta accents.
 * ------------------------------------------------------------------ */

export const ramps = {
  cream: {
    50: [30, 100, 98],
    100: [30, 100, 97],
    200: [30, 60, 92],
    300: [30, 30, 94],
    400: [30, 40, 88],
  },
  sand: {
    100: [30, 35, 90],
    200: [30, 25, 88],
    300: [28, 25, 80],
    400: [26, 22, 68],
    500: [24, 18, 52],
  },
  sage: {
    100: [150, 25, 88],
    200: [150, 25, 76],
    300: [150, 28, 60],
    400: [150, 30, 42],
    500: [150, 32, 32],
    600: [152, 34, 22],
  },
  terracotta: {
    200: [16, 60, 85],
    300: [16, 60, 70],
    400: [16, 60, 55],
    500: [16, 58, 44],
  },
  ink: {
    100: [30, 30, 90],
    200: [20, 10, 50],
    300: [20, 20, 35],
    400: [20, 20, 20],
    500: [20, 20, 10],
  },
  water: {
    200: [196, 55, 82],
    300: [198, 48, 66],
    400: [200, 45, 48],
    500: [202, 42, 30],
  },
} as const satisfies Record<string, Record<number, Hsl>>;

export type Ramp = keyof typeof ramps;

/* ------------------------------------------------------------------ *
 * Semantic aliases, per theme. These mirror `index.css` exactly.
 * ------------------------------------------------------------------ */

export type ThemeName = "day" | "night" | "contrast";

export interface SemanticTokens {
  background: Hsl;
  foreground: Hsl;
  card: Hsl;
  cardForeground: Hsl;
  primary: Hsl;
  primaryForeground: Hsl;
  secondary: Hsl;
  muted: Hsl;
  mutedForeground: Hsl;
  accent: Hsl;
  accentForeground: Hsl;
  border: Hsl;
}

export const themes: Record<ThemeName, SemanticTokens> = {
  day: {
    background: ramps.cream[100],
    foreground: ramps.ink[400],
    card: [30, 50, 99],
    cardForeground: ramps.ink[400],
    primary: ramps.sage[400],
    primaryForeground: ramps.cream[100],
    secondary: ramps.cream[200],
    muted: ramps.cream[300],
    mutedForeground: ramps.ink[200],
    accent: ramps.terracotta[400],
    accentForeground: ramps.cream[100],
    border: ramps.sand[200],
  },
  night: {
    background: ramps.ink[500],
    foreground: ramps.ink[100],
    card: [20, 18, 14],
    cardForeground: ramps.ink[100],
    primary: [150, 35, 50],
    primaryForeground: ramps.ink[500],
    secondary: [20, 15, 20],
    muted: [20, 15, 20],
    mutedForeground: [30, 15, 60],
    accent: [16, 55, 50],
    accentForeground: ramps.ink[100],
    border: [20, 15, 22],
  },
  /** WCAG-forward variant: same hues, pushed to the ends of the lightness range. */
  contrast: {
    background: [30, 100, 99],
    foreground: [20, 30, 8],
    card: [0, 0, 100],
    cardForeground: [20, 30, 8],
    primary: ramps.sage[600],
    primaryForeground: [0, 0, 100],
    secondary: [30, 40, 94],
    muted: [30, 20, 96],
    mutedForeground: [20, 20, 28],
    accent: ramps.terracotta[500],
    accentForeground: [0, 0, 100],
    border: [20, 20, 35],
  },
};

export const tokens = { ramps, themes } as const;
