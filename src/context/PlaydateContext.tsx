import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type PlaydateStatus = "requested" | "accepted" | "scheduled" | "completed" | "declined";

export interface PlaydateSchedule {
  date: string;
  time: string;
  location: string;
}

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
}

export interface PlaydateChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
}

interface PlaydateContextValue {
  requests: PlaydateRequest[];
  requestPlaydate: (params: {
    myPetId: string;
    myPetName: string;
    targetPetId: string;
    targetPetName: string;
    targetPetPhoto: string;
    targetOwnerName: string;
    message?: string;
  }) => void;
  updateStatus: (requestId: string, status: PlaydateStatus) => void;
  schedulePlaydate: (requestId: string, schedule: PlaydateSchedule) => void;
  sendPlaydateMessage: (requestId: string, text: string) => void;
  getRequestForPet: (targetPetId: string) => PlaydateRequest | undefined;
  pendingCount: number;
  acceptedCount: number;
}

const PlaydateContext = createContext<PlaydateContextValue | null>(null);

export function PlaydateProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<PlaydateRequest[]>([]);

  const requestPlaydate = useCallback((params: {
    myPetId: string;
    myPetName: string;
    targetPetId: string;
    targetPetName: string;
    targetPetPhoto: string;
    targetOwnerName: string;
    message?: string;
  }) => {
    const newReq: PlaydateRequest = {
      id: `pd-${Date.now()}`,
      myPetId: params.myPetId,
      myPetName: params.myPetName,
      targetPetId: params.targetPetId,
      targetPetName: params.targetPetName,
      targetPetPhoto: params.targetPetPhoto,
      targetOwnerName: params.targetOwnerName,
      status: "requested",
      createdAt: new Date().toISOString(),
      message: params.message,
      chatMessages: params.message
        ? [{ id: `pm-${Date.now()}`, senderId: "u1", text: params.message, timestamp: new Date().toISOString() }]
        : [],
    };
    setRequests((prev) => [...prev, newReq]);
  }, []);

  const updateStatus = useCallback((requestId: string, status: PlaydateStatus) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const updated = { ...r, status };
        // Auto-add system message
        const statusMsg: PlaydateChatMessage = {
          id: `pm-${Date.now()}`,
          senderId: "system",
          text: status === "accepted" ? "🎉 Playdate accepted! Schedule a time below." 
              : status === "declined" ? "😢 Playdate declined."
              : status === "scheduled" ? "📅 Playdate scheduled!"
              : status === "completed" ? "✅ Playdate completed! Hope they had fun!" 
              : `Status updated to ${status}`,
          timestamp: new Date().toISOString(),
        };
        updated.chatMessages = [...r.chatMessages, statusMsg];
        return updated;
      })
    );
  }, []);

  const schedulePlaydate = useCallback((requestId: string, schedule: PlaydateSchedule) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const scheduleMsg: PlaydateChatMessage = {
          id: `pm-${Date.now()}`,
          senderId: "u1",
          text: `📅 Scheduled for ${schedule.date} at ${schedule.time} — ${schedule.location}`,
          timestamp: new Date().toISOString(),
        };
        return {
          ...r,
          status: "scheduled" as PlaydateStatus,
          schedule,
          chatMessages: [...r.chatMessages, scheduleMsg],
        };
      })
    );
  }, []);

  const sendPlaydateMessage = useCallback((requestId: string, text: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id !== requestId) return r;
        const msg: PlaydateChatMessage = {
          id: `pm-${Date.now()}`,
          senderId: "u1",
          text,
          timestamp: new Date().toISOString(),
        };
        return { ...r, chatMessages: [...r.chatMessages, msg] };
      })
    );
  }, []);

  const getRequestForPet = useCallback(
    (targetPetId: string) => requests.find((r) => r.targetPetId === targetPetId),
    [requests]
  );

  const pendingCount = requests.filter((r) => r.status === "requested").length;
  const acceptedCount = requests.filter((r) => r.status === "accepted" || r.status === "scheduled").length;

  return (
    <PlaydateContext.Provider value={{ requests, requestPlaydate, updateStatus, schedulePlaydate, sendPlaydateMessage, getRequestForPet, pendingCount, acceptedCount }}>
      {children}
    </PlaydateContext.Provider>
  );
}

export function usePlaydates() {
  const ctx = useContext(PlaydateContext);
  if (!ctx) throw new Error("usePlaydates must be used within PlaydateProvider");
  return ctx;
}
