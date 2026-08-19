import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppProvider, useApp } from "@/context/AppContext";
import Login from "@/pages/Login";
import PatientRoster from "@/pages/PatientRoster";
import PatientDashboard from "@/pages/PatientDashboard";

const Protected = ({ children }) => {
  const { operator } = useApp();
  return operator ? children : <Navigate to="/" replace />;
};

const LoginGate = () => {
  const { operator } = useApp();
  return operator ? <Navigate to="/patients" replace /> : <Login />;
};

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginGate />} />
          <Route path="/patients" element={<Protected><PatientRoster /></Protected>} />
          <Route path="/patient/:id" element={<Protected><PatientDashboard /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </AppProvider>
  );
}
