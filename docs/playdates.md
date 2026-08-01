# Derps Playdates — implementation notes

Implements the *Derps Playdates — Functional Specification* (v0.1) on top of the
existing Derps adoption codebase: same Vite + React + TypeScript + Tailwind +
shadcn/ui stack, same context-per-domain state pattern, same design language.

This is the **pet-to-pet** product described in §0 of the spec. It is not owner
dating and not breeding: both are structurally impossible here, not merely
discouraged (§2.3, §11.2).

## Module layout

```
src/lib/playdates/        the matching engine — no React, fully unit-tested
  types.ts                domain model (§7)
  quiz.ts                 trait derivation from raw answers (§5.1)
  scoring.ts              ScoringStrategy + the v1 rules scorer (§6.1, §6.4)
  filters.ts              bidirectional hard filters (§6.3)
  candidates.ts           candidate generation + radius widening (§6.2)
  ranking.ts              expected-mutual-value rank + diversification (§6.5)
  reasons.ts              templated explanations (§6.6)
  feed.ts                 the four-stage pipeline, and the geo boundary
  geo.ts                  distance banding, jitter, geofence (§10.2)
  venues.ts               curated catalog filtering + pair fit (§5.4)
  trust.ts                TrustScore components, trait adjustment (§13.10, PQ-109)
  safety-text.ts          contact-share + transfer-intent classifiers (CH-304, REG-903)
  calendar.ts             .ics export (MP-408)
  analytics.ts            typed domain event bus + impressions (§6.7, §13.5)

src/context/playdates/    one store per bounded module; PlaydatesProvider composes them
src/hooks/use-playdate-feed.ts   cross-store choreography (swipe → match)
src/components/playdates/ deck, quiz, thread, venue browser, safety dialogs
src/pages/Playdate*.tsx   routes under /playdates
src/test/playdates/       77 unit tests over the engine
```

The stores are deliberately dumb. Anything that spans two of them — a like that
becomes a match, a swipe that must be logged against its impression — lives in
`use-playdate-feed.ts`, in one readable place.

## The four-stage pipeline

`buildFeed()` runs the stages the spec fixes in §6.1, in order:

1. **Candidate generation** — geo + eligibility + exclusions, capped at 500,
   widening the radius stepwise (1.5×, 50-mile ceiling) when the set is thin.
   Widening is always reported so the UI can label it. A hard filter is never
   relaxed to fill a deck.
2. **Hard filters** — evaluated bidirectionally and never shown. A pet failing
   any of them is removed, not down-ranked, and no score is emitted for it.
3. **Score** — behind `ScoringStrategy`, so the learned model in V1 drops in
   without touching anything upstream or downstream.
4. **Rank & diversify** — `compatibility × P(likes back) × novelty ×
   responsiveness`, then a play-style run limit and an exploration quota.

`FeedCard` is the only pet shape the UI ever sees, and it carries a
`DistanceBand` — never a coordinate, never a raw distance. A test asserts the
serialised card contains no `lat`, `lng`, or `homeGeo`.

## Deliberate deviations from the spec text

Two, both recorded here rather than buried:

- **`availability_overlap` is an overlap coefficient, not a Jaccard.** §6.4 says
  "fraction of shared availability windows" for this factor and explicitly says
  "Jaccard" for `handler_pref_overlap` — different words, different functions.
  A Jaccard here scores "free Saturday morning" against "free both weekend
  mornings" as 0.5 and halves every score in the deck for two people whose
  schedules are actually fully compatible.
- **Score band labels are calibrated to the real distribution**, not to a 0–100
  intuition. Multiplying five sub-1 factors puts a random pair around 25, which
  is the product's premise — a dog park is a random-assignment experiment. The
  numbers themselves are untouched; only the words next to them moved. They get
  refit when §6.8 fits the weights against outcomes.

## What is a client-side stand-in

There is no backend in this repository, so the following are implemented with
the spec's interfaces and versioning intact, over in-memory or localStorage
state:

| Spec | Here |
| --- | --- |
| PostGIS `ST_DWithin` (§13.2) | `haversineMiles` over the in-memory pool, same stage boundary |
| Redis already-swiped set (§13.3) | `isSuppressedBySwipeHistory` over the swipe log |
| Event bus (§13.5) | `playdateEvents`, typed publish/subscribe, same event shapes |
| `PUT /quiz/responses` partial save (PQ-105) | `usePersistentState`, one hook to swap |
| Chat encryption at rest (SEC-806) | not applicable client-side; bodies are stored plainly |
| On-device geofence (MP-410) | `navigator.geolocation` evaluated in the page; only the boolean is recorded |

The counterparty's like/decline is modelled from the same reciprocity prior the
ranker uses, resolved deterministically per pair so a pet's answer never
changes between an undo and a re-swipe.

## Requirement coverage

Every P0 in §5, §6, §9 and §10 that is meaningful without a server is
implemented. Notable ones and where they live:

| ID | Where |
| --- | --- |
| PQ-101 quiz gates the feed | `usePlaydateFeed` gate, `isEligible` |
| PQ-102 "not sure yet" lowers confidence | `deriveTraitVector` |
| PQ-103/104 raw answers persisted, vectors re-derivable | `quiz.ts`, `reDeriveAll` |
| PQ-105 resumable | `QuizFlow` resumes at first unanswered |
| PQ-106 previous vector kept as history | `buildPersonality` |
| PQ-107 hard filters as explicit records | `HardFilters`, `HardFilterSheet` |
| PQ-108 Vibe Card | `vibe-card.ts`, `VibeCardView` |
| SW-201..212 deck, buttons, undo, limits, Boop, browse, exploration | `PlaydateDeck`, `SwipeContext`, `ranking.ts` |
| CH-301..313 mutual-only, pet-pair scoping, relay, blur, block, expiry, Pals | `MatchContext`, `MatchThread` |
| MP-401..412 catalog, filters, pair fit, proposals, .ics, check-in | `venues.ts`, `VenueBrowser`, `MeetupCard` |
| FB-501..506 private structured feedback | `FeedbackDialog`, `MeetupContext`, `trust.ts` |
| RE-601..605 contributions, reasons, gate disclosure, score caps | `reasons.ts`, `CompatibilityMeter` |
| RE-610..614 impressions, joins, versions, A/B seam | `analytics.ts`, `SwipeContext` |
| UI-701..712 active pet, meter, hit targets, ARIA, reduced motion, empty states | `components/playdates/*`, `index.css` |
| SEC-801/803 no coordinates, bands only | `geo.ts`, `feed.ts` |
| REG-901..905 no ownership transfer, no payments, intent detection | `safety-text.ts`, `MatchThread` |

Out of scope by design and absent from the code: owner dating, breeding or stud
matchmaking, any pet-ownership transfer, and any payment surface.

## Running it

```sh
bun install      # or npm install
bun run dev
bun run test     # 77 engine tests
```

Playdates lives at `/playdates`. The demo account (Nugget) starts unquizzed, so
the first run walks the real onboarding: vaccination attestation → quiz → Vibe
Card → deck. Two matches are seeded so chat, meetup proposals, check-in and the
post-meetup feedback prompt are reachable immediately.
