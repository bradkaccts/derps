import { createContext, useContext, useState, ReactNode, useCallback } from "react";

export type PlaydateStatus = "requested" | "accepted" | "scheduled" | "completed" | "declined";

export interface PlaydateRequest {
  id: string;
  myPetId: string;
  targetPetId: string;
  status: PlaydateStatus;
  createdAt: string;
  message?: string;
}

interface PlaydateContextValue {
  requests: PlaydateRequest[];
  requestPlaydate: (myPetId: string, targetPetId: string, message?: string) => void;
  updateStatus: (requestId: string, status: PlaydateStatus) => void;
  getRequestForPet: (targetPetId: string) => PlaydateRequest | undefined;
  pendingCount: number;
}

const PlaydateContext = createContext<PlaydateContextValue | null>(null);

export function PlaydateProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<PlaydateRequest[]>([]);

  const requestPlaydate = useCallback((myPetId: string, targetPetId: string, message?: string) => {
    const newReq: PlaydateRequest = {
      id: `pd-${Date.now()}`,
      myPetId,
      targetPetId,
      status: "requested",
      createdAt: new Date().toISOString(),
      message,
    };
    setRequests((prev) => [...prev, newReq]);
  }, []);

  const updateStatus = useCallback((requestId: string, status: PlaydateStatus) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status } : r))
    );
  }, []);

  const getRequestForPet = useCallback(
    (targetPetId: string) => requests.find((r) => r.targetPetId === targetPetId),
    [requests]
  );

  const pendingCount = requests.filter((r) => r.status === "requested").length;

  return (
    <PlaydateContext.Provider value={{ requests, requestPlaydate, updateStatus, getRequestForPet, pendingCount }}>
      {children}
    </PlaydateContext.Provider>
  );
}

export function usePlaydates() {
  const ctx = useContext(PlaydateContext);
  if (!ctx) throw new Error("usePlaydates must be used within PlaydateProvider");
  return ctx;
}
