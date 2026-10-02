// Who is signed in. Reads the state held by AuthProvider, which verifies the session with the backend
// (GET /auth/session, through useApi) once on load - so any number of components can call this hook without
// triggering extra requests.
//
//   const { userLoading, userDetails } = useAuth();
import { useContext } from "react";
import { AuthContext } from "@/context/AuthContext";
import type { AuthState } from "@/types";

export function useAuth(): AuthState {
  const state = useContext(AuthContext);
  if (!state) throw new Error("useAuth must be used inside <AuthProvider>.");
  return state;
}
