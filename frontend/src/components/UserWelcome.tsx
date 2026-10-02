// "Name · user code · title" line for the signed-in user, shown on every role's home page.
import { useAuth } from "@/hooks/useAuth";

export default function UserWelcome() {
  const { userDetails } = useAuth();
  if (!userDetails) return null;
  return (
    <p className="text-sm text-slate-600 mt-2" data-testid="user-welcome">
      Welcome back, <span className="font-semibold text-slate-900" data-testid="user-welcome-name">{userDetails.name}</span>
      {" · "}<span className="metric-num" data-testid="user-welcome-code">{userDetails.id}</span>
      {" · "}{userDetails.title}
    </p>
  );
}
