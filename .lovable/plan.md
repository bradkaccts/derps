# Automatic meetup-spot discovery (hybrid, cached)

When someone looks at "Places to meet" somewhere we have no spots yet, the app automatically finds dog-friendly public places nearby from OpenStreetMap, saves them so the next visitor gets them instantly, and lets local owners confirm details (fencing, water, shade) over time using the existing check-in questions.

## What the user experiences

1. Open "Places to meet" (or enter a ZIP / tap "Search this area") anywhere.
2. If the area already has saved spots, they show right away.
3. If not, a short "Finding spots near you..." state appears, then pins show up on the map (usually a few seconds).
4. Newly found spots are labelled "Found from public map data — details not yet confirmed by visitors." Amenities from map data (e.g. fenced) show as "Reported by map data", never as confirmed.
5. Fenced is never treated as confirmed from map data alone — recommendations still treat it as unfenced until visitors confirm it (existing safety rule).
6. Ventura's hand-checked spots keep working exactly as today.

## Which places get included

- Dog parks (`leisure=dog_park`)
- Parks and trails that explicitly allow dogs (`dog=yes` / `dog=leashed`)
- Beaches that allow dogs
- Pet-friendly patios are not auto-discovered (too unreliable); they still come only from suggestions.
- Places explicitly marked `dog=no` are excluded. Private / access=private excluded.

## Technical details

**Database** — new `public.venues` table: id, name, lat, lng, venue_type, amenities text[], leash_rules, hours, source (`osm`/`staff`/`user_submitted`), osm_id (unique), verification_state, verified_at, neighborhood, incident_flag_count, created_at. Readable by everyone (anon + authenticated), writable only by the backend function (service_role). Plus `public.venue_discovery_cells` (grid cell key ~0.1 deg, fetched_at) to remember which areas were already searched (refresh after 30 days).

Auto-discovered rows use verification_state `discovered` — a new state between pending and verified. `selectableVenues` will allow `verified` and `discovered` for meetups (they are public places from map data), while user suggestions stay `pending` and hidden.

**Backend function** `discover-venues`
- Input (Zod): lat, lng, radiusMiles (1-25).
- Rate limited per caller; snaps to grid cells; skips cells fetched within 30 days.
- Queries the Overpass API (free, no key) for the tags above, maps tags to our amenities (`barrier=fence`/`fenced=yes` -> fenced, `drinking_water` -> water, `lit=yes` -> lighting, `toilets` -> restrooms, `parking` nearby -> parking), upserts by osm_id, records the cell.
- Returns venues in radius. Times out gracefully (returns whatever is cached).

**Client**
- New venue source hook replacing direct use of `mockVenues` in `VenueBrowser.tsx`: merges seeded Ventura spots + backend `venues`; on origin change (geolocation, ZIP, "Search this area") reads cached rows, and if the cell is empty invokes `discover-venues`.
- Loading / empty / error states on the map and list.
- `VenueBrowser` provenance row shows the "found from public map data" note for `discovered` spots; map-data amenities render as "reported", not confirmed, through `venue-confidence.ts` (map data seeds a weak prior, never confirmed, never confirms fenced).
- Meetup composer and check-in prompts accept discovered venues (venue_id stays text; osm-backed ids are the row uuid).
- Seeded Ventura venues stay in code for now (later move into the table).

**Tests**
- OSM tag -> amenity/type mapping, dog=no exclusion, grid-cell caching decision, and fenced-from-map-data never resolving to confirmed.

## Not included
- Google Places / paid APIs (can be added later as a second source).
- Admin moderation screen for discovered spots.
