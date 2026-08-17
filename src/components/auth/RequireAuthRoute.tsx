import { type ReactNode } from "react";
import { Loader2, PawPrint } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { SignInPanel } from "./SignInPanel";

/**
 * Guests keep the whole browsing experience. Surfaces where one human reaches
 * another — inbox, matches, meetups — ask for an account first.
 */
export function RequireAuthRoute({
  children,
  reason,
}: {
  children: ReactNode;
  reason: string;
}) {
  const { isSignedIn, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col justify-center gap-6 px-5 py-16">
        <div className="space-y-2 text-center">
          <PawPrint className="mx-auto h-9 w-9 text-primary" />
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
            Sign in to keep going
          </h1>
          <p className="text-muted-foreground">{reason}</p>
        </div>
        <SignInPanel />
      </div>
    );
  }

  return <>{children}</>;
}
