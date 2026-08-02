# MapLibre GL JS Integration — Implementation Plan

Implements the attached spec, adapted to this project: one Vite app (no monorepo), no backend, and no tile server yet.

## Decisions locked in

- **No basemap tiles yet.** The map renders our own verified venue data over a token-coloured background canvas. The style pipeline still produces full OpenMapTiles-compatible layer definitions, so pointing at a real tile source later is a one-line source URL change.
- **Full spec, phased** (Phase 0 through 5, below).
- **Single app.** The spec's package boundaries become folder boundaries (`src/map-style/`, `src/map/`) with an ESLint rule enforcing them instead of workspace dependencies.
- **Three surfaces get the real map:** venue browser, meetup composer, meetup detail.

## Phase 0 — Design tokens as data (prerequisite)

The spec is blocked without machine-readable tokens. Today colours live only as HSL CSS variables in `index.css`.

- Add `src/design-tokens/tokens.ts` as the single source of truth: named ramps (`cream`, `sand`, `sage`, `terracotta`, `ink`) plus semantic aliases, each with day and night values.
- Generate the CSS variable block from those tokens so `index.css` and the map can never disagree. No visual change to the existing app — token values are extracted from the current palette exactly.
- Exit: tokens importable in Node, CSS output byte-identical in appearance to today.

## Phase 1 — Style pipeline (`src/map-style/`)

Zero runtime dependencies, never imports `maplibre-gl`.

- `schema.ts` — typed OpenMapTiles source-layer names.
- `palette.ts` — the token contract: maps tokens to cartographic roles (water, landcover, park, road fill/casing, building, label, halo).
- `layers/` — one module per group: background, landcover, water, transportation, buildings, labels. Full layer list from the spec's tables, with zoom stops.
- `variants.ts` — `day`, `night`, `high-contrast`.
- `build.ts` — emits `dist/{variant}.style.json`, validated with `@maplibre/maplibre-gl-style-spec`; the build fails on any spec error (MAP-150). Output is committed for reviewability.
- Sprites and glyphs: source SVGs for venue pins and amenity icons build into a spritesheet; a bundled font builds into PBF glyph ranges, both served same-origin from `public/map/`.

## Phase 2 — Renderer adapter and `DerpsMap` (`src/map/`)

- `adapter/` — a `MapAdapter` interface (`setCamera`, `fitBounds`, `getCamera`, `setVenues`, `setSelectedVenue`, `setPadding`, `destroy`) with a MapLibre implementation behind it. Nothing outside `src/map/` touches `maplibre-gl`.
- `DerpsMap.tsx` — the only component the app renders. Props: `venues`, `selectedVenueId`, `onSelectVenue`, `camera`, `onCameraChange`, `bottomInset`, `className`.
- Lazy-loaded via dynamic import and code-split, so MapLibre stays out of the initial bundle.
- Guarded lifecycle: cancelled-mount flag, adapter destroyed on unmount, WebGL-unsupported and style-load failures fall back to the existing list view with a friendly message rather than a raw error.

## Phase 3 — Venue rendering

- Venues become a runtime GeoJSON source (not baked into the style), with layers for clustered counts, unclustered pins, selection ring, and the meetup geofence circle.
- Selection uses `setFeatureState`, not filter swapping or source replacement, so selecting a pin never reparses tiles.
- Clustering above density thresholds; hard cap of 500 rendered venues per viewport.
- Existing filter/rank logic in `src/lib/playdates/venues.ts` is reused unchanged — the map consumes its output.

## Phase 4 — Interaction, bottom sheet, controls, a11y

- Camera padding tracks the venue detail sheet's snap points so the selected pin stays visible; padding re-applies and re-centres animated in step with the sheet.
- MapLibre's default controls are replaced with Derps-styled zoom, recentre, and attribution controls.
- Full keyboard traversal of pins; every pin has an equivalent row in the list view (the list stays the primary accessible view, as today). Amenity icons always carry text equivalents.
- Motion respects `prefers-reduced-motion`.

## Phase 5 — Privacy, testing, hardening

- No user positions on the map ever; the home marker stays approximate and coarse, matching current behaviour.
- Style, glyph, and sprite URLs are same-origin so no third party observes map loads.
- Tests: style validation in CI, palette/contrast checks on label-vs-background pairs, unit tests for clustering and selection state, plus screenshot baselines for each style variant regenerated only in isolated renderer-bump PRs.

## Surfaces changed

| Surface | Change |
| --- | --- |
| `/playdates/venues` | `SchematicMap` replaced by `DerpsMap`; filters, list view, and the list/map toggle stay as-is |
| Meetup composer | Venue picking on the real map, still restricted to verified catalog venues |
| Meetup detail | Confirmed location plus the check-in geofence ring |

## Technical notes

- New dependencies: `maplibre-gl`, `@maplibre/maplibre-gl-style-spec` (build-time), plus sprite/glyph build tooling.
- ESLint `no-restricted-imports` blocks `maplibre-gl` outside `src/map/` and blocks `maplibre-gl` entirely inside `src/map-style/`.
- `src/design-tokens/` must not import from `src/map-style/` — the design system does not know a map exists.
- `SchematicMap` is deleted once `DerpsMap` renders on all three surfaces; the list view remains the fallback when WebGL is unavailable.

## Deferred until a tile source is chosen

Basemap roads, water, landcover, and place labels will not be visible until a vector tile endpoint is configured. The layer definitions ship in Phase 1 regardless, so enabling them later is configuration, not code.
