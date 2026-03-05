# Story 2.4: Recurring Program Schedule Configuration

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **OWNER**,
I want to configure recurring program schedules (Sabbath School times, Divine Service times, AY times),
So that the public page can display consistent program times without per-activity entry.

## Acceptance Criteria

1. **Given** the OWNER navigating to Admin > Program Schedules
   **When** the page loads with no program schedules
   **Then** a smart empty state shows: "Configurez les horaires de vos programmes reguliers — Ecole du Sabbat, Culte Divin, JA..."

2. **Given** the program schedule creation form
   **When** the OWNER creates "Ecole du Sabbat" on Saturday 9:30-10:30 hosted by "Fr. Joseph" associated with department "Ecole du Sabbat"
   **Then** the `program_schedules` table stores the entry with title, day_of_week, start_time, end_time, host_name, department_id
   **And** the public API endpoint can serve this as a recurring program time (FR4, FR58)

3. **Given** existing program entries
   **When** the OWNER edits times or host
   **Then** changes are persisted and reflected via API immediately

4. **Given** the program schedule list
   **When** displayed
   **Then** each entry shows its title, day of week (localized), start/end time, host name, and associated department name
   **And** entries are ordered by day of week then start time

5. **Given** a duplicate program (same title + same day of week)
   **When** the OWNER attempts to save
   **Then** a 409 Conflict is returned and the UI shows an appropriate error message

## Prerequisites

### Local Dev Environment
- Docker Desktop running (PostgreSQL 17 via docker-compose)
- .NET 10 SDK installed
- Node.js 20+ / npm
- Previous stories 2.1, 2.2, and 2.3 completed and merged

### Database State
- Departments exist (from Story 2.2) — program schedules optionally FK to departments
- ChurchConfig exists (from Story 2.1) — setup flow context
- ActivityTemplates exist (from Story 2.3) — prior admin patterns established

## Tasks / Subtasks

