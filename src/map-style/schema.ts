/**
 * OpenMapTiles source-layer names, typed.
 *
 * Spec §4.1 — the schema the generated style targets. Keeping these as a typed
 * union means a typo in a layer module is a compile error rather than an
 * invisible empty layer at runtime.
 */

export const SOURCE_ID = "derps-basemap" as const;

export const sourceLayers = {
  water: "water",
  waterway: "waterway",
  landcover: "landcover",
  landuse: "landuse",
  park: "park",
  transportation: "transportation",
  transportationName: "transportation_name",
  building: "building",
  place: "place",
  boundary: "boundary",
  poi: "poi",
} as const;

export type SourceLayer = (typeof sourceLayers)[keyof typeof sourceLayers];

/* ------------------------------------------------------------------ *
 * Minimal structural style types.
 *
 * Deliberately local rather than imported from `maplibre-gl`: this module
 * graph must run in plain Node with no renderer present (CI rule 1). Emitted
 * output is validated against the real style spec in `build.ts`, so these
 * types are a convenience, not the contract.
 * ------------------------------------------------------------------ */

export type StyleExpression = unknown;

export interface LayerSpec {
  id: string;
  type: "background" | "fill" | "line" | "symbol" | "circle" | "raster";
  source?: string;
  "source-layer"?: SourceLayer;
  filter?: StyleExpression;
  minzoom?: number;
  maxzoom?: number;
  layout?: Record<string, StyleExpression>;
  paint?: Record<string, StyleExpression>;
  metadata?: Record<string, unknown>;
}

export interface StyleSpec {
  version: 8;
  name: string;
  metadata: Record<string, unknown>;
  sources: Record<string, unknown>;
  glyphs?: string;
  sprite?: string;
  center: [number, number];
  zoom: number;
  layers: LayerSpec[];
}
