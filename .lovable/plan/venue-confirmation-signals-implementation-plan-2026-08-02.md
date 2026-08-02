# Venue Confirmation Signals — Implementation Plan

Presence-gated micro-prompts at meetup check-in that turn what visitors can see into per-attribute confidence, displayed as provenance ("Confirmed by 5 visitors, most recently 12 days ago") instead of badges. Client-side only, following the existing mock-data + context pattern, with the aggregation math isolated so a real backend can slot in later.

Scope: user-facing core (prompt, capture, aggregation, display, safety-critical asymmetry, disputed handling). Integrity monitoring, Gini/concentration alerts, staff overrides, and abuse flags are out of this build.

## What the user experiences

1. **At check-in only.** Right after a successful geofenced check-in on the meetup card, a small inline card appears with one or two yes / no / not sure questions about the venue ("Are there restrooms here?"). Never a modal, never blocking, dismissible in one tap, never re-shown for that meetup, and never surfaced anywhere else — no venue page prompt, no notifications.
2. **Which questions.** Disputed attributes first, then unknown, then single-observer, then stale-confirmed, with random tie-breaks. Nothing the user answered at that venue in the last 90 days, nothing already confirmed and fresh, nothing inapplicable to the venue type. Max 2 questions (1 on a first-ever check-in). If nothing qualifies, no card renders at all.
3. **After answering.** A neutral one-line acknowledgment with the resulting venue state ("Thanks. 4 visitors have confirmed parking here."). No totals, no streaks, no rank, no follow-up of any kind.
4. **On the venue detail row.** Attributes show provenance lines: confirmed with count and recency, reported as "Reported by 1 visitor — not yet confirmed", disputed showing both sides ("Mixed reports — 4 say yes, 2 say no"), stale as "…but not since March". Unknown attributes are simply absent. A standing note says attributes are reported by visitors and conditions change.
5. **On list rows.** Only confirmed attributes show as amenity icons. Nuanced states live on the detail view.
6. **Fenced is treated differently.** It only displays positively on strong, recent, near-unanimous agreement; a single credible "no" flips it to disputed and suppresses the positive display; absent evidence it is not displayed, and venue recommendations treat anything but a positive fenced state as unfenced.

The words verified, guaranteed, official, and certified never appear next to a community-sourced attribute. Observers are never identified.

## Technical approach

**New model and config** (`src/lib/playdates/types.ts`, new `src/data/venue-attributes.ts`)
- `VenueObservation` — id, venueId, attributeKey, value (`yes | no | unsure`), userId, meetupId, observedAt. Append-only; supersession happens at aggregation time.
- `VenueAttributeDefinition` — attributeKey, questionText, class (`standard | safety_critical`), halfLifeDays, applicableVenueTypes, enabled. Data, not code, per VC-112/VC-604.
- Attribute set: parking, restrooms, water, shade, separate_small_dog_area, lighting (standard) and fenced (safety-critical).

**Aggregation** (new `src/lib/playdates/venue-confidence.ts`, pure functions)
- Collapse to each user's most recent observation, decay `0.5 ^ (age / halfLife)`, apply the 0.5 co-attendance discount for extra observations sharing a meetup, cap each user at 1.0, sum into `W_yes` / `W_no` / `agreement` / `n_distinct` / `n_meetup_events`.
- State resolution: unknown / reported / confirmed / disputed / stale for standard attributes; the inverted thresholds and single-dissent rule for fenced. Confirmed additionally requires two distinct meetup events.
- Evaluated at read time so state ages without a job; memoized per render.

**State** (new `src/context/playdates/VenueConfidenceContext.tsx`)
- Holds observations in `usePersistentState`, seeded from a new `src/data/mock-venue-observations.ts` so venues launch with a realistic spread of confirmed, reported, disputed, and stale attributes.
- Exposes `selectQuestions(venueId, meetupId, userId)`, `submitObservations(...)`, `dismissPrompt(meetupId)`, and `attributeStates(venueId)`. Provider mounted alongside the existing playdate providers.

**UI**
- New `src/components/playdates/VenueConfirmationPrompt.tsx` — the inline two-tap card, rendered by `MeetupCard.tsx` only when the current user is checked in and questions qualify.
- New `src/components/playdates/VenueAttributeProvenance.tsx` — provenance lines for the venue detail body.
- `VenueBrowser.tsx` — detail body renders provenance; list rows filter amenity icons to confirmed states; the standing disclosure note is added.
- Recommendation logic in `src/lib/playdates/venues.ts` reads fenced confidence rather than the static amenity flag.

**Tests** (`src/test/playdates/venue-confidence.test.ts`)
- Decay, per-user cap across repeat visits, co-attendance discount, the three-distinct-users floor, two-meetup-event requirement, fenced asymmetry and single-dissent override, and question-selection priority and exclusions.

## Deliberately not built

No points, badges, streaks, leaderboards, contributor profiles, or public attribution. No reputation weighting. No open editing, free text, user-submitted venues, or notifications soliciting contributions. Post-meetup pet feedback stays a separate prompt on a separate surface.
