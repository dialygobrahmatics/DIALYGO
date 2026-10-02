// Real authentication state. The provider verifies the stored token with the backend (GET /auth/session) once on
// load and holds the result for the whole app; components read it through the useAuth hook.
// Mock workspace data lives in AppContext; this context only knows who is logged in.
import { createContext, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { setUnauthorizedHandler, tokenStore } from "@/api/http";
import { ROLES, USER_TYPE_TO_ROLE } from "@/config/roles";
import { AuthControllers } from "@/controllers/AuthControllers";
import useApi from "@/hooks/useApi";
import type { AccountContext, AuthState, LoginSession, UserDetails } from "@/types";

export const AuthContext = createContext<AuthState | null>(null);

// Shapes a backend account into the user object the UI uses (id is the login user code).
function toUserDetails(account: AccountContext): UserDetails | null {
  const role = USER_TYPE_TO_ROLE[account.userType];
  if (!role) return null;
  const profile = account.profile;
  const designation = profile && "designation" in profile ? profile.designation : null;
  const specialization = profile && "specialization" in profile ? profile.specialization : null;
  return {
    id: account.userCode,
    name: profile?.name || ROLES[role].label,
    role,
    title: designation || specialization || ROLES[role].tagline,
    unit: (profile && "unit" in profile ? profile.unit : null) || specialization,
    registrationRequired: account.registrationRequired,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  // Starts true when a token exists so routes wait for the verification instead of redirecting to login.
  const [bootPending, setBootPending] = useState<boolean>(() => !!tokenStore.get());
  const [isVerifying, verifySession] = useApi(AuthControllers.session);

  const expireSession = useCallback(() => {
    tokenStore.clear();
    setUserDetails(null);
  }, []);

  useEffect(() => { setUnauthorizedHandler(expireSession); }, [expireSession]);

  useEffect(() => {
    if (!tokenStore.get()) return;
    verifySession()
      .then((result) => { if (result.ok) setUserDetails(toUserDetails(result.data)); })
      .finally(() => setBootPending(false));
  }, [verifySession]);

  const startSession = useCallback((session: LoginSession): UserDetails | null => {
    const next = toUserDetails(session);
    if (!next) return null;
    tokenStore.set(session.accessToken);
    setUserDetails(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await AuthControllers.logout(); // best effort: the local session is always cleared
    expireSession();
  }, [expireSession]);

  const value = useMemo<AuthState>(
    () => ({
      userDetails,
      userLoading: bootPending || isVerifying,
      role: userDetails?.role ?? null,
      startSession,
      signOut,
      expireSession,
    }),
    [userDetails, bootPending, isVerifying, startSession, signOut, expireSession],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
