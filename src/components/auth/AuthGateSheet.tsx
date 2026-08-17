import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { SignInPanel } from "./SignInPanel";

/**
 * The single sign-in prompt for gated actions. Guests keep browsing; this only
 * appears when they try something that reaches another human.
 */
export function AuthGateSheet() {
  const { authPrompt, closeAuthPrompt } = useAuth();

  return (
    <Dialog open={authPrompt !== null} onOpenChange={(open) => !open && closeAuthPrompt()}>
      <DialogContent className="max-w-sm rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold">Sign in to keep going 🐾</DialogTitle>
          <DialogDescription>
            {authPrompt} Everything you've done so far comes with you.
          </DialogDescription>
        </DialogHeader>
        <SignInPanel onDone={closeAuthPrompt} />
      </DialogContent>
    </Dialog>
  );
}
