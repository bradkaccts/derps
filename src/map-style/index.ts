/**
 * Public surface of the style pipeline. Zero runtime dependencies: this module
 * emits JSON, it does not render.
 */
export { buildStyle, VARIANTS, DEFAULT_CENTER, DEFAULT_ZOOM } from "./variants";
export type { BuildStyleOptions } from "./variants";
export { paletteFor, paletteSource, typography } from "./palette";
export type { CartographicPalette } from "./palette";
export { SOURCE_ID, sourceLayers } from "./schema";
export type { LayerSpec, StyleSpec, SourceLayer } from "./schema";
