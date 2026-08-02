import { SOURCE_ID, sourceLayers, type LayerSpec } from "../schema";
import { type CartographicPalette } from "../palette";

/** Layers 7–8 — water bodies and waterways. */
export function waterLayers(palette: CartographicPalette): LayerSpec[] {
  return [
    {
      id: "water",
      type: "fill",
      source: SOURCE_ID,
      "source-layer": sourceLayers.water,
      paint: { "fill-color": palette.water },
    },
    {
      id: "waterway",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.waterway,
      minzoom: 10,
      paint: {
        "line-color": palette.waterway,
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.6, 16, 3],
      },
    },
  ];
}
