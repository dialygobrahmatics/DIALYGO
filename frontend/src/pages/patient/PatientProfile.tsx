// Patient profile page (/patient/profile): real data from GET /patient/profile, saves through PATCH.
import { useEffect, useState } from "react";
import { CheckCircle2, Fingerprint, Info, ShieldCheck } from "lucide-react";
import { EmptyState, Field, Metric, Panel } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ProfileControllers } from "@/controllers/ProfileControllers";
import useApi from "@/hooks/useApi";
import { formatDateTime, formatMobile } from "@/lib/format";
import type { PatientProfileResponse, ProfileConsents } from "@/types";

type ConsentKey = "dataSharing" | "privacyNotice" | "research";

const CONSENT_OPTIONS: { key: ConsentKey; text: string }[] = [
  { key: "dataSharing", text: "I consent to sharing my personal, medical and clinical data with DialyGo and my treating facility for the purpose of dialysis care delivery." },
  { key: "privacyNotice", text: "I have read and accept the privacy notice and prototype disclaimer: this application provides decision support only and does not replace clinical judgement." },
  { key: "research", text: "Optional: I consent to the use of my de-identified data for service improvement." },
];

const CONSENT_FIELD: Record<ConsentKey, "consent_data_sharing" | "consent_privacy_notice" | "consent_research"> = {
  dataSharing: "consent_data_sharing",
  privacyNotice: "consent_privacy_notice",
  research: "consent_research",
};

interface DetailsForm {
  emergencyContact: string;
  knownAllergies: string;
  occupation: string;
}

const toForm = (profile: PatientProfileResponse): DetailsForm => ({
  emergencyContact: profile.details.emergencyContact ?? "",
  knownAllergies: profile.details.knownAllergies ?? "",
  occupation: profile.details.occupation ?? "",
});

