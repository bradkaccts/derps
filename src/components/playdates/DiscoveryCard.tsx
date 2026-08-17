import { useState } from "react";
import { MapPin, Radar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useMyPets, type MyPet } from "@/context/MyPetsContext";
import { useAuth } from "@/context/AuthContext";

/**
 * The switch that makes a Derp real to other people.
 *
 * Nothing about a pet reaches another account's feed until its human turns
 * this on and drops a rough pin, so discovery is always a decision rather
 * than a default.
 */
export function DiscoveryCard({ pet }: { pet: MyPet }) {
  const { updatePetDiscovery } = useMyPets();
  const { isSignedIn, requireAuth } = useAuth();
  const [locating, setLocating] = useState(false);

  const hasPin = pet.latitude != null && pet.longitude != null;
  const discoverable = pet.isDiscoverable ?? false;

  const useMyLocation = () => {
    if (!requireAuth("Your Derpdate area is saved to your account.")) return;
    if (!navigator.geolocation) {
      toast.error("This browser can't share a location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        void updatePetDiscovery(pet.id, {
          // Rounded to ~1km so a pin never points at a front door.
          latitude: Number(position.coords.latitude.toFixed(2)),
          longitude: Number(position.coords.longitude.toFixed(2)),
        });
        toast.success("Derpdate area saved 📍");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't get your location. Check browser permissions.");
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Radar className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">
              Let nearby Derps meet {pet.name}
            </h3>
            <p className="text-xs text-muted-foreground">
              When this is on, {pet.name} shows up in other humans' decks — vibe card, traits and
              rough area only.
            </p>
          </div>
          <Switch
            checked={discoverable}
            onCheckedChange={(next) => {
              if (!requireAuth("Discovery needs an account so other humans can reach you.")) return;
              if (next && !hasPin) {
                toast.info("Add your Derpdate area first so we know who's nearby.");
                return;
              }
              void updatePetDiscovery(pet.id, { isDiscoverable: next });
            }}
            aria-label={`Show ${pet.name} to nearby Derps`}
          />
        </div>

        <div className="flex items-center justify-between gap-2 rounded-lg bg-background/60 px-3 py-2">
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {hasPin ? "Derpdate area set" : "No Derpdate area yet"}
          </span>
          <Button size="sm" variant="outline" onClick={useMyLocation} disabled={locating}>
            {locating ? "Finding…" : hasPin ? "Update area" : "Use my location"}
          </Button>
        </div>

        {!isSignedIn && (
          <p className="text-xs text-muted-foreground">
            Sign in to put {pet.name} on the map.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
