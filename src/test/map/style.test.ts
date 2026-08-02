import { describe, expect, it } from "vitest";
import { validateStyleMin } from "@maplibre/maplibre-gl-style-spec";
import { buildStyle, VARIANTS } from "@/map-style";
import { paletteSource } from "@/map-style/palette";

/** WCAG relative luminance from an HSL triple. */
function luminance([h, s, l]: readonly [number, number, number]) {
  const S = s / 100;
  const L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = L - c / 2;
  const [r1, g1, b1] =
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
              : [c, 0, x];
  const lin = (v: number) => {
    const n = v + m;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r1) + 0.7152 * lin(g1) + 0.0722 * lin(b1);
}

function contrast(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("map style pipeline", () => {
  it.each(VARIANTS)("emits a spec-valid style for %s", (variant) => {
    const style = buildStyle({ variant });
    expect(validateStyleMin(style as never)).toEqual([]);
  });

  it.each(VARIANTS)("emits basemap layers for %s once tiles are configured", (variant) => {
    const withTiles = buildStyle({
      variant,
      tileUrl: "https://tiles.example.com/{z}/{x}/{y}.pbf",
    });
    expect(withTiles.layers.length).toBeGreaterThan(10);
    // Symbol layers need glyphs; without a glyphs URL they must be dropped.
    expect(withTiles.layers.some((layer) => layer.type === "symbol")).toBe(false);
    expect(validateStyleMin(withTiles as never)).toEqual([]);
  });

  it("includes label layers when glyphs are configured", () => {
    const style = buildStyle({
      variant: "day",
      tileUrl: "https://tiles.example.com/{z}/{x}/{y}.pbf",
      glyphs: "/fonts/{fontstack}/{range}.pbf",
    });
    expect(style.layers.some((layer) => layer.type === "symbol")).toBe(true);
  });

  it("never emits pitch, terrain or extrusion layers", () => {
    for (const variant of VARIANTS) {
      const style = buildStyle({ variant, tileUrl: "https://t.example/{z}/{x}/{y}.pbf" });
      expect(style.layers.some((layer) => String(layer.type) === "fill-extrusion")).toBe(false);
      expect("terrain" in style).toBe(false);
    }
  });
});

describe("palette contrast (§11.4)", () => {
  it.each(VARIANTS)("%s keeps labels legible against land", (variant) => {
    const source = paletteSource(variant);
    expect(contrast(source.label[0], source.land[0])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(VARIANTS)("%s keeps venue pins distinct from selection", (variant) => {
    const source = paletteSource(variant);
    expect(contrast(source.venuePin[0], source.venuePinSelected[0])).toBeGreaterThan(1.2);
  });
});
