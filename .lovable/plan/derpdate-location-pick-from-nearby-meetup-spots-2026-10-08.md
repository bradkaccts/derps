# Derpdate location: pick from nearby meetup spots

The "Location" box in the Inbox Derpdate scheduler is currently free text ("Park, café, etc."). It will become a searchable drop-down listing checked and discovered meetup spots near you, the same ones shown on "Places to meet".

## What the user experiences

- Tapping Location opens a list of nearby spots, nearest first. Each shows its icon (dog park, park, trail, beach), name, area and rough distance.
- Typing filters the list by name or area.
- "Your area" is your browser location if allowed, otherwise the default Ventura area. If there are no saved spots nearby yet, the list shows "Finding spots near you..." while it looks them up.
- A "See all on the map" link at the bottom opens "Places to meet".
- No free-text addresses — every Derpdate happens somewhere public (this matches the existing safety rule). If nothing fits, "Suggest a spot" points to the existing suggestion form.
- The confirmed Derpdate card and message show the chosen spot's name, as today.

## Technical details

- New `VenuePicker` component (shadcn `Popover` + `Command` combobox) in `src/components/playdates/`, reading `useVenueCatalog()` and calling `discoverVenuesNear()` on open; uses `selectableVenues` + `filterVenues` (10 mi) from the user's position (geolocation, fallback `HOME_GEO`).
- `ChatView.tsx`: replace the Location `Input` with `VenuePicker`; store the venue id alongside the display name in `meetLocation` state so the sent Derpdate message keeps the readable name. Submit stays disabled until a spot is chosen.
- No backend changes.
