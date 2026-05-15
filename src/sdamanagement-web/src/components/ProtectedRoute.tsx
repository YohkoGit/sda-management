import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/LoadingSpinner";
import { ROLE_HIERARCHY } from "@/types/auth";

/**
 * Hierarchical role check. `hasRole("ADMIN", "ADMIN")` is true; so is
 * `hasRole("OWNER", "ADMIN")`. Returns false for unknown roles.
 *
 * Prefer `useRole().hasRole(...)` from `@/hooks/useRole` for new code —
 * it performs exact-match checks against the typed `UserRole` union.
 */
export function hasRole(userRole: string, requiredRole: string): boolean {
  const userKey = userRole.toUpperCase() as keyof typeof ROLE_HIERARCHY;
  const requiredKey = requiredRole.toUpperCase() as keyof typeof ROLE_HIERARCHY;
  return (ROLE_HIERARCHY[userKey] ?? 0) >= (ROLE_HIERARCHY[requiredKey] ?? 0);
}

interface ProtectedRouteProps {
  requiredRole?: string;
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user && !hasRole(user.role, requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
