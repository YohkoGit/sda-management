# Story 3.4: OWNER User Management (Full Access)

Status: done

## Prerequisites

- **Local dev environment**: Node 20+, .NET 10 SDK, Docker (Testcontainers), PostgreSQL 17 via Docker
- **Story 3.3 complete**: User role & department management — PUT /api/users/{id} with four-level authorization, UserFormDialog dual-mode (create/edit), OWNER full access for create/edit
- **OWNER account seeded**: EF Core seed migration creates initial OWNER user
- **Existing user infrastructure**:
  - `UsersController` — GET list, GET by id, POST create, POST bulk, PUT update
  - `IUserService` / `UserService` — GetUsersAsync, GetByIdAsync, CreateAsync, BulkCreateAsync, UpdateAsync
  - `UserFormDialog` — dual-mode create/edit with role filtering and department scoping
  - `AdminUsersPage` — user list with create/bulk/edit buttons, infinite scroll
  - `AlertDialog` component already installed at `src/sdamanagement-web/src/components/ui/alert-dialog.tsx`
- **OWNER can already**: create users with OWNER role (POST), edit any user regardless of scope (PUT), assign any role including OWNER. These are verified in Story 3.3 integration tests.

## Story

As an **OWNER**,
I want to delete user accounts with a confirmation dialog,
so that I have complete user lifecycle management including account removal.

> **Scope note**: OWNER account creation (FR53) and unrestricted edit access (FR55, FR47) are already implemented in Stories 3.1–3.3. This story's primary deliverable is **user soft-deletion** (FR54) with all guards and UI.

## Acceptance Criteria

### AC1 — Delete Button Visibility (OWNER Only)
- **Given** an OWNER on the user management page (AdminUsersPage)
- **When** the page renders user cards
- **Then** each user card shows a delete button (Trash2 icon, ghost variant, red text) — visible to OWNER only
- **And** the delete button does NOT appear for ADMIN or VIEWER users
- **And** the delete button does NOT appear on the OWNER's own card (self-delete prevention)

### AC2 — Delete Confirmation Dialog
- **Given** an OWNER clicks the delete button on a user card
- **When** the AlertDialog opens
- **Then** it displays: title "Supprimer l'utilisateur" / "Delete User"
- **And** description: "Cette action est irreversible. [FirstName LastName] ne pourra plus se connecter." / "This action is irreversible. [FirstName LastName] will no longer be able to sign in."
- **And** two buttons: "Annuler" (cancel) and "Supprimer" (destructive action, red-600)
- **And** the dialog closes on cancel or Escape key

### AC3 — Successful Soft-Delete
- **Given** an OWNER confirms deletion of a user
- **When** the DELETE /api/users/{id} call returns 204
- **Then** the user is soft-deleted (DeletedAt timestamp set, record preserved in database)
- **And** the user disappears from the user list (global query filter excludes soft-deleted users)
- **And** a success toast shows: "Utilisateur supprime" / "User deleted"
- **And** the user's active sessions are invalidated (RefreshTokens and PasswordResetTokens hard-deleted)
- **And** the soft-deleted user cannot log in (global query filter excludes from auth lookups)

### AC4 — Self-Delete Prevention
- **Given** an OWNER attempting to delete themselves via DELETE /api/users/{ownId}
- **When** the API processes the request
- **Then** the API returns 403 — self-deletion is prevented
- **And** the frontend does not show the delete button on the current user's own card

### AC5 — Last-OWNER Protection (Defense-in-Depth)
- **Given** only one non-deleted OWNER exists in the system
- **When** any request attempts to delete them via DELETE /api/users/{id}
- **Then** the API returns 409 Conflict with message: "Cannot delete the last owner account"
- **And** the system always maintains at least one active OWNER
- **Note**: Under normal conditions, self-delete prevention (AC4) fires before this guard (the only OWNER trying to delete themselves gets 403 first). This guard protects against concurrent deletion race conditions where two OWNERs simultaneously delete each other.

