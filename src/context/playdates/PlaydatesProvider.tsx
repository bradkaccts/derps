import { type ReactNode } from "react";
import { PetPersonalityProvider } from "./PetPersonalityContext";
import { SafetyProvider } from "./SafetyContext";
import { SwipeProvider } from "./SwipeContext";
import { MatchProvider } from "./MatchContext";
import { MeetupProvider } from "./MeetupContext";

/**
 * Composes the Playdates module's stores into one provider so `App.tsx` gains
 * a single line rather than five levels of nesting.
 *
 * Ordering matters in one place only: `MeetupProvider` records TrustScore
 * signals, so it sits inside `SafetyProvider`. Everything else is independent
 * — cross-store orchestration lives in `usePlaydateFeed`, not in the stores.
 */
export function PlaydatesProvider({ children }: { children: ReactNode }) {
  return (
    <SafetyProvider>
      <PetPersonalityProvider>
        <SwipeProvider>
          <MatchProvider>
            <MeetupProvider>{children}</MeetupProvider>
          </MatchProvider>
        </SwipeProvider>
      </PetPersonalityProvider>
    </SafetyProvider>
  );
}

export { usePetPersonality } from "./PetPersonalityContext";
export { useSwipes } from "./SwipeContext";
export { useMatches } from "./MatchContext";
export { useMeetups } from "./MeetupContext";
export { useSafety } from "./SafetyContext";
