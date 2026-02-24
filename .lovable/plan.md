

# 🐾 Derps MVP — Implementation Plan

## Overview
A fun, family-friendly pet adoption platform with a whimsical "Derps" aesthetic. This MVP focuses on **discovery, profiles, messaging, and all three user roles** — built frontend-only with rich mock data so we can rapidly iterate on UX and design.

---

## 1. Design System & Branding
- **Color palette**: Warm creams (`#FFF8F0`), sage greens, terracotta accents — organic and approachable
- **Typography**: Rounded sans-serif fonts (e.g., Nunito) for a friendly feel
- **Micro-interactions**: Subtle "wiggle" on pet card hover, bouncy button animations, playful loading states
- **Icons**: Custom Vibe icons — Sleeping Moon (low energy), Soccer Ball (high energy), Shield (good with other pets), Paw (kid-friendly)

---

## 2. Pages & Navigation

### Mobile: Bottom Tab Bar
- **Home** (Discovery Feed), **Inbox**, **My Derps**, **Profile**

### Desktop: Left Sidebar Navigation
- Same sections with expanded labels and an Admin panel link for admin users

---

## 3. Discovery Feed (Home)

### Swipe Mode ("New Arrivals")
- Tinder-style card stack for newly listed pets
- Swipe right to "heart" → adds to Family Shortlist
- Swipe left to skip
- Cards show: pet photo/video, name, species, top Vibe tags, location radius

### Grid Mode ("Browse All")
- Multi-column responsive grid (1 col mobile, 3-4 cols desktop)
- **Vibe Filters** as large tappable icons (not dropdowns) — kid-friendly
- Additional filters: species, distance radius, age range
- Toggle between Swipe and Grid views

---

## 4. Pet Profile Page

### Mobile
- Full-width photo/video gallery (swipeable) at top
- Pet name, species, age, Vibe tags as colorful badges
- "Verified Health Badge" indicator
- Compatibility Meter (visual bar comparing pet traits to user preferences)
- Bio section (with personality and quirky fun facts)
- Rehoming reason (displayed empathetically)
- Sticky "Apply to Adopt" button at bottom

### Desktop
- Split-screen: media gallery left, sticky details + Apply button right

---

## 5. User Profiles & Roles

### Adopter Profile
- Name, location (radius only), home type, family size
- Preferences (species, energy level, yard availability)
- Photo gallery of home environment
- "Trust Score" badge (mock value for MVP)
- Favorites / Family Shortlist

### Rehomer Profile
- Same base profile + ability to create Pet Listings
- Listing management: view applications, change pet status
- "Verified Rehomer" badge

### Admin Dashboard
- User management: view accounts, flag/suspend
- Pet listing moderation queue
- Dispute overview (placeholder UI for future escrow disputes)
- Simple stats: total users, active listings, pending applications

---

## 6. Pet Listing Creation (Rehomer Flow)
- Step-by-step wizard:
  1. **Species & basics** (name, age, breed/type)
  2. **Vibes** — select personality tags from icon grid
  3. **Photos/Videos** — upload media (mock upload in MVP)
  4. **Rehoming reason** — empathetic category selector + optional story
  5. **Review & Publish**
- AI "Bio Generator" button — generates a fun, quirky pet bio (mock/placeholder)

---

## 7. Application Flow

### Adopter Side
- "Apply to Adopt" → short form with screening questions
- Application status tracker: Draft → Submitted → Under Review → Shortlisted → Approved / Declined
- Notification when status changes

### Rehomer Side
- Application inbox per pet listing
- View adopter's Trust Score, home profile, and screening answers
- Actions: Shortlist, Accept for Chat, Decline
- "Pet Personality Quiz" — send a fun quiz to applicants (mock)

---

## 8. In-App Messaging (Inbox)
- Consent-based: chat only unlocks after application is "Accepted for Chat"
- Conversation list with pet context (which pet the chat is about)
- Meet-and-Greet scheduler — pick a date/time directly in chat
- Both parties can "Check-in" to confirm the meeting happened
- Messages are mock/local state for MVP

---

## 9. Family Shortlist ("My Derps")
- Shared favorites board
- Heart pets from Swipe or Grid to add
- Side-by-side comparison view on desktop
- Family member avatars showing who favorited what

---

## 10. Fun "Derp" Touches
- **"Gotcha Day" countdown** — celebratory confetti animation when adoption is marked complete
- **Playful empty states** — cartoon derpy animals when no results found
- **"Wag" notification style** — bouncy animation on new message badges
- **Branded security section** — "Doghouse Rules" instead of "Security Settings"

---

## 11. Mock Data
- ~15-20 pre-built pet profiles across species (dogs, cats, birds, reptiles)
- 3-4 sample user profiles matching the personas (Felix, Fiona, Paul)
- Sample applications in various statuses
- Sample chat conversations

---

## Tech Approach
- React + TypeScript with React Router for multi-page navigation
- Tailwind CSS with custom Derps design tokens
- Shadcn/UI components customized to the warm aesthetic
- Framer Motion or CSS animations for micro-interactions
- All data in local state/mock — ready to connect Supabase later