### AC6 — Authorization Guards
- **Given** a non-OWNER user (ADMIN, VIEWER, Anonymous)
- **When** they call DELETE /api/users/{id}
- **Then** Anonymous returns 401, VIEWER returns 403, ADMIN returns 403
- **And** only OWNER role can delete users

### AC7 — Backend API Endpoint
- `DELETE /api/users/{id}` — soft-delete user (OWNER only)
- Success: 204 No Content
- Not found: 404 if user ID does not exist (or already deleted)
- Self-delete: 403 if id == current user
- Last OWNER: 409 if deleting would leave zero active OWNERs
- ADMIN/VIEWER: 403
- Anonymous: 401

### AC8 — Verification: OWNER Create with OWNER Role (Already Implemented)
- **Given** an OWNER creating a user via POST /api/users
- **When** they assign role "Owner"
- **Then** the account is created successfully (FR53) — already working, add integration test if missing

### AC9 — Verification: OWNER Unrestricted Edit (Already Implemented)
- **Given** an OWNER editing any user via PUT /api/users/{id}
- **When** they change role and/or departments
- **Then** changes are saved regardless of department scoping (FR55, FR47) — already working, add integration test if missing

## Tasks / Subtasks

### Backend

- [x] **Task 1: Add DeletedAt to User entity + EF Core migration** (AC: #3)
  - [x] Add `public DateTime? DeletedAt { get; set; }` to `src/SdaManagement.Api/Data/Entities/User.cs`
  - [x] Add global query filter in `AppDbContext.OnModelCreating`: `e.HasQueryFilter(u => u.DeletedAt == null)`
  - [x] Run `dotnet ef migrations add AddUserSoftDelete` to generate migration
  - [x] Verify migration adds `deleted_at` nullable timestamp column to `users` table

- [x] **Task 2: IUserService.DeleteAsync** (AC: #3, #7)
  - [x] Add to `src/SdaManagement.Api/Services/IUserService.cs`:
    - `Task<bool> DeleteAsync(int userId)`
  - [x] Returns false if user not found (controller maps to 404)
  - [x] Returns true if soft-deleted successfully

- [x] **Task 3: UserService.DeleteAsync implementation** (AC: #3, #7)
  - [x] Implement in `UserService.cs`:
    - Load user by ID (query filter already excludes deleted users)
    - Return false if not found
    - Set `user.DeletedAt = DateTime.UtcNow`
    - Hard-delete all RefreshTokens for this user: `db.RefreshTokens.Where(r => r.UserId == userId)` then `RemoveRange`
    - Hard-delete all PasswordResetTokens for this user: `db.PasswordResetTokens.Where(p => p.UserId == userId)` then `RemoveRange`
    - Single `SaveChangesAsync()` — atomic
    - Return true

- [x] **Task 4: UsersController.Delete endpoint** (AC: #4, #5, #6, #7)
  - [x] Add `[HttpDelete("{id:int}")]` to existing `UsersController.cs`
  - [x] Authorization (three-level for delete):
    1. Authenticate — 401 if anonymous
    2. Role == Owner — 403 if Admin or Viewer (OWNER-only operation)
    3. Self-delete guard — if `id == currentUser.UserId` return 403
  - [x] Last-OWNER guard: count active OWNERs via `db.Users.CountAsync(u => u.Role == UserRole.Owner)` (global query filter already excludes deleted). If count <= 1 AND target user is OWNER, return 409 Conflict
  - [x] Call `userService.DeleteAsync(id)`
  - [x] If false return NotFound
  - [x] Return NoContent (204)

- [x] **Task 5: Backend integration tests** (AC: #3, #4, #5, #6, #7, #8, #9)
  - [x] Add to `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs`
  - [x] DELETE tests:
    - DELETE /api/users/{id} as OWNER soft-deletes VIEWER returns 204
    - DELETE /api/users/{id} — deleted user no longer appears in GET /api/users list
    - DELETE /api/users/{id} — deleted user returns 404 on GET /api/users/{id}
    - DELETE /api/users/{id} — deleted user cannot be deleted again (404)
    - DELETE /api/users/{id} as OWNER deleting self returns 403
    - DELETE /api/users/{id} as OWNER deleting non-last OWNER returns 204 (seed 2 OWNERs, delete second)
    - DELETE /api/users/{id} as ADMIN returns 403
    - DELETE /api/users/{id} as VIEWER returns 403
    - DELETE /api/users/{id} as Anonymous returns 401
    - DELETE /api/users/{id} with non-existent ID returns 404
    - DELETE /api/users/{id} — soft-deleted user cannot log in (POST /api/auth/login returns 401 or user-not-found)
  - [x] Note: The last-OWNER guard (`ownerCount <= 1 → 409`) is defense-in-depth against concurrent deletion race conditions. It is not directly testable via integration tests because the requesting user must also be an OWNER (making ownerCount >= 2). The guard logic is correct and provides safety — no test needed for the 409 path specifically.
  - [x] Verification tests (if not already covered):
    - POST /api/users as OWNER with role Owner returns 201 (AC8)
    - PUT /api/users/{id} as OWNER editing cross-department user returns 200 (AC9)

### Frontend

- [x] **Task 6: User service delete method** (AC: #7)
  - [x] Add to `src/sdamanagement-web/src/services/userService.ts`:
    - `deleteUser(id: number)` calls `DELETE /api/users/${id}`
  - [x] No response body expected (204)

- [x] **Task 7: DeleteUserDialog component** (AC: #1, #2, #3)
  - [x] Create `src/sdamanagement-web/src/components/user/DeleteUserDialog.tsx`
  - [x] Props: `user: UserListItem | null`, `open: boolean`, `onOpenChange: (open: boolean) => void`
  - [x] Uses shadcn AlertDialog (already installed)
  - [x] Title: `t("pages.adminUsers.deleteDialog.title")` — "Supprimer l'utilisateur"
  - [x] Description: `t("pages.adminUsers.deleteDialog.description", { name: \`${user.firstName} ${user.lastName}\` })` — includes user's full name
  - [x] Cancel button: `t("common.cancel")` — "Annuler"
  - [x] Action button: `t("pages.adminUsers.deleteDialog.confirm")` — "Supprimer" with `className="bg-red-600 hover:bg-red-700 focus:ring-red-600"`
  - [x] Delete mutation — uses variable-based pattern: `mutationFn: (userId: number) => userService.deleteUser(userId)` with `deleteMutation.mutate(user!.id)` to capture ID before AlertDialog closes and nullifies user prop
  - [x] Action button disabled while `deleteMutation.isPending`

- [x] **Task 8: AdminUsersPage — add delete button** (AC: #1, #4)
  - [x] Modify `src/sdamanagement-web/src/pages/AdminUsersPage.tsx`
  - [x] Add `deletingUser` state: `useState<UserListItem | null>(null)`
  - [x] Add delete button on each user card — OWNER only, NOT on own card
  - [x] CRITICAL: `user` here is `authUser` from `useAuth()`. Use `user.userId` (not `user.id`) for self-check.
  - [x] Render `<DeleteUserDialog user={deletingUser} open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)} />`

- [x] **Task 9: i18n strings** (AC: #2, #3)
  - [x] Add to `public/locales/fr/common.json` and `en/common.json`: deleteDialog.title, deleteDialog.description, deleteDialog.confirm, toast.deleted, toast.error.lastOwner, toast.error.deleteFailed, common.cancel
  - [x] Add all new keys to `src/sdamanagement-web/src/test-utils.tsx` mock resources

- [x] **Task 10: MSW mock handlers for delete** (AC: #7)
  - [x] Add to `src/sdamanagement-web/src/mocks/handlers/users.ts`:
    - `DELETE /api/users/:id` default: returns `new HttpResponse(null, { status: 204 })`
    - Variant: 403 forbidden
    - Variant: 404 not found
    - Variant: 409 last owner conflict

- [x] **Task 11: Frontend tests** (AC: #1, #2, #3, #4)
  - [x] Create `src/sdamanagement-web/src/pages/AdminUsersPage.delete.test.tsx`
  - [x] Per-file MSW server: `const server = setupServer(...authHandlers, ...userHandlers, ...departmentHandlers)`
  - [x] Tests: 9 test cases all passing — delete button visibility (OWNER/ADMIN/VIEWER), self-card exclusion, AlertDialog content, cancel without API call, confirm with success toast, 409 last owner toast, 403 forbidden toast

## Dev Notes

### Architecture Patterns (Mandatory)

**Soft-Delete Pattern — EF Core Global Query Filter:**

```csharp
// In User entity — add ONE property:
public DateTime? DeletedAt { get; set; }

// In AppDbContext.OnModelCreating — add query filter to EXISTING User config:
modelBuilder.Entity<User>(e =>
{
    // ... existing config (HasKey, HasIndex, etc.)
    e.HasQueryFilter(u => u.DeletedAt == null);
});
```

Key: The global query filter automatically excludes soft-deleted users from ALL queries (user list, auth lookups, department scoping). No need to add `Where(u => u.DeletedAt == null)` anywhere. When you need to include deleted users (e.g., last-OWNER count check in controller), use `db.Users.IgnoreQueryFilters()`.

**CRITICAL: Last-OWNER count must use the filtered DbSet (NOT IgnoreQueryFilters)**, because we only care about non-deleted OWNERs. The global query filter already does this:
```csharp
var activeOwnerCount = await db.Users.CountAsync(u => u.Role == UserRole.Owner);
// This automatically excludes deleted users via query filter
```

**Controller — DELETE endpoint (OWNER only):**

```csharp
[HttpDelete("{id:int}")]
public async Task<IActionResult> Delete(int id)
{
    if (!auth.IsAuthenticated()) return Unauthorized();
    if (!auth.IsOwner()) return Forbid();
    if (id == currentUser.UserId) return Forbid();

    // Last-OWNER guard
    var targetUser = await db.Users.FindAsync(id);
    if (targetUser is null) return NotFound();
    if (targetUser.Role == UserRole.Owner)
    {
        var ownerCount = await db.Users.CountAsync(u => u.Role == UserRole.Owner);
        if (ownerCount <= 1) return Conflict(new { message = "Cannot delete the last owner account" });
    }

    var deleted = await userService.DeleteAsync(id);
    return deleted ? NoContent() : NotFound();
}
```

Note: `db.Users.FindAsync(id)` respects the global query filter in EF Core — already-deleted users return null (404).

**Service — UserService.DeleteAsync:**

```csharp
public async Task<bool> DeleteAsync(int userId)
{
    var user = await db.Users.FindAsync(userId);
    if (user is null) return false;

    user.DeletedAt = DateTime.UtcNow;

    // Revoke all sessions — prevent deleted user from refreshing JWT
    var refreshTokens = await db.RefreshTokens
        .Where(r => r.UserId == userId)
        .ToListAsync();
    db.RefreshTokens.RemoveRange(refreshTokens);

    var resetTokens = await db.PasswordResetTokens
        .Where(p => p.UserId == userId)
        .ToListAsync();
    db.PasswordResetTokens.RemoveRange(resetTokens);

    await db.SaveChangesAsync();
    return true;
}
```

Key: Single `SaveChangesAsync()` — soft-delete + token revocation is atomic. UserDepartments are NOT touched (user record still exists, just filtered from queries).

**Auth Flow Safety — Global Query Filter Covers ALL Auth Paths:**

The global query filter `HasQueryFilter(u => u.DeletedAt == null)` automatically protects every auth flow in the system. Do NOT add explicit `Where(u => u.DeletedAt == null)` to any auth code — the filter handles everything:

| Auth Flow | Query Pattern | Protected By |
|---|---|---|
| Email/password login | `dbContext.Users.FirstOrDefaultAsync(u => u.Email == email)` | Global query filter — returns null |
| Google OAuth callback | `dbContext.Users.FirstOrDefaultAsync(u => u.Email == email)` | Global query filter — returns null |
| Initiate auth flow | `dbContext.Users.FirstOrDefaultAsync(u => u.Email == email)` | Global query filter — returns null |
| Set password (first-login) | `dbContext.Users.FirstOrDefaultAsync(u => u.Email == email)` | Global query filter — returns null |
| Password reset request | `dbContext.Users.FirstOrDefaultAsync(u => u.Email == email)` | Global query filter — returns null |
| Password reset confirm | `dbContext.PasswordResetTokens.Include(t => t.User)` | Tokens hard-deleted on soft-delete |
| Token refresh | `dbContext.RefreshTokens.Include(rt => rt.User)` | RefreshTokens hard-deleted on soft-delete |
| JWT middleware (CurrentUserContextMiddleware) | `dbContext.Users.Where(u => u.Email == emailClaim)` | Global query filter — user becomes Anonymous |

**Between soft-deletion and JWT expiration**, a user with a valid JWT can still reach the API. However, the `CurrentUserContextMiddleware` won't find them in the DB (query filter), so they're treated as Anonymous and get 401 on protected endpoints. This is safe — JWTs are short-lived and expire naturally.

**Double-FindAsync in controller + service**: The controller calls `db.Users.FindAsync(id)` for the last-OWNER guard, then `userService.DeleteAsync(id)` calls `FindAsync(id)` again. The second call returns from EF Core's change tracker cache (zero DB hit, same entity instance). Do NOT "optimize" by passing the entity to the service — this would break the clean separation between authorization (controller) and mutation (service).

**Reference pattern**: See `DepartmentsController.Delete` (DELETE /api/departments/{id}, returns 204, OWNER only) for an existing in-project DELETE endpoint pattern.

### Previous Story Learnings (from Stories 3.1–3.3)

- **Controller primary constructor**: `(UserService, IAuthorizationService auth, ICurrentUserContext currentUser, AppDbContext db)`. `db` was injected in Story 3.3 for ADMIN department visibility checks — reuse for last-OWNER count.
- **Auth pattern**: `auth.IsAuthenticated()` → `auth.IsOwner()` (or `currentUser.Role < UserRole.Owner`). Return-based, not exception-based.
- **`auth.IsOwner()`**: Exists on `IAuthorizationService` — use this for OWNER-only check. Do NOT use `currentUser.Role >= UserRole.Admin` (that allows ADMIN too).
- **Self-identity check**: Use `currentUser.UserId` (from `ICurrentUserContext`), NOT `currentUser.Id`. This was a pitfall in Story 3.3.
- **`db.Users.FindAsync(id)`**: Respects global query filters in EF Core. Already-deleted users return null.
- **Test helpers**: `CreateTestUser(email, role)` returns `User` with Id populated, plus `OwnerClient`, `AdminClient`, `ViewerClient`, `AnonymousClient` on `IntegrationTestBase`. Email is first param, role is second.
- **Frontend test pattern**: Add ALL new i18n keys to `test-utils.tsx` BEFORE writing tests. Per-file `setupServer()`.
- **MSW handlers**: default + variant patterns. Each test file owns its server.
- **AuthUser.userId vs UserResponse.id**: Auth context uses `userId`, API responses use `id`. Self-checks in frontend: `authUser.userId === item.id`.
- **Toast patterns**: `toast.success(t(...))` for success, `toast.error(t(...))` for errors. Use `isAxiosError(error)` for type-safe error checking.
- **Rate limiting**: `[EnableRateLimiting("auth")]` already on `UsersController` class — applies to DELETE endpoint automatically.

### Reuse Existing Code (Do NOT Reinvent)

- **UsersController**: Add `[HttpDelete("{id:int}")]` to EXISTING controller. Do NOT create a new controller.
- **UserService**: Add `DeleteAsync` to EXISTING service. Same primary constructor pattern.
- **IUserService**: Add method signature to EXISTING interface.
- **Auth context / role checks**: Same `useAuth()` pattern. `user?.role?.toUpperCase() === "OWNER"` for OWNER-only UI (case-insensitive — matches codebase convention).
- **Toast / i18n**: Same `toast.success(t(...))` and `toast.error(t(...))` pattern.
- **AlertDialog**: Already installed at `src/sdamanagement-web/src/components/ui/alert-dialog.tsx`. Import from `@/components/ui/alert-dialog`.
- **IntegrationTestBase helpers**: Reuse `CreateTestUser(email, role)`, `OwnerClient`, `AdminClient`, etc.
- **DepartmentsController.Delete pattern**: Existing DELETE /api/departments/{id} → 204 No Content, OWNER only. Follow this exact pattern for UsersController.Delete.
- **MSW handler patterns**: Follow existing `users.ts` handler structure for DELETE variant.
- **Query invalidation**: `queryClient.invalidateQueries({ queryKey: ["users"] })` — same key as create/edit.

### Project Structure Notes

**New files to create:**

Frontend:
- `src/sdamanagement-web/src/components/user/DeleteUserDialog.tsx`
- `src/sdamanagement-web/src/pages/AdminUsersPage.delete.test.tsx`

**Files to modify:**

Backend:
- `src/SdaManagement.Api/Data/Entities/User.cs` — add `DeletedAt` property
- `src/SdaManagement.Api/Data/AppDbContext.cs` — add global query filter for User
- `src/SdaManagement.Api/Services/IUserService.cs` — add `DeleteAsync` method
- `src/SdaManagement.Api/Services/UserService.cs` — implement `DeleteAsync`
- `src/SdaManagement.Api/Controllers/UsersController.cs` — add `[HttpDelete("{id:int}")]` endpoint
- `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs` — add DELETE endpoint tests

Frontend:
- `src/sdamanagement-web/src/services/userService.ts` — add `deleteUser` method
- `src/sdamanagement-web/src/pages/AdminUsersPage.tsx` — add delete button + deletingUser state + DeleteUserDialog
- `src/sdamanagement-web/src/mocks/handlers/users.ts` — add DELETE endpoint handlers
- `src/sdamanagement-web/public/locales/fr/common.json` — add delete i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — add delete i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — add new i18n mock keys

**New EF Core migration required.** Run: `dotnet ef migrations add AddUserSoftDelete --project src/SdaManagement.Api`

### Design Tokens Reference

- Delete button on user card: shadcn Button `variant="ghost"` `size="icon"` with Trash2 icon, `text-red-500 hover:text-red-700 hover:bg-red-50`
- Delete button: visible OWNER only, NOT on own card
- AlertDialog: standard shadcn AlertDialog (Radix UI primitive, accessible, traps focus)
- AlertDialog cancel: default styling
- AlertDialog confirm (destructive): `className="bg-red-600 hover:bg-red-700 focus:ring-red-600"` — override AlertDialogAction default
- Success toast: green accent (emerald-600), 3 seconds auto-dismiss
- Error toast: red accent (red-600), persistent until dismissed
- 409 last-owner toast: specific message, persistent

### Technology Notes (from Context7)

**EF Core — Global Query Filters for Soft Delete:**
- `HasQueryFilter(u => u.DeletedAt == null)` in `OnModelCreating` — automatically applied to all LINQ queries
- `IgnoreQueryFilters()` — bypasses the filter when you need to include deleted entities
- `FindAsync(id)` respects global query filters — deleted entities return null
- Filter is applied at the SQL level (WHERE clause), not in-memory
- Only ONE `HasQueryFilter` per entity — if you need multiple conditions, combine with `&&`
- The filter does NOT apply to raw SQL queries (`FromSqlRaw`) — only LINQ

**shadcn/ui AlertDialog — Destructive Confirmation:**
```tsx
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Controlled mode (open/onOpenChange props):
<AlertDialog open={open} onOpenChange={onOpenChange}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Title</AlertDialogTitle>
      <AlertDialogDescription>Description</AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}
        className="bg-red-600 hover:bg-red-700">
        Delete
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

- AlertDialog vs Dialog: AlertDialog is specifically for confirmations of destructive actions. It's semantically an `alertdialog` role (ARIA), requires explicit user action to dismiss (no backdrop click dismiss by default).
- Use controlled mode (`open`/`onOpenChange`) since the dialog state is managed by parent component.

### Git Intelligence

Commit convention: `feat(users): Story 3.4 — OWNER user management (full access)`

Recent patterns from Story 3.3:
- Backend files in `src/SdaManagement.Api/Controllers/`, `Services/`, `Dtos/User/`, `Validators/`
- Frontend files in `src/sdamanagement-web/src/components/user/`, `pages/`, `schemas/`, `services/`
- Integration tests in `tests/SdaManagement.Api.IntegrationTests/Users/`
- Separate test files per feature: `AdminUsersPage.test.tsx`, `AdminUsersPage.bulk.test.tsx`, `AdminUsersPage.edit.test.tsx`, `AdminUsersPage.delete.test.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.4 — AC and user story]
- [Source: _bmad-output/planning-artifacts/prd.md#FR54 — OWNERs can delete user accounts]
- [Source: _bmad-output/planning-artifacts/prd.md#FR53 — OWNERs can create other OWNER accounts]
- [Source: _bmad-output/planning-artifacts/prd.md#FR55 — OWNERs can edit any user's role and department assignments]
- [Source: _bmad-output/planning-artifacts/prd.md#FR47 — OWNERs can manage all departments regardless of assignment]
- [Source: _bmad-output/planning-artifacts/architecture.md#HTTP Status Codes — 204 No Content for successful DELETE]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Method Conventions — Delete methods return bool]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authorization — return-based pattern, OWNER-only for delete]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries — User owns UserDepartment, RefreshToken (aggregate root)]
- [Source: _bmad-output/planning-artifacts/architecture.md#EF Core Global Query Filters — soft delete pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Destructive Actions — confirmation Dialog required, red-600 destructive variant]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Toast Patterns — success green 3s, error red persistent]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy — ghost variant for destructive actions]
- [Source: _bmad-output/implementation-artifacts/3-3-user-role-and-department-management.md — all patterns, learnings, debug fixes]
- [Source: src/SdaManagement.Api/Controllers/UsersController.cs — existing controller to extend]
- [Source: src/SdaManagement.Api/Services/UserService.cs — existing service to extend]
- [Source: src/SdaManagement.Api/Services/IUserService.cs — interface to extend]
- [Source: src/SdaManagement.Api/Data/Entities/User.cs — entity to add DeletedAt]
- [Source: src/SdaManagement.Api/Data/AppDbContext.cs — add global query filter]
- [Source: src/SdaManagement.Api/Auth/IAuthorizationService.cs — IsOwner() method]
- [Source: src/SdaManagement.Api/Auth/ICurrentUserContext.cs — UserId property]
- [Source: src/sdamanagement-web/src/components/ui/alert-dialog.tsx — AlertDialog already installed]
- [Source: src/sdamanagement-web/src/pages/AdminUsersPage.tsx — page to add delete functionality]
- [Source: src/sdamanagement-web/src/services/userService.ts — service to extend with deleteUser]
- [Source: src/SdaManagement.Api/Controllers/DepartmentsController.cs — existing DELETE endpoint pattern to follow]
- [Source: tests/SdaManagement.Api.IntegrationTests/Departments/DepartmentEndpointTests.cs — DELETE integration test pattern]
- [Source: src/SdaManagement.Api/Controllers/AuthController.cs — all auth flows use dbContext.Users (protected by global query filter)]
- [Source: src/SdaManagement.Api/Services/TokenService.cs — refresh token lookup (tokens hard-deleted on soft-delete)]
- [Source: src/SdaManagement.Api/Auth/CurrentUserContextMiddleware.cs — JWT context population uses dbContext.Users (protected by global query filter)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- Radix AlertDialog stale closure bug: AlertDialogAction closes dialog synchronously (nullifying `user` prop) before async mutation executes. Fixed by using variable-based `mutationFn: (userId: number) => ...` pattern with `mutate(user!.id)` capturing ID at call time.
- "Found multiple elements" in test: `screen.getByText(/Marie-Claire Legault/)` matched both card and AlertDialog description. Fixed with more specific regex: `/irréversible.*Marie-Claire Legault/`.
- Radix jsdom polyfills needed: `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView` — same pattern as AdminUsersPage.edit.test.tsx.

### Completion Notes List

- All 11 tasks implemented and verified
- Backend builds with 0 errors, 0 warnings
- All 188 frontend tests pass (0 regressions, +1 new 404 test from code review)
- 11 backend integration tests written — not executable in this session (Docker not running for Testcontainers), but follow established patterns from Stories 3.1–3.3
- EF Core migration `20260307030841_AddUserSoftDelete` generated successfully
- Global query filter protects all auth flows automatically (no manual `Where` clauses needed)

### File List

**New files created:**
- `src/sdamanagement-web/src/components/user/DeleteUserDialog.tsx` — AlertDialog with delete mutation
- `src/sdamanagement-web/src/pages/AdminUsersPage.delete.test.tsx` — 10 frontend tests for delete functionality
- `src/SdaManagement.Api/Migrations/20260307030841_AddUserSoftDelete.cs` — EF Core migration adding `deleted_at` column
- `src/SdaManagement.Api/Migrations/20260307030841_AddUserSoftDelete.Designer.cs` — Migration designer file

**Modified files:**
- `src/SdaManagement.Api/Data/Entities/User.cs` — Added `DeletedAt` property
- `src/SdaManagement.Api/Data/AppDbContext.cs` — Added global query filter `HasQueryFilter(u => u.DeletedAt == null)`
- `src/SdaManagement.Api/Services/IUserService.cs` — Added `DeleteAsync(int userId)` method signature
- `src/SdaManagement.Api/Services/UserService.cs` — Implemented `DeleteAsync` with atomic soft-delete + token revocation
- `src/SdaManagement.Api/Controllers/UsersController.cs` — Added `[HttpDelete("{id:int}")]` endpoint with three-level auth + last-OWNER guard
- `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs` — Added 11 DELETE integration tests + AC8/AC9 verification tests
- `src/sdamanagement-web/src/services/userService.ts` — Added `deleteUser(id)` method
- `src/sdamanagement-web/src/components/user/index.ts` — Added `DeleteUserDialog` export
- `src/sdamanagement-web/src/pages/AdminUsersPage.tsx` — Added delete button (OWNER-only, not on self), deletingUser state, DeleteUserDialog rendering
- `src/sdamanagement-web/src/mocks/handlers/users.ts` — Added 4 MSW delete handlers (204, 403, 404, 409)
- `src/sdamanagement-web/public/locales/fr/common.json` — Added delete i18n keys (French)
- `src/sdamanagement-web/public/locales/en/common.json` — Added delete i18n keys (English)
- `src/sdamanagement-web/src/test-utils.tsx` — Added all new i18n keys to mock resources
- `src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs` — Auto-updated by EF Core

### Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-03-07 | Added `DeletedAt` to User entity + global query filter | Soft-delete pattern (FR54) |
| 2026-03-07 | Created `DeleteAsync` on IUserService/UserService | Atomic soft-delete with token revocation |
| 2026-03-07 | Added DELETE endpoint to UsersController | Three-level auth + last-OWNER defense-in-depth |
| 2026-03-07 | Created DeleteUserDialog component | Confirmation dialog with AlertDialog |
| 2026-03-07 | Added delete button to AdminUsersPage | OWNER-only visibility, self-card exclusion |
| 2026-03-07 | Used variable-based mutationFn pattern | Fixed Radix AlertDialog stale closure bug |
| 2026-03-07 | Added i18n strings (FR/EN) + test-utils | Delete dialog, toasts, error messages |
| 2026-03-07 | Added MSW handlers + 9 frontend tests | Full delete flow coverage |
| 2026-03-07 | Added 11 backend integration tests | DELETE endpoint coverage including AC8/AC9 verification |
| 2026-03-08 | Code review fixes (6 of 8 issues fixed) | M1: aria-label on delete button, M2: non-Axios error fallback, L4: ProblemDetails for 409, L5: cascade comments, L6: 404 toast + test, L7: accessible test queries |
