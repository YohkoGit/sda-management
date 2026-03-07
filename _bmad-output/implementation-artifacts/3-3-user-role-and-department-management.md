# Story 3.3: User Role & Department Management

Status: done

## Prerequisites

- **Local dev environment**: Node 20+, .NET 10 SDK, Docker (Testcontainers), PostgreSQL 17 via Docker
- **Story 3.2 complete**: Bulk user creation, UsersController with GET/POST/POST-bulk endpoints, UserService, cursor pagination, department-scoped authorization all working
- **Database seeded**: OWNER account exists via EF Core seed migration
- **Departments exist**: At least one department created (Story 2.2)
- **Existing user infrastructure**: `UsersController` (GET list, GET by id, POST create, POST bulk), `IUserService`/`UserService`, `CreateUserRequest`/`CreateUserRequestValidator`, `UserResponse`/`UserListItem`/`UserDepartmentBadge`, `DepartmentMultiSelect` component, `UserFormDialog` (create-only), `AdminUsersPage` with infinite scroll, all i18n keys from Stories 3.1–3.2

## Story

As an **ADMIN**,
I want to promote VIEWERs to ADMIN, reassign users to different departments, and manage user roles,
so that I can handle officer changes and nominating committee term transitions.

## Acceptance Criteria

### AC1 — Edit User Access
- **Given** an ADMIN or OWNER on the user list page (AdminUsersPage)
- **When** they click "Modifier" on a user card
- **Then** an edit dialog appears pre-populated with the user's current firstName, lastName, role, and department assignments
- **And** the email field is displayed as read-only (immutable after creation)
- **And** VIEWERs do not see the edit button

### AC2 — Role Change (Promotion/Demotion)
- **Given** an ADMIN editing a VIEWER user in their department
- **When** they change the role to ADMIN and assign departments
- **Then** the user's role is updated to ADMIN (FR51)
- **And** their next sign-in reflects the new role and department access
- **Given** an ADMIN editing another ADMIN in their department
- **When** they change the role to VIEWER
- **Then** the demotion is allowed — ADMINs can manage users in their departments

### AC3 — Department Reassignment (Term Transitions)
- **Given** a user assigned to departments JA and MIFEM
- **When** an ADMIN (or OWNER) reassigns them to only MF
- **Then** the old department assignments (JA, MIFEM) are fully replaced with the new ones (MF) (FR52)
- **And** the user's access scope updates accordingly
- **And** the user list refreshes to show updated department badges

### AC4 — Department-Scoped Authorization (Edit)
- **Given** an ADMIN scoped to department JA
- **When** they try to edit a user only assigned to MIFEM (outside their scope)
- **Then** the API returns 403 — no cross-department user management for ADMINs
- **Given** an ADMIN scoped to department JA
- **When** they edit a user and try to assign department MIFEM (outside their scope)
- **Then** the API returns 403 for the entire request
- **And** ADMINs only see their managed departments in the department picker

### AC5 — Role Restrictions & Self-Edit Guard
- **Given** an ADMIN editing any user
- **When** they attempt to assign the OWNER role
- **Then** the API returns 403 — ADMINs cannot promote to OWNER
- **And** the role dropdown does not show OWNER as an option for ADMINs
- **Given** any authenticated user (ADMIN or OWNER)
- **When** they attempt to change their own role via PUT /api/users/{ownId}
- **Then** the API returns 403 — self-role-change is prevented for all roles
- **And** the role dropdown is disabled with helper text: "Votre role ne peut etre modifie que par un autre administrateur"

### AC6 — OWNER Full Access (Edit)
- **Given** an OWNER editing any user
- **When** they change role and/or departments
- **Then** the changes are saved regardless of department scoping (FR55)
- **And** OWNERs can assign any role (VIEWER, ADMIN, OWNER) and any department

### AC7 — Backend API Endpoint
- `PUT /api/users/{id}` — update user role and department assignments (ADMIN+ only)
- Request body: `{ firstName, lastName, role, departmentIds }` (no email — immutable)
- Success: 200 with updated `UserResponse`
- Validation error: 400 with ProblemDetails
- Not found: 404 if user ID does not exist
- Authorization: 403 if ADMIN tries OWNER role, out-of-scope departments, cross-department edit, or self-role-change
- Anonymous: 401
- VIEWERs: 403

