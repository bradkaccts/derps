import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MapPin, PawPrint, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { useAuth } from "@/context/AuthContext";

const PERKS = [
  { icon: Heart, text: "Save the Derps you boop, on every device" },
  { icon: MapPin, text: "Plan Derpdates at spots near you" },
  { icon: ShieldCheck, text: "Passwordless — nothing to forget or leak" },
];

export default function Auth() {
  const { isSignedIn, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  useEffect(() => {
    if (!loading && isSignedIn) navigate("/profile", { replace: true });
  }, [isSignedIn, loading, navigate]);

  useEffect(() => {
    document.title =
      tab === "signup"
        ? "Sign up for Derps — Derpdates for your pets"
        : "Sign in to Derps — Derpdates for your pets";
  }, [tab]);

  return (
    <div className="mx-auto w-full max-w-md space-y-5 p-4 md:p-6">
      <div className="space-y-2 pt-4 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
          🐾
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          {tab === "signup" ? "Join the pack" : "Grab your leash"}
        </h1>
        <p className="text-muted-foreground">
          {tab === "signup"
            ? "Make an account so your Derps, picks, and Derpdates follow you everywhere."
            : "Welcome back — your Derps have been waiting by the door."}
        </p>
      </div>

      <Card className="rounded-3xl border-2">
        <CardContent className="space-y-5 p-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2 rounded-2xl">
              <TabsTrigger value="signin" className="rounded-xl font-extrabold">
                Sign in
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-xl font-extrabold">
                Sign up
              </TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-5">
              <SignInPanel mode="signin" onDone={() => navigate("/profile", { replace: true })} />
            </TabsContent>
            <TabsContent value="signup" className="mt-5">
              <SignInPanel mode="signup" onDone={() => navigate("/profile", { replace: true })} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="space-y-2 rounded-3xl border-2 border-dashed border-border bg-muted/30 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          What you unlock
        </p>
        {PERKS.map(({ icon: Icon, text }) => (
          <div key={text} className="flex items-start gap-2">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-sm font-semibold text-foreground">{text}</p>
          </div>
        ))}
      </div>

      <p className="pb-4 text-center text-xs text-muted-foreground">
        Just browsing? Keep sniffing around — you can{" "}
        <button
          className="font-bold text-primary underline-offset-2 hover:underline"
          onClick={() => navigate("/")}
        >
          go back to Derpdates
          <PawPrint className="ml-1 inline h-3 w-3" />
        </button>
      </p>
    </div>
  );
}
