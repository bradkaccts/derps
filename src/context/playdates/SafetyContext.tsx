import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { playdateEvents } from "@/lib/playdates/analytics";
import {
  computeTrustBreakdown,
  isMeetupProposalRestricted,
  type TrustSignal,
} from "@/lib/playdates/trust";
import { type Block, type ReportCategory, type SafetyReport } from "@/lib/playdates/types";
import { currentUser } from "@/data/mock-users";

interface SafetyContextValue {
  blocks: Block[];
  reports: SafetyReport[];
  trustSignals: TrustSignal[];
  /** CH-306 — immediate, silent, bidirectional, and applied at the User level. */
  blockUser: (blockedUserId: string) => void;
  unblockUser: (blockedUserId: string) => void;
  isBlocked: (userId: string) => boolean;
  fileReport: (params: {
    subjectUserId: string;
    subjectPetId?: string | null;
    category: ReportCategory;
    contextRef: string;
  }) => SafetyReport;
  addTrustSignal: (signal: TrustSignal) => void;
  trustBreakdown: ReturnType<typeof computeTrustBreakdown>;
  meetupProposalsRestricted: boolean;
}

const SafetyContext = createContext<SafetyContextValue | null>(null);

export function SafetyProvider({ children }: { children: ReactNode }) {
  const [blocks, setBlocks] = usePersistentState<Block[]>("derps.playdates.blocks", []);
  const [reports, setReports] = usePersistentState<SafetyReport[]>("derps.playdates.reports", []);
  const [trustSignals, setTrustSignals] = usePersistentState<TrustSignal[]>(
    "derps.playdates.trustSignals",
    [],
  );

  const blockUser = useCallback(
    (blockedUserId: string) => {
      setBlocks((prev) => {
        if (prev.some((b) => b.blockedUserId === blockedUserId)) return prev;
        return [
          ...prev,
          {
            blockerUserId: currentUser.id,
            blockedUserId,
            createdAt: new Date().toISOString(),
          },
        ];
      });
      playdateEvents.publish({
        type: "block.created",
        blockerUserId: currentUser.id,
        blockedUserId,
        at: new Date().toISOString(),
      });
    },
    [setBlocks],
  );

  const unblockUser = useCallback(
    (blockedUserId: string) => {
      setBlocks((prev) => prev.filter((b) => b.blockedUserId !== blockedUserId));
    },
    [setBlocks],
  );

  const isBlocked = useCallback(
    (userId: string) =>
      blocks.some(
        (b) =>
          (b.blockerUserId === currentUser.id && b.blockedUserId === userId) ||
          (b.blockerUserId === userId && b.blockedUserId === currentUser.id),
      ),
    [blocks],
  );

  const fileReport = useCallback(
    (params: {
      subjectUserId: string;
      subjectPetId?: string | null;
      category: ReportCategory;
      contextRef: string;
    }) => {
      const report: SafetyReport = {
        id: `rep-${Date.now()}`,
        reporterUserId: currentUser.id,
        subjectUserId: params.subjectUserId,
        subjectPetId: params.subjectPetId ?? null,
        category: params.category,
        contextRef: params.contextRef,
        state: "open",
        resolution: null,
        createdAt: new Date().toISOString(),
      };
      setReports((prev) => [report, ...prev]);
      playdateEvents.publish({
        type: "report.filed",
        reportId: report.id,
        category: report.category,
        at: report.createdAt,
      });
      return report;
    },
    [setReports],
  );

  const addTrustSignal = useCallback(
    (signal: TrustSignal) => {
      setTrustSignals((prev) => (prev.some((s) => s.id === signal.id) ? prev : [...prev, signal]));
    },
    [setTrustSignals],
  );

  const trustBreakdown = useMemo(
    () => computeTrustBreakdown(currentUser.trustScore, trustSignals),
    [trustSignals],
  );

  const meetupProposalsRestricted = useMemo(
    () => isMeetupProposalRestricted(trustSignals),
    [trustSignals],
  );

  const value = useMemo(
    () => ({
      blocks,
      reports,
      trustSignals,
      blockUser,
      unblockUser,
      isBlocked,
      fileReport,
      addTrustSignal,
      trustBreakdown,
      meetupProposalsRestricted,
    }),
    [
      blocks,
      reports,
      trustSignals,
      blockUser,
      unblockUser,
      isBlocked,
      fileReport,
      addTrustSignal,
      trustBreakdown,
      meetupProposalsRestricted,
    ],
  );

  return <SafetyContext.Provider value={value}>{children}</SafetyContext.Provider>;
}

export function useSafety() {
  const ctx = useContext(SafetyContext);
  if (!ctx) throw new Error("useSafety must be used within SafetyProvider");
  return ctx;
}
