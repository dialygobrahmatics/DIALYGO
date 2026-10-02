import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { useAuth } from "@/hooks/useAuth";
import { AppProvider } from "@/context/AppContext";
import { ROLES } from "@/config/roles";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Roadmap from "@/pages/Roadmap";
import {
  OperatorHome, OperatorPatientSearch, OperatorPreSession, OperatorCurrentSession, OperatorPatientHistory,
  OperatorVascular, OperatorMachineInsights, OperatorProcedureSupport, OperatorReports,
} from "@/pages/operator/OperatorPages";
import {
  DoctorHome, DoctorPatients, DoctorPatient360, DoctorClinicalHistory, DoctorDialysisHistory, DoctorVascular,
  DoctorCoreAnalysis, DoctorReports, DoctorClinicalReview,
} from "@/pages/doctor/DoctorPages";
import {
  PatientHome, PatientMyHealth, PatientUpload, PatientReports, PatientDialysisOverview, PatientMedicalHistory,
} from "@/pages/patient/PatientPages";
import PatientProfile from "@/pages/patient/PatientProfile";
import {
  AdminHome, DialysisAdminHome, ClinicalGovernance, AdminUsers, AdminPatients, AdminDoctors, AdminOperators,
  AdminIngestion, AdminIntegration, AdminHistorical, AdminMachineInsights, AdminReports, AdminSettings,
} from "@/pages/admin/AdminPages";

const SessionLoading = () => (
  <div className="min-h-screen grid place-items-center text-sm text-slate-500" data-testid="session-loading">
    Restoring your session…
  </div>
);

const Shell = ({ children, roles }) => {
  const { role, userLoading } = useAuth();
  if (userLoading) return <SessionLoading />;
  if (!role) return <Navigate to="/" replace />;
  if (roles && !roles.includes(role)) return <Navigate to={ROLES[role].home} replace />;
  return <AppLayout>{children}</AppLayout>;
};

const LoginGate = () => {
  const { role, userLoading } = useAuth();
  if (userLoading) return <SessionLoading />;
  return role ? <Navigate to={ROLES[role].home} replace /> : <Login />;
};

const routes = [
  ["/operator/home", <OperatorHome />, ["operator"]],
  ["/operator/search", <OperatorPatientSearch />, ["operator"]],
  ["/operator/pre-session", <OperatorPreSession />, ["operator"]],
  ["/operator/current-session", <OperatorCurrentSession />, ["operator"]],
  ["/operator/history", <OperatorPatientHistory />, ["operator"]],
  ["/operator/vascular", <OperatorVascular />, ["operator"]],
  ["/operator/machine-insights", <OperatorMachineInsights />, ["operator"]],
  ["/operator/procedure-support", <OperatorProcedureSupport />, ["operator"]],
  ["/operator/reports", <OperatorReports />, ["operator"]],
  ["/doctor/home", <DoctorHome />, ["doctor"]],
  ["/doctor/patients", <DoctorPatients />, ["doctor"]],
  ["/doctor/patient-360", <DoctorPatient360 />, ["doctor"]],
  ["/doctor/clinical-history", <DoctorClinicalHistory />, ["doctor"]],
  ["/doctor/dialysis-history", <DoctorDialysisHistory />, ["doctor"]],
  ["/doctor/vascular", <DoctorVascular />, ["doctor"]],
  ["/doctor/core-analysis", <DoctorCoreAnalysis />, ["doctor"]],
  ["/doctor/reports", <DoctorReports />, ["doctor"]],
  ["/doctor/clinical-review", <DoctorClinicalReview />, ["doctor"]],
  ["/patient/home", <PatientHome />, ["patient"]],
  ["/patient/my-health", <PatientMyHealth />, ["patient"]],
  ["/patient/upload", <PatientUpload />, ["patient"]],
  ["/patient/reports", <PatientReports />, ["patient"]],
  ["/patient/dialysis-overview", <PatientDialysisOverview />, ["patient"]],
  ["/patient/medical-history", <PatientMedicalHistory />, ["patient"]],
  ["/patient/profile", <PatientProfile />, ["patient"]],
  ["/tech-admin/home", <AdminHome />, ["techadmin"]],
  ["/tech-admin/users", <AdminUsers />, ["techadmin"]],
  ["/tech-admin/ingestion", <AdminIngestion />, ["techadmin"]],
  ["/tech-admin/integration", <AdminIntegration />, ["techadmin"]],
  ["/tech-admin/machine-insights", <AdminMachineInsights />, ["techadmin"]],
  ["/tech-admin/historical", <AdminHistorical />, ["techadmin"]],
  ["/tech-admin/settings", <AdminSettings />, ["techadmin"]],
  ["/clinical-admin/home", <DialysisAdminHome />, ["dialysisadmin"]],
  ["/clinical-admin/patients", <AdminPatients />, ["dialysisadmin"]],
  ["/clinical-admin/doctors", <AdminDoctors />, ["dialysisadmin"]],
  ["/clinical-admin/operators", <AdminOperators />, ["dialysisadmin"]],
  ["/clinical-admin/historical", <AdminHistorical />, ["dialysisadmin"]],
  ["/clinical-admin/reports", <AdminReports />, ["dialysisadmin"]],
  ["/clinical-admin/governance", <ClinicalGovernance />, ["dialysisadmin"]],
  ["/roadmap", <Roadmap />, null],
];

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginGate />} />
            {routes.map(([path, el, roles]) => (
              <Route key={path} path={path} element={<Shell roles={roles}>{el}</Shell>} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AppProvider>
    </AuthProvider>
  );
}
