import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMatches } from "@/context/playdates/PlaydatesProvider";
import { useMyPets } from "@/context/MyPetsContext";
import { usePetLookup } from "@/hooks/use-pet-lookup";

/**
 * A message only counts as delivered if the other person notices it. Realtime
 * drops the row into the thread; this surfaces it anywhere else in the app.
 */
export function IncomingMessageNotifier() {
  const { incomingMessage, clearIncomingMessage, getMatch, partnerPetId } = useMatches();
  const { activePet } = useMyPets();
  const lookupPet = usePetLookup();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!incomingMessage) return;
    const matchId = incomingMessage.matchId;
    const alreadyReading = location.pathname === `/playdates/matches/${matchId}`;
    clearIncomingMessage();
    if (alreadyReading) return;

    const match = getMatch(matchId);
    const partner =
      match && activePet ? lookupPet(partnerPetId(match, activePet.id)) : undefined;
    const who = partner?.name ? `${partner.name}'s human` : "A Derpdate match";

    toast(`${who} sent you a message`, {
      description:
        incomingMessage.type === "text"
          ? incomingMessage.body.slice(0, 90)
          : "Tap to open the conversation.",
      action: {
        label: "Open chat",
        onClick: () => navigate(`/playdates/matches/${matchId}`),
      },
    });
  }, [
    incomingMessage,
    clearIncomingMessage,
    getMatch,
    partnerPetId,
    activePet,
    lookupPet,
    navigate,
    location.pathname,
  ]);

  return null;
}
