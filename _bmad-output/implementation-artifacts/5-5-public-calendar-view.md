# Story 5.5: Public Calendar View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **anonymous visitor**,
I want to view a public calendar showing church-wide activities and special events,
So that I can browse what's happening across different weeks and months.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–5.4 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2, Story 2.1/2.2) — at least 3-4 departments with colors
- Activities with public visibility created (from Epic 4) — several across different dates and departments
- Program schedules configured (from Epic 2, Story 2.4)

### Codebase State (Story 5.4 Complete)

- `PublicController` exists at `api/public` with five endpoints: `GET /api/public/next-activity` (200/204), `GET /api/public/live-status` (200), `GET /api/public/upcoming-activities` (200), `GET /api/public/program-schedules` (200), `GET /api/public/departments` (200) [Source: `Controllers/PublicController.cs`]
- `IPublicService` / `PublicService` exist with `GetNextActivityAsync()`, `GetUpcomingActivitiesAsync()`, `GetProgramSchedulesAsync()`, `GetPublicDepartmentsAsync()` — extend with new calendar method [Source: `Services/PublicService.cs`]
- `PublicActivityListItem` DTO already exists with: `Id`, `Title`, `Date` (DateOnly), `StartTime` (TimeOnly), `EndTime` (TimeOnly), `DepartmentName`, `DepartmentAbbreviation`, `DepartmentColor`, `PredicateurName`, `PredicateurAvatarUrl`, `SpecialType` — **reuse this DTO** for calendar events [Source: `Dtos/Public/PublicActivityListItem.cs`]
- `Activity` entity has `Visibility` enum (`Public = 0`, `Authenticated = 1`), `DepartmentId` FK (nullable `int?`), `Date` (DateOnly), `StartTime` (TimeOnly), `EndTime` (TimeOnly), `Title`, `SpecialType` [Source: `Data/Entities/Activity.cs`]
- Frontend `PublicCalendarPage.tsx` exists as a **stub** with only a heading — replace entirely [Source: `pages/PublicCalendarPage.tsx`]
- Route `/calendar` already configured in `App.tsx` line 46 under public route tree — **BUT** `PublicCalendarPage` is currently **eagerly imported** at line 13. MUST convert to `lazy()` import to prevent Schedule-X + temporal-polyfill from bloating the main bundle on every page
- `@schedule-x/react` v4.1.0 already installed in `package.json` — **but** `@schedule-x/calendar`, `@schedule-x/events-service`, `@schedule-x/theme-default`, and `temporal-polyfill` are **NOT installed** and must be added
- `publicService.ts` has 5 methods — extend with `getCalendarActivities(start, end)` [Source: `services/publicService.ts`]
- `types/public.ts` has `PublicActivityListItem` interface already — **reuse** for calendar data [Source: `types/public.ts`]
- `usePublicDashboard.ts` has 6 hooks — add `useCalendarActivities(start, end)` [Source: `hooks/usePublicDashboard.ts`]
- MSW handlers exist at `mocks/handlers/public.ts` for all 5 existing endpoints — extend with calendar handler
- i18n keys `pages.calendar.title` already exist ("Calendrier" / "Calendar") — add calendar-specific keys
- `test-utils.tsx` has inline i18n with `pages.calendar.title: "Calendrier"` — extend with new keys
- "public" rate limiting policy exists (30 req/min per IP) in `ServiceCollectionExtensions.cs`
- `formatActivityDate()`, `formatTime()`, `getDateLocale()` exist at `@/lib/dateFormatting.ts` — fully tested (26 test cases)
- Section wrapper pattern, card pattern, skeleton pattern all established from Stories 5.1–5.4

## Acceptance Criteria

1. **Sunday-first calendar with public activities only**: Given an anonymous visitor navigates to "Calendrier" (`/calendar`), When the public calendar page loads, Then a Sunday-first calendar displays with only public-visibility activities (FR6), And activities show with department color coding, And the page heading is "Calendrier" (`pages.calendar.title`).

2. **Multiple calendar view switching**: Given the public calendar page, When the visitor switches between Day, Week, and Month views, Then the calendar updates accordingly, And only public activities are shown (no authenticated-only events), And the default view on desktop is Month grid, And department colors are visible on event blocks in all views.

3. **Mobile layout adaptation**: Given the public calendar on mobile (< 640px), When rendered, Then the calendar automatically adapts to a mobile-friendly day view (Schedule-X `isResponsive: true`), And swipe gestures navigate between days, And no horizontal scrolling occurs. **Note**: UX spec mentions "3-day view, swipe to shift by 1 day" — Schedule-X's responsive mode uses 1-day view instead. This is acceptable for MVP. The 3-day mobile view with `weekOptions.nDays: 3` is deferred to Epic 7 (authenticated calendar) where more control is warranted.

4. **Public calendar API endpoint**: Given `GET /api/public/calendar?start={date}&end={date}` is called without authentication, Then only public-visibility activities within the date range are returned as `PublicActivityListItem[]`, And the endpoint uses `[AllowAnonymous]` and `[EnableRateLimiting("public")]`, And activities are ordered by date then start time.

5. **Department color coding on events**: Given activities with associated departments, When displayed on the calendar, Then each event block uses the department's color (via Schedule-X `calendars` config with `calendarId` mapping), And the department abbreviation is visible on each event, And color is always paired with a text label (department abbreviation).

6. **Loading and error states**: Given the calendar data is loading, When the page renders, Then a skeleton placeholder displays, Given the API call fails, Then an error message displays with `pages.calendar.loadError` i18n key, And a retry mechanism is available.

7. **Dynamic event loading on range change**: Given the calendar view changes (navigation or view switch), When `onRangeUpdate` fires, Then events are fetched from the API for the new visible date range, And previously loaded events outside the range are replaced.

