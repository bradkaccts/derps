import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogOut, PawPrint, Save, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AccountCard } from "@/components/auth/AccountCard";
import { useAuth } from "@/context/AuthContext";

export default function Account() {
  const { profile, isSignedIn, updateProfile, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "My account — Derps";
  }, []);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? "");
    setLocation(profile?.location ?? "");
  }, [profile?.display_name, profile?.location]);

  const dirty =
    displayName.trim() !== (profile?.display_name ?? "") ||
    location.trim() !== (profile?.location ?? "");

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName.trim() || null,
        location: location.trim() || null,
      });
      toast.success("Saved! Looking sharp 🐾");
    } catch {
      toast.error("That didn't save. Try again?");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <PawPrint className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-extrabold text-foreground">My account</h1>
      </div>

      <AccountCard />

      {isSignedIn && (
        <>
          <Separator />

          <Card className="rounded-2xl">
            <CardContent className="space-y-4 p-4">
              <h2 className="text-lg font-extrabold text-foreground">Your details</h2>
              <div className="space-y-1.5">
                <Label htmlFor="account-name" className="text-xs font-bold text-muted-foreground">
                  Display name
                </Label>
                <Input
                  id="account-name"
                  value={displayName}
                  maxLength={60}
                  placeholder="Nugget's human"
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="account-location"
                  className="text-xs font-bold text-muted-foreground"
                >
                  Home base
                </Label>
                <Input
                  id="account-location"
                  value={location}
                  maxLength={120}
                  placeholder="Portland, OR"
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-11 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  Used to find Derpdate spots nearby. We never show your exact address.
                </p>
              </div>
              <Button
                className="btn-bouncy w-full gap-2 rounded-2xl font-extrabold"
                disabled={!dirty || saving}
                onClick={() => void save()}
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="space-y-2 p-4">
              <h2 className="text-lg font-extrabold text-foreground">Your Derps & preferences</h2>
              <p className="text-sm text-muted-foreground">
                Manage your pets and matching preferences on your profile.
              </p>
              <Button asChild variant="outline" className="w-full gap-2 rounded-2xl font-bold">
                <Link to="/profile">
                  <SlidersHorizontal className="h-4 w-4" />
                  Open profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Button
            variant="ghost"
            className="w-full gap-2 font-bold text-muted-foreground"
            onClick={() => void signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </>
      )}
    </div>
  );
}
