import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import CreatePatient from './pages/CreatePatient';
import PatientProfile from './pages/PatientProfile';
import Cases from './pages/Cases';
import CreateCase from './pages/CreateCase';
import CaseDetail from './pages/CaseDetail';
import UpcomingCases from './pages/UpcomingCases';
import InpatientRegister from './pages/InpatientRegister';
import OutpatientRegister from './pages/OutpatientRegister';
import LaboratoryRequests from './pages/LaboratoryRequests';
import Billing from './pages/Billing';
import AdminReview from './pages/AdminReview';
import Documents from './pages/Documents';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

/**
 * Root application component.
 *
 * Wraps the entire app in the AuthProvider, then defines the router.
 * The /login route is public; every other route is rendered inside a
 * ProtectedRoute (which redirects unauthenticated users to /login) and
 * wrapped by the shared Layout (sidebar + topbar + content outlet).
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated routes share the Layout shell */}
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/create" element={<CreatePatient />} />
            <Route path="/patients/:id" element={<PatientProfile />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/upcoming" element={<UpcomingCases />} />
            <Route path="/cases/create" element={<CreateCase />} />
            <Route path="/cases/:id" element={<CaseDetail />} />
            <Route path="/inpatient" element={<InpatientRegister />} />
            <Route path="/outpatient" element={<OutpatientRegister />} />
            <Route path="/laboratory" element={<LaboratoryRequests />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/admin-review" element={<AdminReview />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/users" element={<Users />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallback: anything unknown goes to the dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
