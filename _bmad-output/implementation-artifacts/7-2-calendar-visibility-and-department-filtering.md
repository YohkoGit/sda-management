# Story 7.2: Calendar Visibility & Department Filtering

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to see all activities (including authenticated-only) on the calendar and filter by department,
So that I can focus on the activities relevant to my ministry.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–7.1 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors and abbreviations
- Activities created with **both** `Public` AND `Authenticated` visibility (from Epic 4) — several across different dates, departments
- At least one authenticated user per role (VIEWER, ADMIN, OWNER) for testing visibility behavior
- Story 7.1 complete — shared `CalendarView`, `ViewSwitcher`, `YearGrid`, `useYearActivities` all functional

### Codebase State (Story 7.1 Complete)

- **CalendarView** at `components/calendar/CalendarView.tsx` — shared Schedule-X engine with Day/Week/Month/Year views, Sunday-first, department color coding via `calendars` config, `onRangeChange`/`onViewChange`/`onYearChange` callbacks. Props: `activities`, `yearActivities`, `departments`, `isError`, `onRetry`, `onRangeChange`, `onViewChange`, `onYearChange`, `yearIsPending`, `yearIsError`, `onYearRetry`. [Source: `src/sdamanagement-web/src/components/calendar/CalendarView.tsx`]
- **AuthCalendarPage** at `pages/AuthCalendarPage.tsx` (~80 lines) — mirrors PublicCalendarPage structure. Uses `useCalendarActivities` and `useYearActivities` from **public** API. TODO comment on line 49: `// TODO: Story 7.2 — diverge from PublicCalendarPage with auth-scoped endpoint and query keys`. [Source: `src/sdamanagement-web/src/pages/AuthCalendarPage.tsx`]
- **PublicCalendarPage** at `pages/PublicCalendarPage.tsx` (~80 lines) — thin wrapper using CalendarView. Uses `useCalendarActivities(start, end)` + `useYearActivities(year, enabled)` from public API. **Must NOT be modified by 7.2** — public route stays public-only. [Source: `src/sdamanagement-web/src/pages/PublicCalendarPage.tsx`]
- **useCalendarActivities** defined inline in `hooks/usePublicDashboard.ts:61-69` — queryKey `["public", "calendar", start, end]`, fetches from `publicService.getCalendarActivities(start, end)`.
- **useYearActivities** at `hooks/useYearActivities.ts` — 4 parallel quarterly `useQuery` calls, all using `publicService.getCalendarActivities`. queryKeys use `["public", "calendar", ...]` namespace.
- **publicService.getCalendarActivities()** at `services/publicService.ts:28-33` — calls `GET /api/public/calendar?start=&end=`.
- **PublicController.GetCalendarActivities** at `Controllers/PublicController.cs:57-66` — `[AllowAnonymous]`, 90-day max range, filters `ActivityVisibility.Public` ONLY.
- **PublicService.GetCalendarActivitiesAsync** at `Services/PublicService.cs:138-176` — `.Where(a => a.Visibility == ActivityVisibility.Public && ...)`. Returns `PublicActivityListItem` DTO.
- **ActivityVisibility enum** at `Data/Entities/ActivityVisibility.cs` — `Public = 0`, `Authenticated = 1`.
- **Activity entity** has `Visibility` field, `DepartmentId` FK, `Department` navigation property.
- **CalendarController** does NOT exist yet — architecture maps `CalendarController` / `CalendarService` for FR35-FR40.
- **No authenticated calendar service** (frontend) — `calendarService.ts` does not exist.
- **No department filter component** exists anywhere in the frontend.
- **calendar-controls plugin** installed (`@schedule-x/calendar-controls@^4.3.1`) — provides `setCalendars()` for dynamic calendar visibility toggling.
- **useAuth hook** at `contexts/AuthContext.tsx` — provides `{ user, isAuthenticated }`. `user.departmentIds: number[]` available.
- **ICurrentUserContext** at `Auth/ICurrentUserContext.cs` — `IsAuthenticated`, `UserId`, `Role`, `DepartmentIds`.
- **IAuthorizationService** at `Auth/IAuthorizationService.cs` — `CanView()`, `CanManage(departmentId)`, `IsOwner()`, `IsAuthenticated()`.
- **Route config**: `/calendar` → PublicCalendarPage (public tree), `/my-calendar` → AuthCalendarPage (auth tree, wrapped in `ProtectedRoute`).
- **PublicActivityListItem DTO** (C# + TS): `Id`, `Title`, `Date`, `StartTime`, `EndTime`, `DepartmentName`, `DepartmentAbbreviation`, `DepartmentColor`, `PredicateurName`, `PredicateurAvatarUrl`, `SpecialType`.
- **Schedule-X dependencies**: `@schedule-x/calendar@^4.3.1`, `@schedule-x/events-service@^4.3.1`, `@schedule-x/react@^4.1.0`, `@schedule-x/calendar-controls@^4.3.1`, `@schedule-x/theme-default@^4.3.1`, `temporal-polyfill@0.3.0`.
- **i18n keys** exist: `pages.calendar.title`, `pages.calendar.loadError`, `pages.calendar.retry`, `pages.calendar.views.*`.
- **MSW mock handlers**: `calendarHandlers`, `calendarHandlersEmpty`, `calendarHandlersError` in `mocks/handlers/public.ts`.
- **Test infrastructure**: 461 tests passing. `test-utils.tsx` has calendar i18n keys. MSW handler pattern established.
- **useDepartments hook** at `hooks/usePublicDashboard.ts` — fetches public department list.

## Acceptance Criteria

1. **Given** an anonymous user viewing the calendar (`/calendar`) **When** activities render **Then** only public-visibility activities appear (FR37) **And** no department filter is shown.

2. **Given** an authenticated user viewing the calendar (`/my-calendar`) **When** activities render **Then** both public AND authenticated-only activities appear (FR37) **And** a department filter control is available.

3. **Given** the department filter **When** an authenticated user selects "MIFEM" and "JA" **Then** only activities belonging to those departments are shown (FR38) **And** the filter persists during the session.

4. **Given** activities on the calendar **When** rendered **Then** each activity displays with its department's color coding (FR39) **And** colors match those configured in department settings (Epic 2).

## Tasks / Subtasks

> **Implementation order**: Tasks 1→2→3→4→5→6→7→8. Backend first (Task 1-2), then frontend service/hooks (Task 3-4), then UI (Task 5-6), then tests (Task 7), then i18n/a11y (Task 8).

- [x] Task 1: Create CalendarController + CalendarService backend (AC: #2)
  - [x] 1.1 Create `ICalendarService.cs` interface in `Services/`:
    ```csharp
    public interface ICalendarService
    {
        Task<List<PublicActivityListItem>> GetCalendarActivitiesAsync(
            DateOnly start, DateOnly end, List<int>? departmentIds = null);
    }
    ```
    Returns **both** `Public` and `Authenticated` visibility activities. Accepts optional `departmentIds` filter. Reuses the existing `PublicActivityListItem` DTO — the shape is identical (no extra auth-only fields needed).
  - [x] 1.2 Create `CalendarService.cs` implementing `ICalendarService`:
    - Inject `AppDbContext` **and `IAvatarService`** — avatar service is required for predicateur avatar URL generation via `avatarService.GetAvatarUrl(userId)`. Follow PublicService constructor pattern: `CalendarService(AppDbContext dbContext, IAvatarService avatarService)`.
    - Query: `.Where(a => (a.Visibility == ActivityVisibility.Public || a.Visibility == ActivityVisibility.Authenticated) && a.Date >= start && a.Date <= end)`
    - If `departmentIds` is non-null and non-empty: add `.Where(a => a.DepartmentId != null && departmentIds.Contains(a.DepartmentId.Value))`. Note: activities with `DepartmentId == null` are intentionally excluded when a department filter is active — this is correct behavior (filtering means "show only these departments").
    - Same 90-day max range guard as PublicService
    - Same `.Include(a => a.Department).Include(a => a.Roles).ThenInclude(r => r.Assignments).ThenInclude(ra => ra.User)` for predicateur extraction
    - Predicateur extraction: duplicate `ExtractPredicateur()` private method from `PublicService.cs:178-188`. Uses case-insensitive match for both "Predicateur" and "Prédicateur" role names. Returns `(string? Name, string? AvatarUrl)` tuple. Calls `avatarService.GetAvatarUrl(assignment.UserId)` for avatar URL. Consider extracting to a shared `ActivityMappingHelper` static class if a 3rd call site appears later.
    - Same `PublicActivityListItem` record mapping as `PublicService.GetCalendarActivitiesAsync`
    - `.OrderBy(a => a.Date).ThenBy(a => a.StartTime)`
  - [x] 1.3 Create `CalendarController.cs` in `Controllers/`:
    ```csharp
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.RateLimiting;
    using SdaManagement.Api.Services;

    namespace SdaManagement.Api.Controllers;

    [Route("api/calendar")]
    [ApiController]
    [Authorize]
    [EnableRateLimiting("auth")]
    public class CalendarController(ICalendarService calendarService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetCalendarActivities(
            [FromQuery] DateOnly start,
            [FromQuery] DateOnly end,
            [FromQuery] List<int>? departmentIds = null)
        {
            var result = await calendarService.GetCalendarActivitiesAsync(
                start, end, departmentIds);
            return Ok(result);
        }
    }
    ```
    - `[Route("api/calendar")]` — explicit route string (codebase convention, all 11 controllers use explicit routes, NOT `[controller]` template)
    - `[Authorize]` — requires authentication (any role: VIEWER, ADMIN, OWNER)
    - `[EnableRateLimiting("auth")]` — 5 req/min per IP, matching ALL other authenticated controllers
    - Endpoint: `GET /api/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD&departmentIds=1&departmentIds=3`
    - The `departmentIds` query parameter is optional. When omitted, all departments returned. When provided, filters to those departments only.
  - [x] 1.4 Register `ICalendarService` / `CalendarService` in DI — add to `Extensions/ServiceCollectionExtensions.cs` (NOT Program.cs). Insert at line ~176, after `IPublicService` registration:
    ```csharp
    services.AddScoped<ICalendarService, CalendarService>();
    ```
    Program.cs delegates all DI to `builder.Services.AddApplicationServices(builder.Configuration)` on line 21.

- [x] Task 2: Backend integration tests for CalendarController (AC: #1, #2, #3)
  - [x] 2.1 Create `CalendarEndpointTests.cs` in `SdaManagement.IntegrationTests/Endpoints/`:
    - Test: Anonymous request to `GET /api/calendar` returns 401 (not 200)
    - Test: Authenticated VIEWER request returns both `Public` and `Authenticated` activities
    - Test: Authenticated request with `departmentIds=1` returns only department 1 activities
    - Test: Authenticated request with multiple `departmentIds=1&departmentIds=3` returns activities from both
    - Test: Authenticated request without `departmentIds` returns all activities (both visibilities)
    - Test: Date range > 90 days is capped at 90 days
    - Test: Empty date range returns empty list
  - [x] 2.2 Follow existing test patterns from `PublicCalendarEndpointTests.cs`:
    - Use `SdaManagementWebApplicationFactory`
    - Seed test activities with both `ActivityVisibility.Public` and `ActivityVisibility.Authenticated`
    - Seed activities across multiple departments
    - Authenticate requests using the factory's test auth helper

- [x] Task 3: Frontend calendar service and hooks (AC: #2, #3)
  - [x] 3.1 Create `services/calendarService.ts`:
    ```typescript
    import api from "@/lib/api";
    import type { PublicActivityListItem } from "@/types/public";

    export const calendarService = {
      getCalendarActivities: (
        start: string, end: string, departmentIds?: number[]
      ) =>
        api
          .get<PublicActivityListItem[]>("/api/calendar", {
            params: { start, end, departmentIds },
          })
          .then((res) => res.data),
    };
    ```
    Follows established service pattern from `publicService.ts`: import `api` from `@/lib/api` (default export), use `.get<T>(url, { params }).then(res => res.data)` chain. The `api` instance has `withCredentials: true` — httpOnly JWT cookie sent automatically. Axios serializes `departmentIds` array as `departmentIds=1&departmentIds=3` by default. Reuses `PublicActivityListItem` type (same DTO shape).
  - [x] 3.2 Create `hooks/useAuthCalendarActivities.ts`:
    ```typescript
    export function useAuthCalendarActivities(
      start: string, end: string, departmentIds?: number[]
    ) {
      return useQuery<PublicActivityListItem[]>({
        queryKey: ['auth', 'calendar', start, end, departmentIds ?? []],
        queryFn: () => calendarService.getCalendarActivities(
          start, end, departmentIds),
        staleTime: 5 * 60 * 1000,
        retry: 1,
        enabled: !!start && !!end,
      });
    }
    ```
    Query key includes `departmentIds` — TanStack Query auto-refetches when filter changes. Key namespace is `"auth"` (not `"public"`) for cache isolation.
  - [x] 3.3 Create `hooks/useAuthYearActivities.ts`:
    - Same quarterly-fetch pattern as `useYearActivities.ts` but calls `calendarService.getCalendarActivities(start, end, departmentIds)` instead of `publicService`
    - Query keys: `['auth', 'calendar', quarterStart, quarterEnd, departmentIds ?? []]` — the `?? []` ensures stable array reference for TanStack Query deep comparison (avoids unnecessary refetches when departmentIds is undefined vs empty)
    - Signature: `(year: number, enabled: boolean, departmentIds?: number[])`
    - Returns: `{ data, isPending, isError, refetch }`
    - Import: `import { calendarService } from "@/services/calendarService"`

- [x] Task 4: Department filter UI component (AC: #3)
  - [x] 4.1 Create `components/calendar/DepartmentFilter.tsx`:
    - Props: `{ departments: PublicDepartment[], selectedIds: number[], onChange: (ids: number[]) => void }`
    - Render a row of department toggle chips/buttons (not a dropdown — UX spec says "dropdown multi-select" but chips are more touch-friendly and match the design language)
    - Each chip shows: department color dot + abbreviation (e.g., `[color] JA`)
    - Active state: filled background with department color. Inactive: outline/ghost style.
    - "All" chip at the start — when active, all departments are shown (default state = empty `selectedIds` array).
    - **Multi-toggle behavior**: clicking a department chip toggles it on/off independently. Clicking JA then MIFEM results in `[JA_id, MIFEM_id]` selected (additive). Clicking a selected department deselects it (removes from array). When the last department is deselected (array becomes empty), "All" automatically re-activates. Clicking "All" explicitly clears the array → shows all departments.
    - Responsive: horizontal scroll on mobile if more departments than fit. Use `overflow-x-auto` + `flex-nowrap`.
    - i18n: "All" label translated (`pages.calendar.filter.all` → FR: "Tous", EN: "All")
  - [x] 4.2 Filter persistence: use `useState` in AuthCalendarPage. Filter resets on page navigation (session = current page visit). No localStorage persistence for MVP — keep it simple.
  - [x] 4.3 UX spec compliance: "Department filter: dropdown multi-select — shows all departments by default, user can narrow to specific departments" [Source: ux-design-specification.md:1600]. The chip-based approach satisfies the same intent with better mobile UX. "Mes affectations uniquement" personal filter toggle is deferred to a future story — not in AC for 7.2.

- [x] Task 5: Update AuthCalendarPage for auth-aware data + filtering (AC: #1, #2, #3, #4)
  - [x] 5.1 Replace `useCalendarActivities` import with `useAuthCalendarActivities` from new hook
  - [x] 5.2 Replace `useYearActivities` import with `useAuthYearActivities` from new hook
  - [x] 5.3 Add `selectedDepartmentIds` state: `useState<number[]>([])` — empty array means "all departments" (no filter applied)
  - [x] 5.4 Pass `selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined` to both auth hooks. When empty, backend returns all.
  - [x] 5.5 Render `DepartmentFilter` above CalendarView (between heading and calendar):
    ```tsx
    <DepartmentFilter
      departments={departments}
      selectedIds={selectedDepartmentIds}
      onChange={setSelectedDepartmentIds}
    />
    ```
  - [x] 5.6 Remove the TODO comment from line 49
  - [x] 5.7 Keep `useDepartments()` for the department list — it's used both for calendar color config AND filter UI

- [x] Task 6: Verify CalendarView renders pre-filtered data correctly (AC: #3, #4)
  - [x] 6.1 CalendarView needs NO code changes — it already renders whatever `activities` are passed to it. The page wrapper (AuthCalendarPage) handles filtering via hook parameters. Backend returns only matching activities; CalendarView receives pre-filtered data. Calendar `calendars` config always includes ALL departments (for consistent color mapping even when filter is active).
  - [x] 6.2 Verify YearGrid also respects the filter — it receives `yearActivities` which will already be pre-filtered by the backend.
  - [x] 6.3 Manual verification: switch between views (Day/Week/Month/Year) with department filter active — confirm filter persists across view changes and data refetches correctly.

- [x] Task 7: Tests (AC: #1, #2, #3, #4)
  - [x] 7.1 Create `components/calendar/DepartmentFilter.test.tsx` (~5 tests):
    - Renders department chips for each department
    - "All" chip active by default (empty selectedIds)
    - Clicking a department chip calls onChange with that department's ID
    - Clicking "All" calls onChange with empty array
    - Active chips show filled state (visual test via class assertion)
  - [x] 7.2 Update `pages/AuthCalendarPage.test.tsx`:
    - Add MSW handler for `GET /api/calendar` (auth endpoint) — must use `/api/calendar` NOT `/api/auth/calendar`
    - Include `authHandlers` in server setup (mocks `GET /api/auth/me` for AuthProvider) — required for auth context to resolve
    - Test: renders department filter when departments loaded
    - Test: calendar shows activities (both public + authenticated) from auth endpoint
    - Test: loading skeleton while departments fetch
    - Test: error state on fetch failure
  - [x] 7.3 Create MSW handlers in `mocks/handlers/calendar.ts`:
    - `authCalendarHandlers` — intercept `GET /api/calendar`, parse `departmentIds` query param from request URL, return filtered mock data when param present (use `new URL(request.url).searchParams.getAll('departmentIds')`), return all mock data when absent. Include mock activities with both `Public` and `Authenticated` visibility.
    - `authCalendarHandlersEmpty` — returns empty array
    - `authCalendarHandlersError` — returns 500
    - Pattern: follow existing `calendarHandlers` from `mocks/handlers/public.ts`. Use `http.get("/api/calendar", ({ request }) => { ... })` with request param parsing.
  - [x] 7.4 Verify existing `PublicCalendarPage.test.tsx` tests still pass — public page must NOT show department filter

- [x] Task 8: i18n and accessibility (AC: #2, #3)
  - [x] 8.1 Add i18n keys to `public/locales/fr/common.json`:
    ```json
    "pages.calendar.filter": {
      "all": "Tous",
      "label": "Filtrer par departement"
    }
    ```
  - [x] 8.2 Add i18n keys to `public/locales/en/common.json`:
    ```json
    "pages.calendar.filter": {
      "all": "All",
      "label": "Filter by department"
    }
    ```
  - [x] 8.3 Update `test-utils.tsx` with new i18n keys
  - [x] 8.4 DepartmentFilter accessibility:
    - Container: `role="toolbar"` with `aria-label={t('pages.calendar.filter.label')}`
    - Each chip: `role="checkbox"` with `aria-checked` reflecting active state
    - Department color dot: purely decorative, `aria-hidden="true"`
    - Keyboard: Tab to focus toolbar, arrow keys between chips, Space/Enter to toggle

## Dev Notes

### Architecture Patterns & Constraints

- **New CalendarController** follows architecture mapping: `CalendarController` / `CalendarService` for FR35-FR40. [Source: architecture.md — Requirements Coverage Matrix, line 891]. "CalendarController — calendar event aggregation. Public read, VIEWER+ for detail." [Source: architecture.md, line 838]. For 7.2, the controller is `[Authorize]` only (no public read — the public calendar endpoint remains on `PublicController`).
- **Namespace convention**: If CalendarController ever needs to inject `IAuthorizationService` or `ICurrentUserContext` from `SdaManagement.Api.Auth`, use the namespace alias `using SdacAuth = SdaManagement.Api.Auth;` to avoid conflict with `Microsoft.AspNetCore.Authorization.IAuthorizationService`. All authenticated controllers follow this pattern (see ActivitiesController.cs:9).
- **Read-only projection** — CalendarService reads across Activity aggregates but never writes. Same pattern as PublicService. [Source: architecture.md, line 844]
- **Reuse PublicActivityListItem DTO.** The authenticated calendar returns the same data shape as public calendar — no additional fields needed. Auth vs public distinction is purely about WHICH activities are returned (Public-only vs Public+Authenticated), not different data shapes.
- **Backend filtering vs frontend filtering.** Backend department filtering chosen because: (1) reduces data transfer, (2) simpler frontend logic, (3) consistent with how public endpoint works, (4) no need for `setCalendars()` API complexity. See ADR below.
- **Axios array serialization.** Axios serializes `params: { departmentIds: [1, 3] }` as `departmentIds=1&departmentIds=3` by default. ASP.NET Core model binding reads `List<int>? departmentIds` from query string with this format. No custom serializer needed.
- **PublicCalendarPage must NOT change.** AC #1 explicitly requires anonymous users see only public activities with no department filter. The public route (`/calendar`) continues using `PublicController` + `PublicService` unchanged.
- **Session filter persistence.** Department filter state lives in `AuthCalendarPage` component state (useState). Resets on navigation. No localStorage/sessionStorage for MVP. UX spec says "filter persists during the session" — component state satisfies this for SPA navigation within the auth tree.

### ADR: Department Filter as Backend Query Parameter

| | |
|---|---|
| **Decision** | Department filtering via backend `departmentIds` query parameter, not frontend Schedule-X `setCalendars()` |
| **Context** | AC #3 requires department filtering. Two approaches: (A) backend filters and returns subset, (B) frontend receives all data and visually hides calendars via `setCalendars()` |
| **A chosen** | Backend filtering reduces payload, simplifies frontend. CalendarView stays purely presentational — receives pre-filtered data. Works identically for Year view (YearGrid receives filtered `yearActivities`). |
| **B rejected** | `setCalendars()` only hides visual rendering — events still in memory. Year view (YearGrid) doesn't use Schedule-X calendars config, so would need separate filtering logic. Frontend-only filtering would show wrong activity counts in month grid "+N more" indicators. |
| **Trade-off** | Backend approach makes a new HTTP request on every filter change. Acceptable: staleTime=5min caching + filter changes are infrequent. |

### Dual Endpoint Architecture

- **Public calendar**: `GET /api/public/calendar?start=&end=` → `[AllowAnonymous]` → `ActivityVisibility.Public` only
- **Auth calendar**: `GET /api/calendar?start=&end=&departmentIds=` → `[Authorize]` → `ActivityVisibility.Public + Authenticated`, optional department filter
- Two separate frontend service modules: `publicService` (unchanged) and `calendarService` (new)
- Two separate hook families: `useCalendarActivities` (public, unchanged) and `useAuthCalendarActivities` (new)
- Two separate query key namespaces: `["public", "calendar", ...]` and `["auth", "calendar", ...]` — ensures cache isolation

### Department Color Coding (AC #4) — Already Working

Department color coding was established in Story 5.5 and maintained through 7.1. The `calendars` config in CalendarView maps department abbreviations to colors via `buildCalendarsFromDepartments()`. This works automatically for auth calendar since it uses the same `PublicActivityListItem` DTO with `departmentColor`/`departmentAbbreviation` fields. No changes needed for AC #4 — just verify it works with authenticated activities.

### Project Structure Notes

**New files:**
- `src/SdaManagement.Api/Services/ICalendarService.cs`
- `src/SdaManagement.Api/Services/CalendarService.cs`
- `src/SdaManagement.Api/Controllers/CalendarController.cs`
- `src/SdaManagement.IntegrationTests/Endpoints/CalendarEndpointTests.cs`
- `src/sdamanagement-web/src/services/calendarService.ts`
- `src/sdamanagement-web/src/hooks/useAuthCalendarActivities.ts`
- `src/sdamanagement-web/src/hooks/useAuthYearActivities.ts`
- `src/sdamanagement-web/src/components/calendar/DepartmentFilter.tsx`
- `src/sdamanagement-web/src/components/calendar/DepartmentFilter.test.tsx`
- `src/sdamanagement-web/src/mocks/handlers/calendar.ts`

**Modified files:**
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — register `ICalendarService` / `CalendarService` (line ~176, after IPublicService)
- `src/sdamanagement-web/src/pages/AuthCalendarPage.tsx` — switch to auth hooks, add DepartmentFilter, remove TODO
- `src/sdamanagement-web/src/pages/AuthCalendarPage.test.tsx` — add auth endpoint tests, department filter tests
- `src/sdamanagement-web/public/locales/fr/common.json` — add filter i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — add filter i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — add filter i18n keys

**No changes needed:**
- CalendarView.tsx — receives pre-filtered data, no modification needed
- PublicCalendarPage.tsx — stays as-is (public-only)
- PublicController.cs — no changes to public endpoint
- PublicService.cs — no changes
- useCalendarActivities (in usePublicDashboard.ts) — stays as public hook
- useYearActivities.ts — stays as public hook (auth variant is new file)
- No database migrations needed
- No new npm dependencies needed

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7, Story 7.2] — Story AC and context
- [Source: _bmad-output/planning-artifacts/prd.md#FR35-FR40] — Calendar functional requirements
- [Source: _bmad-output/planning-artifacts/architecture.md#Calendar Integration] — CalendarController + CalendarService mapping
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries] — CalendarController as read-only projection
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Boundaries] — Public vs authenticated route trees
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:1599-1602] — Calendar filtering: department filter dropdown multi-select, personal filter toggle
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:961] — Department filter allows narrowing to single department view
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:365] — Google Calendar's week view with department filters
- [Source: Context7 Schedule-X docs] — `calendarControls.setCalendars()` available for dynamic calendar updates (not used — backend filtering chosen instead)
- [Source: Context7 TanStack Query docs] — Parameterized query keys with filter objects, `enabled` flag pattern
- [Source: _bmad-output/implementation-artifacts/7-1-calendar-core-sunday-first-with-multiple-views.md] — Previous story implementation details, patterns, learnings

### Library & Framework Requirements

| Library | Version | Purpose | Notes |
|---|---|---|---|
| `@schedule-x/react` | ^4.1.0 | Calendar rendering | Already installed. No changes needed. |
| `@schedule-x/calendar-controls` | ^4.3.1 | Programmatic control | Already installed. `setCalendars()` available but NOT used for filtering. |
| `@tanstack/react-query` | ^5.90.21 | Data fetching with parameterized query keys | Already installed. Query keys include `departmentIds` for auto-refetch on filter change. |
| `axios` | existing | HTTP client via `api` from `@/lib/api` | Already installed. Used by new `calendarService.ts`. `withCredentials: true` for httpOnly JWT cookie. |
| `react-i18next` | existing | i18n for filter labels | Already installed. |

**No new dependencies required.** All libraries already in `package.json`.

### Testing Requirements

**Backend integration tests** (Task 2, ~7 tests):
- Anonymous → 401 on `GET /api/calendar`
- VIEWER → returns Public + Authenticated activities
- With `departmentIds=1` → returns only dept 1 activities
- With `departmentIds=1&departmentIds=3` → returns activities from both depts
- Without `departmentIds` → returns all activities
- Date range > 90 days → capped
- Empty range → empty list

**Frontend component tests** (Tasks 7.1-7.4, ~10 tests):
- DepartmentFilter: renders chips, "All" default, click toggles, onChange callback, active visual state
- AuthCalendarPage: renders filter, shows auth activities, loading skeleton, error state
- PublicCalendarPage: verify NO department filter rendered (regression check)

**MSW handlers** (Task 7.3):
- Auth calendar handlers: mixed visibility activities, filtered variants, empty, error

**Total new tests**: ~17 (7 backend + 10 frontend)

### Previous Story Intelligence (Story 7.1)

**From Story 7.1 completion notes:**
- CalendarView is purely presentational — data fetching stays in page wrappers. This pattern means AuthCalendarPage can switch data sources without touching CalendarView.
- `onViewChange` callback notifies page wrapper when view changes — used to switch between `useAuthCalendarActivities` (Day/Week/Month) and `useAuthYearActivities` (Year). Same dual-hook pattern carries over.
- `onYearChange` callback wired through CalendarView → page wrappers for YearGrid year navigation. Auth version needs same wiring.
- `temporal-polyfill` pinned at `0.3.0` — do not upgrade.
- `isPending` (not `isLoading`) for TanStack Query loading states.
- Sonner Toaster renders `<section role="region">` — use specific aria-label when querying by role in tests.
- Hook `enabled: !!start && !!end` prevents fetch before Schedule-X fires initial `onRangeUpdate`.

**From Story 7.1 code review fixes:**
- Year view data flow: `onYearChange` → page wrapper updates `yearForFetch` → `useAuthYearActivities` refetches. Must replicate in auth page.
- Year view loading/error states surfaced to CalendarView via `yearIsPending`/`yearIsError`/`onYearRetry` props. Must pass from auth hooks.

### Git Intelligence

- **Commit pattern**: `feat(calendar): Story 7.2 — Calendar visibility and department filtering`
- **Recent patterns**: Backend-first → frontend service/hooks → UI → tests. Integration tests use `SdaManagementWebApplicationFactory`. MSW handlers per feature domain.
- **Files from 7.1 commit** (1e8d8ee): CalendarView.tsx, ViewSwitcher.tsx, YearGrid.tsx, calendar-utils.ts, useYearActivities.ts, AuthCalendarPage.tsx (stub→full), PublicCalendarPage.tsx (refactored) — all foundations for 7.2.

### Known Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Predicateur extraction duplication | LOW | CalendarService duplicates PublicService `ExtractPredicateur()` private method. Both must match exactly (case-insensitive "Predicateur"/"Prédicateur", FirstOrDefault on assignments, avatarService.GetAvatarUrl). Acceptable for 2 call sites. If a 3rd appears, extract to shared `ActivityMappingHelper` static class. |
| Filter state reset on navigation | LOW | By design for MVP. No localStorage persistence. Users can re-select departments quickly. |
| Query cache bloat with many filter combinations | LOW | staleTime=5min + TanStack Query GC handles this. Department combinations are finite (~2^8 max). |
| "Mes affectations" personal filter not in scope | NONE | UX spec mentions it but it's not in AC for 7.2. Defer to future story. |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No debug issues encountered. Clean implementation across all tasks.

### Completion Notes List

- **Task 1**: Created CalendarController + CalendarService backend. New `[Authorize]` endpoint at `GET /api/calendar` with optional `departmentIds` query parameter. Returns both Public and Authenticated visibility activities. 90-day range guard. DI registered in ServiceCollectionExtensions.
- **Task 2**: Created 7 backend integration tests in `CalendarEndpointTests.cs`: anonymous 401, auth returns both visibilities, single dept filter, multi dept filter, no filter returns all, 90-day cap, inverted range returns empty. All pass.
- **Task 3**: Created `calendarService.ts`, `useAuthCalendarActivities.ts`, `useAuthYearActivities.ts`. Auth hooks use `["auth", "calendar", ...]` query key namespace for cache isolation. Year hook passes departmentIds through quarterly fetches.
- **Task 4**: Created `DepartmentFilter.tsx` — horizontal chip row with "All" default, multi-toggle behavior, department color-coded active states, responsive horizontal scroll, full a11y (toolbar role, checkbox role, keyboard nav).
- **Task 5**: Updated `AuthCalendarPage.tsx` — switched to auth hooks, added department filter state, renders DepartmentFilter above CalendarView, removed TODO comment.
- **Task 6**: Verified CalendarView needs no changes — receives pre-filtered data from page wrapper. YearGrid also receives pre-filtered yearActivities.
- **Task 7**: Created 6 DepartmentFilter unit tests, 4 AuthCalendarPage tests (including filter rendering), auth calendar MSW handlers with dept filtering support. PublicCalendarPage regression tests still pass.
- **Task 8**: Added i18n keys (fr/en) for filter.all and filter.label. Updated test-utils.tsx. DepartmentFilter has full a11y: role="toolbar", aria-label, role="checkbox", aria-checked, arrow key navigation.

### Change Log

- 2026-03-17: Story 7.2 implementation complete — Calendar visibility and department filtering
- 2026-03-17: Code review fixes — 8 findings (1 HIGH, 4 MEDIUM, 3 LOW) resolved:
  - H1: Added 2 missing AuthCalendarPage tests (auth activities, error state)
  - M1: Moved DepartmentFilter into CalendarView via filterSlot prop (heading-first layout)
  - M2: Fixed useCallback deps in useAuthYearActivities + useYearActivities (use .refetch refs)
  - M3: Fixed DepartmentFilter roving tabindex — single tabIndex=0 per WAI-ARIA toolbar pattern
  - M4: Added null guard on assignment.User in CalendarService + PublicService ExtractPredicateur
  - L1: Fixed French accent "departement" → "département" in fr.json + test-utils
  - L2: Improved MSW mock dept filtering — derived from mock data instead of hard-coded mapping
  - L3: Normalized Unicode encoding in fr/common.json calendar section

### File List

**New files:**
- src/SdaManagement.Api/Services/ICalendarService.cs
- src/SdaManagement.Api/Services/CalendarService.cs
- src/SdaManagement.Api/Controllers/CalendarController.cs
- tests/SdaManagement.Api.IntegrationTests/Calendar/CalendarEndpointTests.cs
- src/sdamanagement-web/src/services/calendarService.ts
- src/sdamanagement-web/src/hooks/useAuthCalendarActivities.ts
- src/sdamanagement-web/src/hooks/useAuthYearActivities.ts
- src/sdamanagement-web/src/components/calendar/DepartmentFilter.tsx
- src/sdamanagement-web/src/components/calendar/DepartmentFilter.test.tsx
- src/sdamanagement-web/src/mocks/handlers/calendar.ts

**Modified files:**
- src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs
- src/SdaManagement.Api/Services/PublicService.cs (review fix: null guard in ExtractPredicateur)
- src/sdamanagement-web/src/pages/AuthCalendarPage.tsx
- src/sdamanagement-web/src/pages/AuthCalendarPage.test.tsx
- src/sdamanagement-web/src/components/calendar/CalendarView.tsx (review fix: filterSlot prop)
- src/sdamanagement-web/src/hooks/useYearActivities.ts (review fix: useCallback deps)
- src/sdamanagement-web/public/locales/fr/common.json
- src/sdamanagement-web/public/locales/en/common.json
- src/sdamanagement-web/src/test-utils.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
