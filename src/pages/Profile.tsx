import { currentUser } from "@/data/mock-users";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const Profile = () => (
  <div className="p-4 md:p-6 max-w-2xl mx-auto">
    <div className="flex items-center gap-4 mb-6">
      <img
        src={currentUser.avatar}
        alt={currentUser.name}
        className="h-16 w-16 rounded-full object-cover border-2 border-primary"
      />
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">{currentUser.name}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="capitalize font-semibold">
            {currentUser.role}
          </Badge>
          {currentUser.verified && (
            <span className="flex items-center gap-1 text-xs font-semibold text-primary">
              <ShieldCheck className="h-3 w-3" /> Verified
            </span>
          )}
        </div>
      </div>
    </div>

    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Location</span>
          <span className="font-semibold text-foreground">{currentUser.location}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Home</span>
          <span className="font-semibold text-foreground">{currentUser.homeType}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Family Size</span>
          <span className="font-semibold text-foreground">{currentUser.familySize}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Yard</span>
          <span className="font-semibold text-foreground">{currentUser.hasYard ? "Yes 🌿" : "No"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Trust Score</span>
          <span className="font-bold text-primary">{currentUser.trustScore}/100</span>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default Profile;
