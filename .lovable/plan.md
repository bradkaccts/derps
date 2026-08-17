# Derps Authentication & Identity — Release 1

Based on the attached Authentication & Identity Requirements, scoped to what you selected: Lovable Cloud backend, passwordless sign-in (FR-501), full guest browsing, and migrating pet/quiz/match data into real accounts.

## What gets built

### 1. Lovable Cloud backend
Enables real accounts, a database, and server-side rules. No external account or setup needed.

### 2. Passwordless sign-in (FR-501)
- Sign in with Google and Sign in with Apple as the primary buttons.
- Email magic link as the fallback (no passwords anywhere).
- A single `/auth` screen in the Derps voice ("Grab your leash"), plus a callback route.
- Session restored automatically on return visits; sign-out from Profile.

### 3. Guest-first access (progressive gating)
Signed-out visitors keep full run of the app: browse the Derpdate feed, take the Vibe Quiz, browse Places to Meet, and build a shortlist. Guest activity is held locally and merged into the account on first sign-in, so nothing is lost.

Actions that require an account (Tier 0 — Registered):
- Boop / heart another Derp in a way that reaches them
- Open Inbox or send a message
- Propose or accept a Derpdate meetup
- Add or edit a pet on your profile
- Report or block

These show a friendly "Sign in to keep going" sheet instead of failing.

### 4. Account & pet data in the database
Everything currently held in browser storage moves to per-user rows, private by default:
- Account profile (display name, avatar, location, TrustScore placeholder, verification tier)
- Pets owned by the account, with photos
- Vibe Quiz responses, derived personality, and preferences per pet
- Swipes, boops, and impressions
- Matches, match threads, and meetups
- Blocks, reports, trust signals, and venue observations

Each user can read and write only their own records; another user's pet is visible only through the feed/match surfaces that are meant to expose it. Sign-in on a second device restores everything.

### 5. Tier scaffolding (display only this round)
The spec's four tiers are stored on the account so later work is a data change, not a rebuild. This round every signed-in user is Tier 0, and the Profile page shows the tier with the locked benefits of Tier 1–3 listed as "coming soon". No phone OTP, no ID check, no badges yet.

## Not in this build (from the spec)

- FR-502 phone + email verification (Tier 1) and messaging gate — needs a paid SMS provider
- FR-503 biometric unlock and passkeys — native-app / WebAuthn work, not available through Cloud auth out of the box
- FR-504 ID + liveness (Tier 2/3) — needs Stripe Identity or Persona
- FR-505 step-up auth for escrow/contracts — the escrow product doesn't exist yet
- FR-506 new-device alerts, FR-507 recovery re-verification, FR-508 bot detection and rate limits

## Recommended additions (your call — not included unless you say so)

1. **Terms + privacy acceptance at first sign-in**, with the timestamp stored. Cheap now, painful to backfill; effectively required before real users touch a meetup product.
2. **Age gate at sign-up (13+ / 18+)**. The spec has a "Minors & Family Sub-Accounts" heading with no content. In-person meetups with strangers make this a real question, and it's one field if decided now.
3. **Account deletion / data export** in Profile settings. Required by app stores and privacy law once real accounts exist.
4. **Email verification for the magic-link path**, treated as the email half of Tier 1. Free, and gets you halfway to FR-502 without SMS costs.
5. **Session revoke list** ("signed in on 2 devices, sign out everywhere"). A light version of FR-506 without push infrastructure.
6. **Basic per-account rate limits** on boops and messages. A partial FR-508 with no vendor cost.

## Technical notes

- Enable Lovable Cloud; configure Google and Apple providers plus email OTP/magic link. Auto-confirm stays off; magic link is the confirmation.
- New tables: `profiles`, `pets`, `pet_personalities`, `pet_preferences`, `quiz_responses`, `swipes`, `impressions`, `matches`, `match_messages`, `meetups`, `meetup_feedback`, `blocks`, `reports`, `trust_signals`, `venue_observations`. Every table gets explicit grants and row-level security scoped to `auth.uid()`; a `user_roles` table with a `has_role` function covers admin access rather than a role column on the profile.
- `profiles` carries `verification_tier` (0–3), `trust_score`, and nullable `phone`/`phone_verified_at` columns so FR-502 is additive later.
- A trigger creates the profile row on signup.
- New `AuthProvider` registers `onAuthStateChange` first, then reads the session; `getUser()` is used for any trust decision.
- Existing contexts (`MyPetsContext`, `PetPersonalityContext`, `SwipeContext`, `MatchContext`, `MeetupContext`, `SafetyContext`, `VenueConfidenceContext`) keep their current hook APIs and swap `usePersistentState` for a Cloud-backed store, so the Derpdate surfaces don't change shape. Signed-out sessions keep the localStorage path, and a one-time merge runs on first sign-in.
- A `useRequireAuth()` helper drives the sign-in sheet on gated actions.
- Mock pets stay as the "other pets nearby" population for the feed so the Derpdate experience still has depth with a small user base.
