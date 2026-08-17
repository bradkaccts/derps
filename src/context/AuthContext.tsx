import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface DerpsProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  verification_tier: number;
  trust_score: number;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: DerpsProfile | null;
  loading: boolean;
  isSignedIn: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<DerpsProfile, "display_name" | "location">>) => Promise<void>;
  /** Gated action helper — returns true when the action may proceed. */
  requireAuth: (reason?: string) => boolean;
  /** Reason copy for the sign-in sheet, or null when it is closed. */
  authPrompt: string | null;
  closeAuthPrompt: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Display name captured on the sign-up screen, applied on first sign-in. */
export const PENDING_NAME_KEY = "derps.pendingDisplayName";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DerpsProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPrompt, setAuthPrompt] = useState<string | null>(null);

  useEffect(() => {
    // Listener first, then the initial read — otherwise a session that lands
    // between the two is dropped.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
      if (next?.user) setAuthPrompt(null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, location, verification_tier, trust_score")
      .eq("id", userId)
      .maybeSingle();

    let next = (data as DerpsProfile) ?? null;

    // Apply the name typed on the sign-up screen, once.
    let pendingName: string | null = null;
    try {
      pendingName = localStorage.getItem(PENDING_NAME_KEY);
    } catch {
      pendingName = null;
    }
    if (pendingName) {
      try {
        localStorage.removeItem(PENDING_NAME_KEY);
      } catch {
        /* ignore */
      }
      if (next && !next.display_name) {
        const { data: updated } = await supabase
          .from("profiles")
          .update({ display_name: pendingName })
          .eq("id", userId)
          .select("id, display_name, avatar_url, location, verification_tier, trust_score")
          .maybeSingle();
        if (updated) next = updated as DerpsProfile;
      }
    }

    setProfile(next);
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    void loadProfile(user.id);
  }, [user, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<DerpsProfile, "display_name" | "location">>) => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user.id)
        .select("id, display_name, avatar_url, location, verification_tier, trust_score")
        .maybeSingle();
      if (error) throw error;
      if (data) setProfile(data as DerpsProfile);
    },
    [user],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const requireAuth = useCallback(
    (reason?: string) => {
      if (user) return true;
      setAuthPrompt(reason ?? "Sign in to keep going.");
      return false;
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile,
      loading,
      isSignedIn: !!user,
      signOut,
      refreshProfile,
      requireAuth,
      authPrompt,
      closeAuthPrompt: () => setAuthPrompt(null),
    }),
    [user, session, profile, loading, signOut, refreshProfile, requireAuth, authPrompt],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
