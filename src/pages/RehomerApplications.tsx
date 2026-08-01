import { useApplications, ApplicationStatus } from "@/context/ApplicationContext";
import { mockPets } from "@/data/mock-pets";
import { mockUsers } from "@/data/mock-users";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ConfettiExplosion } from "@/components/ui/confetti";
import { ShieldCheck, Star, Eye, ThumbsUp, XCircle, Inbox } from "lucide-react";
import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Application } from "@/context/ApplicationContext";

const statusColor: Record<ApplicationStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-secondary text-secondary-foreground",
  "under-review": "bg-primary/10 text-primary",
  shortlisted: "bg-accent/20 text-accent-foreground",
  approved: "bg-primary text-primary-foreground",
  declined: "bg-destructive/10 text-destructive",
};

const RehomerApplications = () => {
  const { applications, updateStatus, allowedNextStatuses } = useApplications();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleStatusChange = useCallback((appId: string, status: ApplicationStatus) => {
    updateStatus(appId, status);
    if (status === "approved") {
      setShowConfetti(true);
    }
  }, [updateStatus]);

  // For the demo, show all applications (a real app would filter by current rehomer)
  const rehomerApps = applications;

  if (rehomerApps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 gap-3">
        <Inbox className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold text-foreground">No Applications Yet</h2>
        <p className="text-muted-foreground text-sm">When hopeful adopters apply, they'll appear here.</p>
      </div>
    );
  }

  const actions: { label: string; status: ApplicationStatus; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }[] = [
    { label: "Review", status: "under-review", icon: Eye, variant: "secondary" },
    { label: "Shortlist", status: "shortlisted", icon: Star, variant: "outline" },
    { label: "Approve", status: "approved", icon: ThumbsUp, variant: "default" },
    { label: "Decline", status: "declined", icon: XCircle, variant: "destructive" },
  ];

  return (
    <>
      {showConfetti && <ConfettiExplosion onComplete={() => setShowConfetti(false)} />}
      <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-extrabold text-foreground">Applicant Inbox</h1>
      <p className="text-sm text-muted-foreground">Review adoption applications for your listed pets.</p>

      {rehomerApps.map((app) => {
        const pet = mockPets.find((p) => p.id === app.petId);
        const adopter = mockUsers.find((u) => u.id === app.adopterId);
        if (!pet || !adopter) return null;

        return (
          <Card key={app.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={adopter.avatar} />
                  <AvatarFallback>{adopter.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground truncate">{adopter.name}</h3>
                    {adopter.verified && <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Trust Score: {adopter.trustScore} · {adopter.homeType}</p>
                </div>
                <Badge className={cn("text-xs capitalize shrink-0", statusColor[app.status])}>
                  {app.status.replace("-", " ")}
                </Badge>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-8 w-8 rounded overflow-hidden shrink-0">
                  <img src={pet.photos[0]} alt={pet.name} className="h-full w-full object-cover" />
                </div>
                Applying for <span className="font-semibold text-foreground">{pet.name}</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={() => setSelectedApp(app)}>
                  View Answers
                </Button>
                {actions
                  .filter((a) => allowedNextStatuses(app).includes(a.status))
                  .map((a) => (
                    <Button
                      key={a.status}
                      variant={a.variant}
                      size="sm"
                      className="gap-1"
                      onClick={() => handleStatusChange(app.id, a.status)}
                    >
                      <a.icon className="h-3.5 w-3.5" />
                      {a.label}
                    </Button>
                  ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Screening Answers Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Screening Answers</DialogTitle>
            <DialogDescription>Responses from the adopter's application.</DialogDescription>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-3 text-sm">
              {Object.entries(selectedApp.screeningAnswers).map(([key, value]) => (
                <div key={key}>
                  <p className="font-semibold text-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                  <p className="text-muted-foreground">{String(value)}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </>
  );
};

export default RehomerApplications;
