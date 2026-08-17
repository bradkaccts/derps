import { Link } from "react-router-dom";
import { LogOut, PawPrint, ShieldCheck, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";

/**
 * Tier ladder from the identity spec. Release 1 ships Tier 0 only — the rest
 * are shown so people know what verification will unlock, not as live badges.
 */
const TIERS = [
  { tier: 0, label: "Registered", unlocks: "Browse, build your Derp's profile, save picks" },
  { tier: 1, label: "Contact-verified", unlocks: "Send boops and messages, plan Derpdates" },
  { tier: 2, label: "ID-verified", unlocks: "Verified badge and priority in matching" },
  { tier: 3, label: "Liveness-verified", unlocks: "Extra trust before a first in-person Derpdate" },
];

export function AccountCard() {
  const { user, profile, isSignedIn, signOut } = useAuth();
  const tier = profile?.verification_tier ?? 0;

  if (!isSignedIn) {
    return (
      <Card className="border-dashed">
        <CardContent className="space-y-3 p-4 text-center">
          <PawPrint className="mx-auto h-8 w-8 text-primary" />
          <div>
            <p className="font-extrabold text-foreground">You're browsing as a guest</p>
            <p className="text-sm text-muted-foreground">
              Sign in to save your Derps, send boops, and keep your matches on every device.
            </p>
          </div>
          <Button asChild className="btn-bouncy w-full font-bold">
            <Link to="/auth">Sign in — no password needed</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const name = profile?.display_name || user?.email?.split("@")[0] || "Derp human";

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={name}
              className="h-14 w-14 rounded-full border-2 border-primary object-cover"
            />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary text-2xl">
              🐾
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold text-foreground">{name}</h1>
            <p className="truncate text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 font-semibold" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Trust score</span>
          <span className="font-bold text-primary">{profile?.trust_score ?? 50}/100</span>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Verification
          </span>
          {TIERS.map((t) => {
            const reached = tier >= t.tier;
            return (
              <div
                key={t.tier}
                className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 p-2.5"
              >
                {reached ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    Tier {t.tier} — {t.label}
                    {reached ? (
                      <Badge variant="secondary" className="ml-2 text-[10px]">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        Coming soon
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{t.unlocks}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
