import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PawPrint } from "lucide-react";
import { SignInPanel } from "@/components/auth/SignInPanel";
import { useAuth } from "@/context/AuthContext";

export default function Auth() {
  const { isSignedIn, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isSignedIn) navigate("/", { replace: true });
  }, [isSignedIn, loading, navigate]);

  useEffect(() => {
    document.title = "Sign in to Derps — Derpdates for your pets";
  }, []);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <div className="space-y-2 text-center">
        <PawPrint className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Grab your leash</h1>
        <p className="text-muted-foreground">
          Sign in to save your Derps, send boops, and set up Derpdates nearby.
        </p>
      </div>
      <SignInPanel onDone={() => navigate("/", { replace: true })} />
    </div>
  );
}
