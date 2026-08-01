import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  canTransition,
  getDataProvider,
  type HydratedInteraction,
  type ScreeningAnswers,
} from "@/lib/data";

export type { ScreeningAnswers };

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "shortlisted"
  | "approved"
  | "declined";

/** UI view-model over an adoption-application Interaction. */
export interface Application {
  id: string;
  petId: string;
  adopterId: string;
  rehomerId: string;
  status: ApplicationStatus;
  screeningAnswers: ScreeningAnswers;
  createdAt: string;
  updatedAt: string;
}

function toViewModel(interaction: HydratedInteraction): Application {
  return {
    id: interaction.id,
    petId: interaction.targetPetId,
    adopterId: interaction.requesterUserId,
    rehomerId: interaction.targetUserId,
    status: interaction.status as ApplicationStatus,
    screeningAnswers: interaction.screeningAnswers ?? {
      homeType: "",
      hasYard: false,
      otherPets: "",
      children: "",
      experience: "",
      hoursAlone: "",
      reason: "",
    },
    createdAt: interaction.createdAt.split("T")[0],
    updatedAt: interaction.updatedAt.split("T")[0],
  };
}

interface ApplicationContextType {
  applications: Application[];
  submitApplication: (app: { petId: string; adopterId: string; rehomerId: string; screeningAnswers: ScreeningAnswers }) => void;
  updateStatus: (appId: string, status: ApplicationStatus) => void;
  /** Statuses this application may legally move to (drives action buttons). */
  allowedNextStatuses: (app: Application) => ApplicationStatus[];
  getApplicationsForPet: (petId: string) => Application[];
  getApplicationsForAdopter: (adopterId: string) => Application[];
  getApplicationForPetByAdopter: (petId: string, adopterId: string) => Application | undefined;
}

const ApplicationContext = createContext<ApplicationContextType | null>(null);

const ALL_STATUSES: ApplicationStatus[] = ["draft", "submitted", "under-review", "shortlisted", "approved", "declined"];

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const provider = getDataProvider();
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const user = await provider.getCurrentUser();
      const interactions = await provider.getInteractionsForUser(user.id, "adoption-application");
      if (cancelled) return;
      setApplications(interactions.map(toViewModel));
    };
    load();
    const unsubscribe = provider.subscribe(load);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [provider]);

  const submitApplication = useCallback(
    (app: { petId: string; adopterId: string; rehomerId: string; screeningAnswers: ScreeningAnswers }) => {
      void provider
        .createAdoptionApplication({
          requesterUserId: app.adopterId,
          targetPetId: app.petId,
          screeningAnswers: app.screeningAnswers,
        })
        .catch((err) => console.error("Failed to submit application:", err));
    },
    [provider]
  );

  const updateStatus = useCallback(
    (appId: string, status: ApplicationStatus) => {
      void provider
        .updateInteractionStatus(appId, status)
        .catch((err) => console.error("Failed to update application:", err));
    },
    [provider]
  );

  const allowedNextStatuses = useCallback(
    (app: Application) => ALL_STATUSES.filter((s) => canTransition("adoption-application", app.status, s)),
    []
  );

  const getApplicationsForPet = useCallback(
    (petId: string) => applications.filter((a) => a.petId === petId),
    [applications]
  );

  const getApplicationsForAdopter = useCallback(
    (adopterId: string) => applications.filter((a) => a.adopterId === adopterId),
    [applications]
  );

  const getApplicationForPetByAdopter = useCallback(
    (petId: string, adopterId: string) =>
      applications.find((a) => a.petId === petId && a.adopterId === adopterId),
    [applications]
  );

  return (
    <ApplicationContext.Provider
      value={{ applications, submitApplication, updateStatus, allowedNextStatuses, getApplicationsForPet, getApplicationsForAdopter, getApplicationForPetByAdopter }}
    >
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplications() {
  const ctx = useContext(ApplicationContext);
  if (!ctx) throw new Error("useApplications must be used within ApplicationProvider");
  return ctx;
}
