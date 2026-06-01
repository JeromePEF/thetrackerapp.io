import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { setSessionToken } from "@/lib/api/client";
import { clearSession, loadSession, saveSession, type PersistedSession } from "@/lib/session";

interface AuthContextValue {
  hydrated: boolean;
  session: PersistedSession | null;
  signIn: (session: PersistedSession) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<PersistedSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const restored = await loadSession();
      if (!active) return;
      if (restored) {
        setSessionToken(restored.token);
        setSession(restored);
      }
      setHydrated(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (next: PersistedSession) => {
    setSessionToken(next.token);
    await saveSession(next);
    setSession(next);
  }, []);

  const signOut = useCallback(async () => {
    setSessionToken(null);
    await clearSession();
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ hydrated, session, signIn, signOut }),
    [hydrated, session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Canonical user identifier used as `?contact=` on every endpoint. */
export function useContact(): string | null {
  const { session } = useAuth();
  if (!session?.account) return null;
  return session.account.canonical || session.account.username || session.account.accountId || null;
}
