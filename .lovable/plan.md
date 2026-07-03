## Problem

On the Derpdates grid, the match score sits in the top-right corner directly on the pet photo. Today it renders as a bare SVG ring + number + label text with no background. That fails on several real cards:

- Score 76 on the beagle (Captain Fluff) — the number nearly disappears into the tan fur.
- Score 55 on Whiskers — cream/white cat background washes out the ring.
- The "Great Match!" / "Worth a Sniff" label uses `text-muted-foreground`, which is unreadable on almost every photo.
- The verified badge on the left already solves this by using a solid `bg-primary/90` pill — the score badge is the outlier.

## Recommendation

**Recolor/restyle rather than relocate.** The top-right overlay position is the right pattern (it's a familiar dating-app convention, keeps the photo as the hero, and matches the Verified pill on the left). The fix is to give the badge its own opaque surface so it reads on any background — no layout shuffling required.

## Plan

Edit `src/components/pets/MatchScoreBadge.tsx` only. No changes to `PlaydateCard.tsx` or business logic.

1. **Wrap the ring in a solid chip.** Add a `rounded-full bg-card` (cream) container with `shadow-md` and a thin `ring-1 ring-border` around the SVG so the circle always sits on a known surface. The track circle stays `hsl(var(--border))`, the progress arc keeps its semantic color (primary / accent / muted).
2. **Move the label into a pill under the ring.** Replace the bare `text-muted-foreground` label with a compact `rounded-full bg-card/95 backdrop-blur px-2 py-0.5 shadow-sm` pill so `🎾 Great Match!` / `👃 Worth a Sniff` stays legible. Text color switches to `text-foreground` (with the emoji carrying the semantic hue).
3. **Tighten the small size.** At `size="sm"` the current 48px ring + separate label stack is taller than the Verified pill on the left, making the corner feel unbalanced. Reduce label to `text-[10px]` and pull it flush under the ring so the whole cluster matches the Verified pill's visual weight.
4. **Keep semantic color logic intact.** The ring stroke and score number continue to use `text-primary` / `text-accent` / `text-muted-foreground` from the design tokens — only the surface behind them changes.
5. **No other files touched.** `MatchScoreBadge` is also used on `PetProfile` at `size="lg"`; the same treatment improves readability there for free without any call-site changes.

### Technical notes

- All colors stay as semantic tokens (`bg-card`, `text-foreground`, `ring-border`) — no hardcoded hex or `bg-white`.
- The chip uses `bg-card` (not `bg-background`) so it reads as an elevated surface consistent with the rest of the card system.
- No changes to `matching.ts`, `PlaydateCard.tsx`, or the grid layout in `Index.tsx`.
