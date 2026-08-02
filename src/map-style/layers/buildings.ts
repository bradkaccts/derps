import { SOURCE_ID, sourceLayers, type LayerSpec } from "../schema";
import { type CartographicPalette } from "../palette";

/**
 * Layers 15–16 — buildings, flat. No extrusions: no user need, and a real cost
 * in GPU and battery (spec §1.3).
 */
export function buildingLayers(palette: CartographicPalette): LayerSpec[] {
  return [
    {
      id: "building-fill",
      type: "fill",
      source: SOURCE_ID,
      "source-layer": sourceLayers.building,
      minzoom: 14,
      paint: {
        "fill-color": palette.buildingFill,
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0, 15.5, 1],
      },
    },
    {
      id: "building-outline",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.building,
      minzoom: 15.5,
      paint: { "line-color": palette.buildingOutline, "line-width": 0.6 },
    },
  ];
}
