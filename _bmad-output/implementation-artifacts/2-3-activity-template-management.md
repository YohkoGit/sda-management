# Story 2.3: Activity Template Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **OWNER**,
I want to define activity templates with default service roles and headcounts per role,
So that admins can create activities quickly by selecting a template that pre-populates roles.

## Acceptance Criteria

1. **Given** the OWNER navigating to Admin > Activity Templates
   **When** the page loads with no templates
   **Then** a smart empty state shows: "Definissez vos modeles d'activites — Sabbat, Sainte-Cene, Reunion..."

2. **Given** the template creation form
   **When** the OWNER creates "Culte du Sabbat" with default roles: Predicateur (1), Ancien de Service (1), Annonces (1), Diacres (2), Diaconesses (2)
   **Then** the activity_templates table stores the template
   **And** the template_roles table stores each default role with its headcount
   **And** templates are creation-time blueprints (no live binding to activities)

3. **Given** an existing template
   **When** the OWNER edits roles (adds "Musique Speciale" with headcount 3)
   **Then** the template is updated
   **And** existing activities created from the old version are NOT affected

4. **Given** the template list
   **When** displayed
   **Then** each template shows its name, description, and default role summary (role names + headcounts)

## Prerequisites

### Local Dev Environment
- Docker Desktop running (PostgreSQL 17 via docker-compose)
- .NET 10 SDK installed
- Node.js 20+ / npm
- Previous stories 2.1 and 2.2 completed and merged

### Database State
- Departments exist (from Story 2.2) — templates reference department context but do not FK to departments
- ChurchConfig exists (from Story 2.1) — setup flow context

## Tasks / Subtasks

