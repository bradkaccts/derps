# Make MapLibre worker failures loud, not silent

## What's actually fragile today

The map spawns a web worker. When that worker fails to start, nothing in the current code notices:

- `createMapLibreAdapter` awaits `map.once("load")` with no timeout. If the worker never comes up, that promise never settles — `DerpsMap` sits in `status: "loading"` forever, showing "Loading map…" and never falling back to the venue list.
- `map.on("error", ...)` is registered *after* the load await, so every error raised during style/worker startup — the exact window where worker failures happen — has no listener. MapLibre logs it to the console and the app never hears about it.
- `DerpsMap` never subscribes to the adapter's `error` event at all, so even post-load errors are dropped.
- The current mitigation is `optimizeDeps.exclude: ["maplibre-gl"]` in `vite.config.ts`. That only affects the dev server's dep pre-bundling; it does nothing for the production Rollup build, where worker resolution is handled differently. So dev and prod can diverge without warning.

## The fix

**1. Time-bound the load, and treat a stall as a failure.** Race the `load` event against a timeout (10s) and against an early `error`. If either fires first, reject — `DerpsMap` already turns a rejected adapter into `unsupported`, which renders the venue-list fallback. A user on a broken worker gets the full list instead of a permanent spinner.

**2. Listen for errors from the first moment.** Move the `map.on("error")` registration to immediately after the map is constructed, before the load await. Errors arriving pre-load reject the startup promise; errors after load emit on the adapter as they do now.

**3. Surface adapter errors in the component.** `DerpsMap` subscribes to `error` and, when the map has produced no usable render, switches to the fallback rather than leaving a blank canvas. Add an optional `onError` prop so callers can log. A worker failure becomes a visible state change, never a silent one.

**4. Make the Vite setup correct for both dev and build.** Keep `optimizeDeps.exclude` for dev, and add `worker: { format: "es" }` so worker chunks are emitted as ES modules that match how MapLibre 6 loads them under Rollup. Verify with a real production build plus a preview-server smoke test — not just the dev server — so a build-only regression can't ship unnoticed.

**5. Guard the regression.** Add a test that a failing/stalled map startup resolves to the fallback path within the timeout rather than hanging, alongside the existing style tests.

## Technical notes

- `src/map/adapter/maplibre-adapter.ts`: reorder error registration above the load await; replace the bare `new Promise` with a `Promise.race` over `load`, `error`, and a `setTimeout` rejection; clear the timer on settle and on `destroy()`.
- `src/map/adapter/types.ts`: no interface change needed — `error` already exists on `MapAdapterEvents`.
- `src/map/DerpsMap.tsx`: add `onError?: (e: Error) => void`; subscribe to the adapter `error` event; add a `"failed"` status that renders `fallback` the same way `"unsupported"` does, so the venue list appears instead of an empty canvas.
- `vite.config.ts`: add `worker: { format: "es" }`; keep and re-comment the `optimizeDeps.exclude` entry as dev-only.
- Verification: `bun run build`, then serve the built output and load `/playdates/venues` in Playwright, asserting the canvas renders and no worker error is logged; separately, simulate a worker failure to confirm the fallback list appears.
