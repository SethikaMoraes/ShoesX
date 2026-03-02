import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <section className="panel flex items-center justify-center py-12">
        <span
          className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-600 dark:border-slate-700 dark:border-t-cyan-300"
          aria-label="Loading"
        />
      </section>
    );
  }

  // Hiding admin UI is not security by itself.
  // Enforce admin-only permissions with Supabase RLS policies (or backend checks).
  if (!isAuthenticated || !isAdmin) {
    return <Navigate to="/" replace state={{ from: location.pathname, accessDenied: true }} />;
  }

  return children;
}
