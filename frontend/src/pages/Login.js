import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Lock, ChevronRight, Fingerprint } from "lucide-react";
import { useApp, ROLES } from "@/context/AppContext";
import { operators } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

const roleHints = {
  operator: { label: "User ID", placeholder: "OPR-1041" },
  doctor: { label: "User ID", placeholder: "DOC-0071" },
  patient: { label: "User ID", placeholder: "DUR-PT-00218" },
  dialysisadmin: { label: "User ID", placeholder: "ADM-0002" },
  techadmin: { label: "User ID", placeholder: "ADM-0001" },
};

const demoIds = {
  operator: operators.map((o) => o.id),
  doctor: ["DOC-0071", "DOC-0088"],
  patient: ["DUR-PT-00218", "DUR-PT-00341"],
  dialysisadmin: ["ADM-0002"],
  techadmin: ["ADM-0001"],
};

export default function Login() {
  const { login, demoAccess } = useApp();
  const navigate = useNavigate();
  const [role, setRole] = useState("operator");
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [otpStage, setOtpStage] = useState(false);
  const [otp, setOtp] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (role === "patient" && !otpStage) {
      if (!id.trim()) return setError("Enter your registered mobile or DialyGo ID.");
      setOtpStage(true);
      setError("");
      return;
    }
    if (role === "patient" && otp.trim() !== "123456") return setError("Enter the mock OTP 123456 to continue.");
    const res = login(role, id, consent, password);
    if (!res.ok) return setError(res.error);
    navigate(res.home);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden lg:block dg-gradient-navy">
        <img
          src="https://images.pexels.com/photos/5619462/pexels-photo-5619462.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Dialysis unit"
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
        <div className="absolute inset-0 dg-gradient-navy opacity-80" />
        <div className="relative h-full flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm px-4 py-2">
              <img src="/dialygo-logo.png" alt="DialyGo" className="max-h-full w-[160px] object-contain" data-testid="login-brand-logo" />
            </div>
            <div>
              <p className="overline text-white/60">Operator Intelligence &amp; Vascular Assessment</p>
            </div>
          </div>
          <div className="bg-navy-deep/85 border border-white/15 rounded-2xl p-8 max-w-xl backdrop-blur-sm">
            <p className="overline text-saffron mb-3">Phase-I USP</p>
            <h2 className="font-head text-2xl font-bold text-white leading-snug">
              Before every dialysis session, give the operator a consolidated view of the patient's historical dialysis,
              vascular-access and clinical evidence — so the current procedure is performed with context rather than isolated
              machine readings.
            </h2>
            <p className="text-sm text-white/70 mt-4">
              Rule-based, illustrative, mock-data prototype. Final clinical decisions remain with qualified healthcare professionals.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-white">
        <form onSubmit={submit} className="w-full max-w-md" data-testid="login-form">
          <div className="flex items-center gap-3 lg:hidden mb-8">
            <img src="/dialygo-logo.png" alt="DialyGo" className="h-8 w-[160px] object-contain" data-testid="login-brand-logo-mobile" />
          </div>

          <p className="overline">Sign in</p>
          <h1 className="font-head text-3xl sm:text-4xl font-extrabold mt-2">Choose your workspace</h1>
          <p className="text-sm text-slate-500 mt-3">Five role-based experiences. Roles can also be switched from the profile menu for demonstration.</p>

          <div className="grid grid-cols-2 gap-2 mt-6" data-testid="role-selector">
            {Object.values(ROLES).map((r) => (
              <button
                key={r.id}
                type="button"
                data-testid={`role-option-${r.id}`}
                onClick={() => { setRole(r.id); setId(""); setOtp(""); setError(""); setOtpStage(false); }}
                className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${role === r.id ? "border-navy bg-navy-tint" : "border-slate-200 hover:border-navy/40"}`}
              >
                <span className="block text-sm font-bold text-navy">{r.label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{r.tagline}</span>
              </button>
            ))}
          </div>

          <label className="block mt-6">
            <span className="overline">{roleHints[role].label}</span>
            <Input
              data-testid="login-id-input"
              value={id}
              onChange={(e) => { setId(e.target.value); setError(""); }}
              placeholder={roleHints[role].placeholder}
              className="mt-2 h-12 text-base metric-num tracking-wider"
              autoComplete="off"
            />

          {/* TEMP DISABLED - PASSWORD CHECK - re-enable if needed
          {!demoAccess && (
            <label className="block mt-4">
              <span className="overline">Password</span>
              <Input
                data-testid="login-password-input"
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Demo access password"
                className="mt-2 h-12 text-base"
                autoComplete="off"
              />
            </label>
          )}
          */}

          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            {demoIds[role].map((d) => (
              <button key={d} type="button" data-testid={`demo-id-${d}`} onClick={() => { setId(d); setError(""); }}
                className="text-xs metric-num px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:border-navy hover:text-navy transition-colors">
                {d}
              </button>
            ))}
          </div>

          {role === "patient" && otpStage && (
            <div className="mt-4 rounded-xl border border-[#c3dcf7] bg-navy-tint p-4">
              <p className="overline text-navy">Mock OTP verification</p>
              <p className="text-xs text-navy/80 mt-1">Use OTP <span className="metric-num font-bold">123456</span>. No message is sent in the prototype.</p>
              <Input data-testid="login-otp-input" value={otp} onChange={(e) => { setOtp(e.target.value); setError(""); }} placeholder="123456" className="mt-3 metric-num h-11" />
            </div>
          )}

          <div className="mt-5 rounded-xl border border-slate-200 p-4 bg-slate-50/60">
            <div className="flex items-start gap-3">
              <Checkbox id="dpdp" data-testid="dpdp-consent-checkbox" checked={consent} onCheckedChange={(v) => { setConsent(!!v); setError(""); }} className="mt-0.5" />
              <label htmlFor="dpdp" className="text-sm text-slate-600 leading-relaxed cursor-pointer">
                <span className="font-semibold flex items-center gap-1.5 text-navy">
                  <ShieldCheck className="h-4 w-4 text-navy" /> DPDP Act 2023 — data sharing consent &amp; disclaimer
                </span>
                I consent to personal, medical and clinical data being processed for dialysis care delivery, and I accept that
                DialyGo Phase-I provides decision support only and does not replace qualified clinical judgement. Access is
                logged and auditable.
              </label>
            </div>
          </div>

          {error && <p data-testid="login-error" className="mt-4 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <Button data-testid="login-submit-btn" type="submit" className="w-full h-12 mt-6 text-base font-bold bg-saffron hover:bg-saffron-warm text-white rounded-xl">
            {role === "patient" && !otpStage ? "Send mock OTP" : "Enter workspace"} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>

          <div className="mt-6 space-y-2">
            <p className="text-xs text-slate-500 flex items-start gap-1.5">
              <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0" /> Phase-I demonstration build using synthetic JSON data. No live patient records are stored on this device.
            </p>
            <p className="text-xs text-slate-500 flex items-start gap-1.5">
              <Fingerprint className="h-3.5 w-3.5 mt-0.5 shrink-0" /> Biometric, fingerprint and face-recognition sign-in are future releases, shown here as roadmap capabilities only.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
