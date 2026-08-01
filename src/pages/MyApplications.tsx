import { Link } from "react-router-dom";
import { useApplications } from "@/context/ApplicationContext";
import { currentUser } from "@/data/mock-users";
import { mockPets } from "@/data/mock-pets";
import { ApplicationStatusTracker } from "@/components/applications/ApplicationStatusTracker";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardList } from "lucide-react";

const MyApplications = () => {
  const { getApplicationsForAdopter } = useApplications();
  const apps = getApplicationsForAdopter(currentUser.id);

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 gap-3">
        <ClipboardList className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-bold text-foreground">No Applications Yet</h2>
        <p className="text-muted-foreground text-sm max-w-xs">
          Find a pet you love on the <Link to="/" className="text-primary font-semibold hover:underline">Home</Link> page and apply to adopt!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-extrabold text-foreground">My Applications</h1>
      {apps.map((app) => {
        const pet = mockPets.find((p) => p.id === app.petId);
        if (!pet) return null;
        return (
          <Link key={app.id} to={`/pet/${pet.id}`}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="flex gap-4 p-4">
                <div className="h-16 w-16 rounded-lg overflow-hidden shrink-0">
                  <img src={pet.photos[0]} alt={pet.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-foreground truncate">{pet.name}</h3>
                    <Badge variant="secondary" className="text-xs shrink-0">${pet.adoptionListing?.fee ?? 0}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{pet.breed} · Applied {app.createdAt}</p>
                  <ApplicationStatusTracker status={app.status} />
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};

export default MyApplications;
