# Story 2.5: System Health Dashboard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **OWNER**,
I want to view system health and infrastructure status,
So that I can verify the system is operational and diagnose issues.

## Acceptance Criteria

1. **Given** an OWNER navigating to Admin > System Health
   **When** the page loads
   **Then** it displays: database connection status (from health check), application version, server uptime duration
   **And** each health component is rendered as a distinct card with status indicator

2. **Given** PostgreSQL is connected and responding
   **When** the health check runs
   **Then** the database status card shows "Healthy" with a green (`emerald-600`) indicator dot
   **And** the response time or check duration is displayed

3. **Given** PostgreSQL is unreachable or timing out
   **When** the health check runs
   **Then** the database status card shows "Unhealthy" with a red (`red-500`) indicator dot
   **And** error context is displayed (exception message or description)

4. **Given** a non-OWNER user (ADMIN, VIEWER, or ANONYMOUS)
   **When** they attempt to access the system health page
   **Then** the frontend route guard redirects them (non-OWNER authenticated users)
   **And** the backend `/api/system-health` endpoint returns 403 Forbidden (ADMIN/VIEWER) or 401 Unauthorized (ANONYMOUS)

5. **Given** the system health page loads successfully
   **When** the setup status section renders
   **Then** it displays entity counts: whether ChurchConfig exists (boolean), department count, activity template count, program schedule count, user count
   **And** these counts reflect the current database state for at-a-glance configuration progress

6. **Given** the system health page is displayed
   **When** 30 seconds elapse
   **Then** the health data auto-refreshes in the background without a full page reload (TanStack Query `refetchInterval`)
   **And** a manual refresh button is available for immediate re-check
   **And** background refetches show a subtle indicator, not a full skeleton

7. **Given** the uptime value in the API response
   **When** rendered on the page
   **Then** it displays in clean human-readable format: "X days, Y hours, Z minutes" (e.g., "2 days, 14 hours, 32 minutes")
   **And** segments with zero value are omitted (e.g., "14 hours, 32 minutes" if uptime < 1 day)

## Prerequisites

### Local Dev Environment
- Docker Desktop running (PostgreSQL 17 via docker-compose)
- .NET 10 SDK installed
- Node.js 20+ / npm
- Previous stories 2.1 through 2.4 completed and merged

### Database State
- ChurchConfig may or may not exist (Story 2.1)
- Departments may or may not exist (Story 2.2)
- ActivityTemplates may or may not exist (Story 2.3)
- ProgramSchedules may or may not exist (Story 2.4)
- The health dashboard must work regardless of configuration state

## Tasks / Subtasks

