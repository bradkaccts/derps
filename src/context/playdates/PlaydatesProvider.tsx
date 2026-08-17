import { type ReactNode } from "react";
import { PetPersonalityProvider } from "./PetPersonalityContext";
import { SafetyProvider } from "./SafetyContext";
import { SwipeProvider } from "./SwipeContext";
import { MatchProvider } from "./MatchContext";
import { MeetupProvider } from "./MeetupContext";
import { VenueConfidenceProvider } from "./VenueConfidenceContext";
import { OwnedPetPublisher } from "./OwnedPetPublisher";
import { RemotePoolProvider } from "./RemotePoolContext";



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
    <RemotePoolProvider>
      <SafetyProvider>
        <PetPersonalityProvider>
          <OwnedPetPublisher />
          <SwipeProvider>
            <MatchProvider>
              <MeetupProvider>
                <VenueConfidenceProvider>{children}</VenueConfidenceProvider>
              </MeetupProvider>
            </MatchProvider>
          </SwipeProvider>
        </PetPersonalityProvider>
      </SafetyProvider>
    </RemotePoolProvider>
  );
}


export { usePetPersonality } from "./PetPersonalityContext";
export { useSwipes } from "./SwipeContext";
export { useMatches } from "./MatchContext";
export { useMeetups } from "./MeetupContext";
export { useSafety } from "./SafetyContext";
export { useVenueConfidence } from "./VenueConfidenceContext";
export { useRemoteDerps } from "./RemotePoolContext";