- [x] **Task 1: Backend Entity & Migration** (AC: #2)
  - [x] 1.1 Create `ProgramSchedule` entity (Id, Title, DayOfWeek, StartTime, EndTime, HostName?, DepartmentId? FK, CreatedAt, UpdatedAt)
  - [x] 1.2 Add `DbSet<ProgramSchedule>` to AppDbContext
  - [x] 1.3 Configure fluent API: optional FK to Department (no cascade delete — set null on department deletion), unique index on (title, day_of_week), CHECK constraint on day_of_week (0-6)
  - [x] 1.4 Generate EF Core migration: `dotnet ef migrations add AddProgramSchedules` — include `migrationBuilder.Sql("ALTER TABLE program_schedules ADD CONSTRAINT chk_day_of_week CHECK (day_of_week >= 0 AND day_of_week <= 6);")`

- [x] **Task 2: Backend DTOs** (AC: #2, #4)
  - [x] 2.1 `CreateProgramScheduleRequest` — title, dayOfWeek (int 0-6), startTime (string "HH:mm"), endTime (string "HH:mm"), hostName?, departmentId?
  - [x] 2.2 `UpdateProgramScheduleRequest` — same fields as create
  - [x] 2.3 `ProgramScheduleResponse` — id, title, dayOfWeek (int), startTime, endTime, hostName, departmentId, departmentName, createdAt, updatedAt
  - [x] 2.4 `ProgramScheduleListItem` — id, title, dayOfWeek (int), startTime, endTime, hostName, departmentName

- [x] **Task 3: Backend Validators** (AC: #2, #5)
  - [x] 3.1 `CreateProgramScheduleRequestValidator` — title required/max 100, dayOfWeek 0-6, startTime/endTime required valid format, endTime > startTime, hostName max 100 when present, departmentId > 0 when present
  - [x] 3.2 `UpdateProgramScheduleRequestValidator` — same field rules as create
  - [x] 3.3 Unit tests for all validators using FluentValidation.TestHelper

- [x] **Task 4: Backend Service** (AC: #1, #2, #3, #4, #5)
  - [x] 4.1 `IProgramScheduleService` interface — GetAllAsync, GetByIdAsync, CreateAsync, UpdateAsync, DeleteAsync
  - [x] 4.2 `ProgramScheduleService` implementation with ISanitizationService + AppDbContext
  - [x] 4.3 Create: sanitize inputs, parse TimeOnly from string, verify departmentId exists (if provided) before save — return null/error for invalid department, save entity
  - [x] 4.4 Update: sanitize inputs, update entity fields
  - [x] 4.5 GetAll: `.OrderBy(p => p.DayOfWeek).ThenBy(p => p.StartTime).Select()` projection to ProgramScheduleListItem with department name join
  - [x] 4.6 GetById: `.Include()` department, `.Select()` projection to ProgramScheduleResponse
  - [x] 4.7 Delete: simple removal (no children to cascade)

- [x] **Task 5: Backend Controller** (AC: #1, #2, #3, #4, #5)
  - [x] 5.1 `ProgramSchedulesController` at `/api/program-schedules` — [Authorize], [EnableRateLimiting("auth")]
  - [x] 5.2 GET `/api/program-schedules` — authenticated, returns ordered list
  - [x] 5.3 GET `/api/program-schedules/{id}` — authenticated, returns detail
  - [x] 5.4 POST `/api/program-schedules` — OWNER only, validator injection, returns 201 with Location header
  - [x] 5.5 PUT `/api/program-schedules/{id}` — OWNER only, returns 200
  - [x] 5.6 DELETE `/api/program-schedules/{id}` — OWNER only, returns 204
  - [x] 5.7 Register `IProgramScheduleService` in `ServiceCollectionExtensions.AddApplicationServices()`

- [x] **Task 6: Backend Integration Tests** (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 GET list — as Viewer returns list (200), as Anonymous returns 401
  - [x] 6.2 POST — as Owner creates schedule (201), as Admin returns 403
  - [x] 6.3 POST — validation errors return 400 ProblemDetails (empty title, invalid dayOfWeek, endTime <= startTime)
  - [x] 6.4 POST — duplicate (title + dayOfWeek) returns 409 Conflict
  - [x] 6.5 POST — HTML sanitization strips tags from title/hostName
  - [x] 6.6 POST — with valid departmentId associates department; with non-existent departmentId returns 400 (service-level existence check)
  - [x] 6.7 GET by id — returns schedule with department name
  - [x] 6.8 GET by id — not found returns 404
  - [x] 6.9 PUT — OWNER updates schedule, returns 200
  - [x] 6.10 PUT — Admin/Viewer returns 403
  - [x] 6.11 DELETE — OWNER deletes schedule, returns 204
  - [x] 6.12 DELETE — Admin/Viewer returns 403
  - [x] 6.13 DELETE department that has program schedules — verify SetNull behavior (departmentId becomes null, schedule not deleted)

- [x] **Task 7: Frontend Schema & Service** (AC: #2)
  - [x] 7.1 `programScheduleSchema.ts` — Zod schema with title, dayOfWeek (0-6), startTime (HH:mm pattern), endTime (HH:mm, must be after startTime), hostName?, departmentId?
  - [x] 7.2 `programScheduleSchema.test.ts` — validation edge cases (empty title, invalid dayOfWeek, endTime before startTime, time format)
  - [x] 7.3 `programScheduleService.ts` — API service (getAll, getById, create, update, delete) with TypeScript interfaces

- [x] **Task 8: Frontend Page & Components** (AC: #1, #2, #3, #4)
  - [x] 8.1 `AdminProgramSchedulesPage.tsx` — list layout, empty state, create button, query key `["program-schedules"]`
  - [x] 8.2 `ProgramScheduleCard.tsx` — card showing title, day label, time range, host name, department badge, edit/delete buttons
  - [x] 8.3 `ProgramScheduleFormDialog.tsx` — create/edit form with day-of-week select, time inputs, optional department select, optional host name
  - [x] 8.4 Barrel export `components/program-schedule/index.ts`

- [x] **Task 9: Frontend Routing, Navigation & i18n** (AC: #1)
  - [x] 9.1 Add lazy route in `App.tsx`: `/admin/program-schedules` → `AdminProgramSchedulesPage`
  - [x] 9.2 Add nav item in `AppSidebar.tsx`: labelKey `nav.auth.adminProgramSchedules`, icon `Clock`, minRole `OWNER`
  - [x] 9.3 Add i18n keys to `fr/common.json` and `en/common.json` — page title, empty state, form labels, day names, messages
  - [x] 9.4 MSW handlers in `mocks/handlers/programSchedules.ts`

- [x] **Task 10: Frontend Tests** (AC: #1, #2, #3, #4)
  - [x] 10.1 `AdminProgramSchedulesPage.test.tsx` — empty state render, schedule list render, OWNER access, non-OWNER access denied
  - [x] 10.2 Form dialog test — create with department, edit times, validation errors (endTime before startTime)

## Dev Notes

### Architecture Pattern: Standalone Entity with Optional FK (Simpler than Template/Department)

ProgramSchedule is a standalone entity — NOT an aggregate root with children. This is structurally simpler than ActivityTemplate (which owns TemplateRoles) or Department (which owns SubMinistries). There are no child entities to manage.

The optional department association is a simple nullable FK:
- `int? DepartmentId` — nullable to allow programs not tied to any department
- On department deletion: set DepartmentId to null (NOT cascade delete — deleting a department shouldn't delete program schedules)
- The department name is resolved via `.Include()` or join at query time

### Data Types: TimeOnly + DayOfWeek

**TimeOnly (C#):**
- Maps natively to PostgreSQL `time` type via Npgsql EF Core provider
- `System.Text.Json` serializes as `"HH:mm:ss"` by default
- In DTOs, accept as string `"HH:mm"` and parse to `TimeOnly` in the service layer
- Validation: parse with `TimeOnly.TryParseExact(value, "HH:mm", ...)` — reject invalid formats

**DayOfWeek (C# enum):**
- Built-in .NET enum: Sunday=0, Monday=1, ... Saturday=6
- EF Core stores as integer by default (no special configuration needed)
- In DTOs, send/receive as `int` (0-6)
- Frontend maps integer to localized day name using i18n keys

### Unique Constraint: (Title + DayOfWeek)

Prevents duplicate programs on the same day (e.g., two "Ecole du Sabbat" on Saturday). Allows the same title on different days (e.g., "Priere" on Wednesday and "Priere" on Saturday).

Configure in AppDbContext fluent API:
```csharp
modelBuilder.Entity<ProgramSchedule>()
    .HasIndex(p => new { p.Title, p.DayOfWeek })
    .IsUnique();
```

### Ordering: Natural Sort (No SortOrder Field)

Unlike TemplateRoles which need explicit SortOrder, ProgramSchedules have a natural ordering:
- Primary: `DayOfWeek` ascending (Sunday=0 → Saturday=6)
- Secondary: `StartTime` ascending

This eliminates the need for a SortOrder field. The query is:
```csharp
.OrderBy(p => p.DayOfWeek).ThenBy(p => p.StartTime)
```

### No Pagination

Like departments and templates, program schedules are a small collection (typically 3-5 entries). Simple list query is sufficient.

### Department Dropdown in Form

The creation/edit form includes an optional department selector. Load departments from the existing `/api/departments` endpoint (query key `["departments"]`). Use a shadcn/ui Select component with a "None" option for programs not tied to a department.

### Empty State Message

French: "Configurez les horaires de vos programmes reguliers — Ecole du Sabbat, Culte Divin, JA..."
Follow the exact same empty state card pattern as AdminDepartmentsPage and AdminActivityTemplatesPage.

### Time Input UX

Use two `<Input type="time">` elements for start and end time. HTML5 time inputs render native time pickers on mobile and a time selector on desktop. This is the simplest approach and works well for the "HH:mm" format. No need for a custom time picker component.

### Public API Endpoint (Future: Story 5.3)

The admin CRUD endpoints in this story are all authenticated. Story 5.3 (Upcoming Activities & Program Times) will add a public read endpoint via `PublicController` to serve program schedules to anonymous visitors. The data infrastructure from this story enables that future consumption.

### No SignalR Needed

Program schedules are static configuration data — no real-time updates needed. Changes are infrequent (OWNER-only) and take effect on the next page load.

### Project Structure Notes

All files follow the established directory conventions:

**Backend:**
```
src/SdaManagement.Api/
├── Data/Entities/
│   └── ProgramSchedule.cs              (NEW)
├── Dtos/ProgramSchedule/               (NEW folder)
│   ├── CreateProgramScheduleRequest.cs
│   ├── UpdateProgramScheduleRequest.cs
│   ├── ProgramScheduleResponse.cs
│   └── ProgramScheduleListItem.cs
├── Validators/
│   ├── CreateProgramScheduleRequestValidator.cs   (NEW)
│   └── UpdateProgramScheduleRequestValidator.cs   (NEW)
├── Services/
│   ├── IProgramScheduleService.cs      (NEW)
│   └── ProgramScheduleService.cs       (NEW)
├── Controllers/
│   └── ProgramSchedulesController.cs   (NEW)
├── Extensions/
│   └── ServiceCollectionExtensions.cs  (MODIFY — add service registration)
└── Data/
    ├── AppDbContext.cs                  (MODIFY — add DbSet + fluent config)
    └── Migrations/
        └── {timestamp}_AddProgramSchedules.cs (NEW)
```

**Frontend:**
```
src/sdamanagement-web/src/
├── schemas/
│   ├── programScheduleSchema.ts        (NEW)
│   └── programScheduleSchema.test.ts   (NEW)
├── services/
│   └── programScheduleService.ts       (NEW)
├── pages/
│   ├── AdminProgramSchedulesPage.tsx       (NEW)
│   └── AdminProgramSchedulesPage.test.tsx  (NEW)
├── components/program-schedule/        (NEW folder)
│   ├── ProgramScheduleCard.tsx
│   ├── ProgramScheduleFormDialog.tsx
│   └── index.ts
├── mocks/handlers/
│   └── programSchedules.ts             (NEW)
├── App.tsx                              (MODIFY — add route)
├── components/layout/AppSidebar.tsx     (MODIFY — add nav item)
└── public/locales/
    ├── fr/common.json                   (MODIFY — add i18n keys)
    └── en/common.json                   (MODIFY — add i18n keys)
```

**Tests:**
```
tests/SdaManagement.Api.IntegrationTests/
└── ProgramSchedules/
    └── ProgramScheduleEndpointTests.cs  (NEW)
tests/SdaManagement.Api.UnitTests/
└── Validators/
    ├── CreateProgramScheduleRequestValidatorTests.cs  (NEW)
    └── UpdateProgramScheduleRequestValidatorTests.cs  (NEW)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4] — Acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/prd.md#FR4] — Anonymous visitors can view recurring program times
- [Source: _bmad-output/planning-artifacts/prd.md#FR58] — OWNERs can configure recurring program schedules
- [Source: _bmad-output/planning-artifacts/architecture.md#ConfigController] — Church-wide settings, OWNER only
- [Source: _bmad-output/planning-artifacts/architecture.md#Database Naming] — snake_case convention via UseSnakeCaseNamingConvention()
- [Source: _bmad-output/planning-artifacts/architecture.md#DTO Naming] — Create{Entity}Request, {Entity}Response, {Entity}ListItem pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Controller Method Template] — auth check → service call → return
- [Source: _bmad-output/planning-artifacts/architecture.md#Validation Strategy] — FluentValidation 12.x + Zod 4.x dual validation
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
- **TanStack Query** — `queryKey: ["program-schedules"]` for list, `["program-schedules", id]` for detail
- **React Hook Form 7.x + Zod 4.x** — standard form pattern (no useFieldArray needed — no nested collections)
- **shadcn/ui** — Card, Dialog, AlertDialog, Button, Input, Label, Select components
- **react-i18next** — all strings through `t()`, French-first
- **sonner** — toast notifications
- **MSW** — mock handlers for testing
- **Lucide React** — `Clock` icon for nav item

### Architecture Compliance

**Controller pattern (mandatory):**
```csharp
[HttpPost]
public async Task<IActionResult> CreateSchedule(
    [FromBody] CreateProgramScheduleRequest request,
    [FromServices] IValidator<CreateProgramScheduleRequest> validator)
{
    if (!_auth.IsOwner()) return Forbid();
    var validation = await validator.ValidateAsync(request);
    if (!validation.IsValid) return ValidationError(validation);
    var result = await _scheduleService.CreateAsync(request);
    return CreatedAtAction(nameof(GetSchedule), new { id = result.Id }, result);
}
```

**Service pattern (mandatory):**
- Inject `AppDbContext` + `ISanitizationService` via primary constructor
- Always `.Select()` project to DTOs — never return entities
- `SaveChangesAsync()` for all mutations
- Return `null` for not-found (controller maps to 404)
- Catch `DbUpdateException` with PostgresException SqlState "23505" for unique constraint → return to controller for 409
- Parse `TimeOnly` from string input: `TimeOnly.ParseExact(request.StartTime, "HH:mm")`

**Entity pattern (mandatory):**
```csharp
public class ProgramSchedule
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DayOfWeek DayOfWeek { get; set; }
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    public string? HostName { get; set; }
    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
```

**Fluent API configuration (mandatory):**
```csharp
modelBuilder.Entity<ProgramSchedule>(entity =>
{
    entity.HasIndex(p => new { p.Title, p.DayOfWeek }).IsUnique();
    entity.HasOne(p => p.Department)
        .WithMany()
        .HasForeignKey(p => p.DepartmentId)
        .OnDelete(DeleteBehavior.SetNull);
});
```

**Validator pattern (mandatory):**
```csharp
public class CreateProgramScheduleRequestValidator : AbstractValidator<CreateProgramScheduleRequest>
{
    public CreateProgramScheduleRequestValidator()
    {
        RuleFor(x => x.Title).NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        RuleFor(x => x.DayOfWeek).InclusiveBetween(0, 6);
        RuleFor(x => x.StartTime).NotEmpty().Matches(@"^\d{2}:\d{2}$")
            .Must(BeValidTime).WithMessage("Start time must be a valid time (HH:mm).");
        RuleFor(x => x.EndTime).NotEmpty().Matches(@"^\d{2}:\d{2}$")
            .Must(BeValidTime).WithMessage("End time must be a valid time (HH:mm).");
        RuleFor(x => x)
            .Must(x => TimeOnly.TryParseExact(x.EndTime, "HH:mm", out var end)
                     && TimeOnly.TryParseExact(x.StartTime, "HH:mm", out var start)
                     && end > start)
            .WithMessage("End time must be after start time.")
            .WithName("EndTime");
        RuleFor(x => x.HostName).MaximumLength(100).MustNotContainControlCharacters()
            .When(x => !string.IsNullOrEmpty(x.HostName));
        RuleFor(x => x.DepartmentId).GreaterThan(0)
            .When(x => x.DepartmentId.HasValue);
    }

    private static bool BeValidTime(string? time)
        => time is not null && TimeOnly.TryParseExact(time, "HH:mm", out _);
}
```

**i18n key pattern (mandatory):**
```
pages.adminProgramSchedules.title
pages.adminProgramSchedules.emptyState
pages.adminProgramSchedules.emptyStateHelper
pages.adminProgramSchedules.createButton
pages.adminProgramSchedules.form.createTitle
pages.adminProgramSchedules.form.editTitle
pages.adminProgramSchedules.form.title
pages.adminProgramSchedules.form.titlePlaceholder
pages.adminProgramSchedules.form.dayOfWeek
pages.adminProgramSchedules.form.startTime
pages.adminProgramSchedules.form.endTime
pages.adminProgramSchedules.form.hostName
pages.adminProgramSchedules.form.hostNamePlaceholder
pages.adminProgramSchedules.form.department
pages.adminProgramSchedules.form.departmentNone
pages.adminProgramSchedules.form.save
pages.adminProgramSchedules.form.saving
pages.adminProgramSchedules.form.cancel
pages.adminProgramSchedules.card.edit
pages.adminProgramSchedules.card.delete
pages.adminProgramSchedules.createSuccess
pages.adminProgramSchedules.updateSuccess
pages.adminProgramSchedules.deleteSuccess
pages.adminProgramSchedules.deleteError
pages.adminProgramSchedules.conflictError
pages.adminProgramSchedules.deleteConfirmTitle
pages.adminProgramSchedules.deleteConfirmMessage
pages.adminProgramSchedules.deleteConfirmAction
days.0 (Dimanche / Sunday)
days.1 (Lundi / Monday)
days.2 (Mardi / Tuesday)
days.3 (Mercredi / Wednesday)
days.4 (Jeudi / Thursday)
days.5 (Vendredi / Friday)
days.6 (Samedi / Saturday)
```

**Query key pattern:**
```typescript
["program-schedules"]          // List all
["program-schedules", id]      // Get single
["departments"]                // For department dropdown (existing)
```

### Testing Requirements

**Backend integration tests (extend IntegrationTestBase):**
- Use `OwnerClient`, `AdminClient`, `ViewerClient`, `AnonymousClient`
- Assert 403 for every OWNER-only endpoint when called by Admin/Viewer
- Assert 401 for anonymous access
- Assert 400 with ProblemDetails for validation errors (empty title, invalid dayOfWeek, endTime <= startTime, invalid time format)
- Assert 409 for duplicate (title + dayOfWeek)
- Assert HTML sanitization works on title and hostName
- Assert department name included in response when departmentId provided
- Assert null department handling (create without departmentId)
- Use Shouldly assertions (`.ShouldBe()`, `.ShouldContain()`)

**Backend unit tests:**
- Validator tests using `FluentValidation.TestHelper` (`.TestValidate()`)
- Test: empty title, too-long title, dayOfWeek -1, dayOfWeek 7, startTime invalid format, endTime before startTime, endTime equals startTime (should fail), hostName too long, control characters in text

**Frontend schema tests:**
- Valid schedule with all fields passes
- Empty title rejected
- dayOfWeek < 0 or > 6 rejected
- Invalid time format rejected
- endTime before startTime rejected
- endTime equals startTime rejected
- hostName > 100 rejected

**Frontend page tests (co-located .test.tsx):**
- Empty state renders correctly
- Schedule list renders cards with correct day labels and time formatting
- OWNER can see create button
- Non-OWNER sees access denied
- Form validation errors display (endTime before startTime)

## Previous Story Intelligence

### From Story 2.3 (Activity Template Management)

**Patterns to reuse directly:**
- Controller structure: copy `ActivityTemplatesController` pattern (auth check → validator → service → return)
- Service structure: copy `ActivityTemplateService` (primary constructor injection, ISanitizationService, .Select() projections)
- DTO structure: copy namespace organization `Dtos/ProgramSchedule/` with one file per DTO
- Frontend page: copy `AdminActivityTemplatesPage` layout (empty state → grid → cards → form dialog)
- Frontend card: copy `ActivityTemplateCard` (name, metadata, action buttons)
- Test structure: copy `ActivityTemplateEndpointTests` (same role-based assertion pattern)
- Zod schema: copy pattern from `activityTemplateSchema.ts`

**Key differences from Story 2.3:**
- No nested children (no TemplateRoles equivalent) — simpler entity, simpler form
- No useFieldArray needed — standard form with fixed fields
- Time inputs instead of text inputs for start/end time
- Department selector dropdown (loads from existing departments API)
- DayOfWeek enum handling (integer-based with localized display)
- TimeOnly type handling (parse/format between string and .NET TimeOnly)

**Bugs to avoid:**
- Role case mismatch: always normalize with `.toUpperCase()` when comparing roles on frontend
- Rate limiting: dev limit is 100 req/min (already bumped in appsettings.Development.json)
- Unique constraint handling: catch `DbUpdateException` with PostgresException SqlState "23505" and return 409
- FluentValidation auto-registration: validators are auto-discovered from assembly — no manual registration needed

**Key learnings:**
- Uniqueness enforced at DB level (not FluentValidation) — service catches constraint violations
- `.Select()` projection in all read endpoints — never return entities
- Empty state pattern: dedicated card with i18n message + helper text + create button
- Test infrastructure: IntegrationTestBase handles all role client setup and DB reset
- i18n keys added to test-utils.tsx for frontend tests

### From Git History (Last 5 Commits)

Recent commit pattern: `feat({scope}): Story X.Y — {description}`
- `feat(departments): Story 2.2 — Department CRUD & sub-ministries with code review fixes`
- `feat(config): Story 2.1 — Church identity settings with code review fixes`
- Stories build sequentially on established infrastructure
- Code review fixes are incorporated before merge

## Latest Technical Information

### EF Core 10 — TimeOnly Mapping to PostgreSQL
```csharp
// TimeOnly maps natively to PostgreSQL 'time' type via Npgsql
// No special configuration needed — just use TimeOnly in your entity
public TimeOnly StartTime { get; set; }
public TimeOnly EndTime { get; set; }
// System.Text.Json serializes TimeOnly as "HH:mm:ss"
```

### EF Core 10 — DayOfWeek Enum Storage
```csharp
// DayOfWeek is stored as integer by default in EF Core
// Sunday=0, Monday=1, ..., Saturday=6
// No MapEnum or special config needed — standard .NET enum behavior
public DayOfWeek DayOfWeek { get; set; }
```

### EF Core 10 — Optional FK with SetNull
```csharp
// Correct pattern for optional FK with set-null on parent deletion
modelBuilder.Entity<ProgramSchedule>()
    .HasOne(p => p.Department)
    .WithMany()  // Department doesn't need a navigation to ProgramSchedules
    .HasForeignKey(p => p.DepartmentId)
    .OnDelete(DeleteBehavior.SetNull);
```

### FluentValidation 12.x — Time Validation
```csharp
// Validate time string format and parse
RuleFor(x => x.StartTime)
    .NotEmpty()
    .Matches(@"^\d{2}:\d{2}$")
    .Must(time => TimeOnly.TryParseExact(time, "HH:mm", out _))
    .WithMessage("Must be a valid time (HH:mm).");

// Cross-field validation: endTime > startTime
RuleFor(x => x)
    .Must(x => /* parse and compare */)
    .WithMessage("End time must be after start time.");
```

### HTML5 Time Input
```tsx
// Native time input works well on both mobile and desktop
<Input type="time" step="60" {...field} />
// step="60" = minute precision (no seconds)
// Value format: "HH:mm"
// Mobile: renders native time picker
// Desktop: renders time selector
```

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Integration test fix: `TryGetProperty` needed for null values due to `WhenWritingNull` JSON serialization
- Integration test fix: HtmlSanitizer strips all tags including `<b>`, causing `SanitizeNullable` to return null for some inputs — split into separate test assertions
- Shared validator pattern: Used `IProgramScheduleRequest` interface constraint for FluentValidation shared rules

### Completion Notes List

- All 10 tasks completed successfully
- Backend: 22 unit tests + 4 validator tests + 21 integration tests = 47 new backend tests
- Frontend: 13 schema tests + 7 page tests = 20 new frontend tests
- Full regression: 115 backend unit tests + 119 backend integration tests + 129 frontend tests = all passing

### File List

**New files:**
- `src/SdaManagement.Api/Data/Entities/ProgramSchedule.cs`
- `src/SdaManagement.Api/Dtos/ProgramSchedule/IProgramScheduleRequest.cs`
- `src/SdaManagement.Api/Dtos/ProgramSchedule/CreateProgramScheduleRequest.cs`
- `src/SdaManagement.Api/Dtos/ProgramSchedule/UpdateProgramScheduleRequest.cs`
- `src/SdaManagement.Api/Dtos/ProgramSchedule/ProgramScheduleResponse.cs`
- `src/SdaManagement.Api/Dtos/ProgramSchedule/ProgramScheduleListItem.cs`
- `src/SdaManagement.Api/Validators/ProgramScheduleValidationRules.cs`
- `src/SdaManagement.Api/Validators/CreateProgramScheduleRequestValidator.cs`
- `src/SdaManagement.Api/Validators/UpdateProgramScheduleRequestValidator.cs`
- `src/SdaManagement.Api/Services/IProgramScheduleService.cs`
- `src/SdaManagement.Api/Services/ProgramScheduleService.cs`
- `src/SdaManagement.Api/Controllers/ProgramSchedulesController.cs`
- `src/SdaManagement.Api/Migrations/20260304202142_AddProgramSchedules.cs`
- `src/SdaManagement.Api/Migrations/20260304202142_AddProgramSchedules.Designer.cs`
- `tests/SdaManagement.Api.UnitTests/Validators/CreateProgramScheduleRequestValidatorTests.cs`
- `tests/SdaManagement.Api.UnitTests/Validators/UpdateProgramScheduleRequestValidatorTests.cs`
- `tests/SdaManagement.Api.IntegrationTests/ProgramSchedules/ProgramScheduleEndpointTests.cs`
- `src/sdamanagement-web/src/schemas/programScheduleSchema.ts`
- `src/sdamanagement-web/src/schemas/programScheduleSchema.test.ts`
- `src/sdamanagement-web/src/services/programScheduleService.ts`
- `src/sdamanagement-web/src/pages/AdminProgramSchedulesPage.tsx`
- `src/sdamanagement-web/src/pages/AdminProgramSchedulesPage.test.tsx`
- `src/sdamanagement-web/src/components/program-schedule/ProgramScheduleCard.tsx`
- `src/sdamanagement-web/src/components/program-schedule/ProgramScheduleFormDialog.tsx`
- `src/sdamanagement-web/src/components/program-schedule/index.ts`
- `src/sdamanagement-web/src/mocks/handlers/programSchedules.ts`

**Modified files:**
- `src/SdaManagement.Api/Data/AppDbContext.cs` — Added DbSet + fluent API config
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — Service registration
- `src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs` — Updated snapshot
- `src/SdaManagement.Api/Controllers/ProgramSchedulesController.cs` — C1: Pre-existence check in Update to disambiguate null from service
- `src/SdaManagement.Api/Dtos/ProgramSchedule/ProgramScheduleListItem.cs` — H1: Added DepartmentId field
- `src/SdaManagement.Api/Services/ProgramScheduleService.cs` — H1: Project DepartmentId in GetAllAsync
- `src/sdamanagement-web/src/services/programScheduleService.ts` — H1: Added departmentId to ProgramScheduleListItem interface
- `src/sdamanagement-web/src/components/program-schedule/ProgramScheduleCard.tsx` — H1: Removed getById query; passes schedule directly to form dialog
- `src/sdamanagement-web/src/components/program-schedule/ProgramScheduleFormDialog.tsx` — H1: Accept ProgramScheduleListItem; M1: generic error toast; L1: fieldset disabled
- `tests/SdaManagement.Api.IntegrationTests/ProgramSchedules/ProgramScheduleEndpointTests.cs` — M2/M3/L2: Added 4 missing tests
- `src/sdamanagement-web/src/App.tsx` — Added lazy route
- `src/sdamanagement-web/src/components/layout/AppSidebar.tsx` — Added nav item
- `src/sdamanagement-web/public/locales/fr/common.json` — Added i18n keys + days
- `src/sdamanagement-web/public/locales/en/common.json` — Added i18n keys + days
- `src/sdamanagement-web/src/test-utils.tsx` — Added i18n keys for tests

### Change Log

| Date       | Change Description                                      |
|------------|---------------------------------------------------------|
| 2026-03-04 | Initial implementation of all 10 tasks                  |
| 2026-03-04 | Code review fixes: C1 UpdateAsync null ambiguity (pre-existence check in controller); H1 eliminated getById query from ProgramScheduleCard by adding DepartmentId to ProgramScheduleListItem DTO; M1 generic error toast in ProgramScheduleFormDialog onError; M2 added CreateSchedule_AsViewer_Returns403 test; M3 added UpdateSchedule_WithNonExistentDepartmentId_Returns400 test; L1 fieldset disabled during mutation in ProgramScheduleFormDialog; L2 added anonymous 401 tests for PUT/DELETE |