- [x] **Task 1: Backend System Health Service** (AC: #1, #2, #3, #5)
  - [x] 1.1 Create `ISystemHealthService` interface with `GetSystemHealthAsync(CancellationToken cancellationToken)` returning `SystemHealthResponse`
  - [x] 1.2 Create `SystemHealthService` implementation — inject `HealthCheckService` (abstract class), `AppDbContext`, `IWebHostEnvironment`
  - [x] 1.3 Call `healthCheckService.CheckHealthAsync(predicate: null, cancellationToken)` to get PostgreSQL health status, map each `HealthReportEntry` to a `HealthCheckItem` DTO (name = entry key, status = entry.Status.ToString(), description = `entry.Description ?? entry.Exception?.Message` for error context on unhealthy checks, duration = entry.Duration.ToString())
  - [x] 1.4 Get application version via `typeof(Program).Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion ?? typeof(Program).Assembly.GetName().Version?.ToString() ?? "unknown"`
  - [x] 1.5 Get server uptime via `DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime()` — return as `(long)uptime.TotalSeconds` in `uptimeSeconds` field (frontend formats with i18n)
  - [x] 1.6 Get environment name from `IWebHostEnvironment.EnvironmentName`
  - [x] 1.7 Get setup status counts: `await _db.ChurchConfigs.AnyAsync(cancellationToken)`, `await _db.Departments.CountAsync(cancellationToken)`, `await _db.ActivityTemplates.CountAsync(cancellationToken)`, `await _db.ProgramSchedules.CountAsync(cancellationToken)`, `await _db.Users.CountAsync(cancellationToken)`

- [x] **Task 2: Backend DTOs** (AC: #1, #2, #3, #5, #7)
  - [x] 2.1 `SystemHealthResponse` — status (string), checks (List\<HealthCheckItem\>), version (string), uptimeSeconds (long), environment (string), setupStatus (SetupStatusResponse)
  - [x] 2.2 `HealthCheckItem` — name (string), status (string), description (string?), duration (string, e.g. "00:00:00.023")
  - [x] 2.3 `SetupStatusResponse` — churchConfigExists (bool), departmentCount (int), templateCount (int), scheduleCount (int), userCount (int)
  - [x] 2.4 Place all DTOs in `Dtos/SystemHealth/` folder, one file per DTO

- [x] **Task 3: Backend Controller** (AC: #1, #4)
  - [x] 3.1 Create `SystemHealthController` at `/api/system-health` — `[Authorize]`, `[EnableRateLimiting("auth")]`
  - [x] 3.2 GET `/api/system-health` — OWNER only via `_auth.IsOwner()`, returns `SystemHealthResponse`
  - [x] 3.3 No POST/PUT/DELETE — this is a read-only endpoint
  - [x] 3.4 Register `ISystemHealthService` as scoped in `ServiceCollectionExtensions.AddApplicationServices()`

- [x] **Task 4: Backend Unit Tests** (AC: #2, #3, #5)
  - [x] 4.1 Create `SystemHealthServiceTests` in `tests/SdaManagement.Api.UnitTests/Services/`
  - [x] 4.2 Test: healthy PostgreSQL → response status is "Healthy", check item status is "Healthy", description is null
  - [x] 4.3 Test: unhealthy PostgreSQL → response status is "Unhealthy", check item has description with error context (from `entry.Description ?? entry.Exception?.Message`)
  - [x] 4.4 Test: degraded PostgreSQL → response status is "Degraded"
  - [x] 4.5 Test: uptimeSeconds is a positive long (> 0)
  - [x] 4.6 Test: setup status counts are correctly populated from mocked DbContext
  - [x] 4.7 Mock `HealthCheckService` (abstract class) with NSubstitute to simulate healthy/unhealthy/degraded states — no wrapper interface needed

- [x] **Task 5: Backend Integration Tests** (AC: #1, #2, #4, #5)
  - [x] 5.1 Create `SystemHealthEndpointTests` in `tests/SdaManagement.Api.IntegrationTests/SystemHealth/`
  - [x] 5.2 GET as OWNER — returns 200 with valid SystemHealthResponse (status, version, uptimeSeconds, environment, checks array, setupStatus)
  - [x] 5.3 GET as ADMIN — returns 403 Forbidden
  - [x] 5.4 GET as VIEWER — returns 403 Forbidden
  - [x] 5.5 GET as ANONYMOUS — returns 401 Unauthorized
  - [x] 5.6 Verify response contains "Healthy" status (PostgreSQL via Testcontainers is always up)
  - [x] 5.7 Verify setupStatus counts are non-negative integers
  - [x] 5.8 Verify version is non-empty string
  - [x] 5.9 Verify uptimeSeconds is > 0
  - [x] 5.10 NOTE: Do NOT test unhealthy PostgreSQL in integration tests — Testcontainers always provides a healthy DB. Unhealthy path is covered by unit tests (Task 4).

- [x] **Task 6: Frontend Service & Types** (AC: #1, #6)
  - [x] 6.1 Create `systemHealthService.ts` — `getSystemHealth()` using axios, returns `SystemHealthResponse` TypeScript interface
  - [x] 6.2 Define TypeScript interfaces: `SystemHealthResponse` (with `uptimeSeconds: number`), `HealthCheckItem`, `SetupStatusResponse` — match backend DTO shapes exactly
  - [x] 6.3 No Zod form schema needed (read-only, no user input)

- [x] **Task 7: Frontend Page & Components** (AC: #1, #2, #3, #5, #6, #7)
  - [x] 7.1 Create `AdminSystemHealthPage.tsx` — TanStack Query with `queryKey: ["system-health"]`, `refetchInterval: 30000`
  - [x] 7.2 Page layout: page title + manual refresh button + grid of health cards
  - [x] 7.3 `HealthStatusCard.tsx` — displays a single health check with name, status text, colored indicator dot (emerald-600 for Healthy, red-500 for Unhealthy), duration
  - [x] 7.4 `SystemInfoCard.tsx` — displays version, uptime (formatted from `uptimeSeconds` using i18n plural keys), environment in monospace font (`font-mono`). Include inline `formatUptime(totalSeconds, t)` helper that converts seconds → days/hours/minutes and builds i18n string with zero-segment omission
  - [x] 7.5 `SetupStatusCard.tsx` — displays entity counts (churchConfig exists as check/cross icon, department/template/schedule/user counts)
  - [x] 7.6 Skeleton loading state for first load; subtle refresh indicator for background refetches
  - [x] 7.7 Manual refresh button calls `queryClient.invalidateQueries({ queryKey: ["system-health"] })`
  - [x] 7.8 Barrel export `components/system-health/index.ts`

- [x] **Task 8: Frontend Routing, Navigation & i18n** (AC: #1, #4)
  - [x] 8.1 Add lazy route in `App.tsx`: `/admin/system-health` → `AdminSystemHealthPage`
  - [x] 8.2 Add nav item in `AppSidebar.tsx`: labelKey `nav.auth.adminSystemHealth`, icon `HeartPulse` (from lucide-react), minRole `OWNER`
  - [x] 8.3 Add i18n keys to `fr/common.json` and `en/common.json` — page title, card labels, status values, setup status labels, refresh button
  - [x] 8.4 MSW handler in `mocks/handlers/systemHealth.ts` — export two handler variants:
    - `systemHealthHandlers` (default): returns healthy mock `{ status: "Healthy", checks: [{ name: "npgsql", status: "Healthy", description: null, duration: "00:00:00.023" }], version: "1.0.0-test", uptimeSeconds: 138720, environment: "Development", setupStatus: { churchConfigExists: true, departmentCount: 3, templateCount: 5, scheduleCount: 4, userCount: 12 } }`
    - `systemHealthUnhealthyHandler`: returns unhealthy mock `{ status: "Unhealthy", checks: [{ name: "npgsql", status: "Unhealthy", description: "Failed to connect to PostgreSQL", duration: "00:00:05.000" }], ... }` — used by test 9.3 via `server.use()` override

- [x] **Task 9: Frontend Tests** (AC: #1, #2, #3, #5, #6)
  - [x] 9.1 `AdminSystemHealthPage.test.tsx` — renders health cards with correct data, OWNER access, non-OWNER access denied
  - [x] 9.2 Test healthy state: green indicator dot, "Healthy" text
  - [x] 9.3 Test unhealthy state: red indicator dot, "Unhealthy" text, error description shown (swap MSW handler to unhealthy variant)
  - [x] 9.4 Test setup status card: entity counts displayed
  - [x] 9.5 Test uptime formatting: renders "2 days, 14 hours, 32 minutes" from uptimeSeconds, omits zero segments, shows "Less than 1 minute" for < 60s
  - [x] 9.6 Test manual refresh button is present and clickable

## Dev Notes

### Architecture Pattern: Read-Only Aggregation Endpoint (No Entities, No Migrations)

This story is fundamentally different from Stories 2.1-2.4. There are **no new entities**, **no database migrations**, and **no mutations**. The backend is a single GET endpoint that aggregates data from:
1. ASP.NET Core `HealthCheckService` (PostgreSQL connectivity — abstract class, injected directly)
2. Assembly metadata (version)
3. `System.Diagnostics.Process` (uptime)
4. `IWebHostEnvironment` (environment name)
5. `AppDbContext` (entity counts for setup status)

### Existing `/health` Endpoint — DO NOT MODIFY

The existing `app.MapHealthChecks("/health")` endpoint is the **Docker/Azure infrastructure probe**. It returns plain text "Healthy"/"Unhealthy" and must remain untouched. The new `/api/system-health` endpoint is a separate, OWNER-only admin view that wraps richer health data. These are two different concerns:
- `/health` = infrastructure probe (public, plain text, used by orchestrators)
- `/api/system-health` = admin dashboard data (OWNER-only, JSON, rich detail)

### HealthCheckService — Programmatic Health Check Invocation

ASP.NET Core provides `HealthCheckService` (abstract class from `Microsoft.Extensions.Diagnostics.HealthChecks`) which can be injected into services to run health checks programmatically. The internal `DefaultHealthCheckService` implementation is automatically registered when you call `builder.Services.AddHealthChecks()`. Since `HealthCheckService` is abstract, NSubstitute can mock it directly — no wrapper interface needed.

```csharp
public class SystemHealthService(
    HealthCheckService healthCheckService,
    AppDbContext db,
    IWebHostEnvironment env) : ISystemHealthService
{
    public async Task<SystemHealthResponse> GetSystemHealthAsync(CancellationToken cancellationToken)
    {
        // predicate: null runs ALL registered health checks
        var report = await healthCheckService.CheckHealthAsync(null, cancellationToken);
        // Map report.Entries to HealthCheckItem DTOs
        // Add version, uptime, environment, setup counts
    }
}
```

**Key details:**
- `HealthCheckService` is an **abstract class**, not concrete — DI resolves to internal `DefaultHealthCheckService`
- `CheckHealthAsync` signature: `CheckHealthAsync(Func<HealthCheckRegistration, bool>? predicate, CancellationToken cancellationToken)` — pass `null` for predicate to run all checks
- Always propagate `CancellationToken` from controller through service to all async calls

### Uptime Formatting — Frontend i18n Responsibility

The backend returns raw `uptimeSeconds` (long). The **frontend** converts to days/hours/minutes and formats using i18n keys — no hardcoded English on either side.

**Frontend formatting helper** (inline in the page component or a small utility):
```typescript
function formatUptime(totalSeconds: number, t: TFunction): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(t("pages.adminSystemHealth.uptime.days", { count: days }));
  if (hours > 0) parts.push(t("pages.adminSystemHealth.uptime.hours", { count: hours }));
  if (minutes > 0) parts.push(t("pages.adminSystemHealth.uptime.minutes", { count: minutes }));
  return parts.length > 0 ? parts.join(", ") : t("pages.adminSystemHealth.uptime.lessThanMinute");
}
```

**i18n keys (French):**
```json
"uptime": {
  "days": "{{count}} jour",
  "days_other": "{{count}} jours",
  "hours": "{{count}} heure",
  "hours_other": "{{count}} heures",
  "minutes": "{{count}} minute",
  "minutes_other": "{{count}} minutes",
  "lessThanMinute": "Moins d'une minute"
}
```

**i18n keys (English):**
```json
"uptime": {
  "days": "{{count}} day",
  "days_other": "{{count}} days",
  "hours": "{{count}} hour",
  "hours_other": "{{count}} hours",
  "minutes": "{{count}} minute",
  "minutes_other": "{{count}} minutes",
  "lessThanMinute": "Less than 1 minute"
}
```

Note: react-i18next handles pluralization via `_other` suffix. `t("key", { count: 1 })` → singular, `t("key", { count: 2 })` → `_other` variant.

### No FluentValidation or Zod Form Schema Needed

This is a read-only endpoint with no request body. No `CreateRequest`/`UpdateRequest` DTOs, no validators, no Zod schemas. The only DTOs are response-only. Frontend only needs TypeScript interfaces for type safety.

### No SignalR Needed

System health is a low-frequency admin view. Auto-refresh via TanStack Query `refetchInterval: 30000` is sufficient. No real-time push needed.

### Frontend Auto-Refresh Pattern

```typescript
const { data, isLoading, isFetching } = useQuery({
  queryKey: ["system-health"],
  queryFn: systemHealthService.getSystemHealth,
  refetchInterval: 30000, // 30 second auto-refresh
});
```
- `isLoading` = true only on first load → show skeleton
- `isFetching` = true on background refetch → show subtle refresh indicator (e.g., spinning icon on refresh button)
- Manual refresh: `queryClient.invalidateQueries({ queryKey: ["system-health"] })`

### Monospace Font for System Data

Per UX spec, OWNER system views use monospace font for timestamps, system IDs, and debug info. Use `font-mono` (Tailwind) on the SystemInfoCard for version, uptime, and environment values.

### Color Tokens for Status Indicators

Per UX design spec:
- **Healthy**: `emerald-600` (#059669) — green dot (8px)
- **Unhealthy**: `red-500` — red dot (8px)
- **Degraded** (if applicable): `amber-500` (#F59E0B) — amber dot (8px)

Use small status dots (8px, `w-2 h-2 rounded-full`) consistent with the staffing indicator pattern documented in the UX spec.

### Unit Testing the Unhealthy Path

The unhealthy PostgreSQL scenario CANNOT be tested in integration tests because Testcontainers always provides a healthy database. Test this in **unit tests** by mocking `HealthCheckService` (abstract class — NSubstitute mocks it directly):

```csharp
var mockHealthCheckService = Substitute.For<HealthCheckService>();
mockHealthCheckService.CheckHealthAsync(Arg.Any<Func<HealthCheckRegistration, bool>?>(), Arg.Any<CancellationToken>())
    .Returns(new HealthReport(
        new Dictionary<string, HealthReportEntry>
        {
            ["npgsql"] = new HealthReportEntry(
                HealthStatus.Unhealthy,
                "Failed to connect",
                TimeSpan.FromMilliseconds(5000),
                new Exception("Connection refused"),
                null)
        },
        TimeSpan.FromMilliseconds(5000)));
```

For integration tests, mock at the service level — `ISystemHealthService` is easy to mock if needed, but the integration tests hit the real endpoint with a real healthy Testcontainers database.

### Project Structure Notes

All files follow established directory conventions:

**Backend:**
```
src/SdaManagement.Api/
├── Dtos/SystemHealth/               (NEW folder)
│   ├── SystemHealthResponse.cs
│   ├── HealthCheckItem.cs
│   └── SetupStatusResponse.cs
├── Services/
│   ├── ISystemHealthService.cs      (NEW)
│   └── SystemHealthService.cs       (NEW)
├── Controllers/
│   └── SystemHealthController.cs    (NEW)
└── Extensions/
    └── ServiceCollectionExtensions.cs  (MODIFY — add service registration)
```

**Frontend:**
```
src/sdamanagement-web/src/
├── services/
│   └── systemHealthService.ts       (NEW)
├── pages/
│   ├── AdminSystemHealthPage.tsx        (NEW)
│   └── AdminSystemHealthPage.test.tsx   (NEW)
├── components/system-health/        (NEW folder)
│   ├── HealthStatusCard.tsx
│   ├── SystemInfoCard.tsx
│   ├── SetupStatusCard.tsx
│   └── index.ts
├── mocks/handlers/
│   └── systemHealth.ts              (NEW)
├── App.tsx                           (MODIFY — add route)
├── components/layout/AppSidebar.tsx  (MODIFY — add nav item)
└── public/locales/
    ├── fr/common.json                (MODIFY — add i18n keys)
    └── en/common.json                (MODIFY — add i18n keys)
```

**Tests:**
```
tests/SdaManagement.Api.UnitTests/
└── Services/
    └── SystemHealthServiceTests.cs   (NEW)
tests/SdaManagement.Api.IntegrationTests/
└── SystemHealth/
    └── SystemHealthEndpointTests.cs  (NEW)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.5] — Acceptance criteria and user story
- [Source: _bmad-output/planning-artifacts/prd.md#FR59] — OWNERs can view system health and infrastructure status
- [Source: _bmad-output/planning-artifacts/architecture.md#Health Checks] — `/health` endpoint, AspNetCore.HealthChecks.NpgSql
- [Source: _bmad-output/planning-artifacts/architecture.md#Middleware Pipeline Order] — `app.MapHealthChecks("/health")` at position 9
- [Source: _bmad-output/planning-artifacts/architecture.md#Controller Method Template] — auth check → service call → return
- [Source: _bmad-output/planning-artifacts/architecture.md#DTO Naming] — {Entity}Response, {Entity}ListItem pattern
- [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines] — All 10 mandatory agent rules
- [Source: _bmad-output/planning-artifacts/architecture.md#Anti-Patterns] — Forbidden patterns list
- [Source: _bmad-output/planning-artifacts/architecture.md#Service Method Conventions] — Return DTOs, Async suffix
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries] — ConfigController OWNER only precedent
- [Source: _bmad-output/planning-artifacts/architecture.md#Logging] — Serilog 10.x configuration
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Color System] — emerald-600 for system healthy, amber-500 for warning
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Monospace Font] — JetBrains Mono/Fira Code for Owner system data
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Anti-Patterns] — Role-filtered sidebar, OWNERs see system health
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Loading Skeleton Patterns] — Card-level granularity for skeleton loading

## Technical Requirements

### Backend Stack
- **.NET 10 / ASP.NET Core / EF Core 10** — C# with primary constructors
- **PostgreSQL 17** — health check via `AspNetCore.HealthChecks.NpgSql` (already installed)
- **Microsoft.Extensions.Diagnostics.HealthChecks** — `HealthCheckService` for programmatic health check invocation (built-in, no additional package)
- **Shouldly** — assertion library for tests
- **NSubstitute** — mocking `HealthCheckService` for unit tests
- **Testcontainers.PostgreSql** — real PostgreSQL in integration tests (healthy path only)

### Frontend Stack
- **React 18+ / TypeScript / Vite**
- **TanStack Query** — `queryKey: ["system-health"]` with `refetchInterval: 30000`
- **shadcn/ui** — Card, Button components
- **react-i18next** — all strings through `t()`, French-first
- **Lucide React** — `HeartPulse` icon for nav, `RefreshCw` for manual refresh button
- **MSW** — mock handler for testing (healthy + unhealthy variants)
- **Tailwind** — `font-mono` for system data, `bg-emerald-600`/`bg-red-500` for status dots

### Architecture Compliance

**Controller pattern (mandatory):**
```csharp
[ApiController]
[Route("api/system-health")]
[Authorize]
[EnableRateLimiting("auth")]
public class SystemHealthController(
    ISystemHealthService systemHealthService,
    SdacAuth.IAuthorizationService auth) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSystemHealth(CancellationToken cancellationToken)
    {
        if (!auth.IsOwner()) return Forbid();
        var result = await systemHealthService.GetSystemHealthAsync(cancellationToken);
        return Ok(result);
    }
}
```

**Service pattern (mandatory):**
- Inject `HealthCheckService` + `AppDbContext` + `IWebHostEnvironment` via primary constructor
- Return `SystemHealthResponse` DTO — never return raw `HealthReport`
- `GetSystemHealthAsync(CancellationToken cancellationToken)` is the only method — propagate token to all async calls
- Return `uptimeSeconds` as `(long)uptime.TotalSeconds` — frontend formats with i18n (no hardcoded English strings in backend)
- Populate `HealthCheckItem.Description` from `entry.Description ?? entry.Exception?.Message` — surfaces error context for unhealthy checks
- Catch no exceptions — let the global error handler deal with unexpected failures

**Response shape (mandatory):**
```json
{
  "status": "Healthy",
  "checks": [
    {
      "name": "npgsql",
      "status": "Healthy",
      "description": null,
      "duration": "00:00:00.023"
    }
  ],
  "version": "1.0.0+abc123",
  "uptimeSeconds": 138720,
  "environment": "Development",
  "setupStatus": {
    "churchConfigExists": true,
    "departmentCount": 3,
    "templateCount": 5,
    "scheduleCount": 4,
    "userCount": 12
  }
}
```
Note: `uptimeSeconds` is a raw long — the frontend formats to human-readable using i18n keys (e.g., "2 jours, 14 heures, 32 minutes" in French). This avoids hardcoded English in the backend response.

**i18n key pattern (mandatory):**
```
pages.adminSystemHealth.title
pages.adminSystemHealth.refreshButton
pages.adminSystemHealth.refreshing
pages.adminSystemHealth.lastUpdated
pages.adminSystemHealth.database.title
pages.adminSystemHealth.database.healthy
pages.adminSystemHealth.database.unhealthy
pages.adminSystemHealth.database.degraded
pages.adminSystemHealth.database.duration
pages.adminSystemHealth.system.title
pages.adminSystemHealth.system.version
pages.adminSystemHealth.system.uptime
pages.adminSystemHealth.system.environment
pages.adminSystemHealth.setup.title
pages.adminSystemHealth.setup.churchConfig
pages.adminSystemHealth.setup.departments
pages.adminSystemHealth.setup.templates
pages.adminSystemHealth.setup.schedules
pages.adminSystemHealth.setup.users
pages.adminSystemHealth.setup.configured
pages.adminSystemHealth.setup.notConfigured
pages.adminSystemHealth.uptime.days (with {{count}} interpolation for plural)
pages.adminSystemHealth.uptime.hours (with {{count}} interpolation for plural)
pages.adminSystemHealth.uptime.minutes (with {{count}} interpolation for plural)
pages.adminSystemHealth.uptime.lessThanMinute
nav.auth.adminSystemHealth
```

**Query key pattern:**
```typescript
["system-health"]  // Single endpoint, no detail view
```

### Testing Requirements

**Backend unit tests (`SystemHealthServiceTests`):**
- Mock `HealthCheckService` to return healthy report → verify response status "Healthy", description null
- Mock `HealthCheckService` to return unhealthy report with description → verify response status "Unhealthy" and description populated from `entry.Description ?? entry.Exception?.Message`
- Mock `HealthCheckService` to return degraded report → verify response status "Degraded"
- Test `uptimeSeconds` is a positive long (> 0) — backend returns raw seconds, frontend handles i18n formatting
- Test setup status counts with mocked DbContext (churchConfigExists, departmentCount, etc.)

**Backend integration tests (`SystemHealthEndpointTests`):**
- GET as OWNER → 200 with valid response shape (status, checks, version, uptimeSeconds, environment, setupStatus)
- GET as ADMIN → 403
- GET as VIEWER → 403
- GET as ANONYMOUS → 401
- Response status is "Healthy" (Testcontainers PostgreSQL always up)
- Response version is non-empty
- Response uptimeSeconds is > 0
- Response environment is non-empty
- Response setupStatus contains valid counts (>= 0)
- NOTE: Do NOT attempt unhealthy test — covered by unit tests

**Frontend tests (co-located `AdminSystemHealthPage.test.tsx`):**
- PREREQUISITE: Add all `pages.adminSystemHealth.*` and `nav.auth.adminSystemHealth` i18n keys to `src/sdamanagement-web/src/test-utils.tsx` mock resources (same pattern as previous stories)
- Page renders with health data from MSW mock
- Healthy state: green indicator dot visible, "Healthy" text
- Unhealthy state (swap MSW handler): red indicator dot, "Unhealthy" text, error description shown
- Setup status card shows entity counts
- OWNER can view page (role-based rendering)
- Non-OWNER sees access denied
- Manual refresh button is present

## Previous Story Intelligence

### From Story 2.4 (Recurring Program Schedule Configuration)

**Patterns to reuse directly:**
- Controller structure: copy `ProgramSchedulesController` pattern (primary constructor, SdacAuth.IAuthorizationService, `_auth.IsOwner()` check)
- Service structure: copy primary constructor injection pattern, but WITHOUT `ISanitizationService` (no user input to sanitize)
- Frontend page: copy `AdminProgramSchedulesPage` layout for page structure, but replace CRUD grid with read-only dashboard cards
- Test structure: copy `ProgramScheduleEndpointTests` auth assertion pattern (OWNER 200, Admin 403, Viewer 403, Anonymous 401)
- Nav sidebar: copy the nav item pattern with `minRole: "OWNER"`
- i18n: copy key structure from `pages.adminProgramSchedules.*`

**Key differences from Story 2.4:**
- No mutations (no POST/PUT/DELETE) — read-only endpoint
- No entities, no migrations — aggregation only
- No FluentValidation, no Zod schema — no user input
- No form dialog — display-only cards
- Unit tests needed for service logic (uptime formatting, health check mapping)
- Auto-refresh via TanStack Query `refetchInterval` — not used in previous stories

**Bugs to avoid:**
- Role case mismatch: always normalize with `.toUpperCase()` when comparing roles on frontend
- Rate limiting: dev limit is 100 req/min — auto-refresh at 30s = 2 req/min, well within limit
- `HealthCheckService` is an abstract class — NSubstitute can mock it directly, no wrapper needed

### From Git History (Last 5 Commits)

Recent commit pattern: `feat({scope}): Story X.Y — {description}`
- `feat(departments): Story 2.2 — Department CRUD & sub-ministries with code review fixes`
- `feat(config): Story 2.1 — Church identity settings with code review fixes`
- Stories build sequentially on established infrastructure
- Code review fixes are incorporated before merge

## Latest Technical Information

### ASP.NET Core Health Checks — Programmatic Invocation

The default `/health` endpoint returns plain text. For the admin dashboard, inject `HealthCheckService` (abstract class, auto-registered by `AddHealthChecks()`) to invoke health checks programmatically:

```csharp
// HealthCheckService is ABSTRACT — DefaultHealthCheckService is the internal impl
// Inject via constructor: HealthCheckService healthCheckService
// CheckHealthAsync signature: (Func<HealthCheckRegistration, bool>? predicate, CancellationToken ct)
var report = await healthCheckService.CheckHealthAsync(null, cancellationToken);
// report.Status = HealthStatus.Healthy | Degraded | Unhealthy
// report.Entries = Dictionary<string, HealthReportEntry>
// Each entry has: Status, Description, Duration, Exception, Data
```

### .NET 10 — Assembly Version Retrieval

```csharp
// Get informational version (includes git hash if configured)
var version = typeof(Program).Assembly
    .GetCustomAttribute<AssemblyInformationalVersionAttribute>()
    ?.InformationalVersion
    ?? typeof(Program).Assembly.GetName().Version?.ToString()
    ?? "unknown";
```

### .NET 10 — Process Uptime (Return Raw Seconds)

```csharp
using System.Diagnostics;
var uptime = DateTime.UtcNow - Process.GetCurrentProcess().StartTime.ToUniversalTime();
var uptimeSeconds = (long)uptime.TotalSeconds; // Frontend formats with i18n
```

### TanStack Query — Auto-Refresh with refetchInterval

```typescript
const { data, isLoading, isFetching } = useQuery({
  queryKey: ["system-health"],
  queryFn: systemHealthService.getSystemHealth,
  refetchInterval: 30000, // Auto-refresh every 30 seconds
  // isLoading = true on first fetch only (show skeleton)
  // isFetching = true on background refetch (show subtle indicator)
});
```

### Lucide React — HeartPulse Icon

```typescript
import { HeartPulse, RefreshCw } from "lucide-react";
// HeartPulse = medical heart rate icon, appropriate for system health
// RefreshCw = circular refresh icon for manual refresh button
```

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Minor fix: `User` entity has `FirstName`/`LastName` not `DisplayName` — corrected in unit test

### Completion Notes List

- Backend: Read-only `/api/system-health` endpoint aggregating health check, version, uptime, environment, and setup status counts
- Service uses `HealthCheckService` (abstract class) for programmatic health check invocation — no wrapper interface
- Backend returns raw `uptimeSeconds` — frontend handles i18n formatting with plural support
- Controller follows OWNER-only auth pattern with `SdacAuth.IAuthorizationService`
- Unit tests cover healthy/unhealthy/degraded states, uptime > 0, setup status counts, description fallback chain
- Integration tests cover auth (OWNER 200, Admin 403, Viewer 403, Anonymous 401) and response shape validation
- Frontend: 3 card components (HealthStatusCard, SystemInfoCard, SetupStatusCard) with TanStack Query auto-refresh at 30s
- `formatUptime()` helper uses i18n plural keys with zero-segment omission
- All existing tests pass — 0 regressions (137 frontend, 134 unit, 133 integration)

### File List

**New files:**
- src/SdaManagement.Api/Dtos/SystemHealth/SystemHealthResponse.cs
- src/SdaManagement.Api/Dtos/SystemHealth/HealthCheckItem.cs
- src/SdaManagement.Api/Dtos/SystemHealth/SetupStatusResponse.cs
- src/SdaManagement.Api/Services/ISystemHealthService.cs
- src/SdaManagement.Api/Services/SystemHealthService.cs
- src/SdaManagement.Api/Controllers/SystemHealthController.cs
- tests/SdaManagement.Api.UnitTests/Services/SystemHealthServiceTests.cs
- tests/SdaManagement.Api.IntegrationTests/SystemHealth/SystemHealthEndpointTests.cs
- src/sdamanagement-web/src/services/systemHealthService.ts
- src/sdamanagement-web/src/pages/AdminSystemHealthPage.tsx
- src/sdamanagement-web/src/pages/AdminSystemHealthPage.test.tsx
- src/sdamanagement-web/src/components/system-health/HealthStatusCard.tsx
- src/sdamanagement-web/src/components/system-health/SystemInfoCard.tsx
- src/sdamanagement-web/src/components/system-health/SetupStatusCard.tsx
- src/sdamanagement-web/src/components/system-health/index.ts
- src/sdamanagement-web/src/mocks/handlers/systemHealth.ts

**Modified files:**
- src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs (added ISystemHealthService registration)
- src/sdamanagement-web/src/App.tsx (added lazy route for /admin/system-health)
- src/sdamanagement-web/src/components/layout/AppSidebar.tsx (added HeartPulse nav item)
- src/sdamanagement-web/public/locales/fr/common.json (added system health i18n keys)
- src/sdamanagement-web/public/locales/en/common.json (added system health i18n keys)
- src/sdamanagement-web/src/test-utils.tsx (added system health i18n mock keys)
- _bmad-output/implementation-artifacts/sprint-status.yaml (story status update)

**Cross-story files in uncommitted batch (not attributable to Story 2.5):**
- src/SdaManagement.Api/Data/AppDbContext.cs (Stories 2.3/2.4 — added ActivityTemplate, TemplateRole, ProgramSchedule DbSets)
- src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs (Stories 2.3/2.4 — migration snapshot)
- src/SdaManagement.Api/Services/TokenService.cs (Story 1.7 fix — added MaxAge=Zero to ClearTokenCookies)
- tests/SdaManagement.Api.IntegrationTests/Auth/LogoutEndpointTests.cs (Story 1.7 fix — updated cookie assertions for max-age=0)
- tests/SdaManagement.Api.UnitTests/SdaManagement.Api.UnitTests.csproj (project reference update)

### Change Log

- 2026-03-04: Story 2.5 implemented — OWNER-only system health dashboard with backend aggregation endpoint, 3 frontend card components, auto-refresh, full test coverage (9 unit, 8 integration, 7 frontend tests)
- 2026-03-04: Code review fixes — HealthStatusCard displays check.name dynamically (HIGH-1), non-OWNER redirect via Navigate (HIGH-2), added uptime < 60s test (HIGH-3), sr-only accessible text for setup icons (MED-4), documented cross-story files (MED-1/MED-3). MED-2 (try/catch for Process.StartTime) reverted — story architecture rule says "Catch no exceptions", and the target platforms (Windows/Linux/Docker) support Process.StartTime reliably.
