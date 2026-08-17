import { useState } from "react";
import { Loader2, Mail, PawPrint } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { PENDING_NAME_KEY } from "@/context/AuthContext";

/**
 * FR-501 — passwordless only. Google and Apple are the primary paths, a magic
 * link is the fallback for anyone without either. No passwords anywhere.
 *
 * `mode` only changes the copy and the optional name field: with passwordless
 * auth, signing up and signing in are the same handshake.
 */
export function SignInPanel({
  onDone,
  mode = "signin",
}: {
  onDone?: () => void;
  mode?: "signin" | "signup";
}) {
  const [pending, setPending] = useState<"google" | "apple" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const isSignUp = mode === "signup";

  const rememberName = () => {
    if (isSignUp && name.trim()) {
      try {
        localStorage.setItem(PENDING_NAME_KEY, name.trim());
      } catch {
        /* private mode — the name is a nicety, not a requirement */
      }
    }
  };

  const oauth = async (provider: "google" | "apple") => {
    rememberName();
    setPending(provider);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setPending(null);
      toast.error("That sign-in didn't take. Try again?");
      return;
    }
    if (result.redirected) return;
    setPending(null);
    onDone?.();
  };

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    rememberName();
    setPending("email");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setPending(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setLinkSent(true);
  };

  if (linkSent) {
    return (
      <div className="space-y-2 rounded-2xl border-2 border-dashed border-border bg-muted/40 p-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
          📬
        </span>
        <p className="text-lg font-extrabold text-foreground">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a one-tap link to <span className="font-bold text-foreground">{email}</span>. Open
          it on this device and you're in — no password needed.
        </p>
        <Button variant="ghost" className="font-bold" onClick={() => setLinkSent(false)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button
          className="btn-bouncy h-12 w-full gap-2 rounded-2xl text-base font-extrabold"
          onClick={() => oauth("google")}
          disabled={pending !== null}
        >
          {pending === "google" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PawPrint className="h-4 w-4" />
          )}
          {isSignUp ? "Sign up with Google" : "Continue with Google"}
        </Button>
        <Button
          variant="outline"
          className="btn-bouncy h-12 w-full gap-2 rounded-2xl border-2 text-base font-extrabold"
          onClick={() => oauth("apple")}
          disabled={pending !== null}
        >
          {pending === "apple" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PawPrint className="h-4 w-4" />
          )}
          {isSignUp ? "Sign up with Apple" : "Continue with Apple"}
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-3">
        {isSignUp && (
          <div className="space-y-1.5">
            <Label htmlFor="derps-name" className="text-xs font-bold text-muted-foreground">
              What should we call you?
            </Label>
            <Input
              id="derps-name"
              autoComplete="name"
              placeholder="Nugget's human"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="h-11 rounded-xl"
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="derps-email" className="text-xs font-bold text-muted-foreground">
            Email
          </Label>
          <Input
            id="derps-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            maxLength={255}
            className="h-11 rounded-xl"
          />
        </div>
        <Button
          type="submit"
          variant="secondary"
          className="btn-bouncy h-12 w-full gap-2 rounded-2xl text-base font-extrabold"
          disabled={pending !== null || !email.trim()}
        >
          {pending === "email" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          {isSignUp ? "Email me a sign-up link" : "Email me a sign-in link"}
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        No passwords, ever. We only use your email to keep your Derps safe.
      </p>
    </div>
  );
}