8. **Accessibility**: Given the public calendar page, Then the page has proper heading hierarchy (`h1` for page title), And the calendar container has `role="region"` with `aria-label`, And keyboard navigation works within the calendar (arrow keys between days/events), And all color usage is paired with text labels.

## Tasks / Subtasks

### Prerequisites — Install Schedule-X Dependencies

- [x] Task 0: Install Required npm Packages (AC: #1, #2, #3)
  - [x] 0.1 Install Schedule-X core packages and temporal polyfill — **pin to v4.x to match existing `@schedule-x/react` ^4.1.0**:
    ```bash
    cd src/sdamanagement-web
    npm install @schedule-x/calendar@^4.1.0 @schedule-x/events-service@^4.1.0 @schedule-x/theme-default@^4.1.0 temporal-polyfill
    ```
  - [x] 0.2 Verify all packages resolve correctly in `package.json` **and are the same major.minor**:
    - `@schedule-x/react` — already installed (^4.1.0)
    - `@schedule-x/calendar` — new (^4.1.0)
    - `@schedule-x/events-service` — new (^4.1.0)
    - `@schedule-x/theme-default` — new (^4.1.0)
    - `temporal-polyfill` — new
  - [x] 0.3 **CRITICAL**: All `@schedule-x/*` packages MUST be the same major version. If any package resolves to v5.x while react is v4.x, the APIs are incompatible and will crash at runtime. Verify with `npm ls @schedule-x/react @schedule-x/calendar @schedule-x/events-service @schedule-x/theme-default` — all should show 4.x.y.

### Frontend — Lazy-Load Calendar Page (Bundle Splitting)

- [x] Task 0.5: Convert PublicCalendarPage to Lazy Import (AC: #1)
  - [x] 0.5.1 In `src/sdamanagement-web/src/App.tsx`, **remove** the eager import at line 13:
    ```typescript
    // REMOVE THIS:
    import PublicCalendarPage from "@/pages/PublicCalendarPage";
    ```
  - [x] 0.5.2 Add lazy import alongside the other lazy-loaded pages (after line 19):
    ```typescript
    const PublicCalendarPage = lazy(() => import("@/pages/PublicCalendarPage"));
    ```
  - [x] 0.5.3 Wrap the calendar route (line 46) in a `Suspense` boundary:
    ```tsx
    <Route path="calendar" element={
      <Suspense fallback={<LoadingSpinner />}>
        <PublicCalendarPage />
      </Suspense>
    } />
    ```
  - [x] 0.5.4 **WHY**: Schedule-X + temporal-polyfill + theme CSS add ~80-150KB. Without lazy loading, this code bloats the main bundle and loads on EVERY page (including HomePage). Lazy loading ensures calendar code only loads when user navigates to `/calendar`. This aligns with architecture decision P0-11: "Separate public/auth route trees with layout-level code splitting."

### Backend — Service

- [x] Task 1: Add GetCalendarActivitiesAsync to PublicService (AC: #4)
  - [x] 1.1 Add method signature to `src/SdaManagement.Api/Services/IPublicService.cs`:
    ```csharp
    Task<List<PublicActivityListItem>> GetCalendarActivitiesAsync(DateOnly start, DateOnly end);
    ```
  - [x] 1.2 Implement in `src/SdaManagement.Api/Services/PublicService.cs` — follow the existing `GetUpcomingActivitiesAsync()` pattern:
    ```csharp
    public async Task<List<PublicActivityListItem>> GetCalendarActivitiesAsync(DateOnly start, DateOnly end)
    {
        var activities = await dbContext.Activities
            .Include(a => a.Department)
            .Include(a => a.Roles)
                .ThenInclude(r => r.Assignments)
                    .ThenInclude(ra => ra.User)
            .Where(a => a.Visibility == ActivityVisibility.Public
                     && a.Date >= start
                     && a.Date <= end)
            .OrderBy(a => a.Date)
                .ThenBy(a => a.StartTime)
            .ToListAsync();

        return activities.Select(a =>
        {
            var (predicateurName, predicateurAvatarUrl) = ExtractPredicateur(a);
            return new PublicActivityListItem(
                Id: a.Id,
                Title: a.Title,
                Date: a.Date,
                StartTime: a.StartTime,
                EndTime: a.EndTime,
                DepartmentName: a.Department?.Name,
                DepartmentAbbreviation: a.Department?.Abbreviation,
                DepartmentColor: a.Department?.Color,
                PredicateurName: predicateurName,
                PredicateurAvatarUrl: predicateurAvatarUrl,
                SpecialType: a.SpecialType);
        }).ToList();
    }
    ```
  - [x] 1.3 **No `.Take()` limit** — calendar needs all activities in the visible range (could be 30+ days of data). The activity count per month is small (< 50 for a single church).
  - [x] 1.4 **No new DTO** — reuse `PublicActivityListItem` exactly as-is. The calendar events carry the same data shape as upcoming activities.
  - [x] 1.5 **Date validation**:
    - If `start > end`, return empty list (no error).
    - **Max range guard**: If `end - start > 90 days`, cap `end` to `start.AddDays(90)` silently. This prevents abuse via `?start=2000-01-01&end=2099-12-31` — even though rate limiting exists, large queries should be bounded at the service level.
    - The controller validates the basic format via model binding (`DateOnly` from ISO strings).

### Backend — Controller

- [x] Task 2: Add Calendar Endpoint to PublicController (AC: #4)
  - [x] 2.1 Add to `src/SdaManagement.Api/Controllers/PublicController.cs`:
    ```csharp
    [AllowAnonymous]
    [HttpGet("calendar")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetCalendarActivities(
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end)
    {
        var result = await publicService.GetCalendarActivitiesAsync(start, end);
        return Ok(result);
    }
    ```
  - [x] 2.2 **Returns 200 with array** (empty array if no activities in range). No 204.
  - [x] 2.3 **Query params**: `?start=2026-03-01&end=2026-03-31`. ASP.NET Core model binding handles `DateOnly` natively from ISO format.
  - [x] 2.4 **No pagination** — activity count per range is small. Returns flat array.

### Frontend — Service

- [x] Task 3: Add getCalendarActivities to publicService (AC: #4, #7)
  - [x] 3.1 Add to `src/sdamanagement-web/src/services/publicService.ts`:
    ```typescript
    getCalendarActivities: (start: string, end: string) =>
      api
        .get<PublicActivityListItem[]>("/api/public/calendar", {
          params: { start, end },
        })
        .then((res) => res.data),
    ```
  - [x] 3.2 `start` and `end` are ISO date strings (`"2026-03-01"`) — passed as query params.
  - [x] 3.3 No new type import needed — `PublicActivityListItem` already imported in publicService.

### Frontend — Hook

- [x] Task 4: Add useCalendarActivities Hook (AC: #7)
  - [x] 4.1 Add to `src/sdamanagement-web/src/hooks/usePublicDashboard.ts`:
    ```typescript
    export function useCalendarActivities(start: string, end: string) {
      return useQuery<PublicActivityListItem[]>({
        queryKey: ["public", "calendar", start, end],
        queryFn: () => publicService.getCalendarActivities(start, end),
        staleTime: 5 * 60 * 1000, // 5 minutes — same as upcoming activities
        retry: 1,
        enabled: !!start && !!end,
      });
    }
    ```
  - [x] 4.2 `queryKey` includes `start` and `end` for automatic refetch when date range changes.
  - [x] 4.3 `enabled: !!start && !!end` prevents fetch before Schedule-X fires initial `onRangeUpdate`.

### Frontend — Calendar Page Component

- [x] Task 5: Implement PublicCalendarPage (AC: #1, #2, #3, #5, #6, #7, #8)

  **COMPONENT STRUCTURE**: This is ONE file (`PublicCalendarPage.tsx`) containing TWO components:
  - `PublicCalendarPage` — default export, outer wrapper. Fetches departments, shows skeleton, renders `CalendarView` when ready (Task 5.8).
  - `CalendarView` — inner component (not exported). Receives `departments` prop, initializes Schedule-X calendar, fetches/syncs events (Tasks 5.3–5.7).

  - [x] 5.1 **Replace** the stub at `src/sdamanagement-web/src/pages/PublicCalendarPage.tsx` entirely. Structure:
    ```typescript
    import { useState, useCallback, useMemo, useEffect } from "react";
    import { useTranslation } from "react-i18next";
    import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
    import {
      createViewDay,
      createViewWeek,
      createViewMonthGrid,
    } from "@schedule-x/calendar";
    import { createEventsServicePlugin } from "@schedule-x/events-service";
    import "temporal-polyfill/global";
    import "@schedule-x/theme-default/dist/index.css";
    import { Skeleton } from "@/components/ui/skeleton";
    import { useCalendarActivities, useDepartments } from "@/hooks/usePublicDashboard";
    import type { PublicActivityListItem, PublicDepartment } from "@/types/public";
    ```
  - [x] 5.2 **Department-to-calendar color mapping** — see Task 5.7 (`buildCalendarsFromDepartments`). The `calendars` config is built from departments (fetched in the two-phase pattern, Task 5.8), NOT from activity data. Do NOT create a separate `buildCalendars(activities)` function.
  - [x] 5.3 **Map activities to Schedule-X events**: Transform `PublicActivityListItem[]` to Schedule-X event format:
    ```typescript
    function mapToCalendarEvents(activities: PublicActivityListItem[]) {
      return activities.map((a) => ({
        id: String(a.id),
        title: a.title,
        start: `${a.date} ${a.startTime.substring(0, 5)}`, // "2026-03-14 09:30"
        end: `${a.date} ${a.endTime.substring(0, 5)}`,     // "2026-03-14 12:00"
        calendarId: a.departmentAbbreviation ?? "general",
        description: a.departmentName ?? undefined,
        people: a.predicateurName ? [a.predicateurName] : [],
      }));
    }
    ```
    **CRITICAL — DATE FORMAT**: Schedule-X v3+ moved to the Temporal API as its native date format. The old string format `"YYYY-MM-DD HH:mm"` is a **legacy format** from v2. Use Temporal objects as the primary approach:

    **Primary approach — Temporal objects** (native v4 format):
    ```typescript
    import "temporal-polyfill/global";
    // ...
    start: Temporal.PlainDateTime.from(`${a.date}T${a.startTime}`),
    end: Temporal.PlainDateTime.from(`${a.date}T${a.endTime}`),
    ```
    The backend returns `date` as `"2026-03-14"` and `startTime` as `"09:30:00"`, so `Temporal.PlainDateTime.from("2026-03-14T09:30:00")` parses correctly.

    **Fallback approach — legacy string format** (only if Temporal parsing fails):
    ```typescript
    start: `${a.date} ${a.startTime.substring(0, 5)}`, // "2026-03-14 09:30"
    end: `${a.date} ${a.endTime.substring(0, 5)}`,     // "2026-03-14 12:00"
    ```

    The `temporal-polyfill/global` import is required either way (Schedule-X internal dependency).
  - [x] 5.4 **Calendar initialization** with `useCalendarApp`:

    **CRITICAL — Initial date range**: `onRangeUpdate` may NOT fire on initial mount in all Schedule-X versions. To prevent an empty calendar on first load, set a default date range covering the current month:
    ```typescript
    function getInitialDateRange() {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const start = new Date(year, month, 1).toISOString().substring(0, 10);
      const end = new Date(year, month + 1, 0).toISOString().substring(0, 10);
      return { start, end };
    }

    // Inside CalendarView component:
    export default function CalendarView({ departments }: { departments: PublicDepartment[] }) {
      const { t, i18n } = useTranslation();
      const [dateRange, setDateRange] = useState(getInitialDateRange);
      const [eventsService] = useState(() => createEventsServicePlugin());

      const calendar = useCalendarApp({
        views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
        defaultView: createViewMonthGrid().name,
        firstDayOfWeek: 7, // Sunday-first (Temporal API convention: 7 = Sunday)
        locale: i18n.language === "fr" ? "fr-FR" : "en-US",
        isResponsive: true, // Auto-switches to day view on mobile
        dayBoundaries: { start: "06:00", end: "22:00" },
        weekOptions: {
          gridHeight: 1800,
          nDays: 7,
          eventWidth: 95,
        },
        monthGridOptions: {
          nEventsPerDay: 4,
        },
        events: [],
        plugins: [eventsService],
        callbacks: {
          onRangeUpdate(range) {
            setDateRange({
              start: range.start.toString().substring(0, 10),
              end: range.end.toString().substring(0, 10),
            });
          },
        },
      });
    ```
  - [x] 5.5 **Fetch and sync events**: Use `useCalendarActivities` with `dateRange` and update Schedule-X via `eventsService.set()`:
    ```typescript
      const { data, isPending, isError } = useCalendarActivities(
        dateRange.start,
        dateRange.end
      );

      useEffect(() => {
        if (data && data.length > 0) {
          const calendarEvents = mapToCalendarEvents(data);
          eventsService.set(calendarEvents);
        } else if (data && data.length === 0) {
          eventsService.set([]);
        }
      }, [data, eventsService]);
    ```
  - [x] 5.6 **Page layout**:
    ```tsx
      return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {t("pages.calendar.title")}
          </h1>

          {isError && (
            <p className="mt-4 text-sm text-red-600">
              {t("pages.calendar.loadError")}
            </p>
          )}

          <div
            className="mt-6 h-[600px] sm:h-[700px] lg:h-[800px]"
            role="region"
            aria-label={t("pages.calendar.title")}
          >
            <ScheduleXCalendar calendarApp={calendar} />
          </div>
        </div>
      );
    }
    ```
  - [x] 5.7 **Department-to-calendar color mapping**: Since `useCalendarApp` creates the calendar config ONCE (immutable after init), department colors must be known before calendar initialization. Use the two-phase pattern (Task 5.8) to fetch departments first, then build `calendars` config:

    ```typescript
    function buildCalendarsFromDepartments(departments: PublicDepartment[]) {
      const calendars: Record<string, {
        colorName: string;
        lightColors: { main: string; container: string; onContainer: string };
      }> = {
        // ALWAYS include "general" fallback for activities without a department
        general: {
          colorName: "general",
          lightColors: {
            main: "#94A3B8",       // slate-400
            container: "#F1F5F9",  // slate-100
            onContainer: "#0F172A", // slate-900
          },
        },
      };

      for (const dept of departments) {
        calendars[dept.abbreviation] = {
          colorName: dept.abbreviation,
          lightColors: {
            main: dept.color,
            container: `${dept.color}20`, // 12% opacity tint
            onContainer: "#0F172A",
          },
        };
      }
      return calendars;
    }
    ```

    **WHY "general" fallback**: Activities without a department get `calendarId: "general"`. Without a matching `calendars` entry, Schedule-X may render these without color or throw errors. The slate-400 neutral color signals "no department."

    **Render phases**:
    1. First render: fetch departments → show skeleton
    2. Second render: build `calendars` config from departments → initialize calendar with empty events
    3. `onRangeUpdate` fires → fetch calendar activities → `eventsService.set()`

  - [x] 5.8 **Two-phase initialization pattern**:
    ```typescript
    export default function PublicCalendarPage() {
      const { t, i18n } = useTranslation();
      const { data: departments, isPending: deptPending } = useDepartments();

      if (deptPending) {
        return (
          <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-6 h-[600px] w-full rounded-2xl" />
          </div>
        );
      }

      return <CalendarView departments={departments ?? []} />;
    }
    ```
    The inner `CalendarView` component receives departments and uses them to build `calendars` config in `useCalendarApp`. This avoids re-creating the calendar instance when departments load.

  - [x] 5.9 **Calendar container height**: The calendar container MUST have explicit height — Schedule-X will collapse to 0px without it. Use `h-[600px] sm:h-[700px] lg:h-[800px]` on the wrapper `div`. Match this height in the skeleton placeholder (Task 5.8).
  - [x] 5.10 **No click-to-detail**: Clicking an event does nothing for MVP. No `onEventClick` handler needed. Calendar is read-only view.
  - [x] 5.11 **No drag-and-drop**: Do NOT install `@schedule-x/drag-and-drop`. Public calendar is read-only.

### Frontend — CSS Integration

- [x] Task 6: Handle Schedule-X Theme CSS (AC: #1)
  - [x] 6.1 Import `@schedule-x/theme-default/dist/index.css` in `PublicCalendarPage.tsx` (component-level import, not global).
  - [x] 6.2 **CSS container sizing**: Schedule-X React wraps the calendar in a `.sx-react-calendar-wrapper` div. The docs state: *"The calendar component itself does not have fixed dimensions, so you must define the height and width of its container."* The parent `div` in Task 5.6 sets height via Tailwind (`h-[600px] sm:h-[700px] lg:h-[800px]`). If this doesn't propagate into the Schedule-X wrapper, add a CSS rule as fallback:
    ```css
    /* In a co-located CSS module or global styles */
    .sx-react-calendar-wrapper {
      width: 100%;
      height: 100%;
    }
    ```
  - [x] 6.3 **CSS isolation**: Schedule-X styles are scoped within `[data-calendar]` containers. Tailwind's preflight reset may affect Schedule-X internal elements. If visual issues occur, wrap the calendar in a `div` with `className="sx-calendar-container"` and add targeted CSS overrides in a co-located CSS module or inline styles.
  - [x] 6.4 **IMPORTANT**: Do NOT modify the Schedule-X theme CSS directly. If customization is needed, use the `calendars` config for event colors and CSS custom properties for minor adjustments.

### Frontend — i18n

- [x] Task 7: Add Calendar Translation Keys (AC: #6)
  - [x] 7.1 Add to `src/sdamanagement-web/public/locales/fr/common.json` under `pages.calendar`:
    ```json
    "calendar": {
      "title": "Calendrier",
      "loadError": "Impossible de charger le calendrier"
    }
    ```
    **Note**: `pages.calendar.title` already exists. Add `loadError` only.
  - [x] 7.2 Add to `src/sdamanagement-web/public/locales/en/common.json` under `pages.calendar`:
    ```json
    "calendar": {
      "title": "Calendar",
      "loadError": "Unable to load calendar"
    }
    ```
  - [x] 7.3 **Update test-utils.tsx**: Add `loadError` to the `pages.calendar` section in the inline i18n resources (line 85):
    ```typescript
    calendar: { title: "Calendrier", loadError: "Impossible de charger le calendrier" },
    ```

### Frontend — MSW Mock Handlers

- [x] Task 8: Add Calendar Mock Data and Handlers (AC: #4, #7)
  - [x] 8.1 Add to `src/sdamanagement-web/src/mocks/handlers/public.ts`:
    ```typescript
    const mockCalendarActivities: PublicActivityListItem[] = [
      {
        id: 101,
        title: "Culte du Sabbat",
        date: "2026-03-14",
        startTime: "09:30:00",
        endTime: "12:00:00",
        departmentName: "Culte",
        departmentAbbreviation: "CU",
        departmentColor: "#F43F5E",
        predicateurName: "Pasteur Vicuna",
        predicateurAvatarUrl: null,
        specialType: null,
      },
      {
        id: 102,
        title: "Programme JA",
        date: "2026-03-14",
        startTime: "14:00:00",
        endTime: "16:00:00",
        departmentName: "Jeunesse Adventiste",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        predicateurName: null,
        predicateurAvatarUrl: null,
        specialType: null,
      },
      {
        id: 103,
        title: "Sainte-Cene",
        date: "2026-03-21",
        startTime: "09:30:00",
        endTime: "12:30:00",
        departmentName: "Culte",
        departmentAbbreviation: "CU",
        departmentColor: "#F43F5E",
        predicateurName: "Pasteur Vicuna",
        predicateurAvatarUrl: null,
        specialType: "sainte-cene",
      },
      {
        id: 104,
        title: "Reunion MIFEM",
        date: "2026-03-18",
        startTime: "19:00:00",
        endTime: "20:30:00",
        departmentName: "Ministere de la Femme",
        departmentAbbreviation: "MIFEM",
        departmentColor: "#8B5CF6",
        predicateurName: null,
        predicateurAvatarUrl: null,
        specialType: null,
      },
    ];

    export const calendarHandlers = [
      http.get("/api/public/calendar", () =>
        HttpResponse.json(mockCalendarActivities)
      ),
    ];

    export const calendarHandlersEmpty = [
      http.get("/api/public/calendar", () => HttpResponse.json([])),
    ];

    export const calendarHandlersError = [
      http.get("/api/public/calendar", () =>
        new HttpResponse(null, { status: 500 })
      ),
    ];
    ```
  - [x] 8.2 Export `mockCalendarActivities` for test reuse.

### Frontend — Tests

- [x] Task 9: Create PublicCalendarPage Tests (AC: #1, #6, #8)
  - [x] 9.1 Create `src/sdamanagement-web/src/pages/PublicCalendarPage.test.tsx`:
    - Setup: `setupServer(...authHandlers, ...calendarHandlers, ...departmentHandlers)`
    - Tests:
      1. **Renders page heading** — `await waitFor(() => expect(screen.getByText("Calendrier")).toBeInTheDocument())`
      2. **Renders calendar container** — `expect(document.querySelector('[data-calendar]') ?? screen.getByRole("region")).toBeInTheDocument()`
      3. **Renders error message on API failure** — `server.use(...calendarHandlersError)`, check for error text "Impossible de charger le calendrier"
      4. **Renders skeleton while loading departments** — verify skeleton elements exist during initial load
      5. **Has proper accessibility attributes** — `expect(screen.getByRole("region")).toHaveAttribute("aria-label", "Calendrier")`
      6. **Renders calendar with empty event list** — `server.use(...calendarHandlersEmpty)`, verify calendar still renders (no crash), no error message shown

  - [x] 9.2 **Testing note**: Schedule-X renders its own DOM via the calendar library. Integration testing of calendar internals (event blocks, view switching, day navigation) is deferred to E2E/Playwright tests (Epic 7, Story 7.1). Unit tests focus on: page rendering, API integration, error handling, accessibility attributes.

  - [x] 9.3 **IMPORTANT**: Schedule-X may require a minimum container size to render. If tests fail with rendering issues, mock the calendar component or wrap with explicit dimensions.

### Backend — Integration Tests

- [x] Task 10: Add Calendar Endpoint Integration Tests (AC: #4)
  - [x] 10.1 Create tests in the integration test project following the pattern from existing public endpoint tests:
    - Test class: `PublicCalendarEndpointTests`
    - Tests:
      1. **Returns only public activities in date range** — seed public + authenticated activities, verify only public returned
      2. **Filters by date range** — seed activities across 3 months, request 1 month, verify only range-matching returned
      3. **Returns empty array when no activities** — verify `[]` response, status 200
      4. **Returns activities ordered by date then time** — verify ordering
      5. **Accessible without authentication** — use `AnonymousClient`, expect 200
      6. **Includes department info** — verify `departmentName`, `departmentColor` populated
      7. **Includes predicateur info** — verify `predicateurName` populated when role exists
      8. **Rate limited** — verify rate limiting policy applies (check header presence)
      9. **Max range guard** — request with `start=2000-01-01&end=2099-12-31`, verify response still succeeds but range is capped (returned activities within 90-day window from start)

## Dev Notes

### Architecture Patterns & Constraints

- **Public endpoint pattern**: `[AllowAnonymous]` + `[EnableRateLimiting("public")]` on controller method. No auth service injection needed. Always returns 200 with array. [Source: `Controllers/PublicController.cs`]
- **Service pattern**: `PublicService` queries `dbContext` with `.Include()` for related data. Uses `ExtractPredicateur()` private helper for speaker info. Services return DTOs, never entities. [Source: `Services/PublicService.cs`]
- **DTO reuse**: `PublicActivityListItem` record already has all fields needed for calendar events. No new DTO required. [Source: `Dtos/Public/PublicActivityListItem.cs`]
- **Query pattern**: Same as `GetUpcomingActivitiesAsync()` but with user-provided date range instead of hardcoded 4-week window. No `.Take()` limit — monthly event count is small. [Source: `Services/PublicService.cs`]
- **No pagination**: Calendar data is bounded by date range (typically 1 month). Event count per month < 50. Return full array.
- **Max range guard**: Service caps `end` to `start + 90 days` to prevent abuse. Clients should never request > 3 months of data.
- **DateOnly binding**: ASP.NET Core 10 binds `DateOnly` from query strings natively (ISO format "2026-03-01"). No custom model binder needed.
- **Activity.DepartmentId is `int?` (nullable)**: Activities can exist without a department. FK uses `OnDelete(DeleteBehavior.SetNull)`. No inverse navigation `Department.Activities`. [Source: `Data/Entities/Activity.cs`]

### Frontend Patterns

- **Schedule-X React integration**: Use `useCalendarApp` hook (NOT `useNextCalendarApp` — that's for Next.js). Returns a calendar instance for `<ScheduleXCalendar calendarApp={calendar} />`. [Source: Schedule-X docs]
- **`firstDayOfWeek: 7`**: Sunday-first. Schedule-X follows Temporal API convention: 1=Monday, 7=Sunday. [Source: Schedule-X configuration docs]
- **`isResponsive: true`**: Auto-switches to day view on mobile. Built into Schedule-X — no custom media query logic needed. [Source: Schedule-X docs]
- **Events service plugin**: `createEventsServicePlugin()` provides `set()`, `add()`, `remove()`, `update()`, `getAll()` methods. Use `eventsService.set(events)` to replace all events when data changes. [Source: Schedule-X events-service docs]
- **`onRangeUpdate` callback**: Fires when user navigates or switches views. Provides `{ start, end }` — extract date strings and update query params for `useCalendarActivities`. [Source: Schedule-X docs]
- **`calendars` config**: Maps `calendarId` values to color schemes. Each department abbreviation becomes a calendar ID. Events use `calendarId: departmentAbbreviation`. [Source: Schedule-X calendars docs]
- **Temporal polyfill**: Required by Schedule-X v4. Import `"temporal-polyfill/global"` at component top level. This adds `Temporal` to the global scope. [Source: Schedule-X docs]
- **Two-phase rendering**: Fetch departments first (for calendar color config), then render calendar. Prevents re-creating calendar instance on department load.
- **Hook pattern**: `useQuery<T[]>` with `queryKey: ["public", "calendar", start, end]`, `staleTime: 5 * 60 * 1000`, `retry: 1`, `enabled: !!start && !!end`. [Source: `hooks/usePublicDashboard.ts`]
- **Component pattern**: Same loading/error state pattern as other public pages. Use `isPending` (not `isLoading`) for TanStack Query v5. [Source: `components/public/UpcomingActivitiesSection.tsx`]

### UX Design Compliance

- **Page title**: "Calendrier" (FR) / "Calendar" (EN). Already in i18n. [Source: ux-design-specification.md]
- **Sunday-first**: Calendar week starts on Sunday (day 7 in Temporal convention). Saturday is last day. [Source: ux-design-specification.md — "Sunday-first calendar convention"]
- **Department color coding**: Events display with department color. Color blocks should be large enough for quick-scan category signal. Department abbreviation always visible alongside color. [Source: ux-design-specification.md — "Department Color Palette"]
- **Mobile**: Schedule-X `isResponsive: true` handles automatic view switching. Day view (1-day) on mobile — acceptable MVP deviation from UX spec's "3-day view" which is deferred to Epic 7. Swipe to navigate. [Source: ux-design-specification.md]
- **Desktop**: Month grid as default view. Day and Week views available via view switcher. Full 7-day Sunday-to-Saturday week view. [Source: ux-design-specification.md]
- **Read-only**: No event creation, no click-to-detail for MVP. Calendar is informational. [Source: UX spec — "Event peek deferred from MVP"]
- **Day boundaries**: `06:00–22:00` for week/day views. Church activities don't happen before 6 AM or after 10 PM.
- **No hover effects on events**: Read-only calendar. No cursor-pointer on events.
- **Minimum text size**: Public layer minimum is 14px (`text-sm`). Schedule-X default text sizes should comply. [Source: ux-design-specification.md — "Public layer minimum text size is 14px"]

### Known Limitations (MVP)

- **Calendar locale is set at init time**: The `locale: "fr-FR"` config is passed to `useCalendarApp` which creates the calendar instance once. If the user toggles the language to English mid-session, Schedule-X's internal labels (Day/Week/Month buttons, day headers, month names) will remain in French. This is acceptable for MVP — the primary audience is French-speaking, and full page reload resets the calendar. Fix: Epic 7 can recreate the calendar instance on language change.
- **Schedule-X French locale**: Schedule-X supports `fr-FR` locale natively — Day/Semaine/Mois buttons, day names (Dim/Lun/Mar...), month names should render in French automatically. Verify during implementation. If French translations are missing, check Schedule-X docs for locale configuration or translation file setup.
- **Backend over-fetches for calendar**: The Include chain loads `Roles → Assignments → User` to extract predicateur data. Calendar event blocks (rendered by Schedule-X) only display event title — predicateur info is unused in the calendar view. This is acceptable for MVP (< 50 events per month, negligible overhead). Optimize with a lighter query projection in Epic 7 if needed.
- **Two-phase render creates 3 visual states**: User sees skeleton → empty calendar → populated calendar. This is 2 layout shifts. Acceptable for MVP — the skeleton-to-calendar transition is fast (departments are cached at 30min staleTime from previous page visits).

### Date/Time Formatting

- **Schedule-X date format — Temporal API is native v4 format** (see Task 5.3 for details):
  - **Primary**: Temporal objects — `Temporal.PlainDateTime.from("2026-03-14T09:30:00")`. This is Schedule-X v3+'s native format. The library moved away from string dates in v3.
  - **Fallback (legacy)**: String format `"YYYY-MM-DD HH:mm"` — only if Temporal parsing fails for some reason.
  - The backend returns `date` as `"2026-03-14"` (ISO DateOnly) and `startTime` as `"09:30:00"` (ISO TimeOnly HH:mm:ss). Concatenate as `"2026-03-14T09:30:00"` for `Temporal.PlainDateTime.from()`.
- **No custom date formatting needed for calendar events** — Schedule-X handles display formatting internally based on `locale`.
- **Existing utilities NOT used directly**: `formatActivityDate()` and `formatTime()` are for custom rendering (HeroSection, ActivityCard). Schedule-X renders its own labels.

### Project Structure Notes

- All new files align with established structure:
  - Backend service: modify existing `Services/PublicService.cs` and `Services/IPublicService.cs`
  - Backend controller: modify existing `Controllers/PublicController.cs`
  - Frontend routing: modify existing `App.tsx` (convert eager import to `lazy()` + Suspense)
  - Frontend page: **replace** existing stub `pages/PublicCalendarPage.tsx`
  - Frontend service: modify existing `services/publicService.ts`
  - Frontend hook: modify existing `hooks/usePublicDashboard.ts`
  - Frontend mocks: modify existing `mocks/handlers/public.ts`
  - Frontend tests: new `pages/PublicCalendarPage.test.tsx`
  - i18n: modify existing `locales/en/common.json` and `locales/fr/common.json`
  - Test infra: modify existing `test-utils.tsx` (add i18n key)
  - Backend integration tests: new test class in integration test project
- No new directories needed. All files go into existing folders.
- No database migration needed — Activity and Department entities already have all required fields.
- **New npm dependencies**: `@schedule-x/calendar@^4.1.0`, `@schedule-x/events-service@^4.1.0`, `@schedule-x/theme-default@^4.1.0`, `temporal-polyfill`

### References

- [Source: `src/SdaManagement.Api/Controllers/PublicController.cs`] — Public endpoint pattern (AllowAnonymous, EnableRateLimiting)
- [Source: `src/SdaManagement.Api/Services/PublicService.cs`] — Service query pattern (Include, ExtractPredicateur, date filtering)
- [Source: `src/SdaManagement.Api/Services/IPublicService.cs`] — Interface pattern
- [Source: `src/SdaManagement.Api/Dtos/Public/PublicActivityListItem.cs`] — DTO record to reuse
- [Source: `src/SdaManagement.Api/Data/Entities/Activity.cs`] — Activity entity (Date, StartTime, EndTime, Visibility, DepartmentId)
- [Source: `src/sdamanagement-web/src/pages/PublicCalendarPage.tsx`] — Existing stub to replace
- [Source: `src/sdamanagement-web/src/hooks/usePublicDashboard.ts`] — Hook pattern (queryKey, staleTime, retry)
- [Source: `src/sdamanagement-web/src/services/publicService.ts`] — Service method pattern
- [Source: `src/sdamanagement-web/src/types/public.ts`] — PublicActivityListItem type to reuse
- [Source: `src/sdamanagement-web/src/mocks/handlers/public.ts`] — MSW handler pattern
- [Source: `src/sdamanagement-web/src/test-utils.tsx`] — Test i18n setup
- [Source: `src/sdamanagement-web/src/App.tsx` line 46] — Route already configured
- [Source: `src/sdamanagement-web/package.json`] — @schedule-x/react ^4.1.0 installed
- [Source: Schedule-X docs — configuration] — firstDayOfWeek: 7, isResponsive, onRangeUpdate, calendars config
- [Source: Schedule-X docs — React integration] — useCalendarApp, ScheduleXCalendar, eventsServicePlugin
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md`] — Sunday-first, department colors, mobile responsive, calendar specifications
- [Source: `_bmad-output/planning-artifacts/architecture.md`] — @schedule-x/react, public API patterns, testing standards
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 5.5`] — Original acceptance criteria and BDD scenarios

### Previous Story Intelligence (Story 5.4)

- **Pattern proven**: Section components with hook → loading → error → data rendering works consistently. PublicCalendarPage follows same approach but is a standalone page (not a section within HomePage).
- **Date formatting**: Story 5.4 used `formatActivityDate()` and `formatTime()` from `@/lib/dateFormatting.ts`. For Story 5.5, Schedule-X handles date display internally — do NOT use these utilities for calendar rendering (they're for custom components).
- **MSW handler structure**: Story 5.4 added `departmentHandlers`, `departmentHandlersEmpty`, `departmentHandlersError` — exact same pattern for `calendarHandlers`.
- **Two-query pattern**: Story 5.4's `GetPublicDepartmentsAsync()` uses correlated subquery pattern. Story 5.5's `GetCalendarActivitiesAsync()` is simpler — direct query with date range filter, same as `GetUpcomingActivitiesAsync()`.
- **Test utils i18n**: Story 5.4 added `departmentsTitle` and `noPlannedActivity` to test-utils.tsx inline translations. Story 5.5 adds `loadError` to existing `calendar` section.
- **Skeleton pattern**: Story 5.4 used grid skeleton with 6 cards. Story 5.5 uses a single full-width skeleton rectangle for the calendar container.

### Git Intelligence

- Recent commits show Story 5.x features landing consistently: `feat(public): Story 5.N — description`
- Expected commit: `feat(public): Story 5.5 — Public calendar view with Schedule-X integration`
- UI validation fixes are common after initial implementation — expect a UI review pass
- All 5 epics complete, Epic 5 is the current focus with 4/5 stories done

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- temporal-polyfill peer dependency: @schedule-x/calendar@4.3.1 requires temporal-polyfill@0.3.0 exactly (not latest 0.3.2). Fixed by pinning.
- CalendarEventExternal type requires ZonedDateTime|PlainDate (not PlainDateTime). Fixed by using Temporal.ZonedDateTime with America/Toronto timezone.
- Test: Sonner Toaster renders `<section role="region">` which conflicts with `getByRole("region")`. Fixed by using `getByRole("region", { name: "Calendrier" })`.

### Completion Notes List

- **Task 0**: Installed @schedule-x/calendar@4.3.1, @schedule-x/events-service@4.3.1, @schedule-x/theme-default@4.3.1, temporal-polyfill@0.3.0. All Schedule-X packages at 4.x.
- **Task 0.5**: Converted PublicCalendarPage from eager to lazy import in App.tsx with Suspense fallback. Prevents Schedule-X bundle from loading on every page.
- **Task 1**: Added GetCalendarActivitiesAsync to IPublicService/PublicService with date range filtering, 90-day max range guard, and start>end empty return.
- **Task 2**: Added GET /api/public/calendar endpoint with [AllowAnonymous], [EnableRateLimiting("public")], DateOnly query params.
- **Task 3**: Added getCalendarActivities(start, end) to publicService.ts.
- **Task 4**: Added useCalendarActivities hook with queryKey ["public", "calendar", start, end], staleTime 5min, enabled guard.
- **Task 5**: Implemented full PublicCalendarPage with two-phase pattern (departments first, then calendar). Schedule-X with Sunday-first, responsive, month grid default, department color mapping via calendars config. Events use Temporal.ZonedDateTime with America/Toronto timezone.
- **Task 6**: Added Schedule-X theme CSS import in component. Added .sx-react-calendar-wrapper sizing rule in index.css.
- **Task 7**: Added loadError i18n key to FR and EN common.json, and test-utils.tsx.
- **Task 8**: Added mockCalendarActivities data and calendarHandlers/calendarHandlersEmpty/calendarHandlersError MSW handlers.
- **Task 9**: Created 6 frontend tests: heading render, calendar container, error state, skeleton loading, accessibility attributes, empty event list.
- **Task 10**: Created 9 integration tests in PublicCalendarEndpointTests: public-only filter, date range filter, empty response, ordering, anonymous access, department info, predicateur info, rate limiting, max range guard.

### Change Log

- 2026-03-13: Story 5.5 — Public calendar view with Schedule-X integration. Added GET /api/public/calendar endpoint, PublicCalendarPage component with Schedule-X v4, department color mapping, lazy loading, 6 frontend unit tests, 9 backend integration tests.
- 2026-03-13: Code review fixes — [H1] Added retry button on calendar load error (AC #6). [H2] Department abbreviation now visible on events via title prefix (AC #5). [M1] Pinned temporal-polyfill to 0.3.0 (removed caret). [M2] Added start>end integration test. [M3] Fixed getInitialDateRange to use local time instead of UTC. [M4] Added department fetch error state with retry. [L3] Fixed flaky rate limiting test assertion. Added `retry` i18n key to FR/EN locales and test-utils.

### File List

**Modified:**
- src/sdamanagement-web/package.json (added @schedule-x/calendar, @schedule-x/events-service, @schedule-x/theme-default, temporal-polyfill pinned 0.3.0)
- src/sdamanagement-web/package-lock.json (dependency resolution)
- src/sdamanagement-web/src/App.tsx (lazy import + Suspense for PublicCalendarPage)
- src/sdamanagement-web/src/index.css (added .sx-react-calendar-wrapper CSS)
- src/sdamanagement-web/src/pages/PublicCalendarPage.tsx (full implementation with retry, dept error, abbreviation prefix)
- src/sdamanagement-web/src/services/publicService.ts (added getCalendarActivities)
- src/sdamanagement-web/src/hooks/usePublicDashboard.ts (added useCalendarActivities)
- src/sdamanagement-web/src/mocks/handlers/public.ts (added calendar mock data and handlers)
- src/sdamanagement-web/public/locales/fr/common.json (added loadError, retry keys)
- src/sdamanagement-web/public/locales/en/common.json (added loadError, retry keys)
- src/sdamanagement-web/src/test-utils.tsx (added loadError, retry to test i18n)
- src/SdaManagement.Api/Services/IPublicService.cs (added GetCalendarActivitiesAsync)
- src/SdaManagement.Api/Services/PublicService.cs (added GetCalendarActivitiesAsync implementation)
- src/SdaManagement.Api/Controllers/PublicController.cs (added GetCalendarActivities endpoint)

**New:**
- src/sdamanagement-web/src/pages/PublicCalendarPage.test.tsx (6 unit tests)
- tests/SdaManagement.Api.IntegrationTests/Public/PublicCalendarEndpointTests.cs (10 integration tests)
