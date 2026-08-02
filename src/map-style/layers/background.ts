import { type CartographicPalette } from "../palette";
import { type LayerSpec } from "../schema";

/** Layer 1 — the page colour. Visible wherever no tile data has arrived. */
export function backgroundLayers(palette: CartographicPalette): LayerSpec[] {
  return [
    {
      id: "background",
      type: "background",
      paint: { "background-color": palette.background },
    },
  ];
}
