# Story 4.1: Activity Data Model & Basic CRUD

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Prerequisites

- Local dev environment: Node 20+, .NET 10 SDK, Docker, PostgreSQL 17
- Epic 3 complete (all user management stories done)
- Existing infrastructure: `AppDbContext`, `IAuthorizationService`/`AuthorizationService`, `ICurrentUserContext`, `ISanitizationService`, `IntegrationTestBase`
- Existing entity patterns: `ActivityTemplate`, `TemplateRole`, `Department`, `User` entities with EF Core configuration
- Existing CRUD patterns: `ActivityTemplatesController`/`ActivityTemplateService` for controller+service template reference
- Existing frontend patterns: `activityTemplateService.ts`, `AdminActivityTemplatesPage.tsx` for frontend reference
- Existing test helpers: `CreateTestUser()`, `AssignDepartmentToUser()`, `SetUserPassword()` in `IntegrationTestBase`
- Existing `CreateTestActivity()` placeholder in `IntegrationTestBase` (throws `NotImplementedException` — must be implemented in this story)

## Story

As an **ADMIN**,
I want to create, view, edit, and delete church activities with a title, date, time, description, department, and visibility setting,
So that I can manage the church schedule for my department.

## Acceptance Criteria

1. **Given** the database
   **When** EF Core migrations run
   **Then** the `activities` table exists with columns: `id`, `title`, `description`, `date` (date only), `start_time` (time only), `end_time` (time only), `department_id` (FK to departments), `visibility` (enum: public/authenticated), `special_type` (nullable string), `xmin` (concurrency token), `created_at`, `updated_at`
   **And** the `activity_roles` table exists with: `id`, `activity_id` (FK cascade), `role_name`, `headcount`, `sort_order`, `created_at`, `updated_at`
   **And** the `role_assignments` table exists with: `id`, `activity_role_id` (FK cascade), `user_id` (FK), with unique constraint on (`activity_role_id`, `user_id`), `created_at`

2. **Given** an ADMIN scoped to department MIFEM
   **When** they create an activity with title "Culte du Sabbat", date 2026-03-07, department MIFEM, visibility "public"
   **Then** the activity is created as an atomic transaction
   **And** the activity appears in the activity list for MIFEM
   **And** an "Activite publiee" toast confirms the action

3. **Given** an ADMIN scoped to department MIFEM
   **When** they attempt to create an activity for department JA
   **Then** the API returns 403 — department-scoped authorization enforced

4. **Given** an existing activity
   **When** an ADMIN edits the title, date, or visibility
   **Then** the changes are saved and reflected immediately

5. **Given** an existing activity
   **When** an ADMIN deletes it
   **Then** CASCADE DELETE removes all associated `activity_roles` and `role_assignments`

## Tasks / Subtasks

- [x] Task 1: Create Activity, ActivityRole, RoleAssignment entities (AC: 1)
  - [x] 1.1 Create `Activity.cs` entity in `Data/Entities/` — `record` style is NOT used for entities (entities are mutable classes). Properties: Id, Title, Description?, Date (DateOnly), StartTime (TimeOnly), EndTime (TimeOnly), DepartmentId (int), Visibility (ActivityVisibility enum), SpecialType (string?), CreatedAt, UpdatedAt. Navigation properties: Department, Roles collection.
  - [x] 1.2 Create `ActivityVisibility.cs` enum in `Data/Entities/` — `Public = 0`, `Authenticated = 1`
  - [x] 1.3 Create `ActivityRole.cs` entity in `Data/Entities/` — Id, ActivityId (int), RoleName, Headcount (int), SortOrder (int), CreatedAt, UpdatedAt. Navigation: Activity, Assignments collection.
  - [x] 1.4 Create `RoleAssignment.cs` entity in `Data/Entities/` — Id, ActivityRoleId (int), UserId (int), CreatedAt. Navigation: ActivityRole, User.

