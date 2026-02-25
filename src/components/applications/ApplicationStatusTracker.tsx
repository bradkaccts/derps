import { ApplicationStatus } from "@/context/ApplicationContext";
import { cn } from "@/lib/utils";
import { CheckCircle, Clock, Eye, Star, ThumbsUp, XCircle } from "lucide-react";

const steps: { status: ApplicationStatus; label: string; icon: React.ElementType }[] = [
  { status: "submitted", label: "Submitted", icon: Clock },
  { status: "under-review", label: "Under Review", icon: Eye },
  { status: "shortlisted", label: "Shortlisted", icon: Star },
  { status: "approved", label: "Approved", icon: ThumbsUp },
];

const statusOrder: ApplicationStatus[] = ["draft", "submitted", "under-review", "shortlisted", "approved"];

export function ApplicationStatusTracker({ status }: { status: ApplicationStatus }) {
  if (status === "declined") {
    return (
      <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
        <XCircle className="h-4 w-4" />
        Application Declined
      </div>
    );
  }

  const currentIdx = statusOrder.indexOf(status);

  return (
    <div className="flex items-center gap-1 w-full">
      {steps.map((step, i) => {
        const stepIdx = statusOrder.indexOf(step.status);
        const reached = currentIdx >= stepIdx;
        const Icon = reached && currentIdx >= stepIdx ? CheckCircle : step.icon;
        return (
          <div key={step.status} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-0.5">
              <Icon className={cn("h-4 w-4", reached ? "text-primary" : "text-muted-foreground/40")} />
              <span className={cn("text-[10px] font-semibold", reached ? "text-foreground" : "text-muted-foreground/50")}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-1 rounded-full", currentIdx > stepIdx ? "bg-primary" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}
