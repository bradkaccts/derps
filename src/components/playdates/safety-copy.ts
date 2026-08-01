import { type ReportCategory } from "@/lib/playdates/types";

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  harassment: "Harassment or abuse",
  misrepresentation: "Not the pet in the profile",
  incident: "Bite, injury or aggression",
  scam: "Scam or money request",
  other: "Something else",
};
