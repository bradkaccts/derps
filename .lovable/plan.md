# Simplify to a Derpdates-first app

The app currently ships two overlapping products at once: pet-to-pet Derpdates and pet adoption. Worse, Derpdates itself exists twice — a legacy version bolted onto the Home page (`Index.tsx` "Derpdates" view mode, `PlaydateCard`, `PlaydateContext`, Inbox "Derpdates" tab) and the newer, fuller module under `/playdates` (deck, quiz, matches, venues, safety). This plan hides the adoption surfaces and collapses the duplicate Derpdate experience into one.

Nothing is deleted. Everything hidden goes behind a single feature flag so adoption can be switched back on for release two.

## What the user will see

- Opening the app lands directly on the Derpdates feed (swipe deck for your pet, matches, meetups).
- Navigation shrinks to: Derpdates, Matches/Inbox, My Derp Friends, Profile — plus Places to Meet and Safety Center.
- Gone from the interface: "Rehome a Derp" / listing creation, "My Applications", "Applicant Inbox", the adopt-a-pet swipe and grid browsing on Home, the "Apply to Adopt" flow on a pet's profile, and the max-adoption-fee preference.
- The Inbox becomes a single conversation list (Derpdate chats) instead of the Adoptions/Derpdates tab split.
- "My Derp Friends" becomes the list of pets you've matched or liked through Derpdates rather than an adoption shortlist.

## Technical approach

**1. Feature flag**
New `src/config/features.ts` exporting `FEATURES = { adoption: false }`. All hiding keys off this constant so re-enabling is one edit.

**2. Routing (`src/App.tsx`)**
- `/` renders `PlaydatesFeed`.
- `/playdates` stays as an alias so existing links keep working.
- `/pet/:id`, `/create-listing`, `/my-applications`, `/applications-inbox` render only when `FEATURES.adoption` is true; otherwise those paths fall through to `NotFound`.
- `ApplicationProvider` and `FavoritesProvider` stay mounted (cheap, and avoids touching consumers), but their UI entry points go away.

**3. Navigation (`src/components/layout/AppLayout.tsx`)**
- Drop the separate Home entry; Derpdates becomes the first tab and matches `/` plus `/playdates/*`.
- Remove "My Applications", "Applicant Inbox", the "Rehome a Derp" sidebar button, and the mobile floating rehome button behind the flag.
- Keep Places to Meet and Safety Center.

**4. Home page (`src/pages/Index.tsx`)**
No longer routed. Left in place unmodified so the adoption browse experience returns intact when the flag flips.

**5. Legacy Derpdate duplication**
The legacy `PlaydateContext` path (`Request Derpdate` on `PetProfile`, `PlaydateCard`, Inbox Derpdates tab) is only reachable through adoption screens, so hiding adoption retires it automatically. `PlaydateContext` stays mounted for the Inbox tab code until step 6 removes that tab's dependency.

**6. Inbox (`src/pages/Inbox.tsx`)**
When the flag is off, render the conversation list without the tab bar. Derpdate match threads already live under `/playdates/matches`; the Inbox keeps direct messaging only.

**7. Profile (`src/pages/Profile.tsx`)**
Hide the "Max adoption fee" card behind the flag. Pet registration, personality, and preference sections stay — they feed Derpdate matching.

**8. My Derp Friends (`src/pages/MyDerps.tsx`)**
Repoint from `FavoritesContext` (adoption shortlist) to the Derpdates match store, listing matched pets with a link into each match thread. Keep the empty state pointing at the Derpdates feed.

## Out of scope

- No file deletions and no database changes.
- Adoption copy, screening form, and status tracker remain in the codebase untouched.
