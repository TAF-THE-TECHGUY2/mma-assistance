import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * Optional list of roles allowed to view the wrapped route. When omitted,
   * any authenticated user may access it. "owner" is always permitted.
   */
  roles?: Role[];
}

/**
 * Guards a route subtree.
 *
 * - While auth state is still loading, renders a lightweight spinner so we do
 *   not flash the login screen for users who actually have a valid session.
 * - Redirects unauthenticated users to /login, preserving the attempted
 *   location so the login page can send them back afterwards.
 * - Optionally enforces role-based access; unauthorized users are bounced to
 *   the dashboard.
 */
export default function ProtectedRoute({ children, roles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-teal-600"
          role="status"
          aria-label="Loading"
        />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && roles.length > 0 && user.role !== 'owner' && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