export default function PatientProfile() {
  const [isLoading, loadProfile, , loadAttempted] = useApi(ProfileControllers.get);
  const [isSavingDetails, saveDetails] = useApi(ProfileControllers.saveDetails);
  const [isSavingConsents, saveConsents] = useApi(ProfileControllers.saveConsents);

  const [profile, setProfile] = useState<PatientProfileResponse | null>(null);
  const [form, setForm] = useState<DetailsForm>({ emergencyContact: "", knownAllergies: "", occupation: "" });
  const [consents, setConsents] = useState<Omit<ProfileConsents, "updatedAt">>({ dataSharing: false, privacyNotice: false, research: false });

  // Stores the latest server profile and resets only the forms named in `reset`, so saving one section
  // never discards unsaved edits in the other.
  const adopt = (next: PatientProfileResponse, reset: ("details" | "consents")[]) => {
    setProfile(next);
    if (reset.includes("details")) setForm(toForm(next));
    if (reset.includes("consents")) {
      setConsents({ dataSharing: next.consents.dataSharing, privacyNotice: next.consents.privacyNotice, research: next.consents.research });
    }
  };

  const load = async () => {
    const result = await loadProfile();
    if (result.ok) adopt(result.data, ["details", "consents"]);
  };

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onSaveDetails = async () => {
    const result = await saveDetails({
      emergency_contact: form.emergencyContact,
      known_allergies: form.knownAllergies,
      occupation: form.occupation,
    });
    if (result.ok) adopt(result.data, ["details"]);
  };

  const onSaveConsents = async () => {
    const result = await saveConsents({
      consent_data_sharing: consents.dataSharing,
      consent_privacy_notice: consents.privacyNotice,
      consent_research: consents.research,
    });
    if (result.ok) adopt(result.data, ["consents"]);
  };

  if (!profile) {
    return isLoading || !loadAttempted
      ? <p className="text-sm text-slate-500" data-testid="profile-loading">Loading your profile…</p>
      : (
        <div className="space-y-3" data-testid="profile-error">
          <EmptyState text="We could not load your profile." />
          <Button variant="outline" onClick={() => void load()}>Try again</Button>
        </div>
      );
  }

  const { patient, account, details } = profile;
  const detailsDirty = (Object.keys(form) as (keyof DetailsForm)[]).some((k) => form[k] !== (details[k] ?? ""));
  const consentsDirty = CONSENT_OPTIONS.some(({ key }) => consents[key] !== profile.consents[key]);
  const consentsUpdatedAt = formatDateTime(profile.consents.updatedAt);

  return (
    <div className="space-y-4">
      <Panel title="Profile & KYC" hint="Demographics and identity on your DialyGo record" testId="patient-profile-panel">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label="Name" value={patient.name} testId="profile-name-value" />
          <Metric label="Age" value={patient.age} unit={patient.age !== null ? "years" : undefined} />
          <Metric label="Gender" value={patient.gender} />
          <Metric label="Blood group" value={details.bloodGroup} />
          <Metric label="DialyGo ID" value={account.userCode} testId="profile-code-value" />
          <Metric label="Mobile" value={formatMobile(account.mobileNumber)} />
          <Metric label="Email" value={account.email} />
          <Metric label="Last sign-in" value={formatDateTime(account.lastLoginAt)} />
        </div>
      </Panel>

      <Panel title="Sign-in & security" hint="How your account is verified" testId="patient-security-panel">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-1" data-testid="otp-verified-badge">
            <CheckCircle2 className="h-3.5 w-3.5" /> Mobile verified at sign-in
          </span>
          <p className="text-sm text-slate-600">
            A one-time code is sent to <span className="metric-num font-semibold">{formatMobile(account.mobileNumber)}</span> every time you sign in.
            Changing your registered number is not available yet.
          </p>
        </div>
        <div className="mt-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
          <p className="text-sm font-semibold flex items-center gap-2"><Fingerprint className="h-4 w-4 text-slate-500" /> Biometric, fingerprint and face-recognition login</p>
          <p className="text-xs text-slate-600 mt-1">Future Release – Not Available in Phase I.</p>
        </div>
      </Panel>

      <Panel title="Consent for data sharing" hint="DPDP Act 2023 — explicit, revocable consent" testId="patient-consent-panel">
        <div className="space-y-3">
          {CONSENT_OPTIONS.map((c) => (
            <label key={c.key} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3 cursor-pointer hover:border-slate-300 transition-colors">
              <Checkbox data-testid={`consent-${c.key}`} checked={consents[c.key]} onCheckedChange={(v) => setConsents((p) => ({ ...p, [c.key]: v === true }))} />
              <span className="text-sm text-slate-700">{c.text}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button data-testid="save-consent-btn" className="bg-navy hover:bg-navy-deep" disabled={!consentsDirty || isSavingConsents} onClick={() => void onSaveConsents()}>
            <ShieldCheck className="h-4 w-4 mr-1.5" /> {isSavingConsents ? "Saving…" : "Save consent preferences"}
          </Button>
          {consentsUpdatedAt && <span className="text-xs text-slate-500" data-testid="consent-updated-at">Last updated {consentsUpdatedAt}</span>}
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-start gap-1.5">
          <Info className="h-3.5 w-3.5 mt-0.5" /> Automatic hospital data integration is a future release; in Phase-I your information is entered or uploaded manually.
        </p>
      </Panel>

      <Panel title="Complete missing information" hint="Details kept on your record" testId="patient-missing-panel">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Emergency contact"><Input data-testid="missing-emergency-input" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} placeholder="Name and number" maxLength={255} /></Field>
          <Field label="Known allergies"><Input data-testid="missing-allergies-input" value={form.knownAllergies} onChange={(e) => setForm({ ...form, knownAllergies: e.target.value })} placeholder="None / drug names" /></Field>
          <Field label="Occupation"><Input data-testid="missing-occupation-input" value={form.occupation} onChange={(e) => setForm({ ...form, occupation: e.target.value })} placeholder="Optional" maxLength={150} /></Field>
        </div>
        <Button data-testid="save-missing-btn" variant="outline" className="mt-4" disabled={!detailsDirty || isSavingDetails} onClick={() => void onSaveDetails()}>
          {isSavingDetails ? "Saving…" : "Save information"}
        </Button>
      </Panel>
    </div>
  );
}