### AC8 — Successful Update Feedback
- **Given** a successful user edit
- **When** the API returns 200
- **Then** a "Utilisateur mis a jour" toast confirms the action
- **And** the user list refreshes (invalidate `["users"]` query) to show updated data
- **And** the dialog closes on success

## Tasks / Subtasks

### Backend

- [x] **Task 1: UpdateUserRequest DTO** (AC: #1, #7)
  - [x] Create `src/SdaManagement.Api/Dtos/User/UpdateUserRequest.cs`
  - [x] Shape: `record UpdateUserRequest { string FirstName, string LastName, string Role, List<int> DepartmentIds }`
  - [x] No email field — email is immutable after creation

- [x] **Task 2: UpdateUserRequestValidator** (AC: #7)
  - [x] Create `src/SdaManagement.Api/Validators/UpdateUserRequestValidator.cs`
  - [x] Rules: same as CreateUserRequestValidator minus email — FirstName (NotEmpty, MaxLength(100), NoControlChars), LastName (NotEmpty, MaxLength(100), NoControlChars), Role (must be "Viewer"/"Admin"/"Owner"), DepartmentIds (NotNull, Count > 0, each > 0)
  - [x] Reuse `MustNotContainControlCharacters` custom rule from existing validator

- [x] **Task 3: IUserService.UpdateAsync** (AC: #2, #3, #7)
  - [x] Add to `src/SdaManagement.Api/Services/IUserService.cs`:
    - `Task<UserResponse?> UpdateAsync(int userId, UpdateUserRequest request)`
  - [x] Returns null if user not found (controller maps to 404)

- [x] **Task 4: UserService.UpdateAsync implementation** (AC: #2, #3, #7)
  - [x] Implement in `UserService.cs`:
    - Load user with `.Include(u => u.UserDepartments)` by ID
    - Return null if not found
    - Sanitize firstName, lastName (reuse same sanitization pattern)
    - Update `user.FirstName`, `user.LastName`, `user.Role` (parse enum)
    - Replace departments: remove all existing `UserDepartments`, add new ones from `request.DepartmentIds`
    - Single `SaveChangesAsync()` at end
    - Reload with departments for response projection
    - Return `UserResponse` with updated data

- [x] **Task 5: UsersController.Update endpoint** (AC: #4, #5, #6, #7)
  - [x] Add `[HttpPut("{id:int}")]` to existing `UsersController.cs`
  - [x] Authorization (four-level for update):
    1. Authenticate — 401 if anonymous
    2. Role >= Admin — 403 if Viewer
    3. Self-role-change guard — if `id == currentUser.UserId` and role is different from current, return 403
    4. ADMIN restrictions:
       - Load target user to get their current departments
       - Target user must share at least one department with current ADMIN (visibility check) — 403 if no overlap
       - Cannot assign OWNER role — 403
       - All new departmentIds must be in current ADMIN's scope — 403 if any out-of-scope
  - [x] Inject `[FromServices] IValidator<UpdateUserRequest>`
  - [x] Call `userService.UpdateAsync(id, request)`
  - [x] If null return NotFound
  - [x] Return `Ok(result)`

- [x] **Task 6: Backend unit tests** (AC: #7)
  - [x] Create `tests/SdaManagement.Api.UnitTests/Validators/UpdateUserRequestValidatorTests.cs`
  - [x] Cases: valid request passes; empty firstName fails; empty lastName fails; invalid role fails; empty departmentIds fails; departmentId <= 0 fails; firstName > 100 chars fails; lastName > 100 chars fails

- [x] **Task 7: Backend integration tests** (AC: #2, #3, #4, #5, #6, #7)
  - [x] Add to `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs`
  - [x] Tests:
    - PUT /api/users/{id} as OWNER changes role and departments returns 200
    - PUT /api/users/{id} as ADMIN changes user in own department returns 200
    - PUT /api/users/{id} as ADMIN promotes VIEWER to ADMIN returns 200
    - PUT /api/users/{id} as ADMIN demotes ADMIN to VIEWER returns 200
    - PUT /api/users/{id} as ADMIN with OWNER role returns 403
    - PUT /api/users/{id} as ADMIN editing user outside their departments returns 403
    - PUT /api/users/{id} as ADMIN assigning out-of-scope department returns 403
    - PUT /api/users/{id} as ADMIN changing own role returns 403
    - PUT /api/users/{id} as VIEWER returns 403
    - PUT /api/users/{id} as Anonymous returns 401
    - PUT /api/users/{id} with invalid data returns 400
    - PUT /api/users/{id} with non-existent user ID returns 404
    - PUT /api/users/{id} department replacement is atomic (old removed, new added)
    - PUT /api/users/{id} as OWNER can assign OWNER role returns 200
    - PUT /api/users/{id} as OWNER changing own role returns 403 (self-role-change)
    - PUT /api/users/{id} as ADMIN editing user in shared department (user in JA+MIFEM, admin in JA) returns 200

### Frontend

- [x] **Task 8: Update user Zod schema** (AC: #1, #7)
  - [x] Add to `src/sdamanagement-web/src/schemas/userSchema.ts`:
    - `export const updateUserSchema = createUserSchema.omit({ email: true });` — DRY, inherits all French validation messages
  - [x] Export: `export type UpdateUserFormData = z.infer<typeof updateUserSchema>;`

- [x] **Task 9: User service update method** (AC: #7, #8)
  - [x] Add to `src/sdamanagement-web/src/services/userService.ts`:
    - `updateUser(id: number, data: UpdateUserFormData)` calls `PUT /api/users/${id}`
  - [x] Response type: `UserResponse`

- [x] **Task 10: UserFormDialog — add edit mode** (AC: #1, #2, #3, #4, #5, #6, #8)
  - [x] Modify `src/sdamanagement-web/src/components/user/UserFormDialog.tsx`
  - [x] Accept optional `editUser?: UserResponse` prop — if provided, dialog is in edit mode. CRITICAL: do NOT name this prop `user` — it collides with `const { user: authUser } = useAuth()` already in the component.
  - [x] Determine mode: `const isEditMode = !!editUser`
  - [x] **Edit mode behavior:**
    - Dialog title: "Modifier l'utilisateur" (vs "Ajouter un utilisateur")
    - Pre-populate form with `editUser.firstName`, `editUser.lastName`, `editUser.role`, `editUser.departments.map(d => d.id)`
    - Use `reset()` in useEffect when `editUser` prop changes or dialog opens
    - Email displayed as read-only `<Input disabled>` with `editUser.email`
    - Use `updateUserSchema` + `zodResolver` (not createUserSchema)
    - Submit calls `userService.updateUser(editUser.id, data)` instead of `createUser`
    - Success toast: "Utilisateur mis a jour" (not "cree")
  - [x] **Create mode**: unchanged behavior (when `editUser` prop is undefined)
  - [x] Role dropdown: same filtering — ADMIN sees Viewer/Admin, OWNER sees Viewer/Admin/Owner
  - [x] Department picker: same filtering — ADMIN sees only managed departments
  - [x] Self-role-change: if editing yourself (`editUser.id === authUser.userId`), disable role dropdown with helper text below: "Votre role ne peut etre modifie que par un autre administrateur" / "Your role can only be changed by another administrator". CRITICAL: `AuthUser` uses `userId` (not `id`) — verify via `const { user: authUser } = useAuth()`
  - [x] Role-change info text: when changing a user from ADMIN→VIEWER, show inline informational text below role dropdown: "Cet utilisateur perdra ses privileges d'administration" / "This user will lose admin privileges" (not a blocking confirmation — role change is reversible)
  - [x] Server error handling: 403 → toast error, 400 → inline errors, 404 → toast "user not found"

- [x] **Task 11: AdminUsersPage — add edit button** (AC: #1)
  - [x] Modify `src/sdamanagement-web/src/pages/AdminUsersPage.tsx`
  - [x] Add "Modifier" button (ghost variant) on each user card — visible to ADMIN+ only
  - [x] Track `editingUser` state: `useState<UserResponse | null>(null)`
  - [x] Wire edit button: set `editingUser` from the list item data directly (UserListItem contains all fields needed for the edit form: firstName, lastName, role, departments[].id). No extra API call needed — the list data is sufficient. If fresh data is critical, optionally fetch by ID first.
  - [x] Pass `editingUser` as `editUser` prop to `UserFormDialog`
  - [x] On dialog close: reset `editingUser` to null

- [x] **Task 12: i18n strings** (AC: #1, #8)
  - [x] Add to `public/locales/fr/common.json` and `en/common.json`:
    - `pages.adminUsers.editButton`: "Modifier" / "Edit"
    - `pages.adminUsers.editForm.title`: "Modifier l'utilisateur" / "Edit User"
    - `pages.adminUsers.editForm.emailReadonly`: "Le courriel ne peut pas etre modifie" / "Email cannot be changed"
    - `pages.adminUsers.toast.updated`: "Utilisateur mis a jour" / "User updated"
    - `pages.adminUsers.toast.error.notFound`: "Utilisateur introuvable" / "User not found"
    - `pages.adminUsers.toast.error.selfRoleChange`: "Vous ne pouvez pas modifier votre propre role" / "You cannot change your own role"
    - `pages.adminUsers.editForm.selfRoleDisabled`: "Votre role ne peut etre modifie que par un autre administrateur" / "Your role can only be changed by another administrator"
    - `pages.adminUsers.editForm.roleDowngradeWarning`: "Cet utilisateur perdra ses privileges d'administration" / "This user will lose admin privileges"
  - [x] Add all new keys to `src/sdamanagement-web/src/test-utils.tsx` mock resources

- [x] **Task 13: MSW mock handlers for update** (AC: #7)
  - [x] Add to `src/sdamanagement-web/src/mocks/handlers/users.ts`:
    - `GET /api/users/:id` default: returns 200 with UserResponse (needed if edit flow fetches by ID — verify if handler already exists)
    - `PUT /api/users/:id` default: returns 200 with updated UserResponse
    - Variant: 400 with validation errors
    - Variant: 403 forbidden
    - Variant: 404 not found

- [x] **Task 14: Frontend tests** (AC: #1, #2, #3, #4, #5, #8)
  - [x] Create `src/sdamanagement-web/src/pages/AdminUsersPage.edit.test.tsx`
  - [x] Per-file MSW server: `const server = setupServer(...authHandlers, ...userHandlers, ...departmentHandlers)`
  - [x] Tests:
    - Edit button visible for ADMIN/OWNER, hidden for VIEWER
    - Edit dialog opens with pre-populated user data
    - Email field is displayed but disabled (read-only)
    - Role dropdown filters options based on current user role
    - Successful edit shows "updated" toast and closes dialog
    - Validation errors display inline on correct fields
    - Edit dialog pre-populates departments correctly (DepartmentMultiSelect shows right chips)
    - 403 error shows forbidden toast
    - 404 error shows "not found" toast

## Dev Notes

### Architecture Patterns (Mandatory)

**Backend — Extend existing UsersController with PUT endpoint:**

- **New endpoint**: `[HttpPut("{id:int}")]` in existing `UsersController.cs`. Do NOT create a new controller.
- **Authorization (four-level for update)**:
  1. Authenticate: `if (!auth.IsAuthenticated()) return Unauthorized()`
  2. Role: `if (currentUser.Role < UserRole.Admin) return Forbid()`
  3. Self-role-change guard (ALL roles): `if (id == currentUser.UserId && !request.Role.Equals(currentUser.Role.ToString(), OrdinalIgnoreCase)) return Forbid()` — prevents ADMIN self-demotion AND OWNER self-demotion (which could lock out the system)
  4. ADMIN restrictions (skip for OWNER):
     - Load target user's current departments from DB
     - Check overlap: `targetUser.DepartmentIds.Any(d => currentUser.DepartmentIds.Contains(d))` — 403 if no overlap
     - Check role: `request.Role == "Owner"` → 403
     - Check new departments: `request.DepartmentIds.Any(d => !currentUser.DepartmentIds.Contains(d))` → 403
- **Return**: `Ok(result)` with 200 (not 201 — this is an update)

**Service — UserService.UpdateAsync (department replacement pattern):**

```csharp
public async Task<UserResponse?> UpdateAsync(int userId, UpdateUserRequest request)
{
    var user = await db.Users
        .Include(u => u.UserDepartments)
        .FirstOrDefaultAsync(u => u.Id == userId);

    if (user is null) return null;

    user.FirstName = sanitizer.Sanitize(request.FirstName);
    user.LastName = sanitizer.Sanitize(request.LastName);
    user.Role = Enum.Parse<UserRole>(request.Role, ignoreCase: true);
    user.UpdatedAt = DateTime.UtcNow;

    // Replace departments: clear existing, add new
    db.Set<UserDepartment>().RemoveRange(user.UserDepartments);
    foreach (var deptId in request.DepartmentIds)
    {
        db.Set<UserDepartment>().Add(new UserDepartment
        {
            UserId = userId,
            DepartmentId = deptId,
        });
    }

    await db.SaveChangesAsync();

    // Reload with department details for response
    var updated = await db.Users
        .Include(u => u.UserDepartments)
        .ThenInclude(ud => ud.Department)
        .FirstAsync(u => u.Id == userId);

    return MapToResponse(updated);
}
```

Key: `db.Set<UserDepartment>()` — no DbSet property on AppDbContext for junction table (established in Story 3.1). Use `RemoveRange` + `Add` pattern for full department replacement. Single `SaveChangesAsync()` — atomic.

**Frontend — Extend UserFormDialog for dual-mode (create/edit):**

CRITICAL naming: prop is `editUser` (not `user`) to avoid collision with `const { user: authUser } = useAuth()`.

**Form type strategy:** Use `CreateUserFormData` as the form type in both modes (superset — includes email). In edit mode, email field is disabled and excluded from submission. This avoids TypeScript union type gymnastics.

```tsx
// Props
interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editUser?: UserResponse | UserListItem; // NEW — if provided, edit mode
}

// Inside component
const isEditMode = !!editUser;
const { user: authUser } = useAuth();
const isSelfEdit = isEditMode && editUser.id === authUser?.userId;

const form = useForm<CreateUserFormData>({
    resolver: zodResolver(isEditMode ? updateUserSchema as any : createUserSchema),
    defaultValues: { firstName: "", lastName: "", email: "", role: "Viewer", departmentIds: [] },
});
const { reset, handleSubmit, setError, formState: { errors, isDirty } } = form;

// Reset form when editUser prop or open state changes
useEffect(() => {
    if (open && editUser) {
        reset({
            firstName: editUser.firstName,
            lastName: editUser.lastName,
            email: "", // not validated in edit mode, just for form state
            role: editUser.role,
            departmentIds: editUser.departments.map(d => d.id),
        });
    } else if (open && !editUser) {
        reset({ firstName: "", lastName: "", email: "", role: "Viewer", departmentIds: [] });
    }
}, [open, editUser, reset]);

// Separate mutations
const createMutation = useMutation({ mutationFn: userService.createUser, ... });
const updateMutation = useMutation({
    mutationFn: (data: UpdateUserFormData) => userService.updateUser(editUser!.id, data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["users"] });
        toast.success(t("pages.adminUsers.toast.updated"));
        handleClose();
    },
    onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 403)
            toast.error(t("pages.adminUsers.toast.error.forbidden"));
        if (isAxiosError(error) && error.response?.status === 404)
            toast.error(t("pages.adminUsers.toast.error.notFound"));
    },
});

// Submit handler — exclude email in edit mode
const onSubmit = handleSubmit((data) => {
    if (isEditMode) {
        const { email, ...updateData } = data;
        updateMutation.mutate(updateData);
    } else {
        createMutation.mutate(data);
    }
});

// Submit button — disable when no changes in edit mode
<Button disabled={mutation.isPending || (isEditMode && !isDirty)}>
```

- Email field: in edit mode, render as `<Input disabled value={editUser.email} />` with helper text. Not part of the submitted data.
- Role dropdown: disabled when `isSelfEdit` is true, with helper text.

### Previous Story Learnings (from Stories 3.1–3.2)

- **Controller pattern**: primary constructor with `SdacAuth.IAuthorizationService auth`. Return-based auth. Three-level auth check extends to four-level for update (add self-role-change guard).
- **Service pattern**: primary constructor with `(AppDbContext db, ISanitizationService sanitizer)`. Single `SaveChangesAsync()` at end. Return null for not-found (controller maps to 404).
- **Validator reuse**: `MustNotContainControlCharacters` custom rule already exists — reuse in UpdateUserRequestValidator. Do NOT duplicate the extension method.
- **`db.Set<UserDepartment>()`**: No DbSet property on AppDbContext. Use `db.Set<UserDepartment>()` for all junction table operations.
- **Test helpers**: `CreateTestUser()`, `AssignDepartmentToUser()` already on `IntegrationTestBase`. Use them for seed data.
- **Frontend test pattern**: add ALL new i18n keys to `test-utils.tsx` BEFORE writing tests. Per-file `setupServer()`.
- **MSW handlers**: default + variant handlers. Each test file owns its server.
- **Form reset**: useEffect on dialog `open` state to reset form. CRITICAL for edit mode — must reset with editUser data when dialog opens.
- **AuthUser.userId vs UserResponse.id**: The auth context user has `userId` property, NOT `id`. All self-identity checks must use `authUser.userId === editUser.id`. Getting this wrong means self-role-change guard silently fails.
- **Error mapping**: 403 → toast error. 400 → inline validation errors via ProblemDetails. 404 → toast "not found".
- **Rate limiting**: `[EnableRateLimiting("auth")]` already on controller class — applies to PUT endpoint automatically.
- **DepartmentMultiSelect**: Already extracted as shared component in Story 3.2 — reuse as-is in edit mode.
- **Debug fixes from 3.1–3.2**: `db.Set<UserDepartment>()`, email max length 255 in Zod, PascalCase→camelCase server error key mapping.

### Reuse Existing Code (Do NOT Reinvent)

- **UserFormDialog**: Extend with edit mode via `editUser` prop. Do NOT create a separate EditUserFormDialog. Single component, dual mode. CRITICAL: prop is `editUser` (not `user`) to avoid shadowing `useAuth().user`.
- **DepartmentMultiSelect**: Reuse as-is from `src/sdamanagement-web/src/components/user/DepartmentMultiSelect.tsx`. Same props, same filtering.
- **Auth context / role checks**: Same `useAuth()` patterns. Same `isAdminOrOwner` derivation.
- **UserResponse type**: Reuse existing type — the PUT response is the same shape as GET response.
- **Sanitization**: Same `sanitizer.Sanitize()` applied per field in service.
- **Toast / i18n**: Same `toast.success(t(...))` pattern.
- **MustNotContainControlCharacters**: Reuse FluentValidation extension from existing validators. Do NOT duplicate.
- **IntegrationTestBase helpers**: `CreateTestUser(role, departmentIds)`, `AssignDepartmentToUser()`, `OwnerClient`, `AdminClient`, `ViewerClient`, `AnonymousClient`.

### Project Structure Notes

**New files to create:**

Backend:
- `src/SdaManagement.Api/Dtos/User/UpdateUserRequest.cs`
- `src/SdaManagement.Api/Validators/UpdateUserRequestValidator.cs`
- `tests/SdaManagement.Api.UnitTests/Validators/UpdateUserRequestValidatorTests.cs`

Frontend:
- `src/sdamanagement-web/src/pages/AdminUsersPage.edit.test.tsx`

**Files to modify:**

Backend:
- `src/SdaManagement.Api/Services/IUserService.cs` — add `UpdateAsync` method
- `src/SdaManagement.Api/Services/UserService.cs` — implement `UpdateAsync`
- `src/SdaManagement.Api/Controllers/UsersController.cs` — add `[HttpPut("{id:int}")]` endpoint
- `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs` — add PUT endpoint tests

Frontend:
- `src/sdamanagement-web/src/schemas/userSchema.ts` — add `updateUserSchema`
- `src/sdamanagement-web/src/services/userService.ts` — add `updateUser` method
- `src/sdamanagement-web/src/components/user/UserFormDialog.tsx` — add edit mode (dual-mode create/edit)
- `src/sdamanagement-web/src/pages/AdminUsersPage.tsx` — add edit button + editingUser state
- `src/sdamanagement-web/src/mocks/handlers/users.ts` — add PUT endpoint handlers
- `src/sdamanagement-web/public/locales/fr/common.json` — add edit i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — add edit i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — add new i18n mock keys

**No database migrations needed.** Same `users` and `user_departments` tables from Epic 1.

### Design Tokens Reference

- Edit button on user card: shadcn Button `variant="ghost"` with pencil icon, `text-slate-400 hover:text-indigo-600`
- Edit dialog: same Dialog/Sheet responsive pattern as UserFormDialog (create mode)
- Read-only email field: `<Input disabled>` with `bg-slate-50 text-slate-500 cursor-not-allowed` styling
- Email helper text: `text-xs text-muted-foreground` below the disabled field
- Self-role-change disabled: role `<Select disabled>` with `bg-slate-50 cursor-not-allowed` + helper text below in `text-xs text-muted-foreground`
- Role downgrade warning: `text-xs text-amber-600` inline below role dropdown when changing ADMIN→VIEWER (informational, not blocking)
- Success toast: green accent, 3 seconds auto-dismiss
- Error toast: red accent, persistent until dismissed

### Technology Notes (from Context7)

**React Hook Form 7.x — Edit Mode with Reset:**
- Use `reset(values)` in useEffect when dialog opens with user data — pre-populates all fields
- Alternative: use `values` prop on `useForm()` for reactive updates from external state
- `reset()` with no args resets to `defaultValues` (for create mode)
- `keepDirtyValues: true` option available if partial reset needed (not needed here)
- `isDirty` formState tracks if user has changed any field — use this in edit mode to disable submit when no changes made (prevents unnecessary PUT calls)

**FluentValidation 12.x — UpdateUserRequestValidator:**
- Same pattern as CreateUserRequestValidator minus email rules
- Reuse `MustNotContainControlCharacters` extension — it's already registered
- `When` conditions available for conditional rules but not needed here (all fields required)

**EF Core — Department Replacement Pattern:**
- `RemoveRange(user.UserDepartments)` marks all existing junction records for deletion
- `Add(new UserDepartment { ... })` adds new junction records
- Single `SaveChangesAsync()` — both delete + insert execute in one transaction
- Must `.Include(u => u.UserDepartments)` before removing to load the collection into tracking
- After save, re-query with `.ThenInclude(ud => ud.Department)` for response projection

### Git Intelligence

Commit convention: `feat(users): Story 3.3 — User role & department management`

Recent patterns from Stories 3.1–3.2:
- Backend files in `src/SdaManagement.Api/Controllers/`, `Services/`, `Dtos/User/`, `Validators/`
- Frontend files in `src/sdamanagement-web/src/components/user/`, `pages/`, `schemas/`, `services/`
- Integration tests in `tests/SdaManagement.Api.IntegrationTests/Users/`
- Unit tests in `tests/SdaManagement.Api.UnitTests/Validators/`
- Separate test files per feature: `AdminUsersPage.test.tsx`, `AdminUsersPage.bulk.test.tsx`, `AdminUsersPage.edit.test.tsx`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.3 — AC and user story]
- [Source: _bmad-output/planning-artifacts/prd.md#FR51 — ADMINs promote VIEWER to ADMIN with department assignments]
- [Source: _bmad-output/planning-artifacts/prd.md#FR52 — ADMINs reassign departments for term transitions]
- [Source: _bmad-output/planning-artifacts/prd.md#FR55 — OWNERs edit any user's role and departments]
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 5 — nominating committee term transitions as routine operation]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries — UsersController for user CRUD]
- [Source: _bmad-output/planning-artifacts/architecture.md#HTTP Status Codes — 200 OK for successful PUT]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Method Conventions — Update methods return updated DTO]
- [Source: _bmad-output/planning-artifacts/architecture.md#DTO Naming — UpdateUserRequest pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authorization — return-based pattern, department-scoped]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries — User owns UserDepartment (aggregate root)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy — ghost variant for "Modifier"]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns — validate on blur, inline errors]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Destructive vs Reversible — role reassignment is reversible, no confirmation needed]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Toast Patterns — success green 3s, error red persistent]
- [Source: _bmad-output/implementation-artifacts/3-2-bulk-user-creation.md — all patterns, learnings, debug fixes]
- [Source: _bmad-output/implementation-artifacts/3-1-single-user-account-creation.md — controller/service/validator patterns]
- [Source: src/SdaManagement.Api/Controllers/UsersController.cs — existing controller to extend]
- [Source: src/SdaManagement.Api/Services/UserService.cs — CreateAsync pattern to adapt for UpdateAsync]
- [Source: src/SdaManagement.Api/Services/IUserService.cs — interface to extend]
- [Source: src/SdaManagement.Api/Auth/IAuthorizationService.cs — CanManage, IsOwner methods]
- [Source: src/SdaManagement.Api/Auth/ICurrentUserContext.cs — UserId, Role, DepartmentIds]
- [Source: src/SdaManagement.Api/Data/Entities/User.cs — entity with UserDepartments collection]
- [Source: src/SdaManagement.Api/Data/Entities/UserDepartment.cs — junction entity]
- [Source: src/sdamanagement-web/src/components/user/UserFormDialog.tsx — form dialog to extend with edit mode]
- [Source: src/sdamanagement-web/src/components/user/DepartmentMultiSelect.tsx — reusable department picker]
- [Source: src/sdamanagement-web/src/schemas/userSchema.ts — createUserSchema to derive updateUserSchema from]
- [Source: src/sdamanagement-web/src/services/userService.ts — service to extend with updateUser]
- [Source: src/sdamanagement-web/src/pages/AdminUsersPage.tsx — page to add edit functionality]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed TS error: `editUser.role` (string) cast to `CreateUserFormData["role"]` for form reset compatibility
- Injected `AppDbContext` into `UsersController` primary constructor for ADMIN department visibility check on PUT endpoint

### Completion Notes List

- Backend: PUT /api/users/{id} endpoint with four-level authorization (authenticate, role check, self-role-change guard, ADMIN department scoping)
- Service: UserService.UpdateAsync with atomic department replacement (RemoveRange + Add pattern)
- Validator: UpdateUserRequestValidator reusing MustNotContainControlCharacters extension
- Frontend: UserFormDialog extended with dual-mode (create/edit) via `editUser` prop
- Frontend: AdminUsersPage edit button (ghost variant, Pencil icon) visible for ADMIN+ only
- i18n: All edit-related keys added to fr/en locales and test-utils mock resources
- Self-role-change guard prevents ALL roles (including OWNER) from modifying their own role
- Role downgrade warning (ADMIN->VIEWER) shown as informational text, not blocking

### Change Log

- 2026-03-06: Story 3.3 implemented — User role & department management (all 14 tasks complete)
- 2026-03-06: Code review fixes (9 findings) — auth ordering, guest guard, submit button text, dead i18n key, missing/weak tests

### File List

**New files:**
- src/SdaManagement.Api/Dtos/User/UpdateUserRequest.cs
- src/SdaManagement.Api/Validators/UpdateUserRequestValidator.cs
- tests/SdaManagement.Api.UnitTests/Validators/UpdateUserRequestValidatorTests.cs
- src/sdamanagement-web/src/pages/AdminUsersPage.edit.test.tsx

**Modified files:**
- src/SdaManagement.Api/Services/IUserService.cs
- src/SdaManagement.Api/Services/UserService.cs
- src/SdaManagement.Api/Controllers/UsersController.cs
- tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs
- src/sdamanagement-web/src/schemas/userSchema.ts
- src/sdamanagement-web/src/services/userService.ts
- src/sdamanagement-web/src/components/user/UserFormDialog.tsx
- src/sdamanagement-web/src/pages/AdminUsersPage.tsx
- src/sdamanagement-web/src/mocks/handlers/users.ts
- src/sdamanagement-web/public/locales/fr/common.json
- src/sdamanagement-web/public/locales/en/common.json
- src/sdamanagement-web/src/test-utils.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
