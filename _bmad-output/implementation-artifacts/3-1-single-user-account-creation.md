# Story 3.1: Single User Account Creation

Status: done

## Prerequisites

- **Local dev environment**: Node 20+, .NET 10 SDK, Docker (Testcontainers), PostgreSQL 17 via Docker
- **Epic 2 complete**: All Stories 2.1-2.6 merged and working
- **Database seeded**: OWNER account exists via EF Core seed migration
- **Departments exist**: At least one department created (Story 2.2) for department assignment testing

## Story

As an **ADMIN**,
I want to create a new user account with name, email, role, and department assignments,
so that officers can sign in and access the system with appropriate permissions.

## Acceptance Criteria

### AC1 — User List Display
- **Given** a VIEWER, ADMIN, or OWNER navigating to Admin > Members
- **When** the page loads
- **Then** users are displayed with name, email, role badge, department badges, and initials avatar
- **And** cursor-based pagination is used ("Load more" pattern, not page numbers)
- **And** VIEWERs see all users (read-only, no create button)
- **And** ADMINs see only users in departments they manage
- **And** OWNERs see all users
- **And** guest users (isGuest = true) are excluded from the list

### AC2 — Single User Creation Form
- **Given** an ADMIN or OWNER on the user list page
- **When** they click "Ajouter un utilisateur"
- **Then** a creation dialog appears with fields: first name, last name, email, role (VIEWER/ADMIN dropdown), department assignment(s) (checkbox popover with removable chips)

