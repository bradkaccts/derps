import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  getDataProvider,
  type HydratedInteraction,
  type InteractionMessage,
  type PlaydateSchedule,
} from "@/lib/data";

export type PlaydateStatus = "requested" | "accepted" | "scheduled" | "completed" | "declined";
export type PlaydateChatMessage = InteractionMessage;
export type { PlaydateSchedule };

/**
 * UI view-model over a hydrated playdate Interaction, preserving the field
 * names the existing components render. Normalized truth lives in the
 * provider; this is a read-time projection.
 */
export interface PlaydateRequest {
  id: string;
  myPetId: string;
  myPetName: string;
  targetPetId: string;
  targetPetName: string;
  targetPetPhoto: string;
  targetOwnerName: string;
  status: PlaydateStatus;
  createdAt: string;
  message?: string;
  schedule?: PlaydateSchedule;
  chatMessages: PlaydateChatMessage[];
  /** Whether the current user initiated this request. */
  direction: "outgoing" | "incoming";
}

function toViewModel(interaction: HydratedInteraction, currentUserId: string): PlaydateRequest {
  const outgoing = interaction.requesterUserId === currentUserId;
  const myPet = outgoing ? interaction.requesterPet : interaction.targetPet;
  const otherPet = outgoing ? interaction.targetPet : interaction.requesterPet;
  const otherUser = outgoing ? interaction.targetUser : interaction.requesterUser;
  const firstUserMessage = interaction.messages.find((m) => m.senderId !== "system");
  return {
    id: interaction.id,
    myPetId: myPet?.id ?? "",
    myPetName: myPet?.name ?? "",
    targetPetId: otherPet?.id ?? "",
    targetPetName: otherPet?.name ?? "",
    targetPetPhoto: otherPet?.photos[0] ?? "",
    targetOwnerName: otherUser?.name ?? "",
    status: interaction.status as PlaydateStatus,
    createdAt: interaction.createdAt,
    message: firstUserMessage?.text,
    schedule: interaction.schedule,
    chatMessages: interaction.messages,
    direction: outgoing ? "outgoing" : "incoming",
  };
}

interface PlaydateContextValue {
  requests: PlaydateRequest[];
  requestPlaydate: (params: { myPetId: string; targetPetId: string; message?: string }) => void;
  updateStatus: (requestId: string, status: PlaydateStatus) => void;
  schedulePlaydate: (requestId: string, schedule: PlaydateSchedule) => void;
  sendPlaydateMessage: (requestId: string, text: string) => void;
  getRequestForPet: (targetPetId: string) => PlaydateRequest | undefined;
  pendingCount: number;
  acceptedCount: number;
}

const PlaydateContext = createContext<PlaydateContextValue | null>(null);

export function PlaydateProvider({ children }: { children: ReactNode }) {
  const provider = getDataProvider();
  const [requests, setRequests] = useState<PlaydateRequest[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const user = await provider.getCurrentUser();
      const interactions = await provider.getInteractionsForUser(user.id, "playdate");
      if (cancelled) return;
      setCurrentUserId(user.id);
      setRequests(interactions.map((i) => toViewModel(i, user.id)));
    };
    load();
    const unsubscribe = provider.subscribe(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [provider]);

  const requestPlaydate = useCallback(
    (params: { myPetId: string; targetPetId: string; message?: string }) => {
      void provider
        .createPlaydateRequest({
          requesterUserId: currentUserId,
          requesterPetId: params.myPetId,
          targetPetId: params.targetPetId,
          message: params.message,
        })
        .catch((err) => console.error("Failed to request playdate:", err));
    },
    [provider, currentUserId]
  );

  const updateStatus = useCallback(
    (requestId: string, status: PlaydateStatus) => {
      void provider
        .updateInteractionStatus(requestId, status)
        .catch((err) => console.error("Failed to update playdate:", err));
    },
    [provider]
  );

  const schedulePlaydate = useCallback(
    (requestId: string, schedule: PlaydateSchedule) => {
      void provider
        .schedulePlaydate(requestId, schedule)
        .catch((err) => console.error("Failed to schedule playdate:", err));
    },
    [provider]
  );

  const sendPlaydateMessage = useCallback(
    (requestId: string, text: string) => {
      void provider
        .sendInteractionMessage(requestId, currentUserId, text)
        .catch((err) => console.error("Failed to send message:", err));
    },
    [provider, currentUserId]
  );

  const getRequestForPet = useCallback(
    (targetPetId: string) => requests.find((r) => r.targetPetId === targetPetId),
    [requests]
  );

  const pendingCount = requests.filter((r) => r.status === "requested").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted" || r.status === "scheduled").length;

  return (
    <PlaydateContext.Provider
      value={{ requests, requestPlaydate, updateStatus, schedulePlaydate, sendPlaydateMessage, getRequestForPet, pendingCount, acceptedCount }}
    >
      {children}
    </PlaydateContext.Provider>
  );
}

export function usePlaydates() {
  const ctx = useContext(PlaydateContext);
  if (!ctx) throw new Error("usePlaydates must be used within PlaydateProvider");
  return ctx;
}
