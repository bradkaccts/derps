# Venue pin tooltips — hover and tap

Give every venue pin on the map a small tooltip card that answers "what is this place, and can we meet here?" without leaving the map.

## What the tooltip shows

Kept to four short lines so it stays readable on a phone:

1. Venue name + type ("Camino Real Park · Dog park")
2. Distance band ("<1 mi away")
3. Up to three key amenity chips, prioritised: fenced, off-leash, small-dog area, water, shade, parking, restrooms — with the confirmation signal appended when one exists ("Fenced · 5 confirmed", "Water · mixed reports")
4. One actionable line: hours when known, otherwise the venue rules summary trimmed to one sentence

When the browser is in "pick a spot" mode, the card ends with a primary action ("Choose this spot"), or a muted reason when the venue is not suitable for the matched pair (from the existing recommendation notes).

## Interaction

```text
Desktop  hover pin  -> tooltip opens after ~120ms, closes on mouse out
         keyboard   -> Tab to pin opens tooltip, Esc closes
         click      -> selects the venue (unchanged)

Touch    tap pin    -> tooltip opens (no selection yet)
         tap action -> selects the venue
         tap map    -> tooltip closes
```

Only one tooltip is open at a time, and the geofence tooltip and a pin tooltip never overlap — opening one closes the other. Cluster bubbles keep their current zoom-in behaviour and get a plain "3 spots here — zoom in" tooltip.

Selected pins keep their tooltip open so the current choice stays labelled while the map moves.

## Technical notes

- `MapVenueFeature` (`src/map/adapter/types.ts`) gains optional presentation-only fields: `amenityChips: { label: string; note?: string; tone: "confirmed" | "mixed" | "plain" }[]`, `detailLine?: string`, `actionLabel?: string`, `blockedReason?: string`. No product logic moves into the adapter.
- `src/map/venue-features.ts` builds those fields from the existing `VenueResult` (amenities, rules, hours, recommendation notes) and the venue-confidence attribute states already passed through `VenueBrowser`.
- `src/map/adapter/maplibre-adapter.ts`: reuse the existing `Popup` pattern used for the geofence. Add a shared `venuePopup` plus `pointerenter`/`pointerleave`/`focus`/`blur`/`click` handlers in `makePin`, with a pointer-type check so touch taps open rather than hover. Popup content is built with DOM nodes (no `innerHTML` interpolation of venue text) and the action button emits the existing `selectVenue` event.
- Tooltip visuals extend `.derps-map-popup` in `src/map/map.css` with chip and action styles driven by the existing marker CSS variables, so day/dark variants stay in sync. Reduced-motion respects the existing `reducedMotion` flag (no fade).
- Pin `aria-label` stays the full description; the popup is `aria-hidden` decoration for pointer users so screen readers are not double-announced.
- Tests: extend `src/test/map/` with a case asserting features carry chips/detail lines for a venue with mixed-report attributes, and that unsuitable venues expose `blockedReason` instead of `actionLabel`. Verify hover, tap, and Esc behaviour in the browser with a screenshot.
