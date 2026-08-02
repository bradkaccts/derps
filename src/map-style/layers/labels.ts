import { SOURCE_ID, sourceLayers, type LayerSpec } from "../schema";
import { typography, type CartographicPalette } from "../palette";

/**
 * Layers 17–20 — boundaries and place labels.
 *
 * Text layers require glyph ranges. They are emitted only when the style is
 * built with a glyphs URL configured; see `variants.ts`.
 */
export function labelLayers(palette: CartographicPalette): LayerSpec[] {
  return [
    {
      id: "boundary-state",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.boundary,
      filter: ["<=", ["get", "admin_level"], 4],
      paint: {
        "line-color": palette.boundary,
        "line-width": 1,
        "line-opacity": 0.5,
        "line-dasharray": [3, 2],
      },
    },
    {
      id: "place-label-city",
      type: "symbol",
      source: SOURCE_ID,
      "source-layer": sourceLayers.place,
      filter: ["in", ["get", "class"], ["literal", ["city", "town"]]],
      layout: {
        "text-field": ["get", "name"],
        "text-font": typography.labelFontBold,
        "text-size": ["interpolate", ["linear"], ["zoom"], 8, 12, 14, 18],
        "text-max-width": 8,
      },
      paint: {
        "text-color": palette.label,
        "text-halo-color": palette.labelHalo,
        "text-halo-width": 1.4,
      },
    },
    {
      id: "place-label-neighbourhood",
      type: "symbol",
      source: SOURCE_ID,
      "source-layer": sourceLayers.place,
      filter: ["in", ["get", "class"], ["literal", ["neighbourhood", "suburb", "village"]]],
      minzoom: 12,
      layout: {
        "text-field": ["get", "name"],
        "text-font": typography.labelFont,
        "text-size": 12,
        "text-letter-spacing": 0.04,
      },
      paint: {
        "text-color": palette.labelMinor,
        "text-halo-color": palette.labelHalo,
        "text-halo-width": 1.2,
      },
    },
    {
      id: "road-label",
      type: "symbol",
      source: SOURCE_ID,
      "source-layer": sourceLayers.transportationName,
      minzoom: 14,
      layout: {
        "symbol-placement": "line",
        "text-field": ["get", "name"],
        "text-font": typography.labelFont,
        "text-size": 11,
      },
      paint: {
        "text-color": palette.labelMinor,
        "text-halo-color": palette.labelHalo,
        "text-halo-width": 1.2,
      },
    },
  ];
}
