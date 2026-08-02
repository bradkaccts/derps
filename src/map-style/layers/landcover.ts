import { SOURCE_ID, sourceLayers, type LayerSpec } from "../schema";
import { type CartographicPalette } from "../palette";

/** Layers 2–6 — landcover, landuse and parks. */
export function landcoverLayers(palette: CartographicPalette): LayerSpec[] {
  return [
    {
      id: "landcover-grass",
      type: "fill",
      source: SOURCE_ID,
      "source-layer": sourceLayers.landcover,
      filter: ["in", ["get", "class"], ["literal", ["grass", "farmland"]]],
      paint: { "fill-color": palette.landcoverGrass },
    },
    {
      id: "landcover-wood",
      type: "fill",
      source: SOURCE_ID,
      "source-layer": sourceLayers.landcover,
      filter: ["in", ["get", "class"], ["literal", ["wood", "forest"]]],
      paint: { "fill-color": palette.landcoverWood },
    },
    {
      id: "landuse-residential",
      type: "fill",
      source: SOURCE_ID,
      "source-layer": sourceLayers.landuse,
      filter: ["==", ["get", "class"], "residential"],
      minzoom: 9,
      paint: { "fill-color": palette.land },
    },
    {
      id: "park-fill",
      type: "fill",
      source: SOURCE_ID,
      "source-layer": sourceLayers.park,
      paint: { "fill-color": palette.parkFill },
    },
    {
      id: "park-outline",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.park,
      minzoom: 12,
      paint: { "line-color": palette.parkOutline, "line-width": 1 },
    },
  ];
}
