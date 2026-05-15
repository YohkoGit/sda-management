/**
 * Canonical role union. Backend emits these UPPERCASE values:
 * - `TokenService.cs` sets the role claim as `user.Role.ToString().ToUpper()`
 * - `AuthMeResponse` is built with `role: u.Role.ToString().ToUpper()`
 *
 * Keep the union in sync with the backend `UserRole` enum.
 */
export type UserRole = "OWNER" | "ADMIN" | "VIEWER";

export const USER_ROLES: readonly UserRole[] = ["OWNER", "ADMIN", "VIEWER"] as const;

/** Numeric weighting used by hierarchical role checks (`hasRole`-style helpers). */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  VIEWER: 1,
  ADMIN: 2,
  OWNER: 3,
};
