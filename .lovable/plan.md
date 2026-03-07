

# Pet Dating / Meet & Greet Feature — Enhancement Plan

## Concept

Transform the existing pet discovery into a **"Pet Playdates"** matching system where pet owners can find compatible pets for their own pets to meet. This adds a social/community layer on top of the adoption flow — think "Tinder for pets to make friends."

## Key Enhancements

### 1. Pet Compatibility Matching Engine (`src/lib/matching.ts`)
Replace the current random compatibility score with a real algorithm that scores pet-to-pet matches based on:
- **Vibe overlap** — shared personality tags (playful + playful = great match)
- **Species compatibility** — same species or cross-species friendliness (pets with `good-with-pets` vibe)
- **Location proximity** — closer = higher score
- **Energy level alignment** — high-energy pairs with high-energy, not low-energy
- **Age compatibility** — similar age categories score higher

The function returns a 0-100 score plus a fun label ("Perfect Playdate!", "Worth a Sniff", "Unlikely Pals").

### 2. "My Pet" Profile Selection
Currently the app has a `currentUser` but no concept of "the user's own pet." To enable pet-to-pet matching:
- Add a **"Your Derps"** section to the Profile page where the user can register their own pet(s) — either by selecting from their rehoming listings or creating a quick mini-profile (name, species, vibes, photo)
- Store in a new `MyPetsContext` with a selectable "active pet" for matching
- Mock data: give Felix (the default adopter) a pet so the feature works immediately

### 3. New "Playdates" Discovery Tab
Add a third view mode on the Home page alongside Swipe/Grid:
- **Playdates mode** (icon: `Heart` with `Users`) — shows pets ranked by compatibility with the user's active pet
- Each card displays: match score badge, shared vibes highlighted, distance, and a "Request Playdate" button
- Swipe-right in this mode sends a playdate request instead of a favorite

### 4. Playdate Request Flow
- New `PlaydateContext` managing playdate requests with statuses: `requested → accepted → scheduled → completed`
- When a playdate is accepted, it unlocks the existing Meet & Greet scheduler in messaging
- Add a "Playdates" tab in the Inbox to separate playdate conversations from adoption conversations

### 5. Pet Profile Enhancements
On `PetProfile.tsx`:
- Replace the random compatibility score with the real matching score (pet-to-pet if user has a pet, or pet-to-preferences if not)
- Add a **"Playdate Match"** card showing vibe overlap visualization (shared vibes highlighted in green)
- Add a "Request Playdate 🐾" button alongside the existing "Apply to Adopt" button

### 6. Navigation & UI Updates
- Add a **"Playdates"** nav item to sidebar and mobile tab bar (or integrate as a badge/tab on the Home page)
- Add playdate request count badge similar to the unread messages badge
- On `MyDerps` page, add a section showing "Upcoming Playdates" with scheduled meet-and-greets

## Files to Create
| File | Purpose |
|------|---------|
| `src/lib/matching.ts` | Compatibility scoring algorithm |
| `src/context/MyPetsContext.tsx` | User's own pets state + active pet selection |
| `src/context/PlaydateContext.tsx` | Playdate request management |
| `src/components/pets/PlaydateCard.tsx` | Pet card variant showing match score + request button |
| `src/components/pets/MatchScoreBadge.tsx` | Animated circular match percentage badge |
| `src/pages/Playdates.tsx` | Dedicated playdates discovery/management page |

## Files to Modify
| File | Change |
|------|--------|
| `src/pages/Index.tsx` | Add "Playdates" view mode tab |
| `src/pages/PetProfile.tsx` | Real compatibility score, playdate request button |
| `src/pages/Profile.tsx` | "My Pets" section for registering user's pet |
| `src/pages/MyDerps.tsx` | Upcoming playdates section |
| `src/pages/Inbox.tsx` | Playdates tab in messaging |
| `src/components/layout/AppLayout.tsx` | Playdates nav item or badge |
| `src/App.tsx` | Add MyPetsProvider, PlaydateProvider, /playdates route |
| `src/data/mock-pets.ts` | Add a pet owned by the current user for demo |

## Matching Algorithm Sketch

```text
Score Weights:
  Vibe overlap        → 35%  (shared vibes / total unique vibes)
  Energy alignment    → 20%  (same energy tier = full, adjacent = half)
  Species compat      → 15%  (same species or good-with-pets = full)
  Location proximity  → 20%  (inverse of distance, capped at 50km)
  Age compatibility   → 10%  (same category = full, adjacent = half)

Labels:
  90-100  → "Perfect Playdate! 💕"
  70-89   → "Great Match! 🎾"
  50-69   → "Worth a Sniff 👃"
  <50     → "Unlikely Pals 🤷"
```

## UX Flow Summary

```text
Profile → Register "My Pet" (name, species, vibes, photo)
  ↓
Home → Switch to "Playdates" tab
  ↓
See pets ranked by compatibility with your pet
  ↓
Swipe right or tap "Request Playdate"
  ↓
Owner receives request in Inbox (Playdates tab)
  ↓
Accept → Meet & Greet scheduler unlocks
  ↓
Schedule, meet, check-in → confetti 🎉
```