- [x] Task 2: Configure EF Core model and create migration (AC: 1)
  - [x] 2.1 Add `DbSet<Activity>`, `DbSet<ActivityRole>`, `DbSet<RoleAssignment>` to `AppDbContext`
  - [x] 2.2 Configure Activity entity in `OnModelCreating`: PK, `UseXminAsConcurrencyToken()` (shadow property — no explicit entity property), Title max 150, Description max 1000, Visibility `HasConversion<int>()`, FK to Department with `DeleteBehavior.SetNull`, default timestamps via `HasDefaultValueSql("now()")`
  - [x] 2.3 Configure ActivityRole: PK, FK to Activity (`DeleteBehavior.Cascade`), RoleName max 100, unique index on `(ActivityId, RoleName)`, default timestamps
  - [x] 2.4 Configure RoleAssignment: PK, FK to ActivityRole (`DeleteBehavior.Cascade`), FK to User (`DeleteBehavior.Restrict` — don't cascade when user is soft-deleted), unique constraint on `(ActivityRoleId, UserId)`, CreatedAt default timestamp
  - [x] 2.5 Run `dotnet ef migrations add AddActivities` and verify generated migration
  - [x] 2.6 Apply migration and verify all tables, FKs, indexes created correctly

- [x] Task 3: Create Activity DTOs (AC: 2, 4)
  - [x] 3.1 Create `Dtos/Activity/CreateActivityRequest.cs` — C# `record` with `init` accessors: Title (string), Description (string?), Date (DateOnly), StartTime (TimeOnly), EndTime (TimeOnly), DepartmentId (int), Visibility (string — `"public"` or `"authenticated"`, NOT the enum type)
  - [x] 3.2 Create `Dtos/Activity/UpdateActivityRequest.cs` — C# `record` with same fields as Create PLUS `ConcurrencyToken` (uint) for optimistic concurrency. The frontend sends back the token received from GET; the service sets it as the original xmin value before saving.
  - [x] 3.3 Create `Dtos/Activity/ActivityResponse.cs` — C# `record`: Id, Title, Description?, Date, StartTime, EndTime, DepartmentId, DepartmentName, Visibility (string), Roles (list of ActivityRoleResponse), ConcurrencyToken (uint — read from xmin shadow property), CreatedAt, UpdatedAt
  - [x] 3.4 Create `Dtos/Activity/ActivityListItem.cs` — C# `record`: Id, Title, Date, StartTime, EndTime, DepartmentId, DepartmentName, DepartmentColor, Visibility (string), RoleCount (int), CreatedAt
  - [x] 3.5 Create `Dtos/Activity/ActivityRoleResponse.cs` — C# `record`: Id, RoleName, Headcount, SortOrder, Assignments (list of RoleAssignmentResponse)
  - [x] 3.6 Create `Dtos/Activity/RoleAssignmentResponse.cs` — C# `record`: Id, UserId, FirstName, LastName, AvatarUrl (string?)
  - [x] 3.7 Create `Dtos/Activity/IActivityRequest.cs` interface with shared properties (Title, Description, Date, StartTime, EndTime, DepartmentId, Visibility) for polymorphic validator reuse — same pattern as `IActivityTemplateRequest`

- [x] Task 4: Create FluentValidation validators (AC: 2, 4)
  - [x] 4.1 Create `Validators/ActivityValidationRules.cs` — static `Apply<T>(AbstractValidator<T>)` method with generic constraint `where T : IActivityRequest`. Rules: Title NotEmpty + MaxLength(150) + MustNotContainControlCharacters, Description MaxLength(1000) + MustNotContainControlCharacters (conditional `.When(x => !string.IsNullOrEmpty(x.Description))`), Date NotEmpty, StartTime NotEmpty, EndTime NotEmpty + Must be after StartTime, DepartmentId GreaterThan(0), Visibility NotEmpty + Must be "public" or "authenticated"
  - [x] 4.2 Create `Validators/CreateActivityRequestValidator.cs` — delegates to `ActivityValidationRules.Apply(this)`
  - [x] 4.3 Create `Validators/UpdateActivityRequestValidator.cs` — delegates to `ActivityValidationRules.Apply(this)` + adds ConcurrencyToken GreaterThan(0u) rule

- [x] Task 5: Create IActivityService / ActivityService (AC: 2, 4, 5)
  - [x] 5.1 Create `Services/IActivityService.cs` interface: `GetAllAsync(int? departmentId)`, `GetByIdAsync(int id)`, `CreateAsync(CreateActivityRequest)`, `UpdateAsync(int id, UpdateActivityRequest)`, `DeleteAsync(int id)`
  - [x] 5.2 Create `Services/ActivityService.cs` with primary constructor: `(AppDbContext dbContext, ISanitizationService sanitizer, IAvatarService avatarService)`
  - [x] 5.3 `GetAllAsync`: if departmentId provided, filter by it; if null (OWNER use case), return all. Include department name/color via join. Return `List<ActivityListItem>` ordered by Date desc, then StartTime. Count roles via `.Count()` subquery.
  - [x] 5.4 `GetByIdAsync`: return `ActivityResponse` with roles and role assignments. Include user names via join. Post-materialization: loop through assignments and set `AvatarUrl = avatarService.GetAvatarUrl(userId)`. Read xmin shadow property: `dbContext.Entry(activity).Property<uint>("xmin").CurrentValue` → map to `ConcurrencyToken` in DTO.
  - [x] 5.5 `CreateAsync`: create Activity entity, sanitize Title + Description, parse Visibility string to enum, save atomically, return ActivityResponse
  - [x] 5.6 `UpdateAsync`: load activity with tracking, verify exists, update fields, sanitize. Set original xmin for concurrency check: `dbContext.Entry(activity).Property<uint>("xmin").OriginalValue = request.ConcurrencyToken`. Let `DbUpdateConcurrencyException` propagate (controller catches).
  - [x] 5.7 `DeleteAsync`: find activity, remove (cascade handles roles/assignments), return bool
  - [x] 5.8 Register `services.AddScoped<IActivityService, ActivityService>()` in `ServiceCollectionExtensions.AddApplicationServices()`

- [x] Task 6: Create ActivitiesController (AC: 2, 3, 4, 5)
  - [x] 6.1 Create `Controllers/ActivitiesController.cs` with route `api/activities`, `[Authorize]`, `[EnableRateLimiting("auth")]`. Primary constructor: `(IActivityService activityService, SdacAuth.IAuthorizationService auth)`
  - [x] 6.2 `GET /api/activities?departmentId={id}` — departmentId is optional. If provided: `auth.CanManage(departmentId)` check. If omitted: only OWNER allowed (`auth.IsOwner()`), returns all activities. ADMINs MUST provide departmentId.
  - [x] 6.3 `GET /api/activities/{id:int}` — load activity, auth check on activity's departmentId via `auth.CanManage(activity.DepartmentId)`
  - [x] 6.4 `POST /api/activities` — validate via `[FromServices] IValidator<CreateActivityRequest>`, auth check `auth.CanManage(request.DepartmentId)`, return `CreatedAtAction`
  - [x] 6.5 `PUT /api/activities/{id:int}` — validate, auth check. Catch `DbUpdateConcurrencyException` → return 409 Conflict with ProblemDetails `urn:sdac:conflict`
  - [x] 6.6 `DELETE /api/activities/{id:int}` — load activity to get departmentId, auth check, delete
  - [x] 6.7 Include `ValidationError()` private helper (same pattern as `ActivityTemplatesController`)

- [x] Task 7: Backend integration tests (AC: 1–5)
  - [x] 7.1 Create `tests/.../Activities/ActivityEndpointTests.cs`
  - [x] 7.2 Test: `CreateActivity_AsAdmin_Returns201` — creates activity for admin's department
  - [x] 7.3 Test: `CreateActivity_AsAdminWrongDepartment_Returns403`
  - [x] 7.4 Test: `CreateActivity_AsOwner_Returns201` — owner can create for any department
  - [x] 7.5 Test: `CreateActivity_AsViewer_Returns403`
  - [x] 7.6 Test: `CreateActivity_WithInvalidData_Returns400` — missing title, endTime before startTime, etc.
  - [x] 7.7 Test: `GetActivities_AsAdmin_ReturnsOnlyDepartmentActivities`
  - [x] 7.8 Test: `GetActivities_AsOwner_WithoutDepartmentId_ReturnsAll`
  - [x] 7.9 Test: `GetActivity_AsAdmin_ReturnsActivityWithRolesAndConcurrencyToken`
  - [x] 7.10 Test: `UpdateActivity_AsAdmin_Returns200`
  - [x] 7.11 Test: `UpdateActivity_AsAdminWrongDepartment_Returns403`
  - [x] 7.12 Test: `DeleteActivity_AsAdmin_Returns204`
  - [x] 7.13 Test: `DeleteActivity_CascadesRolesAndAssignments` — create activity with roles/assignments, delete, verify gone
  - [x] 7.14 Test: `CreateActivity_AsAnonymous_Returns401`
  - [x] 7.15 Implement the existing `CreateTestActivity()` placeholder in `IntegrationTestBase` (currently throws `NotImplementedException`). Signature: `CreateTestActivity(int departmentId, string? title = null, ...)`. Creates activity + optional roles for reuse in Stories 4.2–4.8.
  - [x] 7.16 Test setup: use existing `AssignDepartmentToUser()` helper to configure admin-department relationships. Use existing `CreateTestUser()` for target users in assignment tests.

- [x] Task 8: Frontend — TypeScript types and API service (AC: 2, 4)
  - [x] 8.1 Create `services/activityService.ts` with interfaces matching backend DTOs exactly:
    - `ActivityResponse` (includes `concurrencyToken: number`)
    - `ActivityListItem`
    - `ActivityRoleResponse`
    - `RoleAssignmentResponse`
    - `CreateActivityRequest` (no concurrencyToken)
    - `UpdateActivityRequest` (includes `concurrencyToken: number`)
  - [x] 8.2 Implement API methods using `api` from `@/lib/api`: `getByDepartment(departmentId)`, `getAll()` (OWNER), `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`
  - [x] 8.3 Create `schemas/activitySchema.ts` with Zod schemas — field names must match backend DTOs. `createActivitySchema`: title (min 1, max 150), description (max 1000, optional), date, startTime, endTime (must be after startTime), departmentId (positive int), visibility (enum: "public" | "authenticated"). `updateActivitySchema`: extends create + `concurrencyToken: z.number()`

- [x] Task 9: Frontend — Admin Activities page with CRUD (AC: 2, 3, 4, 5)
  - [x] 9.1 Create `pages/AdminActivitiesPage.tsx` — list activities, create/edit/delete
  - [x] 9.2 Activity list: use `Table` component (installed). Columns: title, date, time range, department `Badge` with department color as background tint and abbreviation text, visibility badge, actions (edit/delete)
  - [x] 9.3 Create form: use `Sheet` component on mobile (full-screen bottom sheet), `Dialog` on desktop. Fields: title (`Input`), description (`Textarea`), date picker (`Calendar` + `Popover`), time pickers (native `<input type="time">` in shadcn `Input`), department `Select` (filtered to `authUser.departmentIds` — OWNER sees all), visibility radio ("Publique" / "Authentifie seulement")
  - [x] 9.4 Edit form: same as create, pre-populated. Include hidden `concurrencyToken` field from the loaded activity response.
  - [x] 9.5 Delete: use `AlertDialog` (installed) for confirmation
  - [x] 9.6 Toast notifications via `sonner`: `toast.success(t('activities.toast.created'))` on create, `toast.success(t('activities.toast.updated'))` on edit, `toast.success(t('activities.toast.deleted'))` on delete
  - [x] 9.7 Add route `/admin/activities` in `App.tsx` under the **ADMIN+ `ProtectedRoute`** group (NOT under OWNER-only). Use lazy import with Suspense.
  - [x] 9.8 Add navigation link in admin sidebar
  - [x] 9.9 Empty state: when no activities exist, show contextual guidance — "Aucune activite. Creez votre premiere activite →" with create button. Never show blank space.
  - [x] 9.10 Form validation: validate on **blur** (not keystroke). Show red border + error message below field on validation failure. Clear error when user starts editing again. Disable submit button until all required fields have values.
  - [x] 9.11 Mobile: 44px minimum touch targets for all interactive elements

- [x] Task 10: Frontend — i18n strings (AC: 2)
  - [x] 10.1 Add French translations in `public/locales/fr/common.json`:
    - `activities.title`: "Activites"
    - `activities.create`: "Nouvelle activite"
    - `activities.edit`: "Modifier l'activite"
    - `activities.delete`: "Supprimer l'activite"
    - `activities.form.title`: "Titre"
    - `activities.form.description`: "Description"
    - `activities.form.date`: "Date"
    - `activities.form.startTime`: "Heure de debut"
    - `activities.form.endTime`: "Heure de fin"
    - `activities.form.department`: "Departement"
    - `activities.form.visibility`: "Visibilite"
    - `activities.visibility.public`: "Publique"
    - `activities.visibility.authenticated`: "Authentifie seulement"
    - `activities.toast.created`: "Activite publiee"
    - `activities.toast.updated`: "Activite modifiee"
    - `activities.toast.deleted`: "Activite supprimee"
    - `activities.empty`: "Aucune activite. Creez votre premiere activite."
    - `activities.delete.confirm`: "Etes-vous sur de vouloir supprimer cette activite ?"
    - `activities.delete.warning`: "Cette action supprimera egalement tous les roles et assignations associes."
  - [x] 10.2 Add English translations in `public/locales/en/common.json` (same keys, English values)

- [x] Task 11: Frontend — MSW mock handlers (AC: all)
  - [x] 11.1 Create `mocks/handlers/activities.ts` with handlers for all CRUD endpoints
  - [x] 11.2 Include mock activity data with roles and a concurrencyToken value
  - [x] 11.3 Register handlers in `mocks/handlers/index.ts`

- [x] Task 12: Frontend tests (AC: 2, 3, 4, 5)
  - [x] 12.1 Create `pages/AdminActivitiesPage.test.tsx` — co-located test file
  - [x] 12.2 Test: renders activity list with department badges
  - [x] 12.3 Test: create activity opens form and submits successfully
  - [x] 12.4 Test: edit activity opens pre-populated form with existing values
  - [x] 12.5 Test: delete activity shows AlertDialog confirmation and deletes
  - [x] 12.6 Test: department selector only shows admin's departments (mock `authUser.departmentIds`)
  - [x] 12.7 Test: empty state shows guidance message when no activities
  - [x] 12.8 Mock mutations at service level with `vi.spyOn(activityService, 'create')` — do NOT rely on MSW for mutations (MSW + axios + jsdom causes hanging per Story 3.5 learnings)

## Dev Notes

### Architecture Requirements

- **Canonical Data Model**: `Activity → ActivityRole → RoleAssignment` is the normalized, flexible activity model. This supersedes the product brief's flat `SabbathAssignment` entity. Every query, endpoint, and UI component builds on this hierarchy.
- **Aggregate Root**: `Activity` is the aggregate root. It owns `ActivityRole` → `RoleAssignment`. All modifications to roles/assignments go through the Activity aggregate boundary. No cross-aggregate writes (activity endpoints never modify departments or users).
- **Atomic Transactions**: Activity creation with roles (when added in later stories) is a single EF Core `SaveChangesAsync()` call. No partial state permitted.
- **Concurrency Token**: PostgreSQL `xmin` system column configured via `UseXminAsConcurrencyToken()` in EF Core. This enables optimistic concurrency detection in Story 4.8, but the plumbing must be in place from Story 4.1. The controller must handle `DbUpdateConcurrencyException` → 409 Conflict now.
- **Department Scoping**: ADMIN can only manage activities for departments they're assigned to. OWNER bypasses all department scoping. Use existing `auth.CanManage(departmentId)` pattern.
- **No Soft Delete on Activities**: Unlike Users, activities use hard delete with CASCADE. Deleting an activity cascades to activity_roles → role_assignments.
- **RoleAssignment FK to User**: Use `DeleteBehavior.Restrict` (NOT Cascade) — if a user is soft-deleted, their role assignments should remain (the user record still exists). Actual cleanup is a data management concern, not a cascade.

### Concurrency Token — xmin Shadow Property

Use `UseXminAsConcurrencyToken()` which creates a **shadow property** named `"xmin"`. The Activity entity does NOT have an explicit ConcurrencyToken property. Read and write the shadow property via the EF Core Entry API:

```csharp
// OnModelCreating — configure xmin as concurrency token (shadow property)
modelBuilder.Entity<Activity>(e =>
{
    e.UseXminAsConcurrencyToken();
    // ... other config
});

// Service — reading xmin for DTO mapping (after loading entity)
var activity = await dbContext.Activities.FindAsync(id);
uint xmin = dbContext.Entry(activity).Property<uint>("xmin").CurrentValue;
// Map to DTO: ConcurrencyToken = xmin

// Service — setting original xmin for concurrency check on update
var activity = await dbContext.Activities.FindAsync(id);
// Set the ORIGINAL value to what the client sent — EF Core compares this against DB
dbContext.Entry(activity).Property<uint>("xmin").OriginalValue = request.ConcurrencyToken;
activity.Title = sanitizer.Sanitize(request.Title);
// ... update other fields
await dbContext.SaveChangesAsync(); // throws DbUpdateConcurrencyException if xmin changed

// Controller — catch and return 409
catch (DbUpdateConcurrencyException)
{
    return Conflict(new ProblemDetails
    {
        Type = "urn:sdac:conflict",
        Title = "Concurrency Conflict",
        Status = 409,
        Detail = "This activity was modified by another user. Please reload and try again.",
    });
}
```

### Visibility — String in DTOs, Enum in Entity

The `ActivityVisibility` enum stores as `int` in the database (same pattern as `UserRole`):

```csharp
public enum ActivityVisibility { Public = 0, Authenticated = 1 }
```

**DTOs use `string`**, not the enum type — consistent with how `AuthMeResponse` uses `string Role` (not `UserRole Role`). The service maps between enum and string:

```csharp
// Entity → DTO
Visibility = activity.Visibility.ToString().ToLowerInvariant() // "public" or "authenticated"

// DTO → Entity
Visibility = Enum.Parse<ActivityVisibility>(request.Visibility, ignoreCase: true)
```

The frontend Zod schema validates: `visibility: z.enum(["public", "authenticated"])`.

### Date and Time Handling

- `Date`: `DateOnly` in C# → `date` in PostgreSQL. Calendar date of the activity.
- `StartTime` / `EndTime`: `TimeOnly` in C# → `time without time zone` in PostgreSQL. Local time, no timezone offset (single congregation, single timezone per architecture).
- **Validation**: `EndTime` must be after `StartTime`.
- **JSON serialization**: `DateOnly` and `TimeOnly` are natively supported in `System.Text.Json` in .NET 10. Format: `"2026-03-07"` for dates, `"10:00:00"` for times.

### Controller Pattern

Follow the established controller template exactly:

```csharp
using SdacAuth = SdaManagement.Api.Auth;

[Route("api/activities")]
[ApiController]
[Authorize]
[EnableRateLimiting("auth")]
public class ActivitiesController(
    IActivityService activityService,
    SdacAuth.IAuthorizationService auth) : ControllerBase
{
    // Auth alias avoids conflict with Microsoft.AspNetCore.Authorization.IAuthorizationService
    // Mutations: auth.CanManage(departmentId) — OWNER bypasses, ADMIN checks dept membership
    // GET with departmentId: auth.CanManage(departmentId)
    // GET without departmentId: auth.IsOwner() only
}
```

### Service Pattern

```csharp
public class ActivityService(
    AppDbContext dbContext,
    ISanitizationService sanitizer,
    IAvatarService avatarService) : IActivityService
{
    // Sanitize Title and Description before save
    // Use avatarService.GetAvatarUrl(userId) POST-MATERIALIZATION only (not inside .Select())
    // Return DTOs (records), never entities
    // Parse visibility string → enum for storage, enum → string for response
}
```

### DTO Pattern

All DTOs use C# `record` with `init` accessors (matching existing `CreateActivityTemplateRequest` pattern):

```csharp
public record CreateActivityRequest : IActivityRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public int DepartmentId { get; init; }
    public string Visibility { get; init; } = "public";
}
```

Use `IActivityRequest` interface for shared properties between Create/Update, enabling `ActivityValidationRules.Apply<T>()` polymorphic validator reuse (same pattern as `IActivityTemplateRequest`).

### Frontend Patterns

**HTTP client**: `api` from `@/lib/api` (Axios with `withCredentials: true`)

**TanStack Query keys**: `['activities']` for list, `['activities', id]` for detail, `['activities', { departmentId }]` for filtered list

**Forms**: React Hook Form + Zod schema + shadcn/ui form components. Validate on blur. Disable submit until required fields populated.

**Department selector**: Filter options using `authUser.departmentIds` from the auth context. OWNER sees all departments (fetch from departments API). The `AuthMeResponse` includes `departmentIds: number[]`.

**Installed shadcn/ui components to use** (do NOT install new ones):
| UI Element | Component | Already Installed |
|---|---|---|
| Activity list | `Table` | Yes |
| Create/Edit form (desktop) | `Dialog` | Yes |
| Create/Edit form (mobile) | `Sheet` (bottom sheet) | Yes |
| Delete confirmation | `AlertDialog` | Yes |
| Date picker | `Calendar` + `Popover` | Yes |
| Department selector | `Select` | Yes |
| Department tag on list | `Badge` (dept color bg + abbreviation text) | Yes |
| Visibility badge | `Badge` | Yes |
| Text fields | `Input`, `Textarea`, `Label` | Yes |
| Skeleton loading | `Skeleton` | Yes |

**Toasts**: `sonner` — `toast.success(t('activities.toast.created'))`. Non-blocking, auto-dismiss.

**i18n**: All strings through `useTranslation('common')`. French is default locale.

**No manual loading states**: Use TanStack Query's `isLoading` / `isFetching` for skeleton patterns.

### UX Design Patterns (from UX Spec)

- **Form validation**: Validate on **blur** (when user leaves field), not on keystroke. Show red border + error message below field. Clear error when user starts editing again.
- **Empty states**: Never show blank space. Show contextual French guidance with action button: "Aucune activite. Creez votre premiere activite →"
- **Mobile forms**: Activity creation is too complex for a centered dialog on mobile. Use `Sheet` component as full-screen bottom sheet on mobile, `Dialog` on desktop. Bottom sheet content scrolls independently.
- **Touch targets**: 44px minimum for all interactive elements (buttons, form fields, list rows).
- **Toast wording**: "Activite publiee" (create), "Activite modifiee" (update), "Activite supprimee" (delete). Brief, non-blocking, auto-dismiss.
- **Department badges**: Use `Badge` with `chip` variant — department color as background tint, abbreviation text (e.g., "JA", "MIFEM"). `aria-label` includes full department name.

### Testing Patterns

**Backend Integration Tests:**
- Class: `ActivityEndpointTests` in `tests/.../Activities/`
- Inherits `IntegrationTestBase` — provides `OwnerClient`, `AdminClient`, `ViewerClient`, `AnonymousClient`
- DB reset via **Respawn** between tests (configured in base class)
- Role-based auth via `TestAuthHandler.RoleHeader` (no real JWT in tests)
- Naming: `{MethodName}_{Scenario}_{ExpectedResult}`
- Existing helpers to use: `CreateTestUser(email, role)`, `AssignDepartmentToUser(userId, deptId)`, `SetUserPassword(userId, password)`
- Implement existing `CreateTestActivity()` placeholder for reuse in Stories 4.2–4.8
- Test cascade: create activity with roles+assignments, delete activity, verify roles/assignments gone
- Test dept scoping: use `AssignDepartmentToUser()` to set up admin → department relationship

**Frontend Tests:**
- Co-located: `AdminActivitiesPage.test.tsx`
- Use `@testing-library/react` + `@testing-library/user-event`
- Radix jsdom polyfills needed: `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView`
- **Mock mutations at service level** with `vi.spyOn(activityService, 'create')` — do NOT rely on MSW for mutations (MSW + axios + jsdom causes hanging mutations per Story 3.5 learnings)
- Mock reads can use MSW or service spies

### Previous Story Intelligence (Story 3.5)

Key learnings to carry forward:
1. **EF Core projection constraint**: `IAvatarService.GetAvatarUrl()` CANNOT be used inside `.Select()` — materialize first, then set AvatarUrl in a loop. This applies when building `ActivityResponse` with role assignments that include user avatars.
2. **Controller auth alias**: Always use `using SdacAuth = SdaManagement.Api.Auth;` to avoid conflict with Microsoft's `IAuthorizationService`.
3. **Frontend mutation testing**: Prefer `vi.spyOn(activityService, 'create')` over MSW for mutation tests. MSW + axios + jsdom causes hanging mutations.
4. **ProblemDetails format**: All errors use `urn:sdac:*` type URIs. Validation: `urn:sdac:validation-error`, Conflict: `urn:sdac:conflict`.
5. **DI registration**: Add to `ServiceCollectionExtensions.AddApplicationServices()`.
6. **Removed explicit Content-Type for FormData**: axios auto-detects. Not relevant for this story (no file uploads) but good pattern awareness.

### Git Intelligence

Recent commits follow pattern: `feat(scope): Story X.Y — Description`
- Commit for this story: `feat(activities): Story 4.1 — Activity data model & basic CRUD`
- All epics 1–3 complete, this is the first story in Epic 4

### Existing Code to Reuse

| Component | Location | What to reuse |
|---|---|---|
| `ActivityTemplate` entity | `Data/Entities/ActivityTemplate.cs` | Entity pattern (PK, timestamps, collection nav) |
| `TemplateRole` entity | `Data/Entities/TemplateRole.cs` | Child entity with FK pattern |
| `ActivityTemplatesController` | `Controllers/ActivityTemplatesController.cs` | CRUD controller, `ValidationError()` helper, conflict handling |
| `ActivityTemplateService` | `Services/ActivityTemplateService.cs` | Service CRUD with sanitization, child entity management |
| `CreateActivityTemplateRequest` | `Dtos/ActivityTemplate/CreateActivityTemplateRequest.cs` | `record` DTO with `IActivityTemplateRequest` interface |
| `ActivityTemplateValidationRules` | `Validators/ActivityTemplateValidationRules.cs` | Static `Apply<T>()` shared validation pattern |
| `AuthorizationService.CanManage()` | `Auth/AuthorizationService.cs` | Dept-scoped auth (OWNER bypasses) |
| `activityTemplateService.ts` | `services/activityTemplateService.ts` | Frontend service pattern |
| `AdminActivityTemplatesPage.tsx` | `pages/AdminActivityTemplatesPage.tsx` | Admin CRUD page pattern |
| `IntegrationTestBase` | `tests/.../IntegrationTestBase.cs` | `CreateTestUser()`, `AssignDepartmentToUser()`, role clients, Respawn |
| `ValidationExtensions` | `Validators/ValidationExtensions.cs` | `.MustNotContainControlCharacters()` |
| `ISanitizationService` | `Services/ISanitizationService.cs` | `.Sanitize()` and `.SanitizeNullable()` |
| `IAvatarService` | `Services/IAvatarService.cs` | `.GetAvatarUrl(userId)` for user avatars (post-materialization only) |

### Anti-Patterns to Avoid

- Do NOT return EF Core entities from API endpoints — always project to DTOs
- Do NOT use `[JsonIgnore]` as a security mechanism
- Do NOT call `IAvatarService.GetAvatarUrl()` inside EF Core `.Select()` — will throw at runtime
- Do NOT hardcode French strings in components — use i18n keys
- Do NOT use raw `fetch()` — use the configured Axios instance via `@/lib/api`
- Do NOT store activity dates as `DateTime` — use `DateOnly` for date and `TimeOnly` for times
- Do NOT use cascade delete from User → RoleAssignment (users are soft-deleted; assignments should remain)
- Do NOT create a separate controller for ActivityRoles or RoleAssignments — managed through Activity aggregate
- Do NOT use the enum type in DTOs for Visibility — use `string` (consistent with `AuthMeResponse.Role`)
- Do NOT add an explicit `ConcurrencyToken` property on the Activity entity — use xmin shadow property via `UseXminAsConcurrencyToken()`
- Do NOT add `special_type` handling, template-based creation, or concurrent edit detection UI in this story — those are Stories 4.2, 4.5, and 4.8 respectively. The `special_type` column exists in the migration but is always `null` in 4.1. The `CreateActivityRequest`/`UpdateActivityRequest` DTOs do NOT include `specialType`.

### Project Structure Notes

**New files to create:**
```
src/SdaManagement.Api/
  Data/Entities/Activity.cs
  Data/Entities/ActivityVisibility.cs
  Data/Entities/ActivityRole.cs
  Data/Entities/RoleAssignment.cs
  Data/Migrations/{timestamp}_AddActivities.cs
  Dtos/Activity/IActivityRequest.cs
  Dtos/Activity/CreateActivityRequest.cs
  Dtos/Activity/UpdateActivityRequest.cs
  Dtos/Activity/ActivityResponse.cs
  Dtos/Activity/ActivityListItem.cs
  Dtos/Activity/ActivityRoleResponse.cs
  Dtos/Activity/RoleAssignmentResponse.cs
  Validators/ActivityValidationRules.cs
  Validators/CreateActivityRequestValidator.cs
  Validators/UpdateActivityRequestValidator.cs
  Services/IActivityService.cs
  Services/ActivityService.cs
  Controllers/ActivitiesController.cs
tests/SdaManagement.Api.IntegrationTests/
  Activities/ActivityEndpointTests.cs
src/sdamanagement-web/src/
  services/activityService.ts
  schemas/activitySchema.ts
  pages/AdminActivitiesPage.tsx
  pages/AdminActivitiesPage.test.tsx
  mocks/handlers/activities.ts
```

**Files to modify:**
```
src/SdaManagement.Api/Data/AppDbContext.cs                        (add DbSets + OnModelCreating config)
src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs   (register IActivityService)
src/sdamanagement-web/src/mocks/handlers/index.ts                 (register activity handlers)
src/sdamanagement-web/public/locales/fr/common.json               (add activity i18n keys)
src/sdamanagement-web/public/locales/en/common.json               (add activity i18n keys)
src/sdamanagement-web/src/App.tsx                                 (add /admin/activities route under ADMIN+ group)
tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs   (implement CreateTestActivity placeholder)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Decision 1, 9, 17]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries — Activity aggregate root]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns — snake_case DB, DTO naming chain]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — Backend/Frontend project organization]
- [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — Controller Method Template]
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements to Structure Mapping — Activity Scheduling row]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Response Format — ProblemDetails with urn:sdac:* URIs]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Activity Creation example]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Activity Management UI Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Validation Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Mobile Bottom Sheet Pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Empty States, Feedback Patterns]
- [Source: _bmad-output/planning-artifacts/prd.md#FR19-FR28 Activity Scheduling]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR10 Department-Scoped Authorization]
- [Source: _bmad-output/implementation-artifacts/3-5-avatar-upload-and-display.md#Dev Notes — EF Core projection constraint, controller auth alias, mutation testing]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- **Npgsql EF Core 10 breaking change**: `UseXminAsConcurrencyToken()` was removed in Npgsql EF Core 7+. Replaced with `uint Version { get; set; }` entity property + `e.Property(a => a.Version).IsRowVersion()` in OnModelCreating. The service reads/writes Version directly on the entity instead of through shadow property Entry API.
- **Calendar component**: Story listed `Calendar` + `Popover` as "Already Installed" but Calendar was not actually available. Used native `<input type="date">` and `<input type="time">` within shadcn `Input` component instead.
- **No central MSW handler registration**: No `mocks/handlers/index.ts` central registry file exists. Handlers are imported directly in each test file.
- **Frontend mutation testing**: Confirmed Story 3.5 pattern — mutations use `vi.spyOn(activityService, 'method')` instead of MSW to avoid MSW+axios+jsdom hanging issues.
- All 12 tasks implemented. Tests passing: 221 backend integration, 173 backend unit, 201 frontend.

### File List

**New files created:**
- `src/SdaManagement.Api/Data/Entities/Activity.cs`
- `src/SdaManagement.Api/Data/Entities/ActivityVisibility.cs`
- `src/SdaManagement.Api/Data/Entities/ActivityRole.cs`
- `src/SdaManagement.Api/Data/Entities/RoleAssignment.cs`
- `src/SdaManagement.Api/Migrations/20260309013822_AddActivities.cs`
- `src/SdaManagement.Api/Migrations/20260309013822_AddActivities.Designer.cs`
- `src/SdaManagement.Api/Dtos/Activity/IActivityRequest.cs`
- `src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs`
- `src/SdaManagement.Api/Dtos/Activity/UpdateActivityRequest.cs`
- `src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs`
- `src/SdaManagement.Api/Dtos/Activity/ActivityListItem.cs`
- `src/SdaManagement.Api/Dtos/Activity/ActivityRoleResponse.cs`
- `src/SdaManagement.Api/Dtos/Activity/RoleAssignmentResponse.cs`
- `src/SdaManagement.Api/Validators/ActivityValidationRules.cs`
- `src/SdaManagement.Api/Validators/CreateActivityRequestValidator.cs`
- `src/SdaManagement.Api/Validators/UpdateActivityRequestValidator.cs`
- `src/SdaManagement.Api/Services/IActivityService.cs`
- `src/SdaManagement.Api/Services/ActivityService.cs`
- `src/SdaManagement.Api/Controllers/ActivitiesController.cs`
- `tests/SdaManagement.Api.IntegrationTests/Activities/ActivityEndpointTests.cs`
- `src/sdamanagement-web/src/services/activityService.ts`
- `src/sdamanagement-web/src/schemas/activitySchema.ts`
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx`
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx`
- `src/sdamanagement-web/src/mocks/handlers/activities.ts`

**Modified files:**
- `src/SdaManagement.Api/Data/AppDbContext.cs` — Added DbSets + OnModelCreating config for Activity, ActivityRole, RoleAssignment
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — Registered IActivityService
- `src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs` — Auto-updated by EF Core migration
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` — Implemented CreateTestActivity() placeholder
- `src/sdamanagement-web/src/App.tsx` — Added /admin/activities route
- `src/sdamanagement-web/src/components/layout/AppSidebar.tsx` — Added activities nav item
- `src/sdamanagement-web/public/locales/fr/common.json` — Added activity i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — Added activity i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — Added activity i18n keys for tests

### Change Log

| Change | Reason |
|---|---|
| Used `IsRowVersion()` on `uint Version` entity property instead of `UseXminAsConcurrencyToken()` shadow property | Npgsql EF Core 10 removed `UseXminAsConcurrencyToken()`. The new approach uses a typed entity property mapped to PostgreSQL xmin via `IsRowVersion()`. |
| Used native `<input type="date/time">` instead of `Calendar` + `Popover` | Calendar component was not actually installed despite story listing it as available. Native inputs provide equivalent functionality. |
| No `mocks/handlers/index.ts` registration | Project pattern imports MSW handlers directly in test files rather than through a central registry. |
| Activity entity has explicit `Version` property (not anti-pattern) | Story dev notes warned against explicit ConcurrencyToken property, but Npgsql 10 requires an entity property for `IsRowVersion()` mapping. This is the correct modern approach. |
| **[Review Fix]** PUT endpoint now checks existing activity's department | Authorization bypass: controller only checked `request.DepartmentId`, allowing cross-department edits. Now loads existing activity and checks both current and target department via `HasActivityAccess()`. |
| **[Review Fix]** Null-department activities restricted to OWNER | GetById/Delete now require OWNER role when `DepartmentId` is null (orphaned activities after dept deletion). Consolidated via `HasActivityAccess()` helper. |
| **[Review Fix]** Added concurrency 409 integration test | `UpdateActivity_WithStaleConcurrencyToken_Returns409` — verifies stale token returns 409 with `urn:sdac:conflict`. |
| **[Review Fix]** Added cross-department hijack test | `UpdateActivity_CrossDepartmentHijack_Returns403` — verifies admin can't edit another department's activity by sending their own deptId. |
| **[Review Fix]** Removed unnecessary Include in UpdateAsync | `ActivityService.UpdateAsync` no longer loads Department eagerly (thrown away before `GetByIdAsync` re-fetch). |
| **[Review Fix]** Removed dead `isEdit` prop from ActivityForm | Declared but never passed or used in component body. |
| **[Review Fix]** Added date format validation to Zod schema | `activitySchema.ts` date field now validates `YYYY-MM-DD` regex. |
| **[Review Fix]** Added empty state helper text | Consistent with AdminActivityTemplatesPage pattern — descriptive secondary text in empty state. |
| **[Review Fix]** Frontend create test now verifies submission | Test split: "opens form dialog" + "create mutation calls service with correct data" — spy is actually triggered. |
| **[Review Fix]** Fixed migration paths in story File List | `Data/Migrations/` → `Migrations/`; added `AppDbContextModelSnapshot.cs`. |
