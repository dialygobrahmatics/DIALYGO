import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Activity, Lock, ChevronRight } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { operators } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export default function Login() {
  const { login } = useApp();
  const navigate = useNavigate();
  const [id, setId] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    const res = login(id, consent);
    if (!res.ok) return setError(res.error);
    navigate("/patients");
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden lg:block bg-slate-900">
        <img
          src="https://images.pexels.com/photos/5619462/pexels-photo-5619462.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Dialysis unit"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="relative h-full flex flex-col justify-between p-12">
          <div className="flex items-center gap-3 text-white">
            <div className="h-10 w-10 rounded bg-blue-600 grid place-items-center">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="font-head text-xl font-extrabold leading-none">DURISE</p>
              <p className="overline text-slate-300">Dialysis Operator Intelligence</p>
            </div>
          </div>
          <div className="bg-slate-900/90 border border-slate-700 rounded-md p-8 max-w-xl">
            <p className="overline text-blue-300 mb-3">Phase-1 purpose</p>
            <h2 className="font-head text-2xl font-bold text-white leading-snug">
              Before every dialysis session, give the operator a consolidated view of the patient's historical dialysis,
              vascular-access and clinical evidence.
            </h2>
            <p className="text-sm text-slate-300 mt-4">
              Decision support only. Rule-based engine. Final clinical decisions remain with qualified healthcare professionals.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <div className="flex items-center gap-3 lg:hidden mb-8">
            <div className="h-9 w-9 rounded bg-blue-600 grid place-items-center text-white">
              <Activity className="h-5 w-5" />
            </div>
            <p className="font-head text-lg font-extrabold">DURISE</p>
          </div>

          <p className="overline">Operator sign-in</p>
          <h1 className="font-head text-3xl sm:text-4xl font-extrabold mt-2">Dialysis Procedure Console</h1>
          <p className="text-sm text-slate-600 mt-3">
            Enter your registered operator ID to access patient evidence for today's sessions.
          </p>

          <label className="block mt-8">
            <span className="overline">Operator ID</span>
            <Input
              data-testid="operator-id-input"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(""); }}
              placeholder="OPR-1041"
              className="mt-2 h-12 text-base metric-num tracking-wider"
              autoComplete="off"
            />
          </label>

          <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
            <p className="overline mb-2">Demo operator IDs</p>
            <div className="flex flex-wrap gap-2">
              {operators.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  data-testid={`demo-operator-${o.id}`}
                  onClick={() => { setId(o.id); setError(""); }}
                  className="text-xs metric-num px-2.5 py-1.5 rounded border border-slate-300 bg-white hover:border-blue-600 hover:text-blue-700 transition-colors"
                >
                  {o.id}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-md border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="dpdp"
                data-testid="dpdp-consent-checkbox"
                checked={consent}
                onCheckedChange={(v) => { setConsent(!!v); setError(""); }}
                className="mt-0.5"
              />
              <label htmlFor="dpdp" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
                <span className="font-semibold flex items-center gap-1.5 text-slate-900">
                  <ShieldCheck className="h-4 w-4 text-blue-600" /> DPDP Act 2023 - Data sharing acknowledgement
                </span>
                I confirm that patient personal and health data accessed in DURISE is processed only for the lawful purpose of
                dialysis care delivery, that valid patient consent has been obtained by the treating facility, and that I will
                not share, export or retain this data outside authorised clinical use. Access is logged and auditable.
              </label>
            </div>
          </div>

          {error && (
            <p data-testid="login-error" className="mt-4 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <Button data-testid="login-submit-btn" type="submit" className="w-full h-12 mt-6 text-base bg-blue-600 hover:bg-blue-700">
            Enter console <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          <p className="text-xs text-slate-500 mt-6 flex items-start gap-1.5">
            <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Phase-1 demonstration build using representative JSON data. No live patient records are stored on this device.
          </p>
        </form>
      </div>
    </div>
  );
}
