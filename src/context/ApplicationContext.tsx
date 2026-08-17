import { stableContext } from "@/context/stable-context";
import React, { createContext, useContext, useState, ReactNode } from "react";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "shortlisted"
  | "approved"
  | "declined";

export interface ScreeningAnswers {
  homeType: string;
  hasYard: boolean;
  otherPets: string;
  children: string;
  experience: string;
  hoursAlone: string;
  reason: string;
}

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

const seedApplications: Application[] = [
  {
    id: "app-1",
    petId: "p8",
    adopterId: "u1",
    rehomerId: "u3",
    status: "shortlisted",
    screeningAnswers: {
      homeType: "House with yard",
      hasYard: true,
      otherPets: "One friendly dog",
      children: "Two kids, ages 8 and 11",
      experience: "Had cats growing up",
      hoursAlone: "4-6 hours",
      reason: "Looking for a calm companion for the family",
    },
    createdAt: "2026-02-12",
    updatedAt: "2026-02-14",
  },
];

interface ApplicationContextType {
  applications: Application[];
  submitApplication: (app: Omit<Application, "id" | "createdAt" | "updatedAt" | "status">) => void;
  updateStatus: (appId: string, status: ApplicationStatus) => void;
  getApplicationsForPet: (petId: string) => Application[];
  getApplicationsForAdopter: (adopterId: string) => Application[];
  getApplicationForPetByAdopter: (petId: string, adopterId: string) => Application | undefined;
}

const ApplicationContext = stableContext<ApplicationContextType>("ApplicationContext");

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [applications, setApplications] = useState<Application[]>(seedApplications);

  const submitApplication = (app: Omit<Application, "id" | "createdAt" | "updatedAt" | "status">) => {
    const now = new Date().toISOString().split("T")[0];
    const newApp: Application = {
      ...app,
      id: `app-${Date.now()}`,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    };
    setApplications((prev) => [...prev, newApp]);
  };

  const updateStatus = (appId: string, status: ApplicationStatus) => {
    setApplications((prev) =>
      prev.map((a) =>
        a.id === appId ? { ...a, status, updatedAt: new Date().toISOString().split("T")[0] } : a
      )
    );
  };

  const getApplicationsForPet = (petId: string) => applications.filter((a) => a.petId === petId);
  const getApplicationsForAdopter = (adopterId: string) => applications.filter((a) => a.adopterId === adopterId);
  const getApplicationForPetByAdopter = (petId: string, adopterId: string) =>
    applications.find((a) => a.petId === petId && a.adopterId === adopterId);

  return (
    <ApplicationContext.Provider
      value={{ applications, submitApplication, updateStatus, getApplicationsForPet, getApplicationsForAdopter, getApplicationForPetByAdopter }}
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
