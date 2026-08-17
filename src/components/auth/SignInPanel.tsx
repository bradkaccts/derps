import { useState } from "react";
import { Loader2, Mail, PawPrint } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

/**
 * FR-501 — passwordless only. Google and Apple are the primary paths, a magic
 * link is the fallback for anyone without either. No passwords anywhere.
 */
export function SignInPanel({ onDone }: { onDone?: () => void }) {
  const [pending, setPending] = useState<"google" | "apple" | "email" | null>(null);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  const oauth = async (provider: "google" | "apple") => {
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
      <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-4 text-center">
        <Mail className="mx-auto h-7 w-7 text-primary" />
        <p className="font-bold text-foreground">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a one-tap link to {email}. Open it on this device and you're in — no password
          needed.
        </p>
        <Button variant="ghost" className="font-semibold" onClick={() => setLinkSent(false)}>
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Button
          className="w-full gap-2 font-bold"
          size="lg"
          onClick={() => oauth("google")}
          disabled={pending !== null}
        >
          {pending === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PawPrint className="h-4 w-4" />}
          Continue with Google
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2 font-bold"
          size="lg"
          onClick={() => oauth("apple")}
          disabled={pending !== null}
        >
          {pending === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <PawPrint className="h-4 w-4" />}
          Continue with Apple
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={sendMagicLink} className="space-y-2">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11"
        />
        <Button
          type="submit"
          variant="secondary"
          className="w-full gap-2 font-bold"
          size="lg"
          disabled={pending !== null || !email.trim()}
        >
          {pending === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          Email me a sign-in link
        </Button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        No passwords, ever. We only use your email to keep your Derps safe.
      </p>
    </div>
  );
}
