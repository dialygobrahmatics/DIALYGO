import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ApiError } from '../services/api';
import { fetchSession, logoutRequest, sendOtp, verifyOtp } from '../services/patient';
import { clearToken, readToken, saveToken } from '../services/storage';
import type { Session } from '../types';

type AuthState = {
  booting: boolean;
  session: Session | null;
  signIn: (mobile: string, otp: string) => Promise<Session>;
  requestOtp: (mobile: string) => Promise<{ devOtp?: string; expiresInSeconds: number }>;
  refresh: () => Promise<Session | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function routeForSession(session: Session | null): string {
  if (!session) return '/auth/login';
  if (session.userType === 'DOCTOR') return '/doctor';
  if (session.registrationRequired) return '/auth/register';
  return '/patient';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [booting, setBooting] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  const refresh = useCallback(async () => {
    const token = await readToken();
    if (!token) {
      setSession(null);
      return null;
    }
    try {
      const next = await fetchSession();
      setSession(next);
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.isSessionExpired) {
        await clearToken();
        setSession(null);
        return null;
      }
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      await refresh();
      setBooting(false);
    })();
  }, [refresh]);

  const requestOtp = useCallback(async (mobile: string) => {
    const result = await sendOtp(mobile);
    return { devOtp: result.devOtp, expiresInSeconds: result.expiresInSeconds };
  }, []);

  const signIn = useCallback(async (mobile: string, otp: string) => {
    const result = await verifyOtp(mobile, otp);
    await saveToken(result.accessToken);
    const next: Session = {
      userType: result.userType,
      registrationRequired: result.registrationRequired,
      profile: result.profile,
    };
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // logout is best-effort; the local session is always cleared
    }
    await clearToken();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({ booting, session, signIn, requestOtp, refresh, signOut }),
    [booting, session, signIn, requestOtp, refresh, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