- [x] **Task 1: Backend Entity & Migration** (AC: #2)
  - [x]1.1 Create `ActivityTemplate` entity (Id, Name, Description?, CreatedAt, UpdatedAt)
  - [x]1.2 Create `TemplateRole` entity (Id, ActivityTemplateId FK, RoleName, DefaultHeadcount, SortOrder, CreatedAt, UpdatedAt)
  - [x]1.3 Add `DbSet<ActivityTemplate>` and `DbSet<TemplateRole>` to AppDbContext
  - [x]1.4 Configure fluent API: one-to-many ActivityTemplate→TemplateRole, cascade delete, unique index on (activity_template_id, role_name)
  - [x]1.5 Generate EF Core migration: `dotnet ef migrations add AddActivityTemplatesAndTemplateRoles`

- [x] **Task 2: Backend DTOs** (AC: #2, #4)
  - [x]2.1 `CreateActivityTemplateRequest` — name, description?, roles list [{roleName, defaultHeadcount}]
  - [x]2.2 `UpdateActivityTemplateRequest` — name, description?, roles list [{id?, roleName, defaultHeadcount}] (full replacement strategy)
  - [x]2.3 `ActivityTemplateResponse` — id, name, description, roles [{id, roleName, defaultHeadcount, sortOrder}], createdAt, updatedAt
  - [x]2.4 `ActivityTemplateListItem` — id, name, description, roleSummary (formatted string), roleCount
  - [x]2.5 `TemplateRoleRequest` — roleName, defaultHeadcount (nested in create/update requests)
  - [x]2.6 `TemplateRoleResponse` — id, roleName, defaultHeadcount, sortOrder

- [x] **Task 3: Backend Validators** (AC: #2)
  - [x]3.1 `CreateActivityTemplateRequestValidator` — name required/max 100, description max 500, roles NotEmpty, RuleForEach roles with ChildRules
  - [x]3.2 `UpdateActivityTemplateRequestValidator` — same field rules as create
  - [x]3.3 `TemplateRoleRequestValidator` — roleName required/max 100, defaultHeadcount InclusiveBetween(1, 99)
  - [x]3.4 Unit tests for all validators using FluentValidation.TestHelper

- [x] **Task 4: Backend Service** (AC: #1, #2, #3, #4)
  - [x]4.1 `IActivityTemplateService` interface — GetAllAsync, GetByIdAsync, CreateAsync, UpdateAsync, DeleteAsync
  - [x]4.2 `ActivityTemplateService` implementation with ISanitizationService + AppDbContext
  - [x]4.3 Create: sanitize inputs, create template + roles in single transaction, set SortOrder from array index
  - [x]4.4 Update: full role replacement strategy — delete existing roles, insert new roles (simpler than diff, template editing is infrequent)
  - [x]4.5 GetAll: `.Select()` projection to ActivityTemplateListItem with roleSummary built from roles
  - [x]4.6 GetById: `.Include(t => t.Roles).Select()` projection to ActivityTemplateResponse
  - [x]4.7 Delete: cascade deletes TemplateRoles automatically

- [x] **Task 5: Backend Controller** (AC: #1, #2, #3, #4)
  - [x]5.1 `ActivityTemplatesController` at `/api/activity-templates` — [Authorize], [EnableRateLimiting("auth")]
  - [x]5.2 GET `/api/activity-templates` — authenticated, returns list
  - [x]5.3 GET `/api/activity-templates/{id}` — authenticated, returns detail with roles
  - [x]5.4 POST `/api/activity-templates` — OWNER only, validator injection, returns 201 with Location header
  - [x]5.5 PUT `/api/activity-templates/{id}` — OWNER only, full replacement of roles
  - [x]5.6 DELETE `/api/activity-templates/{id}` — OWNER only, returns 204
  - [x]5.7 Register `IActivityTemplateService` in `ServiceCollectionExtensions.AddApplicationServices()`

- [x] **Task 6: Backend Integration Tests** (AC: #1, #2, #3, #4)
  - [x]6.1 GET list — as Viewer returns empty list (200), as Anonymous returns 401
  - [x]6.2 POST — as Owner creates template with roles (201), as Admin returns 403
  - [x]6.3 POST — validation errors return 400 ProblemDetails (empty name, no roles, headcount 0)
  - [x]6.4 POST — duplicate template name returns 409 Conflict
  - [x]6.5 POST — HTML sanitization strips tags from name/description/roleName
  - [x]6.6 GET by id — returns template with roles ordered by SortOrder
  - [x]6.7 GET by id — not found returns 404
  - [x]6.8 PUT — OWNER updates template (roles fully replaced), returns 200
  - [x]6.9 PUT — Admin returns 403
  - [x]6.10 DELETE — OWNER deletes template (cascade deletes roles), returns 204
  - [x]6.11 DELETE — Admin returns 403

- [x] **Task 7: Frontend Schema & Service** (AC: #2)
  - [x]7.1 `activityTemplateSchema.ts` — Zod schemas for create/update with nested roleSchema, `z.infer` types
  - [x]7.2 `activityTemplateSchema.test.ts` — validation edge cases (empty roles array, headcount bounds, name length)
  - [x]7.3 `activityTemplateService.ts` — API service (getAll, getById, create, update, delete) with TypeScript interfaces

- [x] **Task 8: Frontend Page & Components** (AC: #1, #2, #3, #4)
  - [x]8.1 `AdminActivityTemplatesPage.tsx` — grid layout, empty state, create button, query key `["activity-templates"]`
  - [x]8.2 `ActivityTemplateCard.tsx` — card showing name, description, role summary chips, edit/delete buttons
  - [x]8.3 `ActivityTemplateFormDialog.tsx` — create/edit form with dynamic role rows (useFieldArray), headcount number inputs
  - [x]8.4 `TemplateRoleRow.tsx` — single role row with roleName input + headcount stepper + remove button
  - [x]8.5 Barrel export `components/activity-template/index.ts`

- [x] **Task 9: Frontend Routing, Navigation & i18n** (AC: #1)
  - [x]9.1 Add lazy route in `App.tsx`: `/admin/activity-templates` → `AdminActivityTemplatesPage`
  - [x]9.2 Add nav item in `AppSidebar.tsx`: labelKey `nav.auth.adminActivityTemplates`, icon `FileText`, minRole `OWNER`
  - [x]9.3 Add i18n keys to `fr/common.json` and `en/common.json` — page title, empty state, form labels, messages
  - [x]9.4 MSW handlers in `mocks/handlers/activityTemplates.ts`

- [x] **Task 10: Frontend Tests** (AC: #1, #2, #3, #4)
  - [x]10.1 `AdminActivityTemplatesPage.test.tsx` — empty state render, template list render, OWNER access, non-OWNER access denied
  - [x]10.2 Form dialog test — create with roles, edit with role replacement, validation errors

## Dev Notes

### Architecture Pattern: Aggregate Root + Children (Same as Department → SubMinistry)

ActivityTemplate is an aggregate root that owns TemplateRoles. This is structurally identical to how Department owns SubMinistries in Story 2.2. Follow the exact same patterns:

- **Entity configuration**: `HasMany(t => t.Roles).WithOne(r => r.ActivityTemplate).HasForeignKey(r => r.ActivityTemplateId).OnDelete(DeleteBehavior.Cascade)`
- **Unique constraint**: composite index on `(activity_template_id, role_name)` — prevents duplicate role names within a template
- **Unique constraint**: unique index on `name` for ActivityTemplate — prevents duplicate template names
- **Cascade delete**: deleting a template automatically deletes all its roles

### Key Difference from Department Pattern: Full Role Replacement on Update

Unlike SubMinistries (which have separate add/edit/delete endpoints), TemplateRoles use a **full replacement strategy** on template update:
- The `UpdateActivityTemplateRequest` includes the complete roles array
- Service deletes all existing TemplateRoles, then inserts the new ones from the request
- This is simpler than differential updates and acceptable because template editing is infrequent
- The frontend sends the full role list on every save

### Template as Creation-Time Blueprint

Templates have **NO foreign key to activities**. When an admin creates an activity from a template (Epic 4, Story 4.2), the system:
1. Reads the template's default roles and headcounts
2. Copies those values into the new Activity's ActivityRoles
3. The template and activity are completely independent after creation

Do NOT create any FK relationship between ActivityTemplate and Activity entities. They are decoupled by design.

### Role SortOrder Convention

TemplateRoles have a `SortOrder` int field that preserves the order the OWNER defined them. Set from the array index during create/update (0-based). Display roles sorted by SortOrder ascending.

### Form UX: Dynamic Role Rows

The template creation/edit form uses `react-hook-form`'s `useFieldArray` for dynamic role management:
- "Add Role" button appends a new empty row
- Each row: roleName text input + defaultHeadcount number input (min 1, max 99) + remove button
- At least 1 role required (validated by Zod and FluentValidation)
- Role rows are ordered — SortOrder derived from array position

### Empty State Message

French: "Definissez vos modeles d'activites — Sabbat, Sainte-Cene, Reunion..."
This guides the OWNER to understand what templates are for. Follow the exact same empty state card pattern as AdminDepartmentsPage.

### No Pagination Needed

Similar to departments, templates are a small collection (typically <10). Simple list query with `OrderBy(t => t.Name)` is sufficient.

### Project Structure Notes

All files follow the established directory conventions:

**Backend:**
```
src/SdaManagement.Api/
├── Data/Entities/
│   ├── ActivityTemplate.cs          (NEW)
│   └── TemplateRole.cs              (NEW)
├── Dtos/ActivityTemplate/           (NEW folder)
│   ├── CreateActivityTemplateRequest.cs
│   ├── UpdateActivityTemplateRequest.cs
│   ├── ActivityTemplateResponse.cs
│   ├── ActivityTemplateListItem.cs
│   ├── TemplateRoleRequest.cs
│   └── TemplateRoleResponse.cs
├── Validators/
│   ├── CreateActivityTemplateRequestValidator.cs   (NEW)
│   ├── UpdateActivityTemplateRequestValidator.cs   (NEW)
│   └── TemplateRoleRequestValidator.cs             (NEW)
├── Services/
│   ├── IActivityTemplateService.cs  (NEW)
│   └── ActivityTemplateService.cs   (NEW)
├── Controllers/
│   └── ActivityTemplatesController.cs (NEW)
├── Extensions/
│   └── ServiceCollectionExtensions.cs (MODIFY — add service registration)
└── Data/
    ├── AppDbContext.cs               (MODIFY — add DbSets + fluent config)
    └── Migrations/
        └── {timestamp}_AddActivityTemplatesAndTemplateRoles.cs (NEW)
```

**Frontend:**
```
src/sdamanagement-web/src/
├── schemas/
│   ├── activityTemplateSchema.ts        (NEW)
│   └── activityTemplateSchema.test.ts   (NEW)
├── services/
│   └── activityTemplateService.ts       (NEW)
├── pages/
│   ├── AdminActivityTemplatesPage.tsx       (NEW)
│   └── AdminActivityTemplatesPage.test.tsx  (NEW)
├── components/activity-template/        (NEW folder)
│   ├── ActivityTemplateCard.tsx
│   ├── ActivityTemplateFormDialog.tsx
│   ├── TemplateRoleRow.tsx
│   └── index.ts
├── mocks/handlers/
│   └── activityTemplates.ts             (NEW)
├── App.tsx                              (MODIFY — add route)
├── components/layout/AppSidebar.tsx     (MODIFY — add nav item)
└── public/locales/
    ├── fr/common.json                   (MODIFY — add i18n keys)
    └── en/common.json                   (MODIFY — add i18n keys)
```

**Tests:**
```
tests/SdaManagement.Api.IntegrationTests/
└── ActivityTemplates/
    └── ActivityTemplateEndpointTests.cs  (NEW)
tests/SdaManagement.Api.UnitTests/
└── Validators/
    ├── CreateActivityTemplateRequestValidatorTests.cs  (NEW)
    └── TemplateRoleRequestValidatorTests.cs            (NEW)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3] — Acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/architecture.md#Activity Scheduling] — ActivityTemplate entity, flexible activity model, templates as blueprints
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Naming] — snake_case convention via UseSnakeCaseNamingConvention()
- [Source: _bmad-output/planning-artifacts/architecture.md#DTO Naming] — Create{Entity}Request, {Entity}Response, {Entity}ListItem pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Controller Method Template] — auth check → service call → return
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Strategy] — FluentValidation 12.x + Zod 4.x dual validation
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend State] — TanStack Query for server state, useFieldArray for dynamic forms
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines] — All 10 mandatory agent rules
- [Source: _bmad-output/planning-artifacts/architecture.md#Anti-Patterns] — Forbidden patterns list
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Method Conventions] — Return DTOs, Async suffix, SaveChangesAsync
- [Source: _bmad-output/planning-artifacts/architecture.md#Input Sanitization Pipeline] — FluentValidation → HtmlSanitizer → EF Core → React JSX

## Technical Requirements

### Backend Stack
- **.NET 10 / ASP.NET Core / EF Core 10** — C# with primary constructors
- **PostgreSQL 17** — snake_case naming via `UseSnakeCaseNamingConvention()`
- **FluentValidation 12.x** — one validator per request DTO, auto-registered from assembly
- **HtmlSanitizer 9.x** — sanitize all text before persistence via `ISanitizationService`
- **Shouldly** — assertion library for tests
- **Testcontainers.PostgreSql** — real PostgreSQL in integration tests

### Frontend Stack
- **React 18+ / TypeScript / Vite**
- **TanStack Query** — `queryKey: ["activity-templates"]` for list, `["activity-templates", id]` for detail
- **React Hook Form 7.x + Zod 4.x** — `useFieldArray` for dynamic template roles
- **shadcn/ui** — Card, Dialog, AlertDialog, Button, Input, Label, FormField components
- **react-i18next** — all strings through `t()`, French-first
- **sonner** — toast notifications
- **MSW** — mock handlers for testing
- **Lucide React** — `FileText` icon for nav item

### Architecture Compliance

**Controller pattern (mandatory):**
```csharp
[HttpPost]
public async Task<IActionResult> CreateTemplate(
    [FromBody] CreateActivityTemplateRequest request,
    [FromServices] IValidator<CreateActivityTemplateRequest> validator)
{
    if (!_auth.IsOwner()) return Forbid();
    var validation = await validator.ValidateAsync(request);
    if (!validation.IsValid) return ValidationError(validation);
    var result = await _templateService.CreateAsync(request);
    return CreatedAtAction(nameof(GetTemplate), new { id = result.Id }, result);
}
```

**Service pattern (mandatory):**
- Inject `AppDbContext` + `ISanitizationService` via primary constructor
- Always `.Select()` project to DTOs — never return entities
- `SaveChangesAsync()` for all mutations
- Return `null` for not-found (controller maps to 404)
- Catch `DbUpdateException` with PostgresException SqlState "23505" for unique constraint → return to controller for 409

**Validator pattern (mandatory):**
```csharp
public class CreateActivityTemplateRequestValidator : AbstractValidator<CreateActivityTemplateRequest>
{
    public CreateActivityTemplateRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        RuleFor(x => x.Description).MaximumLength(500).MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.Description));
        RuleFor(x => x.Roles).NotEmpty().WithMessage("At least one role is required.");
        RuleForEach(x => x.Roles).SetValidator(new TemplateRoleRequestValidator());
    }
}
```

**Frontend form pattern (mandatory):**
```typescript
const { control, handleSubmit, formState: { errors } } = useForm<ActivityTemplateFormData>({
  resolver: zodResolver(activityTemplateSchema),
  defaultValues: isEdit ? existingTemplate : { name: "", description: "", roles: [{ roleName: "", defaultHeadcount: 1 }] },
  mode: "onBlur",
});
const { fields, append, remove } = useFieldArray({ control, name: "roles" });
```

**i18n key pattern (mandatory):**
```
pages.adminActivityTemplates.title
pages.adminActivityTemplates.emptyState
pages.adminActivityTemplates.emptyStateHelper
pages.adminActivityTemplates.createButton
pages.adminActivityTemplates.form.createTitle
pages.adminActivityTemplates.form.editTitle
pages.adminActivityTemplates.form.name
pages.adminActivityTemplates.form.namePlaceholder
pages.adminActivityTemplates.form.description
pages.adminActivityTemplates.form.descriptionPlaceholder
pages.adminActivityTemplates.form.roles
pages.adminActivityTemplates.form.addRole
pages.adminActivityTemplates.form.roleName
pages.adminActivityTemplates.form.roleNamePlaceholder
pages.adminActivityTemplates.form.headcount
pages.adminActivityTemplates.form.save
pages.adminActivityTemplates.form.saving
pages.adminActivityTemplates.form.cancel
pages.adminActivityTemplates.card.edit
pages.adminActivityTemplates.card.delete
pages.adminActivityTemplates.card.roles
pages.adminActivityTemplates.createSuccess
pages.adminActivityTemplates.updateSuccess
pages.adminActivityTemplates.deleteSuccess
pages.adminActivityTemplates.deleteError
pages.adminActivityTemplates.conflictError
pages.adminActivityTemplates.deleteConfirmTitle
pages.adminActivityTemplates.deleteConfirmMessage
pages.adminActivityTemplates.deleteConfirmAction
```

**Query key pattern:**
```typescript
["activity-templates"]          // List all
["activity-templates", id]      // Get single
```

### Testing Requirements

**Backend integration tests (extend IntegrationTestBase):**
- Use `OwnerClient`, `AdminClient`, `ViewerClient`, `AnonymousClient`
- Assert 403 for every OWNER-only endpoint when called by Admin/Viewer
- Assert 401 for anonymous access
- Assert 400 with ProblemDetails for validation errors
- Assert 409 for duplicate template name
- Assert HTML sanitization works
- Assert cascade delete removes roles
- Use Shouldly assertions (`.ShouldBe()`, `.ShouldContain()`)

**Backend unit tests:**
- Validator tests using `FluentValidation.TestHelper` (`.TestValidate()`)
- Test: empty name, too-long name, empty roles array, headcount 0, headcount 100, control characters in text

**Frontend schema tests:**
- Valid template with roles passes
- Empty name rejected
- Empty roles array rejected
- Headcount < 1 rejected
- Headcount > 99 rejected

**Frontend page tests (co-located .test.tsx):**
- Empty state renders correctly
- Template list renders cards
- OWNER can create template
- Non-OWNER sees access denied
- Form validation errors display

## Previous Story Intelligence

### From Story 2.2 (Department CRUD & Sub-Ministries)

**Patterns to reuse directly:**
- Controller structure: copy `DepartmentsController` pattern (auth check → validator → service → return)
- Service structure: copy `DepartmentService` (primary constructor injection, ISanitizationService, .Select() projections)
- DTO structure: copy namespace organization `Dtos/ActivityTemplate/` with one file per DTO
- Frontend page: copy `AdminDepartmentsPage` layout (empty state → grid → cards → form dialog)
- Frontend card: copy `DepartmentCard` (name, description, action buttons)
- Test structure: copy `DepartmentEndpointTests` (same role-based assertion pattern)
- Zod schema: copy pattern from `departmentSchema.ts`

**Bugs to avoid:**
- Role case mismatch: always normalize with `.toUpperCase()` when comparing roles on frontend (already fixed in ProtectedRoute.tsx)
- Rate limiting: dev limit is 100 req/min (already bumped in appsettings.Development.json)
- Unique constraint handling: catch `DbUpdateException` with PostgresException SqlState "23505" and return 409

**Key learnings:**
- Uniqueness enforced at DB level (not FluentValidation) — service catches constraint violations
- `.Select()` projection in all read endpoints — never return entities
- Sub-entity CRUD can be inline (SubMinistryManager) or full-replacement (TemplateRoles) — this story uses full replacement
- Empty state pattern: dedicated card with i18n message + helper text + create button
- Color picker UX: `react-colorful` in Popover (not relevant for templates, but demonstrates UX attention)
- Test infrastructure: IntegrationTestBase handles all role client setup and DB reset

### From Git History (Last 5 Commits)

Recent commit pattern: `feat({scope}): Story X.Y — {description}`
- `feat(departments): Story 2.2 — Department CRUD & sub-ministries with code review fixes`
- `feat(config): Story 2.1 — Church identity settings with code review fixes`
- Stories build sequentially on established infrastructure
- Code review fixes are incorporated before merge

## Latest Technical Information

### EF Core 10 — One-to-Many Configuration
```csharp
// Correct pattern for ActivityTemplate → TemplateRole
modelBuilder.Entity<ActivityTemplate>()
    .HasMany(t => t.Roles)
    .WithOne(r => r.ActivityTemplate)
    .HasForeignKey(r => r.ActivityTemplateId)
    .OnDelete(DeleteBehavior.Cascade);
```

### FluentValidation 12.x — Collection Validation
```csharp
// Correct pattern for validating nested role collection
RuleFor(x => x.Roles).NotEmpty().WithMessage("At least one role is required.");
RuleForEach(x => x.Roles).SetValidator(new TemplateRoleRequestValidator());
// OR inline with ChildRules:
RuleForEach(x => x.Roles).ChildRules(role => {
    role.RuleFor(x => x.RoleName).NotEmpty().MaximumLength(100);
    role.RuleFor(x => x.DefaultHeadcount).InclusiveBetween(1, 99);
});
```

### React Hook Form — useFieldArray for Dynamic Roles
```typescript
const { fields, append, remove } = useFieldArray({ control, name: "roles" });
// Append new role: append({ roleName: "", defaultHeadcount: 1 })
// Remove role: remove(index)
// Fields array drives rendering: fields.map((field, index) => ...)
```

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Build cache issue on Windows required `rm -rf obj bin` before clean builds

### Completion Notes List

- Task 1: Created ActivityTemplate and TemplateRole entities with proper relationships, unique constraints (name for templates, composite activity_template_id+role_name for roles), cascade delete, and generated EF Core migration
- Task 2: Created all 6 DTOs following established naming conventions (Create/Update requests, Response, ListItem, TemplateRoleRequest/Response)
- Task 3: Created 3 FluentValidation validators with child validator pattern for nested roles. Created comprehensive unit tests (added to existing 75 tests, now 87 total)
- Task 4: Created IActivityTemplateService and ActivityTemplateService with full replacement strategy for role updates, ISanitizationService integration, .Select() projections
- Task 5: Created ActivityTemplatesController at /api/activity-templates with [Authorize], [EnableRateLimiting("auth")], OWNER-only write operations, 409 conflict handling for duplicate names
- Task 6: Created 15 integration tests covering: auth (401/403), CRUD operations, validation (400), conflict (409), HTML sanitization, cascade delete, role ordering
- Task 7: Created Zod schema with nested templateRoleSchema, activityTemplateService with TypeScript interfaces, and 12 schema validation tests
- Task 8: Created AdminActivityTemplatesPage, ActivityTemplateCard, ActivityTemplateFormDialog (with useFieldArray), TemplateRoleRow components following department patterns
- Task 9: Added lazy route, nav item with FileText icon, FR/EN i18n keys, MSW mock handlers
- Task 10: Created 6 page tests (empty state, list render, access denied, dialog open, validation error, delete confirmation). Added i18n keys to test-utils.tsx

### Change Log

- 2026-03-04: Story 2.3 implemented — Activity Template Management with full CRUD, role management with full replacement strategy, i18n, tests
- 2026-03-04: Second code review fixes applied (0 HIGH, 2 MEDIUM, 5 LOW):
  - M1: Added generic error toast fallback in ActivityTemplateFormDialog onError handler
  - M2: Resolved by eliminating the getById detail fetch from ActivityTemplateCard — roles now carried on ActivityTemplateListItem (L2 fix makes this obsolete)
  - L1: Created UpdateActivityTemplateRequestValidatorTests.cs
  - L2: Added structured `Roles` list to ActivityTemplateListItem DTO+service+TS interface; ActivityTemplateCard now renders role chips from template.roles directly (removes fragile lookbehind regex; eliminates getById query on card entirely)
  - L3: UpdateAsync now returns fresh projection via GetByIdAsync after SaveChangesAsync (removes reliance on EF Core in-memory collection state)
  - L4: Wrapped ActivityTemplateFormDialog form inputs in fieldset disabled={mutation.isPending}; Cancel button remains active
  - L5: Added UpdateTemplate_AsAnonymous_Returns401 and DeleteTemplate_AsAnonymous_Returns401 integration tests
- 2026-03-04: Code review fixes applied (1 HIGH, 5 MEDIUM, 3 LOW):
  - H1: Added duplicate role name validation (FluentValidation Must rule + Zod superRefine + integration test)
  - M1: Removed dead IsAuthenticated() checks from GetAll/GetById (redundant with [Authorize])
  - M2: Added 3 Viewer 403 integration tests for POST/PUT/DELETE
  - M3: Added UpdateTemplate_DuplicateName_Returns409 integration test
  - M4: Added loading spinner to edit dialog while fetching template detail
  - M5: DRYed validators via shared ActivityTemplateValidationRules + IActivityTemplateRequest interface
  - L1: Fixed fragile roleSummary parsing with lookbehind regex split
  - L2: Added headcount clamping to direct number input in TemplateRoleRow
  - L3: Updated File List with missing files

### File List

**New files:**
- src/SdaManagement.Api/Data/Entities/ActivityTemplate.cs
- src/SdaManagement.Api/Data/Entities/TemplateRole.cs
- src/SdaManagement.Api/Dtos/ActivityTemplate/IActivityTemplateRequest.cs (code review: shared interface)
- src/SdaManagement.Api/Dtos/ActivityTemplate/CreateActivityTemplateRequest.cs
- src/SdaManagement.Api/Dtos/ActivityTemplate/UpdateActivityTemplateRequest.cs
- src/SdaManagement.Api/Dtos/ActivityTemplate/ActivityTemplateResponse.cs
- src/SdaManagement.Api/Dtos/ActivityTemplate/ActivityTemplateListItem.cs
- src/SdaManagement.Api/Dtos/ActivityTemplate/TemplateRoleRequest.cs
- src/SdaManagement.Api/Dtos/ActivityTemplate/TemplateRoleResponse.cs
- src/SdaManagement.Api/Validators/ActivityTemplateValidationRules.cs (code review: shared validation)
- src/SdaManagement.Api/Validators/CreateActivityTemplateRequestValidator.cs
- src/SdaManagement.Api/Validators/UpdateActivityTemplateRequestValidator.cs
- src/SdaManagement.Api/Validators/TemplateRoleRequestValidator.cs
- src/SdaManagement.Api/Services/IActivityTemplateService.cs
- src/SdaManagement.Api/Services/ActivityTemplateService.cs
- src/SdaManagement.Api/Controllers/ActivityTemplatesController.cs
- src/SdaManagement.Api/Migrations/20260304174613_AddActivityTemplatesAndTemplateRoles.cs
- src/SdaManagement.Api/Migrations/20260304174613_AddActivityTemplatesAndTemplateRoles.Designer.cs
- tests/SdaManagement.Api.UnitTests/Validators/CreateActivityTemplateRequestValidatorTests.cs
- tests/SdaManagement.Api.UnitTests/Validators/TemplateRoleRequestValidatorTests.cs
- tests/SdaManagement.Api.IntegrationTests/ActivityTemplates/ActivityTemplateEndpointTests.cs
- src/sdamanagement-web/src/schemas/activityTemplateSchema.ts
- src/sdamanagement-web/src/schemas/activityTemplateSchema.test.ts
- src/sdamanagement-web/src/services/activityTemplateService.ts
- src/sdamanagement-web/src/pages/AdminActivityTemplatesPage.tsx
- src/sdamanagement-web/src/pages/AdminActivityTemplatesPage.test.tsx
- src/sdamanagement-web/src/components/activity-template/ActivityTemplateCard.tsx
- src/sdamanagement-web/src/components/activity-template/ActivityTemplateFormDialog.tsx
- src/sdamanagement-web/src/components/activity-template/TemplateRoleRow.tsx
- src/sdamanagement-web/src/components/activity-template/index.ts
- src/sdamanagement-web/src/mocks/handlers/activityTemplates.ts

**Modified files:**
- src/SdaManagement.Api/Data/AppDbContext.cs (added DbSets + fluent config)
- src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs (service registration)
- src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs (auto-generated by EF migration)
- src/sdamanagement-web/src/App.tsx (added route)
- src/sdamanagement-web/src/components/layout/AppSidebar.tsx (added nav item)
- src/sdamanagement-web/public/locales/fr/common.json (added i18n keys)
- src/sdamanagement-web/public/locales/en/common.json (added i18n keys)
- src/sdamanagement-web/src/test-utils.tsx (added i18n test translations)
- tests/SdaManagement.Api.UnitTests/SdaManagement.Api.UnitTests.csproj (added FluentValidation package)

**Additional files from 2nd code review:**
- tests/SdaManagement.Api.UnitTests/Validators/UpdateActivityTemplateRequestValidatorTests.cs (NEW)

**Pre-existing changes included in working tree (not from Story 2.3):**
- src/SdaManagement.Api/Services/TokenService.cs (Story 1.7 cookie-clearing fix)
- tests/SdaManagement.Api.IntegrationTests/Auth/LogoutEndpointTests.cs (Story 1.7 HTTPS test client fix)
