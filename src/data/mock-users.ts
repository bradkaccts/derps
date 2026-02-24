export type UserRole = "adopter" | "rehomer" | "admin";

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: UserRole;
  location: string;
  homeType: string;
  familySize: number;
  hasYard: boolean;
  trustScore: number;
  preferences: {
    species: string[];
    energyLevel: string;
  };
  verified: boolean;
}

export const mockUsers: User[] = [
  {
    id: "u1",
    name: "Felix Adopter",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    role: "adopter",
    location: "Portland, OR",
    homeType: "House with yard",
    familySize: 4,
    hasYard: true,
    trustScore: 87,
    preferences: { species: ["dog", "cat"], energyLevel: "medium" },
    verified: true,
  },
  {
    id: "u2",
    name: "Fiona Rehomer",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    role: "rehomer",
    location: "Seattle, WA",
    homeType: "Apartment",
    familySize: 2,
    hasYard: false,
    trustScore: 92,
    preferences: { species: ["cat"], energyLevel: "low" },
    verified: true,
  },
  {
    id: "u3",
    name: "Paul Rehomer",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    role: "rehomer",
    location: "Austin, TX",
    homeType: "House with yard",
    familySize: 3,
    hasYard: true,
    trustScore: 78,
    preferences: { species: ["dog", "bird"], energyLevel: "high" },
    verified: true,
  },
  {
    id: "u4",
    name: "Admin Dana",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
    role: "admin",
    location: "New York, NY",
    homeType: "Apartment",
    familySize: 1,
    hasYard: false,
    trustScore: 100,
    preferences: { species: [], energyLevel: "any" },
    verified: true,
  },
];

export const currentUser = mockUsers[0]; // Default: Felix the Adopter
