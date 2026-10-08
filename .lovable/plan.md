# Make the meetup map load reliably

## What the code does today (confirmed by reading it)

- The map waits for MapLibre's full `load` event, which needs a round trip to OpenFreeMap for the tile index, then the tiles, then the label fonts. All three come from a free third-party host.
- That wait has a hard 10-second limit. If it runs out, the map quietly turns into the venue list for the rest of the visit. There is no retry.
- Any startup error that isn't tied to a map source (for example a font file failing) also switches straight to the list.
- If the page is left before the map finishes starting (and in development, where React mounts things twice), the half-built map keeps loading into the same container. Two maps can end up competing for one canvas.

## Likely causes of the "sometimes it loads, sometimes it doesn't" behavior

1. **Slow or flaky free tile host.** When OpenFreeMap is slow, the 10-second limit runs out and you get the list instead of the map. This fits the random pattern best.
2. **Double-start race.** A map that starts twice into one container can leave a blank or frozen canvas.
3. **A permanent fallback.** One slow load sends you to the list until you reload the page.

These are strong suspects but not yet proven. Step 1 confirms which one(s) are really happening.

## The fix

1. **Measure first.** Log how long each startup stage takes (style, first tiles, `load`) and why it fell back (timeout, error, or cancelled). Run 20 cold loads through a test browser, normal and with a slowed-down network, so we can see which cause is real.
2. **Show the map earlier.** Mark the map ready as soon as the style has loaded (`style.load`) rather than waiting for every tile. Tiles and labels can keep filling in afterward. Only problems with the style itself or the background worker should count as fatal.
3. **Cancel properly.** Pass a cancel signal into map startup. When the page unmounts, the half-built map is removed right away, so a second start never shares a container with the first.
4. **Retry instead of giving up.** On failure, show the list with a "Try the map again" button, and retry once on its own with a longer wait (about 20s) before falling back.
5. **Fit the container.** Resize the map when its box changes size, so it never starts with zero size and draws a blank canvas.
6. **Rely less on the free host (optional).** Pin the tile index version, or cache it, so we don't fetch it again on every visit.

## Technical notes

- `src/map/adapter/maplibre-adapter.ts`: resolve on `style.load`; fatal only on style/worker errors; accept an `AbortSignal` and call `map.remove()` on abort; set `destroyed` via the signal; add a `ResizeObserver` that calls `map.resize()`; add timing marks.
- `src/map/DerpsMap.tsx`: create an `AbortController` per mount and abort it in cleanup; add a `retry()` that resets status to `loading` and remounts; auto-retry once; pass a retry callback to the fallback.
- `src/components/playdates/VenueBrowser.tsx`: show a "Try the map again" button above the list when the map failed.
- Tests: extend `src/test/map/adapter-startup.test.ts` with cases for resolving on `style.load`, aborting before load (map removed, no resolve), and retrying after a timeout.
- Verify with Playwright: 20 cold loads of `/playdates/venues`, with normal and slowed-down network, and confirm the map renders every time or recovers after a retry.
