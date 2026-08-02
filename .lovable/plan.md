# Always-visible map legend

Today the map has one legend chip, "Your home area", and its explanation only appears on hover or tap of a tooltip — so on touch devices and for anyone scanning quickly, the map's symbols are unexplained. The venue pins, the selected pin, the greyed-out pin and the number bubble have no legend at all.

Replace that single chip with a compact legend panel that is always visible on the map and names every symbol it draws.

## What the legend shows

Anchored bottom-left over the map, in the same card/blur styling as the current chip:

```text
 ┌─────────────────────────────┐
 │ ◌  Your home area           │
 │ ●  Meet-up spot             │
 │ ●  Selected                 │  (only while choosing a venue)
 │ ●  Not a fit for this pair  │  (only while choosing a venue)
 │ ③  Several spots — zoom in  │
 │ Approximate area, never     │
 │ your address.               │
 └─────────────────────────────┘
```

- Each row pairs a real swatch — the same dashed circle, pin border colours and cluster bubble the map itself renders — with a short label.
- The home-area row keeps a one-line privacy note visible rather than hiding it in a tooltip, since that is the part users most need to read: the circle is an approximate area, never an address.
- The two selection rows only appear when the browser is in "pick a venue" mode; in read-only mode they would name states the map cannot show.
- The cluster row only appears when clusters are actually on screen at the current zoom, so the legend never explains something absent.

## Layout and readability

- The panel stays small: swatch plus label per row, no headings, tuned so it never covers more than a corner of the map on mobile.
- A collapse control lets it shrink to a single "Legend" chip and expand again, defaulting to expanded. This keeps "always visible" true while giving an out on small screens.
- It is a plain list, not a set of buttons, so it is never mistaken for a filter control.

## Technical notes

- Rework `HomeAreaLegend` in `src/components/playdates/VenueBrowser.tsx` into a `MapLegend` component, passed through the existing `overlay` prop of `DerpsMap` — no adapter change needed for rendering.
- Legend swatches reuse the CSS variables already driving the markers (`--derps-map-pin`, `--derps-map-pin-selected`, `--derps-map-pin-disabled`, `--derps-map-cluster`) via new classes in `src/map/map.css`, so the legend cannot drift from the map's actual colours across the day/night/contrast variants.
- To know whether clusters are visible, `MapAdapter` gains a lightweight `onClustersChanged` callback emitted from the existing `syncMarkers` pass in `src/map/adapter/maplibre-adapter.ts`; `DerpsMap` surfaces it so the legend row can be conditional.
- The legend is marked up as a `dl` with visually-hidden text for each swatch, so a screen reader gets the same key. The existing venue list already conveys the same information, so this is additive.
- Home-area copy continues to come from `HOME_AREA` in `src/map/venue-features.ts` rather than being duplicated in the component.
