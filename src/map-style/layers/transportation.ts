import { SOURCE_ID, sourceLayers, type LayerSpec } from "../schema";
import { type CartographicPalette } from "../palette";

const MAJOR = ["motorway", "trunk", "primary"];
const MINOR = ["secondary", "tertiary", "minor", "service", "street"];

/**
 * Layers 9–14 — roads, drawn casing-under-fill so junctions read cleanly.
 * Widths interpolate on zoom rather than stepping, which keeps the network
 * legible while panning.
 */
export function transportationLayers(palette: CartographicPalette): LayerSpec[] {
  const width = (min: number, max: number) => [
    "interpolate",
    ["exponential", 1.4],
    ["zoom"],
    8,
    min,
    18,
    max,
  ];

  return [
    {
      id: "road-path",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.transportation,
      filter: ["in", ["get", "class"], ["literal", ["path", "track", "pedestrian"]]],
      minzoom: 13,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": palette.pathFill,
        "line-width": width(0.5, 2.5),
        "line-dasharray": [2, 2],
      },
    },
    {
      id: "road-minor-casing",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.transportation,
      filter: ["in", ["get", "class"], ["literal", MINOR]],
      minzoom: 11,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": palette.minorCasing, "line-width": width(1.4, 12) },
    },
    {
      id: "road-minor",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.transportation,
      filter: ["in", ["get", "class"], ["literal", MINOR]],
      minzoom: 11,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": palette.minorFill, "line-width": width(0.8, 9) },
    },
    {
      id: "road-major-casing",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.transportation,
      filter: ["in", ["get", "class"], ["literal", MAJOR]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": palette.majorCasing, "line-width": width(2, 18) },
    },
    {
      id: "road-major",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.transportation,
      filter: ["in", ["get", "class"], ["literal", MAJOR]],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": palette.majorFill, "line-width": width(1.2, 14) },
    },
    {
      id: "road-rail",
      type: "line",
      source: SOURCE_ID,
      "source-layer": sourceLayers.transportation,
      filter: ["==", ["get", "class"], "rail"],
      minzoom: 12,
      paint: {
        "line-color": palette.railFill,
        "line-width": width(0.6, 2),
        "line-dasharray": [4, 2],
      },
    },
  ];
}
