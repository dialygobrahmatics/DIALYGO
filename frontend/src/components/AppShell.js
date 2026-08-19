import { Link, useNavigate } from "react-router-dom";
import { Activity, LogOut, ShieldCheck, ArrowLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";

export default function AppShell({ children, back }) {
  const { operator, logout } = useApp();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 no-print">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {back && (
              <Button
                data-testid="back-btn"
                variant="ghost"
                size="icon"
                onClick={() => navigate(back)}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Link to="/patients" className="flex items-center gap-2.5 min-w-0" data-testid="brand-link">
              <div className="h-9 w-9 rounded bg-blue-600 grid place-items-center text-white shrink-0">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-head font-extrabold leading-none">DURISE</p>
                <p className="overline hidden sm:block truncate">Operator Intelligence &amp; Vascular Assessment</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> DPDP consent on file
            </span>
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold leading-none" data-testid="operator-name">{operator?.name}</p>
              <p className="overline">{operator?.id} · {operator?.unit}</p>
            </div>
            <Button data-testid="logout-btn" variant="outline" size="icon" onClick={() => { logout(); navigate("/"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6">{children}</main>
      <footer className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-10 pt-4 no-print">
        <p className="text-xs text-slate-500 border-t border-slate-200 pt-4">
          DURISE Phase-1 · Rule-based decision support for dialysis operators. Not an autonomous diagnostic or machine-control
          system. Predictive ML and angiogram image analysis are deferred to a later release. No genomic data is captured.
        </p>
      </footer>
    </div>
  );
}