### AC3 — Successful User Creation
- **Given** a valid user form submission
- **When** the ADMIN saves
- **Then** the user record is created with no password (Google OAuth users don't need one)
- **And** the email is stored as unique (FluentValidation + DB unique index, 409 Conflict if duplicate)
- **And** department assignments are stored in user_departments junction table
- **And** a "Utilisateur cree" toast confirms the action
- **And** the user list refreshes to show the new user

### AC4 — Department-Scoped Authorization
- **Given** an ADMIN scoped to department JA
- **When** they create a user and assign them to department MIFEM (outside their scope)
- **Then** the API returns 403 — ADMINs can only assign departments they manage
- **And** the creation form only shows departments the ADMIN manages in the department picker

### AC5 — OWNER Can Create Any User
- **Given** an OWNER on the user creation form
- **When** they create a user
- **Then** they can assign any role (VIEWER, ADMIN, OWNER) and any department
- **And** the role dropdown includes the OWNER option (only visible to OWNERs)

### AC6 — Email Uniqueness Enforcement
- **Given** a user with email "existing@test.com" already exists
- **When** an ADMIN tries to create a user with the same email
- **Then** the API returns 409 Conflict with ProblemDetails type `urn:sdac:conflict`
- **And** the frontend shows an inline error on the email field

### AC7 — Setup Checklist Integration
- **Given** the setup checklist from Story 2.6
- **When** at least one non-OWNER, non-guest user exists in the database
- **Then** the "Membres" step in the setup checklist shows as complete
- **And** the setup checklist now has 5 steps (church-config, departments, templates, schedules, members)

### AC8 — Backend API Endpoints
- `GET /api/users?cursor={token}&limit=20` — paginated user list (VIEWER+ for read, department-scoped for ADMINs)
- `POST /api/users` — create single user (ADMIN+ only)
- `GET /api/users/{id}` — single user detail (VIEWER+ for read, department-scoped for ADMINs)
- Anonymous users receive 401
- VIEWERs: read-only access to GET endpoints (limited fields: name, email, role); 403 on POST
- ADMINs: full field access, scoped to their departments
- OWNERs: unrestricted access

## Tasks / Subtasks

### Backend

- [x] **Task 1: PagedResponse generic DTO** (AC: #1, #8)
  - [x] Create `src/SdaManagement.Api/Dtos/Common/PagedResponse.cs`
  - [x] Shape: `class PagedResponse<T> { List<T> Items { get; init; } = []; string? NextCursor { get; init; } }`
  - [x] Reusable for all future paginated endpoints

- [x] **Task 2: User DTOs** (AC: #1, #2, #3, #8)
  - [x] Create `src/SdaManagement.Api/Dtos/User/CreateUserRequest.cs`
    - record: `FirstName`, `LastName`, `Email`, `Role` (string: "Viewer"/"Admin"/"Owner"), `DepartmentIds` (List&lt;int&gt;)
  - [x] Create `src/SdaManagement.Api/Dtos/User/UserListItem.cs`
    - class with init: `Id`, `FirstName`, `LastName`, `Email`, `Role` (string), `Departments` (List&lt;UserDepartmentBadge&gt;), `CreatedAt`
  - [x] Create `src/SdaManagement.Api/Dtos/User/UserDepartmentBadge.cs`
    - class with init: `Id`, `Name`, `Abbreviation`, `Color`
  - [x] Create `src/SdaManagement.Api/Dtos/User/UserResponse.cs`
    - class with init: `Id`, `FirstName`, `LastName`, `Email`, `Role`, `IsGuest`, `Departments` (List&lt;UserDepartmentBadge&gt;), `CreatedAt`, `UpdatedAt`

- [x] **Task 3: CreateUserRequestValidator** (AC: #3, #6)
  - [x] Create `src/SdaManagement.Api/Validators/CreateUserRequestValidator.cs`
  - [x]Rules:
    - `FirstName`: NotEmpty, MaximumLength(100), MustNotContainControlCharacters
    - `LastName`: NotEmpty, MaximumLength(100), MustNotContainControlCharacters
    - `Email`: NotEmpty, EmailAddress, MaximumLength(255), MustNotContainControlCharacters
    - `Role`: NotEmpty, Must be one of "Viewer", "Admin", "Owner" (case-insensitive)
    - `DepartmentIds`: NotNull, must have Count > 0, RuleForEach item > 0

- [x] **Task 4: IUserService + UserService** (AC: #1, #3, #4, #5, #6)
  - [x] Create `src/SdaManagement.Api/Services/IUserService.cs`
    - `GetUsersAsync(string? cursor, int limit, IReadOnlyList<int>? departmentFilter)` returns `PagedResponse<UserListItem>`
    - `GetByIdAsync(int id)` returns `UserResponse?`
    - `CreateAsync(CreateUserRequest request)` returns `UserResponse`
  - [x] Create `src/SdaManagement.Api/Services/UserService.cs`
    - Primary constructor: `(AppDbContext db, ISanitizationService sanitizer)`
    - `GetUsersAsync`: cursor-based keyset pagination (see Cursor Pagination section below)
    - `CreateAsync`: sanitize all inputs, parse role enum, create User + UserDepartment entries, SaveChangesAsync
    - `GetByIdAsync`: Include UserDepartments then Departments for badge display
  - [x]Register: `services.AddScoped<IUserService, UserService>()` in `ServiceCollectionExtensions.AddApplicationServices()`

- [x] **Task 5: UsersController** (AC: #1, #3, #4, #5, #6, #8)
  - [x] Create `src/SdaManagement.Api/Controllers/UsersController.cs`
  - [x]Route: `api/users`
  - [x]`[Authorize]`, `[EnableRateLimiting("auth")]`
  - [x]Primary constructor: `(IUserService userService, SdacAuth.IAuthorizationService auth, ICurrentUserContext currentUser)`
  - [x]`[HttpGet]` GetAll:
    - OWNER: `userService.GetUsersAsync(cursor, limit, departmentFilter: null)`
    - ADMIN: `userService.GetUsersAsync(cursor, limit, departmentFilter: currentUser.DepartmentIds)`
    - VIEWER: `userService.GetUsersAsync(cursor, limit, departmentFilter: null)` — read-only, all users visible (needed for Epic 6 roster views)
    - Anonymous: Forbid (401)
    - Query params: `cursor` (string?), `limit` (int, default 20, clamp to 1-100)
  - [x]`[HttpGet("{id}")]` GetById:
    - OWNER: unrestricted
    - ADMIN: verify returned user shares at least one department with caller, else 403
    - VIEWER: read-only access (same fields as list)
    - Anonymous: Forbid (401)
  - [x]`[HttpPost]` Create:
    - Inject `[FromServices] IValidator<CreateUserRequest>`
    - Authorization matrix (see Dev Notes)
    - Catch `PostgresException { SqlState: "23505" }` for 409 Conflict
    - Return `CreatedAtAction(nameof(GetById), new { id }, response)`

- [x] **Task 6: Update SetupProgressService** (AC: #7)
  - [x]In `SetupProgressService.cs`: add "members" step after "schedules"
  - [x]Completion: `await db.Users.AnyAsync(u => !u.IsGuest && u.Role != UserRole.Owner)`
  - [x]Remove the `// TODO(story-3.1)` comment

- [x] **Task 7: Backend unit tests** (AC: #3)
  - [x]`tests/SdaManagement.Api.UnitTests/Validators/CreateUserRequestValidatorTests.cs`
  - [x]Cases: valid passes; empty firstName/lastName/email fails; invalid email fails; invalid role fails; empty DepartmentIds fails; DepartmentId <= 0 fails

- [x] **Task 8: Backend integration tests** (AC: #1, #3, #4, #5, #6, #7, #8)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs`
  - [x]**Add `AssignDepartmentToUser(int userId, int departmentId)` helper to `IntegrationTestBase.cs`** — creates UserDepartment junction record. Reusable across all Epic 3 tests.
  - [x]SeedTestData: create OWNER, ADMIN (with department JA), VIEWER, and department JA + MIFEM
  - [x]Tests:
    - GET /api/users as OWNER returns 200 with all users
    - GET /api/users as ADMIN returns 200 with only JA-scoped users
    - GET /api/users as VIEWER returns 200 (read-only, all non-guest users)
    - GET /api/users as Anonymous returns 401
    - POST /api/users as VIEWER returns 403
    - GET /api/users cursor pagination: seed 25 users, first page 20 + nextCursor, second page 5 + null
    - POST /api/users as OWNER with OWNER role returns 201
    - POST /api/users as ADMIN with VIEWER role in JA returns 201
    - POST /api/users as ADMIN with OWNER role returns 403
    - POST /api/users as ADMIN with MIFEM department returns 403
    - POST /api/users with duplicate email returns 409
    - POST /api/users with invalid body returns 400
    - GET /api/users/{id} returns user detail
    - GET /api/users/{id} as ADMIN for user outside scope returns 403
  - [x]Update `SetupProgressEndpointTests.cs`: add members step assertions

### Frontend

- [x] **Task 9: User service** (AC: #1, #3)
  - [x] Create `src/sdamanagement-web/src/services/userService.ts`
  - [x]Methods:
    - `getUsers(cursor?: string, limit?: number)` calls `GET /api/users`
    - `getUserById(id: number)` calls `GET /api/users/${id}`
    - `createUser(data: CreateUserFormData)` calls `POST /api/users`
  - [x]TypeScript types: `UserListItem`, `UserResponse`, `UserDepartmentBadge`, `PagedResponse<T>`, `CreateUserFormData`

- [x] **Task 10: User Zod schema** (AC: #2, #3)
  - [x] Create `src/sdamanagement-web/src/schemas/userSchema.ts`
  - [x]Fields: `firstName` (min 1, max 100), `lastName` (min 1, max 100), `email` (email), `role` (enum "Viewer"|"Admin"|"Owner"), `departmentIds` (array of numbers, min length 1)
  - [x]Export: `type CreateUserFormData = z.infer<typeof createUserSchema>`

- [x] **Task 11: useUsers hook** (AC: #1)
  - [x] Create `src/sdamanagement-web/src/hooks/useUsers.ts`
  - [x]`useInfiniteQuery` with cursor-based pagination (see Dev Notes)
  - [x]`enabled: isAuthenticated` (VIEWERs included — they have read access)
  - [x]Export: `{ users, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError }`
  - [x]Flatten `data.pages` into single array for component consumption

- [x] **Task 12: UserFormDialog component** (AC: #2, #3, #4, #5, #6)
  - [x] Create `src/sdamanagement-web/src/components/user/UserFormDialog.tsx`
  - [x]**Responsive**: Use `Dialog` on desktop (≥640px), bottom `Sheet` on mobile (<640px) per UX spec. Use a `useMediaQuery("(min-width: 640px)")` hook to switch. Alternatively, create a `ResponsiveDialog` wrapper that renders `Dialog` or `Sheet` based on viewport.
  - [x]React Hook Form + zodResolver
  - [x]Fields: firstName `<Input>`, lastName `<Input>`, email `<Input type="email">`, role `<Select>`, departments checkbox `<Popover>` with chips
  - [x]Department list: fetch via `departmentService.getAll()`, filtered for ADMIN scope
  - [x]Role options: VIEWER/ADMIN for ADMINs, VIEWER/ADMIN/OWNER for OWNERs
  - [x]Submit: call `userService.createUser()`, invalidate `["users"]` query, toast, close
  - [x]Error: 409 → set form error on email field; 403 → toast error
  - [x]**Accessibility**: Focus trap within dialog/sheet, auto-focus first field on open, `Escape` to close, `aria-describedby` on fields with validation errors, `aria-invalid` on errored inputs

- [x] **Task 13: AdminUsersPage** (AC: #1, #2)
  - [x] Create `src/sdamanagement-web/src/pages/AdminUsersPage.tsx`
  - [x]Page title + "Ajouter un utilisateur" button + user list
  - [x]User cards: initials avatar, full name, email, role badge, department badges
  - [x]Load more button at bottom when `hasNextPage`
  - [x]Empty state with encouraging copy and create button
  - [x]Loading: Skeleton cards
  - [x]Access: VIEWER+ (VIEWERs see list read-only without create button; ADMINs/OWNERs get full CRUD controls)

- [x] **Task 14: InitialsAvatar component** (AC: #1)
  - [x] Create `src/sdamanagement-web/src/components/ui/initials-avatar.tsx`
  - [x]Props: `firstName`, `lastName`, `size` ("sm"|"md"|"lg")
  - [x]Circle with first letter of each name, deterministic background color from name hash
  - [x]Extensible for Story 3.5 avatar upload (accept optional `avatarUrl` prop)

- [x] **Task 15: Route and navigation** (AC: #1)
  - [x]Add lazy route `/admin/users` in `App.tsx` pointing to `AdminUsersPage`
  - [x]Add nav item in `AppSidebar.tsx`: `{ to: "/admin/users", labelKey: "nav.auth.adminUsers", icon: Users, minRole: "VIEWER" }`
  - [x]Position: after the admin overview link, before owner-only items (departments, templates, etc.)

- [x] **Task 16: Update SetupChecklist frontend** (AC: #7)
  - [x]In `useSetupProgress.ts`: add `"members": { route: "/admin/users", labelKey: "setup.steps.members" }` to STEP_CONFIG
  - [x]Remove the `// TODO(story-3.1)` comment
  - [x]Add i18n key: `setup.steps.members` in both locales
  - [x]**Update `SetupChecklist.test.tsx`**: Change all hard-coded 4-step assertions to 5 steps (the current tests assert exactly 4 rendered step elements and will break when the "members" step is added)

- [x] **Task 17: i18n strings** (AC: #2)
  - [x]Add to `public/locales/fr/common.json` and `en/common.json`:
    - `nav.auth.adminUsers`: "Membres" / "Members"
    - `pages.adminUsers.title`: "Gestion des membres" / "Member Management"
    - `pages.adminUsers.createButton`: "Ajouter un utilisateur" / "Add User"
    - `pages.adminUsers.emptyState`: "Aucun membre. Ajoutez votre premier membre." / "No members yet. Add your first member."
    - `pages.adminUsers.loadMore`: "Charger plus" / "Load More"
    - `pages.adminUsers.form.title`: "Nouvel utilisateur" / "New User"
    - `pages.adminUsers.form.firstName`: "Pr\u00e9nom" / "First Name"
    - `pages.adminUsers.form.lastName`: "Nom de famille" / "Last Name"
    - `pages.adminUsers.form.email`: "Courriel" / "Email"
    - `pages.adminUsers.form.role`: "R\u00f4le" / "Role"
    - `pages.adminUsers.form.departments`: "D\u00e9partements" / "Departments"
    - `pages.adminUsers.form.selectDepartments`: "S\u00e9lectionner des d\u00e9partements" / "Select departments"
    - `pages.adminUsers.form.submit`: "Cr\u00e9er" / "Create"
    - `pages.adminUsers.form.cancel`: "Annuler" / "Cancel"
    - `pages.adminUsers.toast.created`: "Utilisateur cr\u00e9\u00e9" / "User created"
    - `pages.adminUsers.toast.error.duplicate`: "Cet email est d\u00e9j\u00e0 utilis\u00e9" / "This email is already in use"
    - `pages.adminUsers.toast.error.forbidden`: "Acc\u00e8s refus\u00e9" / "Access denied"
    - `setup.steps.members`: "Membres" / "Members"
  - [x]Add all new keys to `test-utils.tsx` mock resources

- [x] **Task 18: MSW mock handlers** (AC: #1, #3)
  - [x] Create `src/sdamanagement-web/src/mocks/handlers/users.ts`
  - [x]Default: paginated user list (5 mock users, no nextCursor)
  - [x]Variants: empty list, with nextCursor, 409 conflict, 403 forbidden

- [x] **Task 19: Frontend tests** (AC: #1, #2, #3, #6)
  - [x] Create `src/sdamanagement-web/src/pages/AdminUsersPage.test.tsx`
  - [x]Per-file MSW server: `const server = setupServer(...authHandlers, ...userHandlers, ...departmentHandlers)`
  - [x]Tests:
    - OWNER renders user list
    - ADMIN renders user list (filtered mock)
    - VIEWER sees user list (read-only, no create button visible)
    - Empty state renders with create button (ADMIN/OWNER only)
    - Loading skeleton shows while fetching
    - Create dialog opens on button click (ADMIN/OWNER)
    - Successful creation shows toast and closes dialog
    - Duplicate email error displays on email field

## Dev Notes

### Architecture Patterns (Mandatory)

**Backend — Follow established patterns exactly:**

- **Controller**: primary constructor with `(IUserService, SdacAuth.IAuthorizationService auth, ICurrentUserContext currentUser)`. Copy structure from `DepartmentsController`. Always alias: `using SdacAuth = SdaManagement.Api.Auth;`
- **Authorization**: Return-based checks. `if (!auth.IsAuthenticated()) return Forbid();` then role-specific checks. Never use `[Authorize(Roles = "...")]` attributes.
- **Service**: primary constructor with `(AppDbContext db, ISanitizationService sanitizer)`. All methods end with `Async`. No exception handling in services.
- **DTOs**: Request = `record` with `{ get; init; }`. Response = `class` with `{ get; init; }`. Defaults: `= string.Empty` for strings, `= []` for collections.
- **Validation**: `AbstractValidator<T>` in `Validators/` folder. Auto-registered via `AddValidatorsFromAssemblyContaining<>()`. Injected as `[FromServices] IValidator<T>` in controller action.
- **Sanitization**: ALL string inputs go through `sanitizer.Sanitize()` (or `SanitizeNullable()`) before DB write.
- **Conflict**: Catch `DbUpdateException ex when (ex.InnerException is PostgresException { SqlState: "23505" })` and return 409 with `ProblemDetails { Type = "urn:sdac:conflict" }`.
- **JSON naming**: camelCase automatic via System.Text.Json. DTO properties are PascalCase C# / camelCase JSON.

**Frontend — Follow established patterns exactly:**

- **Service**: thin axios wrapper in `services/userService.ts`. Copy pattern from `departmentService.ts`.
- **Hook**: `useInfiniteQuery` for paginated list. `enabled: isAdminOrOwner`.
- **Schema**: Zod in `schemas/userSchema.ts`. `z.infer<typeof schema>` for types.
- **Form**: React Hook Form + `zodResolver(createUserSchema)`. `<Controller>` for custom inputs (department picker). Follow `ChurchIdentityForm` and `DepartmentFormDialog` patterns.
- **Component**: shadcn/ui + Tailwind. Mobile-first (base = mobile, `sm:` = tablet, `lg:` = desktop). Skip `md:` breakpoint.
- **i18n**: all visible strings via `useTranslation()`. Zero hardcoded text.
- **Tests**: per-file `setupServer()` with needed handlers. Add i18n keys to `test-utils.tsx` BEFORE writing tests.

### Cursor-Based Pagination (First Implementation in Project)

This is the first paginated endpoint. Follow the architecture spec exactly.

**Backend query pattern:**

```
SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.created_at
FROM users u
WHERE u.is_guest = false
  [AND u.id IN (SELECT ud.user_id FROM user_departments ud WHERE ud.department_id = ANY(@adminDeptIds))]
  [AND (u.last_name, u.id) > (@cursorLastName, @cursorId)]
ORDER BY u.last_name, u.id
LIMIT @limit + 1
```

**EF Core implementation:**

```csharp
var query = db.Users
    .Where(u => !u.IsGuest)
    .OrderBy(u => u.LastName).ThenBy(u => u.Id);

if (departmentFilter is { Count: > 0 })
    query = query.Where(u => u.UserDepartments.Any(ud => departmentFilter.Contains(ud.DepartmentId)));

if (cursor is not null)
{
    var (cursorLastName, cursorId) = DecodeCursor(cursor);
    query = query.Where(u => u.LastName.CompareTo(cursorLastName) > 0
        || (u.LastName == cursorLastName && u.Id > cursorId));
}

var items = await query.Take(limit + 1)
    .Select(u => new UserListItem { ... })
    .ToListAsync();

string? nextCursor = items.Count > limit
    ? EncodeCursor(items[limit - 1].LastName, items[limit - 1].Id)
    : null;

return new PagedResponse<UserListItem>
{
    Items = items.Take(limit).ToList(),
    NextCursor = nextCursor,
};
```

**Cursor encoding**: `Base64(lastName + "|" + id)` — opaque to frontend, validated on decode.

**Frontend hook pattern:**

```ts
export function useUsers() {
  const { user, isAuthenticated } = useAuth();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } =
    useInfiniteQuery({
      queryKey: ["users"],
      queryFn: ({ pageParam }) => userService.getUsers(pageParam).then(res => res.data),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      enabled: isAuthenticated, // VIEWERs have read access too
    });

  const users = data?.pages.flatMap(page => page.items) ?? [];
  const isAdminOrOwner = user?.role?.toUpperCase() === "OWNER" || user?.role?.toUpperCase() === "ADMIN";
  return { users, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError, isAdminOrOwner };
}
```

**API response shape:**

```json
{
  "items": [
    {
      "id": 2,
      "firstName": "Marie-Claire",
      "lastName": "Legault",
      "email": "mc.legault@gmail.com",
      "role": "Viewer",
      "departments": [
        { "id": 1, "name": "MIFEM", "abbreviation": "MIFEM", "color": "#4F46E5" }
      ],
      "createdAt": "2026-03-05T00:00:00Z"
    }
  ],
  "nextCursor": "TGVnYXVsdHwy"
}
```

### Department-Scoped Authorization Matrix

| Caller | Can Read (GET) | Can Create (POST) | Allowed Roles | Department Scope |
|--------|---------------|-------------------|---------------|-----------------|
| OWNER | Yes — all users | Yes | VIEWER, ADMIN, OWNER | Any department |
| ADMIN | Yes — dept-scoped | Yes | VIEWER, ADMIN | Only departments ADMIN manages |
| VIEWER | Yes — all users (read-only) | No (403) | - | - |
| ANONYMOUS | No (401) | No (401) | - | - |

**Controller authorization flow (Create):**

```csharp
[HttpPost]
public async Task<IActionResult> Create(
    [FromBody] CreateUserRequest request,
    [FromServices] IValidator<CreateUserRequest> validator)
{
    if (!auth.IsAuthenticated()) return Forbid();
    if (currentUser.Role < UserRole.Admin) return Forbid();

    var validation = await validator.ValidateAsync(request);
    if (!validation.IsValid) return ValidationError(validation);

    // ADMIN-specific restrictions
    if (!auth.IsOwner())
    {
        // Cannot assign OWNER role
        if (request.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase))
            return Forbid();
        // Can only assign departments they manage
        if (request.DepartmentIds.Any(dId => !currentUser.DepartmentIds.Contains(dId)))
            return Forbid();
    }

    try
    {
        var user = await userService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
    }
    catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" })
    {
        return Conflict(new ProblemDetails
        {
            Type = "urn:sdac:conflict",
            Title = "Resource Conflict",
            Status = 409,
            Detail = "A user with this email already exists.",
        });
    }
}
```

**User list authorization:**

- OWNER: all non-guest users (no department filter)
- ADMIN: users who share at least one department with the ADMIN (via UserDepartments join)
- VIEWER: all non-guest users (read-only, no department filter) — needed for Epic 6 roster views and contact pickers
- ANONYMOUS: 401 Unauthorized

### Setup Checklist Integration

**Backend (`SetupProgressService.cs`):**

Add step `"members"` after `"schedules"`. Completion check:

```csharp
var memberExists = await db.Users.AnyAsync(u => !u.IsGuest && u.Role != UserRole.Owner);
// Step: { Id = "members", Status = memberExists ? "complete" : (allPriorComplete ? "current" : "pending") }
```

This checks for at least one real member (not the OWNER seed account, not guest speakers).

Remove the `// TODO(story-3.1): Add "members" step` comment from line 7.

**Frontend (`useSetupProgress.ts`):**

Add to STEP_CONFIG after `"schedules"`:

```ts
"members": { route: "/admin/users", labelKey: "setup.steps.members" },
// TODO(story-4.1): Add "first-activity" step  ← keep this one
```

Remove the `// TODO(story-3.1): Add "members" step` comment from line 14.

### Department Multi-Select Pattern

Follow UX spec: **Checkbox list in a Popover** with removable chips below trigger.

```
Trigger: Button with text "Selectionner des departements" (or count if selected)
Popover content:
  - Checkbox list of departments (name + color dot)
  - ADMIN: only departments they manage (filter by departmentService.getAll() vs user departments)
  - OWNER: all departments
Below trigger:
  - Removable chips for each selected department
  - Chip: abbreviation text + color dot + X remove button
Mobile: full-width popover
Desktop: anchored to trigger, max 400px wide
```

Use shadcn/ui `Popover` + `Checkbox` primitives. Use React Hook Form `<Controller>` to manage the array value.

### Initials Avatar

Simple component for MVP. Will be extended in Story 3.5 for uploaded photos.

```
Display: Circle with 2 initials (first char of firstName + first char of lastName)
Size: sm (32px/h-8 w-8 text-xs), md (40px/h-10 w-10 text-sm), lg (48px/h-12 w-12 text-base)
Background: deterministic color from name hash — cycle through:
  bg-slate-200, bg-indigo-100, bg-emerald-100, bg-amber-100, bg-rose-100
Text: text-slate-700 font-semibold
Shape: rounded-full
```

Accept optional `avatarUrl` prop for future Story 3.5 extension (render `<img>` if provided, initials if not).

### Reuse Existing Code (Do NOT Reinvent)

- **Department list for picker**: reuse `departmentService.getAll()`. Do NOT create a new endpoint.
- **Auth context**: `useAuth()` for role checks. Pattern: `user?.role?.toUpperCase() === "OWNER"`.
- **ProtectedRoute**: already gates `/admin/*` routes. Add `/admin/users` following existing pattern.
- **AppSidebar**: add nav item with `minRole: "ADMIN"` following existing items array.
- **Toast**: Sonner toast. Pattern from other admin pages: `toast.success(t("pages.adminUsers.toast.created"))`.
- **Dialog/Sheet**: shadcn/ui `Dialog` (desktop) / `Sheet` (mobile <640px) for creation form. Follow `DepartmentFormDialog` pattern, extended with responsive wrapper.
- **Badge**: shadcn/ui `Badge` for role and department display.
- **Skeleton**: existing `Skeleton` component for loading states.
- **User entity**: `src/SdaManagement.Api/Data/Entities/User.cs` already exists with all needed fields.
- **UserDepartment entity**: `src/SdaManagement.Api/Data/Entities/UserDepartment.cs` already has composite PK and cascade delete.
- **DB tables**: `users` and `user_departments` tables exist from Epic 1 migrations. **No new migrations needed.**

### Project Structure Notes

**New files to create:**

Backend:
- `src/SdaManagement.Api/Dtos/Common/PagedResponse.cs`
- `src/SdaManagement.Api/Dtos/User/CreateUserRequest.cs`
- `src/SdaManagement.Api/Dtos/User/UserListItem.cs`
- `src/SdaManagement.Api/Dtos/User/UserDepartmentBadge.cs`
- `src/SdaManagement.Api/Dtos/User/UserResponse.cs`
- `src/SdaManagement.Api/Validators/CreateUserRequestValidator.cs`
- `src/SdaManagement.Api/Services/IUserService.cs`
- `src/SdaManagement.Api/Services/UserService.cs`
- `src/SdaManagement.Api/Controllers/UsersController.cs`
- `tests/SdaManagement.Api.UnitTests/Validators/CreateUserRequestValidatorTests.cs`
- `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs`

Frontend:
- `src/sdamanagement-web/src/services/userService.ts`
- `src/sdamanagement-web/src/schemas/userSchema.ts`
- `src/sdamanagement-web/src/hooks/useUsers.ts`
- `src/sdamanagement-web/src/pages/AdminUsersPage.tsx`
- `src/sdamanagement-web/src/pages/AdminUsersPage.test.tsx`
- `src/sdamanagement-web/src/components/user/UserFormDialog.tsx`
- `src/sdamanagement-web/src/components/user/index.ts`
- `src/sdamanagement-web/src/components/ui/initials-avatar.tsx`
- `src/sdamanagement-web/src/mocks/handlers/users.ts`

**Files to modify:**

Backend:
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — register UserService
- `src/SdaManagement.Api/Services/SetupProgressService.cs` — add "members" step, remove TODO

Frontend:
- `src/sdamanagement-web/src/App.tsx` — add `/admin/users` lazy route
- `src/sdamanagement-web/src/components/layout/AppSidebar.tsx` — add Members nav item with `minRole: "ADMIN"`
- `src/sdamanagement-web/src/hooks/useSetupProgress.ts` — add "members" step config, remove TODO
- `src/sdamanagement-web/src/components/setup/SetupChecklist.test.tsx` — update hard-coded 4-step assertions to 5 steps
- `src/sdamanagement-web/public/locales/fr/common.json` — add user management i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — add user management i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — add new i18n mock keys

Tests:
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` — add `AssignDepartmentToUser()` helper method
- `tests/SdaManagement.Api.IntegrationTests/Setup/SetupProgressEndpointTests.cs` — add members step assertions

**No database migrations needed.** The `users` and `user_departments` tables already exist from Epic 1 migrations.

### Design Tokens Reference

- Role badge (OWNER): `bg-amber-100 text-amber-800 border-amber-200`
- Role badge (ADMIN): `bg-indigo-100 text-indigo-800 border-indigo-200`
- Role badge (VIEWER): `bg-slate-100 text-slate-700 border-slate-200`
- Department chip in form: `bg-white border border-slate-200 text-slate-700` with color dot
- Department badge in list: `text-xs` badge with department color as left border or dot
- Initials avatar: `rounded-full font-semibold` with deterministic bg color
- Empty state: `text-slate-500 text-center py-12`
- Load more button: shadcn Button `variant="outline"` full-width
- User card: shadcn `Card` with `rounded-2xl` (project pattern)
- Create button: shadcn Button `variant="default"` (indigo primary)

### Testing Strategy

**Backend unit tests** (`CreateUserRequestValidatorTests`):
- Valid request with all fields passes
- Empty firstName, lastName, email each fail
- Invalid email format fails
- Role not in allowed values fails
- Empty DepartmentIds fails
- DepartmentId <= 0 fails

**Backend integration tests** (`UserEndpointTests`):
- Extend `IntegrationTestBase` with `SdaManagementWebApplicationFactory`
- Override `SeedTestData()`: create OWNER, ADMIN (assigned to dept JA), VIEWER, plus departments JA and MIFEM
- For data setup in individual tests: use `Factory.Services.CreateScope()` to insert users via AppDbContext
- Test all authorization combinations per the matrix
- Test cursor pagination: seed 25 users, verify page 1 (20 items + nextCursor), page 2 (5 items + null cursor)
- Test 409 duplicate email
- Test 400 validation errors
- Test setup progress members step integration

**Frontend component tests** (`AdminUsersPage.test.tsx`):
- Per-file MSW: `const server = setupServer(...authHandlers, ...userHandlers, ...departmentHandlers)`
- Swap auth user per test via `server.use(http.get("/api/auth/me", ...))`
- OWNER renders full user list
- ADMIN renders user list
- VIEWER sees user list read-only (no create button)
- Empty state with create action (ADMIN/OWNER)
- Create dialog lifecycle (open, fill, submit, toast, close)
- Duplicate email error handling

### Previous Story Learnings (from Story 2.6)

- **Controller pattern**: primary constructor with `SdacAuth.IAuthorizationService auth`. Return-based auth checks.
- **Service pattern**: primary constructor injection. Async methods. No exception handling.
- **Test pattern**: OWNER 200, ADMIN varies (200 for scoped or 403), VIEWER 403, ANONYMOUS 401.
- **Frontend tests**: add ALL new i18n keys to `test-utils.tsx` mock resources BEFORE writing tests.
- **MSW handlers**: create default + variant handlers. Each test file creates its own `setupServer()` — NO shared server.
- **i18n key hierarchy**: `pages.{feature}.*` for page-specific, `nav.auth.*` for navigation.
- **Rate limiting**: `[EnableRateLimiting("auth")]` on controller class.
- **TODO integration**: Story 2.6 left `// TODO(story-3.1): Add "members" step` in both `SetupProgressService.cs` (line 7) and `useSetupProgress.ts` (line 14). Both MUST be addressed.
- **Pre-existing issue**: SystemHealthEndpointTests occasionally fail with 429 due to shared rate limiter (not this story's concern).

### Git Intelligence

Recent commit pattern: `feat(epic-2): Story 2.6 — Guided first-time setup experience`. Follow convention: `feat(users): Story 3.1 — Single user account creation`.

### Technology Notes (from Context7)

**FluentValidation 12.x:**
- `AbstractValidator<T>` with rules in constructor
- `RuleForEach()` for collection items (DepartmentIds)
- `.Must()` for custom predicate validation (role enum check)
- Auto-registration: `AddValidatorsFromAssemblyContaining<>()`
- Async validation available via `MustAsync()` but NOT needed here — email uniqueness enforced by DB constraint

**TanStack Query v5 — useInfiniteQuery:**
- Required params: `queryKey`, `queryFn`, `initialPageParam`, `getNextPageParam`
- `initialPageParam`: use `undefined as string | undefined` for cursor type
- `getNextPageParam(lastPage)`: return `undefined` (not `null`) to signal no more pages
- `fetchNextPage()`, `hasNextPage`, `isFetchingNextPage` for load-more UI
- `data.pages` is array of page results — use `.flatMap(page => page.items)` to flatten

**React Hook Form 7.x + Zod 4.x:**
- `useForm<T>({ resolver: zodResolver(schema), defaultValues })` for typed forms
- `register()` for native inputs; `<Controller>` for custom components (department picker)
- `formState: { errors, isSubmitting }` for validation display and button state
- `setError("email", { message })` for server-side errors (409 duplicate)
- Form field names must match Zod schema keys and API request property names (camelCase)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.1 — AC and user story]
- [Source: _bmad-output/planning-artifacts/architecture.md#Cursor Pagination — keyset pagination spec]
- [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries — UsersController spec]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — FluentValidation, sanitization pipeline]
- [Source: _bmad-output/planning-artifacts/prd.md#FR49-FR55 — User administration requirements]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#RapidEntryForm — form UX pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns — validation, layout, department multi-select]
- [Source: _bmad-output/implementation-artifacts/2-6-guided-first-time-setup-experience.md — TODO integration, test patterns]
- [Source: src/SdaManagement.Api/Controllers/DepartmentsController.cs — Controller CRUD pattern]
- [Source: src/SdaManagement.Api/Services/DepartmentService.cs — Service with sanitization pattern]
- [Source: src/SdaManagement.Api/Data/Entities/User.cs — User entity model]
- [Source: src/SdaManagement.Api/Data/Entities/UserDepartment.cs — Junction table entity]
- [Source: src/SdaManagement.Api/Auth/AuthorizationService.cs — CanManage(departmentId), IsOwner()]
- [Source: src/SdaManagement.Api/Auth/ICurrentUserContext.cs — DepartmentIds for scope filtering]
- [Source: src/sdamanagement-web/src/App.tsx — Route structure, lazy loading pattern]
- [Source: src/sdamanagement-web/src/components/layout/AppSidebar.tsx — Nav item pattern with minRole]
- [Source: src/sdamanagement-web/src/services/departmentService.ts — Service layer pattern]
- [Source: src/sdamanagement-web/src/schemas/departmentSchema.ts — Zod schema pattern]
- [Source: src/sdamanagement-web/src/hooks/useSetupProgress.ts — Hook pattern, TODO location line 14]
- [Source: src/SdaManagement.Api/Services/SetupProgressService.cs — TODO location line 7]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed CS1061: AppDbContext has no `DbSet<UserDepartment>` property — used `db.Set<UserDepartment>()` instead
- Fixed email max length unit test: `new string('a', 246) + "@test.com"` = 255 chars (at max, not over) — changed to 247
- Fixed missing `using Shouldly;` in CreateUserRequestValidatorTests
- Fixed SetupProgress "EmptyDb" integration test: seeded test users satisfy `!IsGuest && Role != Owner` check, so members step is "complete"
- Fixed Vitest matcher: `toBeGreaterThanOrEqualTo` → `toBeGreaterThanOrEqual`
- Fixed SetupProgressServiceTests unit tests: updated from 4 steps to 5 steps, seeded member for AllComplete test

### Completion Notes List

- **Backend**: Full UsersController with GET (list + detail) and POST endpoints. Cursor-based keyset pagination (Base64-encoded `lastName|id`). Department-scoped authorization (OWNER unrestricted, ADMIN dept-scoped, VIEWER read-only). FluentValidation for CreateUserRequest. ISanitizationService for all string inputs. PostgresException 23505 → 409 Conflict with ProblemDetails.
- **Frontend**: AdminUsersPage with user cards (InitialsAvatar, role badges, department badges), cursor pagination via TanStack useInfiniteQuery, UserFormDialog with React Hook Form + zodResolver, department multi-select Popover with Checkbox chips. Role dropdown restricted by caller role.
- **Setup Integration**: "members" step added to SetupProgressService (backend) and useSetupProgress (frontend). Completion check: `!IsGuest && Role != Owner`.
- **Tests**: 18 backend unit tests (validator), 16 backend integration tests (auth matrix, pagination, conflict, setup progress), 8 frontend component tests. All SetupProgressServiceTests and SetupChecklist tests updated for 5-step model.
- **No new migrations**: User and UserDepartment entities/tables already existed from Epic 1.

### Change Log

- 2026-03-05: Story 3.1 implementation complete — single user account creation with full-stack CRUD, cursor pagination, department-scoped authorization, setup checklist integration
- 2026-03-06: Code review fixes — H1: cursor validation (400 on malformed); H2: department picker now ADMIN-scoped via departmentIds in auth/me; M1: 3 dialog lifecycle tests added; M2: error state rendering; L1: email max(255) in Zod; L3: GetByIdAsync filters guests; L4: dead setupProgress mock export removed
- 2026-03-06: Code review #2 fixes — extracted DepartmentMultiSelect shared component (from UserFormDialog + BulkUserFormDialog); fixed InitialsAvatar aria (role="img" + aria-label); added error state test; added missing files to story file list

### File List

**New files created:**
- `src/SdaManagement.Api/Dtos/Common/PagedResponse.cs`
- `src/SdaManagement.Api/Dtos/User/CreateUserRequest.cs`
- `src/SdaManagement.Api/Dtos/User/UserListItem.cs`
- `src/SdaManagement.Api/Dtos/User/UserDepartmentBadge.cs`
- `src/SdaManagement.Api/Dtos/User/UserResponse.cs`
- `src/SdaManagement.Api/Validators/CreateUserRequestValidator.cs`
- `src/SdaManagement.Api/Services/IUserService.cs`
- `src/SdaManagement.Api/Services/UserService.cs`
- `src/SdaManagement.Api/Controllers/UsersController.cs`
- `tests/SdaManagement.Api.UnitTests/Validators/CreateUserRequestValidatorTests.cs`
- `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs`
- `src/sdamanagement-web/src/services/userService.ts`
- `src/sdamanagement-web/src/schemas/userSchema.ts`
- `src/sdamanagement-web/src/hooks/useUsers.ts`
- `src/sdamanagement-web/src/pages/AdminUsersPage.tsx`
- `src/sdamanagement-web/src/pages/AdminUsersPage.test.tsx`
- `src/sdamanagement-web/src/components/user/UserFormDialog.tsx`
- `src/sdamanagement-web/src/components/user/DepartmentMultiSelect.tsx`
- `src/sdamanagement-web/src/components/user/index.ts`
- `src/sdamanagement-web/src/components/ui/initials-avatar.tsx`
- `src/sdamanagement-web/src/components/ui/checkbox.tsx`
- `src/sdamanagement-web/src/mocks/handlers/users.ts`

**Modified files:**
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — registered UserService
- `src/SdaManagement.Api/Services/SetupProgressService.cs` — added "members" step, removed TODO
- `src/SdaManagement.Api/Dtos/Auth/AuthMeResponse.cs` — added DepartmentIds for ADMIN scope filtering
- `src/SdaManagement.Api/Controllers/AuthController.cs` — /api/auth/me returns departmentIds
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` — added AssignDepartmentToUser helper
- `tests/SdaManagement.Api.IntegrationTests/Setup/SetupProgressEndpointTests.cs` — updated for 5 steps
- `tests/SdaManagement.Api.UnitTests/Services/SetupProgressServiceTests.cs` — updated for 5 steps, added member seed
- `src/sdamanagement-web/src/App.tsx` — added /admin/users lazy route
- `src/sdamanagement-web/src/contexts/AuthContext.tsx` — added departmentIds to AuthUser interface
- `src/sdamanagement-web/src/components/layout/AppSidebar.tsx` — added Members nav item
- `src/sdamanagement-web/src/hooks/useSetupProgress.ts` — added "members" step config
- `src/sdamanagement-web/src/components/setup/SetupChecklist.test.tsx` — updated for 5 steps
- `src/sdamanagement-web/src/mocks/handlers/setupProgress.ts` — added members step to all mocks, removed dead export
- `src/sdamanagement-web/src/mocks/handlers/auth.ts` — added departmentIds to mock users
- `src/sdamanagement-web/public/locales/fr/common.json` — added user management i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — added user management i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — added new i18n mock keys
- `src/sdamanagement-web/src/components/setup/SetupChecklist.tsx` — added isError guard, removed redundant role="navigation"
- `src/sdamanagement-web/src/pages/DashboardPage.tsx` — removed redundant useSetupProgress hook call (SetupChecklist handles own display logic)
- `src/SdaManagement.Api/appsettings.Development.json` — cleared OwnerEmail (should be in secrets.json)
