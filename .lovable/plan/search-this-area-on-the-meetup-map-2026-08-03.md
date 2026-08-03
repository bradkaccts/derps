# "Search this area" on the meetup map

When someone drags or zooms the map away from where the current results were found, a floating "Search this area" button appears over the map. Tapping it re-runs the venue search around whatever the map is now centered on, so the list and pins match what they're looking at.

## Behavior

- Results are currently always measured from a fixed home point. That becomes a "search origin" that starts at the same place but can move.
- After the map settles (drag/zoom end), compare the new center to the current search origin. If it has moved more than roughly a quarter of the visible map width (with a small minimum so tiny nudges don't count), show the button.
- The button sits centered near the top of the map, above the legend, as a pill with a search icon: "Search this area".
- Tapping it sets the search origin to the map's center, re-filters and re-ranks venues from there, hides the button, and briefly shows a "Searching…" state so the refresh is visible.
- The result count line updates to say results are for "this area" once the origin has moved from the default, with a small "Reset to my area" link to snap back and recenter the map.
- Distance chips (3/10/25/50 mi) and the distance bands on each card keep working — they just measure from the new origin.
- The button is a real focusable button with an aria-live announcement of the new result count, so keyboard and screen-reader users get the same behavior. It never covers the pin tooltips.

## Technical notes

- `MapAdapter` already emits `cameraChange`; expose it through `DerpsMap` as a new optional `onCameraChange(camera)` prop (wired in the existing mount effect alongside `selectVenue`/`clustersChanged`).
- `VenueBrowser` gains `searchOrigin` state (defaults to `HOME_GEO`) plus a `pendingCenter` ref/state fed by `onCameraChange`; the drift check uses the existing `haversineMiles` helper from `src/lib/playdates/venues.ts` and the current zoom to estimate viewport width.
- `results` memo swaps `HOME_GEO` for `searchOrigin`; nothing in `filterVenues`/`rankVenuesForPair` changes.
- Reset uses the `camera` prop path — pass a camera keyed to the search origin so recentering animates back to `MAP_ANCHOR`.
- New button rendered inside the existing `overlay` prop next to `MapLegend`, styled with existing tokens (`bg-card`, `border-border`, `shadow-md`, `btn-bouncy`).
- Add a unit test for the drift threshold helper and confirm the flow in the browser (drag map, button appears, tap, pins/list update).
