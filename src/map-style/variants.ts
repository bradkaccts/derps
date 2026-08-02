/**
 * Style variants (spec §4.5) — day, night, high-contrast.
 *
 * The basemap layers are only emitted when a vector tile endpoint is
 * configured. Until one is, the style is a valid, token-coloured background
 * over which Derps renders its own venue data; adding tiles later is a URL,
 * not a code change.
 */
import { type ThemeName } from "@/design-tokens/tokens";
import { paletteFor } from "./palette";
import { SOURCE_ID, type LayerSpec, type StyleSpec } from "./schema";
import { backgroundLayers } from "./layers/background";
import { landcoverLayers } from "./layers/landcover";
import { waterLayers } from "./layers/water";
import { transportationLayers } from "./layers/transportation";
import { buildingLayers } from "./layers/buildings";
import { labelLayers } from "./layers/labels";

export interface BuildStyleOptions {
  variant: ThemeName;
  /** Vector tile JSON or `{z}/{x}/{y}` template. Omit for the no-basemap build. */
  tileUrl?: string;
  /** Same-origin glyph range template. Text layers are dropped without it. */
  glyphs?: string;
  /** Same-origin sprite base. */
  sprite?: string;
  /** Raster basemap tiles. Defaults to the hosted CARTO basemap for the variant. */
  rasterTiles?: string[] | null;
  center?: [number, number];
  zoom?: number;
  attribution?: string;
}

/** Keyless raster basemaps, tinted per variant so the map reads as a map. */
const RASTER_BASEMAPS: Record<ThemeName, string> = {
  day: "https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
  night: "https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png",
  contrast: "https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png",
};

export const RASTER_SOURCE_ID = "derps-basemap-raster";

/** Launch metro (FRD §13.8) — Ventura/LA. */
export const DEFAULT_CENTER: [number, number] = [-119.229, 34.2746];
export const DEFAULT_ZOOM = 11.5;


export function buildStyle(options: BuildStyleOptions): StyleSpec {
  const {
    variant,
    tileUrl,
    glyphs,
    sprite,
    rasterTiles,
    center = DEFAULT_CENTER,
    zoom = DEFAULT_ZOOM,
    attribution = "© OpenStreetMap contributors, © CARTO",
  } = options;

  const palette = paletteFor(variant);
  const layers: LayerSpec[] = [...backgroundLayers(palette)];
  const sources: Record<string, unknown> = {};

  // Without a vector endpoint, fall back to a keyless raster basemap so the
  // canvas shows actual geography rather than a flat token-coloured field.
  const raster =
    rasterTiles === null ? null : rasterTiles ?? [RASTER_BASEMAPS[variant]];
  if (!tileUrl && raster) {
    sources[RASTER_SOURCE_ID] = {
      type: "raster",
      tiles: raster,
      tileSize: 256,
      maxzoom: 20,
      attribution,
    };
    layers.push({
      id: "basemap-raster",
      type: "raster",
      source: RASTER_SOURCE_ID,
      paint: { "raster-opacity": 1, "raster-saturation": -0.15 },
    } as LayerSpec);
  }

  if (tileUrl) {

    sources[SOURCE_ID] = tileUrl.endsWith(".json")
      ? { type: "vector", url: tileUrl, attribution }
      : { type: "vector", tiles: [tileUrl], maxzoom: 14, attribution };

    layers.push(
      ...landcoverLayers(palette),
      ...waterLayers(palette),
      ...transportationLayers(palette),
      ...buildingLayers(palette),
    );

    // Symbol layers need glyph ranges; emitting them without would fail at load.
    const basemapLabels = labelLayers(palette).filter(
      (layer) => layer.type !== "symbol" || Boolean(glyphs),
    );
    layers.push(...basemapLabels);
  }

  const style: StyleSpec = {
    version: 8,
    name: `Derps ${variant}`,
    metadata: {
      "derps:variant": variant,
      "derps:generated": true,
      "derps:note": "Generated from @/design-tokens. Do not hand-edit.",
      "derps:basemap": Boolean(tileUrl),
    },
    sources,
    center,
    zoom,
    layers,
  };

  if (glyphs) style.glyphs = glyphs;
  if (sprite) style.sprite = sprite;

  return style;
}

export const VARIANTS: ThemeName[] = ["day", "night", "contrast"];
