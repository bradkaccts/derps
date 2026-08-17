# Application Review — and the next thing to build

## Where the app stands today

**Solid and real:**
- Derpdates-first navigation, feed, swipe deck, quiz, compatibility scoring, safety and trust logic — all well factored under `src/lib/playdates/` with real unit tests.
- MapLibre venue map: clustering, tooltips, legend, "search this area", venue confidence signals.
- Auth: passwordless sign-in (Google, Apple, magic link), `/auth`, `/account`, guest browsing with sign-in gates on hearts, inbox and matches.
- Database: `profiles`, `pets`, `user_roles` + `has_role`, and `user_state`, each with row-level security and grants. Pets are genuinely stored per account.

**The structural gap:** the app is a complete single-player simulation of a two-sided product.

1. **The feed only ever shows mock pets.** `src/hooks/use-playdate-feed.ts:2` builds its entire candidate pool from `buildMockPool()` / `mockPlaydatePets`. Nothing queries the `pets` table for other people's Derps. Two real users signed in on two phones cannot see each other, no matter how close they live.
2. **A "match" is a private note to yourself.** Matches, swipes, meetups and safety records all persist through `usePersistentState`, which writes a JSON blob to `user_state` scoped to `auth.uid()` (`src/hooks/use-persistent-state.ts:66`). The other side of a match has no row anywhere. The match is decided locally by a deterministic hash of the two pet IDs (`pairRoll`), not by the other owner actually booping back.
3. **Messages are not delivered.** Match threads read from the same per-user blob and from `mock-venues` / `mock-playdate-pets`. There is no shared thread table, so a message can never arrive on another account.
4. **Pet photos are fake.** Adding a pet assigns a hardcoded stock Unsplash URL (`src/pages/Profile.tsx:107`); there is no storage bucket and no upload. Every real user's Derp looks like the same stock dog.

Everything else — verification tiers, reports, blocks, venue confirmations — is scaffolding sitting on top of that simulation.

## Recommended priority: make Derpdates two-sided

Nothing else in the backlog changes the product's value until two real accounts can find each other, mutually match, and talk. Verification tiers, escrow, richer sorting and more map polish all decorate a loop that currently cannot complete between two humans. This is also the only work that turns the existing (good) matching engine from a demo into a product.

Suggested order:

### Step 1 — Real pets in the feed
Query the `pets` table for Derps within range of the active pet's location, convert them into the `ScoredPet` shape the existing pipeline already consumes, and run them through the same scoring code untouched. Keep mock pets as filler behind real ones so the feed still has depth in a thin market, with real Derps always ranked first and visually indistinguishable in layout.

Requires: pet location stored as coordinates, not just a city string, plus a discoverability flag so a pet can be hidden from the feed.

### Step 2 — Real boops and real matches
Move swipes out of the per-user blob into a shared `swipes` table (one row per pet-to-pet decision) and add a `matches` table. A match is created when two rows point at each other — no more `pairRoll`. Keep passes cheap and un-gated; a boop requires an account, as it does now.

### Step 3 — Real match threads
A `match_messages` table scoped to match participants, with realtime so a message appears on the other device without a refresh. The existing `MatchThread` UI stays; only its data source changes.

### Step 4 — Real pet photos
A storage bucket with upload from the add/edit pet form, replacing the hardcoded stock URL.

### Step 5 — Photo moderation and empty states
Once real photos and real strangers are in play: a report path that writes to the database, and honest empty states for a market with three users nearby instead of thirty.

## Technical notes

- `pets` needs `latitude`, `longitude`, `is_discoverable`, and the personality/preference fields the matcher needs — those live in `user_state` blobs today and must become columns or a `pet_personalities` table so other people's pets can be scored.
- New tables (`swipes`, `matches`, `match_messages`) each need explicit grants plus row-level security. Reading another person's pet is fine (`pets` is already publicly selectable); reading their swipes is not. Messages must be readable only by the two owners in the match.
- Match creation should be a security-definer function or trigger on `swipes`, so neither client can fabricate a match.
- `usePersistentState` stays for genuinely private, single-player state (quiz answers, preferences, venue notes). Swipes, matches and messages graduate out of it, including the guest-merge path.
- `use-playdate-feed.ts` keeps its hook API; only the pool source changes, so the deck, quiz gating and scoring tests all stay valid.
- Realtime on `match_messages` needs the table added to the realtime publication.

## Alternative, if this is too large a step

A smaller version of the same goal: Step 1 plus Step 2 only — real Derps in the feed and real mutual matches — and leave messaging as-is for a release. That alone makes the app two-sided; conversation can follow.
