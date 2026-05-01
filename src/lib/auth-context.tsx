import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthCallback: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isAuthCallback: false,
  signOut: async () => {},
});

function readOAuthTokensFromUrl() {
  if (typeof window === "undefined") return null;

  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

  const access_token =
    hashParams.get("access_token") ?? searchParams.get("access_token");
  const refresh_token =
    hashParams.get("refresh_token") ?? searchParams.get("refresh_token");

  if (!access_token || !refresh_token) return null;

  return { access_token, refresh_token };
}

function clearOAuthParamsFromUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  const authKeys = [
    "access_token",
    "refresh_token",
    "token_type",
    "expires_in",
    "expires_at",
    "provider_token",
    "provider_refresh_token",
    "code",
    "state",
    "type",
  ];

  for (const key of authKeys) {
    url.searchParams.delete(key);
  }

  if (url.hash) {
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    for (const key of authKeys) {
      hashParams.delete(key);
    }
    const nextHash = hashParams.toString();
    url.hash = nextHash ? `#${nextHash}` : "";
  }

  window.history.replaceState({}, "", url.toString());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthCallback, setIsAuthCallback] = useState(false);
  const initializedRef = useRef(false);
  const processingOAuthRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const pathname = typeof window !== "undefined" ? window.location.pathname : "";
    const runningAuthCallback = pathname === "/auth/callback";
    setIsAuthCallback(runningAuthCallback);

    const applySession = (nextSession: Session | null) => {
      if (!mounted) return;
      initializedRef.current = true;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    };

    const tokens = readOAuthTokensFromUrl();
    processingOAuthRef.current = Boolean(tokens);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (processingOAuthRef.current && !nextSession && !initializedRef.current) {
        return;
      }
      applySession(nextSession);
    });

    const init = async () => {
      if (tokens) {
        const { error } = await supabase.auth.setSession(tokens);
        if (!error) {
          clearOAuthParamsFromUrl();
        }
        processingOAuthRef.current = false;
      }

      const { data } = await supabase.auth.getSession();

      if (!mounted || initializedRef.current) return;

      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    };

    void init();

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        loading,
        signOut: async () => {
          await supabase.auth.signOut();
        },
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
