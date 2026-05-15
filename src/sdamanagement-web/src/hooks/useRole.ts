import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/types/auth";

export interface UseRoleResult {
  /** Current user's role, or `null` when unauthenticated. */
  role: UserRole | null;
  /** `true` when role is exactly `"OWNER"`. */
  isOwner: boolean;
  /**
   * `true` when role is exactly `"ADMIN"` — does NOT include `"OWNER"`.
   *
   * If a caller wants "admin or owner", use `hasRole("ADMIN", "OWNER")`.
   * The audit found this distinction is wrong in many call sites today,
   * which is why this hook exposes both forms explicitly.
   */
  isAdmin: boolean;
  /** `true` when role is exactly `"VIEWER"`. */
  isViewer: boolean;
  /** `true` when an authenticated user is present. */
  isAuthenticated: boolean;
  /**
   * Returns `true` when the current role matches any of the supplied roles.
   * Returns `false` when unauthenticated.
   */
  hasRole(...roles: UserRole[]): boolean;
  /**
   * The department IDs scoped to the authenticated user, or `[]` when
   * unauthenticated. Owners typically have an empty list (unrestricted).
   */
  ownedDepartmentIds: number[];
}

/**
 * Typed accessor for the current user's role and department scope.
 *
 * Wraps `useAuth()` so callers do not have to defensively `.toUpperCase()`
 * the role string — the backend (`TokenService` / `AuthMeResponse`) always
 * emits the role uppercase, and `AuthUser.role` is now typed as the discrete
 * `UserRole` union.
 *
 * Returns sensible defaults for anonymous users (role `null`, all flags `false`,
 * empty department list).
 */
export function useRole(): UseRoleResult {
  const { user, isAuthenticated } = useAuth();

  return useMemo<UseRoleResult>(() => {
    const role = user?.role ?? null;
    const ownedDepartmentIds = user?.departmentIds ?? [];

    return {
      role,
      isOwner: role === "OWNER",
      isAdmin: role === "ADMIN",
      isViewer: role === "VIEWER",
      isAuthenticated,
      hasRole: (...roles: UserRole[]) =>
        role !== null && roles.includes(role),
      ownedDepartmentIds,
    };
  }, [user, isAuthenticated]);
}
