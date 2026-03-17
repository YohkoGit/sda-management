# Story 7.1: Calendar Core — Sunday-First with Multiple Views

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user (any role)**,
I want to view a calendar with Sunday as the first day and switch between Day, Week, Month, and Year views,
So that I can browse church activities across different time scales.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–6 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors and abbreviations
- Activities created with public visibility (from Epic 4) — several across different dates, departments, and time slots
- At least one authenticated user (VIEWER, ADMIN, or OWNER) for testing the authenticated calendar route
- Story 5.5 (Public Calendar View) complete — `PublicCalendarPage` functional with Schedule-X Month/Week/Day views

### Codebase State (Epic 6 Complete)

- **PublicCalendarPage** at `pages/PublicCalendarPage.tsx` (200 lines) — fully functional Schedule-X calendar with Month Grid, Week, Day views, Sunday-first (`firstDayOfWeek: 7`), responsive mode, department color coding via `calendars` config, `onRangeUpdate` callback for date-based data fetching. Internal `CalendarView` component not yet extracted. [Source: `src/sdamanagement-web/src/pages/PublicCalendarPage.tsx`]
- **AuthCalendarPage** at `pages/AuthCalendarPage.tsx` (11 lines) — **stub placeholder** showing only the title. No calendar functionality. [Source: `src/sdamanagement-web/src/pages/AuthCalendarPage.tsx`]
- **Backend endpoint** `GET /api/public/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` returns `PublicActivityListItem[]` with 90-day max range guard. Filters by `ActivityVisibility.Public` only. [Source: `Controllers/PublicController.cs:58-66`]
- **PublicService.GetCalendarActivitiesAsync()** with date range validation, department Include, predicateur extraction. [Source: `Services/PublicService.cs:138-176`]
- **useCalendarActivities hook** at `hooks/usePublicDashboard.ts:61-69` — `queryKey: ["public", "calendar", start, end]`, staleTime 5min, enabled guard.
- **publicService.getCalendarActivities()** at `services/publicService.ts:28-33`.
- **PublicActivityListItem** DTO (C# + TypeScript) with Id, Title, Date, StartTime, EndTime, DepartmentName, DepartmentAbbreviation, DepartmentColor, PredicateurName, PredicateurAvatarUrl, SpecialType.
- **Schedule-X dependencies** installed: `@schedule-x/calendar@^4.3.1`, `@schedule-x/events-service@^4.3.1`, `@schedule-x/react@^4.1.0`, `@schedule-x/theme-default@^4.3.1`, `temporal-polyfill@0.3.0`.
- **Routing**: `/calendar` (public route tree, lazy-loaded with Suspense) → `PublicCalendarPage`. `/my-calendar` (auth route tree, lazy-loaded) → `AuthCalendarPage` (stub).
- **i18n keys** exist: `pages.calendar.title` (FR: "Calendrier", EN: "Calendar"), `pages.calendar.loadError`, `pages.calendar.retry`.
- **MSW mock handlers** exist: `calendarHandlers`, `calendarHandlersEmpty`, `calendarHandlersError` in `mocks/handlers/public.ts`.
- **Tests**: 6 frontend unit tests in `PublicCalendarPage.test.tsx`, 10 backend integration tests in `PublicCalendarEndpointTests.cs`.
- **CSS**: `@schedule-x/theme-default/dist/index.css` imported in component, `.sx-react-calendar-wrapper` sizing rule in `index.css`.
- **Schedule-X config** established: `timezone: "America/Toronto"`, `locale` from i18n, `isResponsive: true`, `dayBoundaries: { start: "06:00", end: "22:00" }`, `weekOptions: { gridHeight: 1800, nDays: 7, eventWidth: 95 }`, `monthGridOptions: { nEventsPerDay: 4 }`.

## Acceptance Criteria

1. **Given** any user (anonymous or authenticated) navigates to the calendar page **When** the calendar renders **Then** it displays with Sunday as the first day (day 1) and Saturday as the seventh day (FR35) **And** the @schedule-x/react component is used.

2. **Given** the calendar page **When** the user switches between Day, Week, Month, and Year views **Then** the calendar updates to the selected view (FR36) **And** the Week view shows Sunday through Saturday as columns.

3. **Given** the calendar on mobile (375px) **When** rendered in Week view **Then** it adapts to a mobile-friendly layout (condensed or horizontal scroll) **And** Day view is usable with swipe left/right to navigate between days.

4. **Given** the Month view **When** rendered **Then** days display with colored activity indicators showing how many activities are scheduled **And** tapping a day drills into the Day view for that date.

## Tasks / Subtasks

> **Implementation order**: Tasks 0→1→2→3→4→5→6→7 first (core calendar improvements), then Task 8 last (Year view). This ensures the highest-value work (drill-to-day, auth calendar, view switching) ships even if Year view takes longer.

- [x] Task 0: Install `@schedule-x/calendar-controls` and verify APIs (AC: #2, #4) — **DO FIRST**
  - [x] 0.1 Install `@schedule-x/calendar-controls@^4.3.1` (must match `@schedule-x/calendar` version). The CalendarApp instance returned by `useCalendarApp()` does NOT expose `setView()` or `setDate()` — these require the **calendar-controls plugin**.
  - [x] 0.2 Initialize plugin: `const [calendarControls] = useState(() => createCalendarControlsPlugin())` and add to `plugins: [eventsService, calendarControls]` in the `useCalendarApp` config.
  - [x] 0.3 Verify programmatic view switching: `calendarControls.setView('day')` — should switch Schedule-X to day view.
  - [x] 0.4 Verify programmatic date change: `calendarControls.setDate(Temporal.PlainDate.from('2026-03-14'))` — should navigate to that date.
  - [x] 0.5 Verify `onClickDate` callback fires when clicking a day cell in Month Grid view. Note: callback signature is `onClickDate(date: Temporal.PlainDate, e?: UIEvent)` — returns `PlainDate`, NOT `ZonedDateTime`.
  - [x] 0.6 **Fallback if calendar-controls plugin fails**: Use React `key` prop to force Schedule-X remount with different `defaultView` and `selectedDate`. This causes a brief re-render but is functionally equivalent.
  - [x] 0.7 Record findings in Debug Log References section before proceeding

- [x] Task 1: Extract shared CalendarView component (AC: #1, #2, #3, #4)
  - [x] 1.1 Create `components/calendar/CalendarView.tsx` — extract the inner `CalendarView` component from `PublicCalendarPage.tsx` into a standalone reusable component
  - [x] 1.2 Accept props: `activities: PublicActivityListItem[]`, `yearActivities: PublicActivityListItem[] | undefined`, `departments: PublicDepartment[]`, `isError: boolean`, `onRetry: () => void`, `onRangeChange: (start: string, end: string) => void`, `onViewChange: (view: string) => void`. Data fetching stays in page wrappers — CalendarView is purely presentational + Schedule-X management. The `onViewChange` callback notifies the page wrapper when the active view changes so it can switch between `useCalendarActivities` (Day/Week/Month) and `useYearActivities` (Year). `yearActivities` is passed separately because it uses a different fetching strategy (4 quarterly calls vs single range).
  - [x] 1.3 Keep all Schedule-X configuration inside the component: Sunday-first, responsive, timezone, day boundaries, locale from i18n
  - [x] 1.4 Move `mapToCalendarEvents()` and `buildCalendarsFromDepartments()` helper functions into `components/calendar/calendar-utils.ts`

- [x] Task 2: Add view switcher and drill-to-day behavior (AC: #2, #4) — **HIGH PRIORITY**
  - [x] 2.1 Create `components/calendar/ViewSwitcher.tsx` — segmented button group with Day / Week / Month / Year labels
  - [x] 2.2 Track active view in CalendarView state: `"day" | "week" | "month-grid" | "year"`
  - [x] 2.3 When activeView is "day", "week", or "month-grid" → render `ScheduleXCalendar`
  - [x] 2.4 When activeView is "year" → render `YearGrid` (Schedule-X does not render Year). If YearGrid not yet built, show placeholder.
  - [x] 2.5 Implement `onClickDate` callback in Schedule-X config: when user taps a day in Month Grid, switch activeView to "day" and call `calendarControls.setView('day')` + `calendarControls.setDate(clickedDate)`. Note: `onClickDate` returns `Temporal.PlainDate` (not ZonedDateTime) — pass directly to `calendarControls.setDate()`. Keep click handler simple — just switch view. Role-aware click behavior (ADMIN creates activity, VIEWER sees detail) is Story 7.3, not 7.1.
  - [x] 2.6 Sync Schedule-X's internal view with ViewSwitcher state via `calendarControls.setView(viewName)`
  - [x] 2.7 Call `onViewChange(newView)` prop when active view changes so page wrapper can switch data hooks
  - [x] 2.8 ViewSwitcher responsive: full labels on desktop ("Day" / "Week" / "Month" / "Year"), abbreviated on mobile ("D" / "W" / "M" / "Y")
  - [x] 2.9 i18n: view labels translated (FR: "Jour" / "Semaine" / "Mois" / "Année")

- [x] Task 3: Update CalendarPage wrappers for both routes (AC: #1)
  - [x] 3.1 Refactor `PublicCalendarPage.tsx` — replace inline CalendarView with imported shared component. Track `activeView` state. Use `useCalendarActivities` for Day/Week/Month views, `useYearActivities` for Year view (activated by `onViewChange` callback). Keep department fetching and loading/error states. PublicCalendarPage becomes a thin wrapper (~40-50 lines).
  - [x] 3.2 Implement `AuthCalendarPage.tsx` — replace stub with full calendar using same shared CalendarView. Same dual-hook pattern: `useCalendarActivities` for Day/Week/Month, `useYearActivities` for Year. Mirror the PublicCalendarPage structure (dept loading → skeleton, dept error → error state, dept loaded → CalendarView). Story 7.2 will add auth-aware data and features. No operational micro-label yet.
  - [x] 3.3 Both pages lazy-loaded in App.tsx (already configured). Keep route names as-is: `/calendar` (public), `/my-calendar` (auth). Route consolidation deferred to 7.2.
  - [x] 3.4 Verify both routes render the complete calendar with view switching and drill-to-day

- [x] Task 4: Month view colored activity indicators (AC: #4) — **Verification task**
  - [x] 4.1 The existing Schedule-X month grid already renders department-colored event blocks (via `calendars` config). The "colored activity indicators" in AC #4 ARE these colored event blocks — do not over-interpret as needing custom dot rendering. Verify they display correctly with multiple activities per day.
  - [x] 4.2 Adjust `monthGridOptions.nEventsPerDay` if needed (current: 4). Activities beyond threshold show "+N more" indicator from Schedule-X.
  - [x] 4.3 Verify department color contrast is sufficient for scan-ability — per UX spec: "Department color blocks must be large enough for the color to register as a quick-scan category signal."

- [x] Task 5: i18n — Calendar view translation keys (AC: #2)
  - [x] 5.1 Add to `public/locales/fr/common.json` under `pages.calendar`: `"views": { "day": "Jour", "week": "Semaine", "month": "Mois", "year": "Année" }`
  - [x] 5.2 Add to `public/locales/en/common.json` under `pages.calendar`: `"views": { "day": "Day", "week": "Week", "month": "Month", "year": "Year" }`
  - [x] 5.3 Update `test-utils.tsx` with new calendar view keys

- [x] Task 6: Frontend tests (AC: #1, #2, #3, #4)
  - [x] 6.1 Create `components/calendar/CalendarView.test.tsx` (~5 tests): renders calendar container, view switcher visible with 4 options, default view is month-grid, error state displays, passes activities to Schedule-X
  - [x] 6.2 Create `components/calendar/ViewSwitcher.test.tsx` (~4 tests): renders 4 buttons, highlights active view, fires onViewChange callback, accessible tablist role
  - [x] 6.3 Update `PublicCalendarPage.test.tsx` — adapt existing tests to verify wrapper behavior: department loading skeleton, department error state, CalendarView rendered when departments loaded. Calendar internals now tested in CalendarView.test.tsx.
  - [x] 6.4 Create `AuthCalendarPage.test.tsx` (~3 tests): renders in auth context, shows calendar heading, shows calendar container
  - [x] 6.5 Create `components/calendar/YearGrid.test.tsx` (~5 tests): renders 12 mini-months, correct year in header, click day fires callback, click month fires callback, prev/next year navigation. Visual correctness deferred to Playwright E2E.
  - [x] 6.6 Note: Schedule-X internals (swipe, event rendering, view transitions) tested via E2E/Playwright — unit tests verify component wiring, not library behavior

- [x] Task 7: Accessibility (AC: #1, #3) — **Simplified**
  - [x] 7.1 CalendarView region: `role="region"` with `aria-label` (already exists, preserve)
  - [x] 7.2 ViewSwitcher: `role="tablist"` with `role="tab"` on each button, `aria-selected` on active view
  - [x] 7.3 YearGrid: `role="grid"` with `aria-label`, each month header as accessible group label
  - [x] 7.4 Verify Schedule-X's built-in keyboard navigation works (arrow keys between days/blocks) — this is Schedule-X's responsibility, not custom code. Note any gaps for E2E testing.

- [x] Task 8: Add Year view — simplified YearGrid component (AC: #2) — **IMPLEMENT LAST**
  - [x] 8.1 Create `components/calendar/YearGrid.tsx` — compact 12-mini-month grid (Schedule-X has NO built-in year view). **Keep it simple: ~100-150 lines max.** This is the least-used view; users primarily use Week/Month.
  - [x] 8.2 Render 4x3 grid of mini-month calendars (Jan-Dec) using date-fns (`eachMonthOfInterval`, `eachDayOfInterval`, `startOfWeek`, `endOfWeek`, `isSameMonth`, `isSameDay`)
  - [x] 8.3 Each mini-month: Sunday-first 7-column grid with day numbers, current month highlighted, today marked
  - [x] 8.4 Activity indicators: small department-colored dots on days that have activities. Simple implementation — one dot per unique department on that day (no max/overflow logic needed for mini-month scale).
  - [x] 8.5 Click a day → `onDayClick(date)` callback. Click a month header → `onMonthClick(date)` callback. Parent handles view switching via `calendarControls.setView()` + `calendarControls.setDate()`.
  - [x] 8.6 Navigation: previous/next year arrows in header. Display year prominently.
  - [x] 8.7 Responsive: 4x3 grid on desktop (lg:), 3x4 on tablet (sm:), vertical scroll with 2-column grid on mobile (<640px). Use simple CSS grid, no complex morphing.
  - [x] 8.8 Accept `activities: PublicActivityListItem[]` prop (passed as `yearActivities` from page wrapper). Group by date internally using a `Map<string, { departments: Set<string> }>` for efficient dot rendering.
  - [x] 8.9 **Data fetching strategy**: Year view needs 365 days of data but backend caps at 90 days. Create `useYearActivities(year: number)` hook that fires 4 parallel `useQuery` calls (Q1: Jan-Mar, Q2: Apr-Jun, Q3: Jul-Sep, Q4: Oct-Dec). Merge results. Handle partial failures gracefully (show loaded quarters, retry button for failed ones). **Optional enhancement**: If this proves slow, create `GET /api/public/calendar/year-summary?year=2026` returning `{ date, count, departments[] }[]` in a follow-up task — don't block the story on backend changes.

## Dev Notes

### Architecture Patterns & Constraints

- **No new backend work for 7.1.** The existing `GET /api/public/calendar` endpoint serves both anonymous and authenticated users for now. Both routes (`/calendar` and `/my-calendar`) fetch from the same public API. Story 7.2 introduces `CalendarController` with auth-aware visibility filtering and department filtering.
- **Shared component, separate page wrappers.** `CalendarView` is the shared engine; `PublicCalendarPage` and `AuthCalendarPage` are thin wrappers handling route-specific concerns (layout integration, data fetching). Data fetching lives in page wrappers, not CalendarView. CalendarView is purely presentational + Schedule-X management. This follows the established pattern from Story 6.3: `MyAssignmentsSection` / `DashboardUpcomingSection` shared between dashboard configurations.
- **No CalendarController yet.** Architecture maps Calendar Integration (FR35-FR40) to `CalendarController` / `CalendarService`, but Story 7.1 only covers FR35-FR36 (core views). The CalendarController is introduced in Story 7.2 when auth-aware filtering is needed. Using PublicController for 7.1 avoids premature abstraction.
- **Route naming.** Keep `/calendar` (public) and `/my-calendar` (auth) as-is. Route consolidation is a cross-cutting concern addressed in Story 7.2 when auth calendar gets distinct features.

### ADR: Year View Rendering Strategy

| | |
|---|---|
| **Decision** | Simplified custom YearGrid component (~100-150 lines) using date-fns |
| **Context** | AC #2 requires Year view. Schedule-X v4 has NO `createViewYear()`. Available: Day, Week, MonthGrid, MonthAgenda, List only. |
| **Options** | (A) Full custom year calendar (300-400 lines, responsive grid morphing, keyboard nav, overflow dots), (B) Simplified compact year overview (100-150 lines, dots only, vertical scroll mobile), (C) Use MonthAgenda as substitute, (D) Defer entirely |
| **A rejected** | 1.5-2 days effort for the least-used view. Over-engineered for MVP. |
| **C rejected** | MonthAgenda is not a "Year view" — doesn't show 12 months simultaneously. |
| **D considered** | Viable fallback if Year view proves too complex. Doesn't satisfy AC #2. |
| **B chosen** | Delivers Year overview that's useful and matches AC spirit. Ships in ~0.5 days. Can be enhanced later without breaking changes. |
| **Trade-off** | Less interactive than a full year calendar. Year view is the least-used view (users primarily use Week/Month per UX research: Google Calendar patterns). Investing heavily here has poor ROI. |

### Dual-Renderer Architecture

- **Year view renders OUTSIDE Schedule-X.** CalendarView toggles between Schedule-X (Day/Week/Month) and custom YearGrid (Year). This avoids fighting Schedule-X's internal view management.
- **View state management.** CalendarView maintains `activeView` state (`"day" | "week" | "month-grid" | "year"`). When switching from Year to Day/Week/Month, it calls `calendarControls.setView(viewName)`. When switching TO Year, it hides Schedule-X and shows YearGrid. On every view change, CalendarView calls `onViewChange(newView)` prop so the page wrapper can switch data hooks.
- **Single source of truth for selectedDate.** CalendarView owns `selectedDate` state internally. When switching TO Schedule-X views, uses `calendarControls.setDate()`. When switching FROM Schedule-X to Year, captures current date first. This prevents state sync bugs between the two renderers.
- **Data flow for Year view.** Page wrappers track which view is active (via `onViewChange` callback). When view is "year", page wrapper activates `useYearActivities(year)` hook and passes results as `yearActivities` prop. When view is Day/Week/Month, page wrapper uses `useCalendarActivities(start, end)` and passes as `activities` prop. CalendarView routes the correct data to the correct renderer.

### Schedule-X Programmatic Control via `@schedule-x/calendar-controls`

- **The CalendarApp instance does NOT expose `setView()` or `setDate()`.** These require the `@schedule-x/calendar-controls` plugin (separate package, must install).
- **Plugin setup in React:**
  ```tsx
  import { createCalendarControlsPlugin } from '@schedule-x/calendar-controls'
  const [calendarControls] = useState(() => createCalendarControlsPlugin())
  const calendar = useCalendarApp({
    views: [...],
    plugins: [eventsService, calendarControls],
    // ...
  })
  // Then use:
  calendarControls.setView('day')        // Switch view
  calendarControls.setDate(Temporal.PlainDate.from('2026-03-14'))  // Navigate to date
  calendarControls.setLocale('fr-FR')    // Change locale (if needed)
  ```
- **`onClickDate` callback** — fires when clicking a day cell in Month Grid. Signature: `onClickDate(date: Temporal.PlainDate, e?: UIEvent)`. Returns `PlainDate` (NOT `ZonedDateTime`). Pass directly to `calendarControls.setDate()`.
- **Fallback if plugin fails:** Use React `key` prop to force Schedule-X remount with different `defaultView` and `selectedDate`. Example: `<ScheduleXCalendar key={`${activeView}-${selectedDate}`} calendarApp={calendar} />`. Brief re-render but functionally correct.

### Container Height Switching

- Schedule-X views require explicit container height: `h-[600px] sm:h-[700px] lg:h-[800px]` (established in Story 5.5).
- YearGrid should use auto height with scrollable content: `min-h-[600px]` or just natural height.
- CalendarView wrapper needs conditional height classes based on `activeView`:
  - Day/Week/Month → fixed height (Schedule-X requirement)
  - Year → auto height (CSS grid content determines size)

### Calendar Event Format

- Events use `Temporal.ZonedDateTime` with `America/Toronto` timezone (established in Story 5.5). Example: `Temporal.ZonedDateTime.from("2026-03-14T09:30:00[America/Toronto]")`. The `calendarId` field maps to department abbreviation for color coding.

### Year View Data Fetching Strategy

- Backend caps `GET /api/public/calendar` at 90 days per request. Year view needs 365 days.
- **Primary approach:** Create `useYearActivities(year)` hook with 4 parallel `useQuery` calls for Q1/Q2/Q3/Q4 (each ~90 days). Merge results via `Promise.all`. Handle partial failures (show loaded quarters, retry failed).
- **Optional backend enhancement (follow-up, NOT blocking):** `GET /api/public/calendar/year-summary?year=2026` returning `{ date: string, count: number, departments: string[] }[]` — single call, tiny payload (~3KB). Only build this if 4-call approach proves too slow in practice.

### Known Risks (from Pre-mortem Analysis)

| Risk | Severity | Mitigation |
|---|---|---|
| Year view scope creep | HIGH | Simplified approach (ADR above). Implement LAST. ~100-150 lines max. |
| Schedule-X setView() unavailable | MEDIUM | Task 0 verification spike. Key-based remounting fallback documented. |
| Year data fetching fragile | MEDIUM | 4 parallel calls with graceful partial failure. Optional backend endpoint follow-up. |
| Dual-renderer state sync | MEDIUM | Single selectedDate source of truth. Clear handoff contract. |
| Test overhead | LOW | Minimal unit tests for visual components. E2E via Playwright for visual correctness. |

### UX Design Compliance

- **Sunday-first.** `firstDayOfWeek: 7` (Temporal API convention). Both Schedule-X views and custom YearGrid must start weeks on Sunday. [Source: ux-design-specification.md — "Monday-first calendar is an anti-pattern"]
- **Department color coding.** Events display with department color via `calendars` config. Colors are "muted, desaturated background tints that coexist without competing with the indigo primary." [Source: ux-design-specification.md:562]
- **Color + text rule.** "Department colors never appear without an accompanying text label." On calendar events, the department abbreviation must be visible on or adjacent to the color block. Current implementation prefixes title with `[CU]`, `[JA]` etc. — this satisfies the rule. [Source: ux-design-specification.md:577]
- **Calendar event block sizing.** "Department color blocks on the calendar must be large enough for the color to register as a quick-scan category signal before reading text." [Source: ux-design-specification.md:579]
- **Week view responsive.** UX spec: "≥ 640px (sm): full 7-day view. < 640px: 3-day view with swipe to shift by 1 day." Schedule-X's `isResponsive: true` handles this (auto-switches to day view on mobile). Acceptable for MVP; exact 3-day view deferred. [Source: ux-design-specification.md:1290-1291]
- **Operational vocabulary.** Calendar page title is "Calendrier" (FR) / "Calendar" (EN). UX spec maps to "Ministry Roadmap" operational label — consider adding as micro-label if following the authenticated register pattern from Story 6.3. [Source: ux-design-specification.md:293]
- **Accessibility.** WeekCalendar: "Keyboard navigable (arrow keys between days/blocks). Each block has `aria-label` with activity name + time + department." [Source: ux-design-specification.md:1297]
- **No horizontal scroll.** "No unintentional horizontal scroll at any breakpoint. Intentional horizontal scroll (WeekCalendar swipe navigation) is contained within the calendar component." [Source: ux-design-specification.md:1726]
- **Month view "colored activity indicators" (AC #4 clarification).** The existing Schedule-X month grid renders department-colored event blocks (via `calendars` config). These ARE the "colored activity indicators showing how many activities are scheduled" — do NOT over-interpret as needing custom dot rendering or activity count badges. The "+N more" overflow indicator from Schedule-X handles the "how many" aspect.
- **Known limitation: locale sync.** Schedule-X calendar locale is set at initialization time. Toggling language mid-session won't update Schedule-X's internal labels (day names, month names, navigation text). Full page refresh required to apply locale change. Carried from Story 5.5 — not fixed in 7.1.

### Project Structure Notes

**New files:**
- `src/sdamanagement-web/src/components/calendar/CalendarView.tsx` — shared Schedule-X calendar engine with view switching
- `src/sdamanagement-web/src/components/calendar/calendar-utils.ts` — `mapToCalendarEvents()`, `buildCalendarsFromDepartments()` helpers
- `src/sdamanagement-web/src/components/calendar/ViewSwitcher.tsx` — Day/Week/Month/Year segmented control
- `src/sdamanagement-web/src/components/calendar/YearGrid.tsx` — simplified 12-mini-month year overview (~100-150 lines)
- `src/sdamanagement-web/src/hooks/useYearActivities.ts` — 4-quarter parallel fetch hook for year view data
- `src/sdamanagement-web/src/components/calendar/CalendarView.test.tsx`
- `src/sdamanagement-web/src/components/calendar/ViewSwitcher.test.tsx`
- `src/sdamanagement-web/src/components/calendar/YearGrid.test.tsx`
- `src/sdamanagement-web/src/pages/AuthCalendarPage.test.tsx`

**Modified files:**
- `src/sdamanagement-web/src/pages/PublicCalendarPage.tsx` — simplify to thin wrapper using shared CalendarView
- `src/sdamanagement-web/src/pages/AuthCalendarPage.tsx` — implement using shared CalendarView (replace stub)
- `src/sdamanagement-web/src/pages/PublicCalendarPage.test.tsx` — adapt to shared component extraction
- `src/sdamanagement-web/public/locales/fr/common.json` — add view label keys
- `src/sdamanagement-web/public/locales/en/common.json` — add view label keys
- `src/sdamanagement-web/src/test-utils.tsx` — add new i18n keys

**Minimal changes needed:**
- **One new npm dependency**: `@schedule-x/calendar-controls@^4.3.1` — required for `setView()` and `setDate()` programmatic control
- No database migrations
- No backend changes (optional year-summary endpoint is a follow-up, not required)
- No changes to `App.tsx` routing (routes already configured)

**Modified (additional):**
- `src/sdamanagement-web/package.json` — add `@schedule-x/calendar-controls` dependency

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7, Story 7.1] — Story AC and context
- [Source: _bmad-output/planning-artifacts/architecture.md#Calendar Integration] — CalendarController mapping (deferred to 7.2), CalendarService, pages/Calendar.tsx
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Boundaries] — Public route tree: `/calendar`, Auth route tree
- [Source: _bmad-output/planning-artifacts/architecture.md#Requirements Coverage] — FR35-FR40 covered by CalendarController + @schedule-x/react
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#WeekCalendar] — Component spec, ADR-1, responsive behavior
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Google Calendar Influence] — Department color coding, week view default, day view, month view, mobile swipe
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:741] — Calendar renders "institutional template blocks as fixed-time color-coded department blocks"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:1379] — ADR-1: @schedule-x/react chosen over custom-built and react-big-calendar
- [Source: Context7 Schedule-X docs] — Available views: Day, Week, MonthGrid, MonthAgenda, List. NO Year view. Config: firstDayOfWeek, isResponsive, dayBoundaries, weekOptions, monthGridOptions, calendars, callbacks (onRangeUpdate, onClickDate, onClickDateTime, fetchEvents)
- [Source: _bmad-output/implementation-artifacts/5-5-public-calendar-view.md] — Implementation details, patterns, known limitations
- [Source: _bmad-output/implementation-artifacts/6-3-authenticated-dashboard.md] — Authenticated page patterns, MSW testing, component extraction

### Library & Framework Requirements

| Library | Version | Purpose | Notes |
|---|---|---|---|
| `@schedule-x/react` | ^4.1.0 | Calendar rendering (Day/Week/Month) | Already installed. Use `useCalendarApp` hook + `ScheduleXCalendar` component |
| `@schedule-x/calendar` | ^4.3.1 | View creators, calendar config | Already installed. `createViewDay()`, `createViewWeek()`, `createViewMonthGrid()` |
| `@schedule-x/events-service` | ^4.3.1 | Dynamic event CRUD | Already installed. `createEventsServicePlugin()` for `.set()`, `.add()` |
| `@schedule-x/calendar-controls` | ^4.3.1 | Programmatic view/date control | **NEW — must install.** `calendarControls.setView()`, `.setDate()`, `.setLocale()` |
| `@schedule-x/theme-default` | ^4.3.1 | Default CSS theme | Already installed. Import in component |
| `temporal-polyfill` | 0.3.0 | Temporal API polyfill for Schedule-X v4 | Already installed. Pinned exact version. Note: `@schedule-x/react` is at ^4.1.0 while others are ^4.3.1 — version drift is acceptable (same major) |
| `date-fns` | ^4.1.0 | Year view date math | Already installed. `startOfYear`, `endOfYear`, `eachMonthOfInterval`, `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `startOfWeek`, `endOfWeek`, `isSameMonth`, `isSameDay`, `format`, `addYears`, `subYears` |
| `react-i18next` | existing | i18n for view labels | Already installed |
| `@tanstack/react-query` | ^5.90.21 | Data fetching (useCalendarActivities) | Already installed |

**One new dependency required:** `@schedule-x/calendar-controls@^4.3.1` for programmatic view switching and date navigation. All other packages already in `package.json`.

### Testing Requirements

- **CalendarView tests** (Task 6.1, ~5 tests): renders calendar container, view switcher visible with 4 options, default view is month-grid, error state displays, passes activities to Schedule-X
- **ViewSwitcher tests** (Task 6.2, ~4 tests): renders 4 buttons, highlights active view, fires onViewChange callback, accessible tablist role with aria-selected
- **Updated PublicCalendarPage tests** (Task 6.3): adapt existing tests to verify wrapper behavior only — department loading skeleton, department error state, CalendarView rendered when departments loaded. Calendar internals now tested in CalendarView.test.tsx.
- **AuthCalendarPage tests** (Task 6.4, ~3 tests): renders in auth context, shows calendar heading, shows calendar container
- **YearGrid tests** (Task 6.5, ~5 tests): renders 12 mini-months, correct year in header, click day fires callback, click month fires callback, prev/next year navigation. Visual correctness (dot rendering, responsive layout) deferred to Playwright E2E.
- **E2E (deferred)**: Schedule-X internal behavior (swipe, event rendering, view transitions) deferred to Playwright per UX spec test strategy: "WeekCalendar: `e2e` — Library integration, swipe, responsive breakpoint"
- **No new backend tests**: existing 10 PublicCalendarEndpointTests remain valid, no API changes
- **Total test count**: ~17 unit/component tests + adapted existing tests (reduced from original ~22 estimate)

### Previous Story Intelligence (Stories 5.5 + 6.3)

**From Story 5.5 (Public Calendar View):**
- `temporal-polyfill` must be pinned at `0.3.0` exactly — `@schedule-x/calendar@4.3.1` requires this specific version
- Schedule-X `CalendarEventExternal` type requires `ZonedDateTime | PlainDate` — use `Temporal.ZonedDateTime` with `America/Toronto`
- Calendar locale set at init time — toggling language mid-session won't update internal labels (known limitation)
- Two-phase rendering: fetch departments first (for calendar color config), then render calendar
- `.sx-react-calendar-wrapper { width: 100%; height: 100%; }` CSS rule required for proper sizing
- Container height must be explicit: `h-[600px] sm:h-[700px] lg:h-[800px]`
- Sonner Toaster renders `<section role="region">` — use specific aria-label when querying by role in tests
- Hook `enabled: !!start && !!end` prevents fetch before Schedule-X fires initial `onRangeUpdate`
- Use `isPending` (not `isLoading`) for TanStack Query loading state

**From Story 6.3 (Authenticated Dashboard):**
- Component extraction pattern: create shared component, thin page wrappers for different routes
- MSW handler pattern: `{feature}Handlers`, `{feature}HandlersEmpty`, `{feature}HandlersError`
- Test i18n: add new keys to `test-utils.tsx`
- Semantic token styling for authenticated register
- "REGISTRE PERSONNEL" micro-label pattern for operational vocabulary

### Git Intelligence

- **Commit pattern**: `feat(scope): Story X.Y — description`
- **For this story**: `feat(calendar): Story 7.1 — Calendar core with Sunday-first views and year grid`
- **Recent patterns**: Stories use component extraction (6.3 extracted DashboardGreeting/DashboardActivityCard), MSW handlers per feature, integration tests for backend endpoints, component tests for frontend
- **Files from 5.5 commit** (91e20db): PublicCalendarPage.tsx, publicService.ts, usePublicDashboard.ts, PublicController.cs, PublicService.cs, IPublicService.cs, mock handlers, tests, i18n — all calendar foundations already committed

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- **Task 0 — calendar-controls verification (2026-03-17)**: Context7 docs confirm `@schedule-x/calendar-controls@^4.3.1` API: `createCalendarControlsPlugin()`, `setView(viewName)`, `setDate(Temporal.PlainDate)`, `getView()`, `getDate()`, `getRange()`. `onClickDate` callback signature: `(date: Temporal.PlainDate, e?: UIEvent)`. All APIs available — no fallback (key-based remounting) needed.

### Completion Notes List

- Extracted shared `CalendarView` component from `PublicCalendarPage.tsx` into `components/calendar/CalendarView.tsx` — reusable across public and auth routes
- Created `ViewSwitcher.tsx` with Day/Week/Month/Year segmented control, responsive abbreviations on mobile, full i18n support, ARIA tablist/tab roles
- Created `YearGrid.tsx` (~160 lines) — custom 12-mini-month year overview with department-colored activity dots, Sunday-first weeks, prev/next year navigation, responsive grid (4x3 → 3x4 → 2-col)
- Created `useYearActivities` hook — 4 parallel quarterly TanStack Query calls to fetch 365 days within 90-day API limit
- Refactored `PublicCalendarPage.tsx` to thin wrapper (~80 lines) using shared CalendarView with dual-hook data pattern
- Replaced `AuthCalendarPage.tsx` stub with fully functional calendar (mirrors public pattern, ready for auth-aware features in 7.2)
- Integrated `@schedule-x/calendar-controls` plugin for programmatic `setView()` / `setDate()` — enables drill-to-day from month grid and view switcher sync
- Implemented `onClickDate` callback: clicking a day in month grid navigates to day view
- Added i18n keys for FR/EN calendar views including ViewSwitcher label
- Created 22 unit tests across 5 test files; all 461 tests pass with 0 regressions
- Fixed `temporal-polyfill/global` mock in tests to provide minimal Temporal global for `mapToCalendarEvents`

### File List

**New files:**
- `src/sdamanagement-web/src/components/calendar/CalendarView.tsx`
- `src/sdamanagement-web/src/components/calendar/calendar-utils.ts`
- `src/sdamanagement-web/src/components/calendar/ViewSwitcher.tsx`
- `src/sdamanagement-web/src/components/calendar/YearGrid.tsx`
- `src/sdamanagement-web/src/hooks/useYearActivities.ts`
- `src/sdamanagement-web/src/components/calendar/CalendarView.test.tsx`
- `src/sdamanagement-web/src/components/calendar/ViewSwitcher.test.tsx`
- `src/sdamanagement-web/src/components/calendar/YearGrid.test.tsx`
- `src/sdamanagement-web/src/pages/AuthCalendarPage.test.tsx`

**Modified files:**
- `src/sdamanagement-web/src/pages/PublicCalendarPage.tsx` — refactored to thin wrapper
- `src/sdamanagement-web/src/pages/AuthCalendarPage.tsx` — replaced stub with full calendar
- `src/sdamanagement-web/src/pages/PublicCalendarPage.test.tsx` — adapted for shared component
- `src/sdamanagement-web/public/locales/fr/common.json` — added calendar view keys
- `src/sdamanagement-web/public/locales/en/common.json` — added calendar view keys
- `src/sdamanagement-web/src/test-utils.tsx` — added calendar view i18n keys
- `src/sdamanagement-web/package.json` — added `@schedule-x/calendar-controls`
- `src/sdamanagement-web/package-lock.json` — lockfile updated

### Change Log

- **2026-03-17**: Story 7.1 implemented — extracted shared CalendarView from PublicCalendarPage, added ViewSwitcher (Day/Week/Month/Year), built custom YearGrid with department-colored dots, implemented AuthCalendarPage, integrated calendar-controls plugin for programmatic navigation, added 22 new unit tests. All 461 tests pass.
- **2026-03-17 (Code Review)**: Fixed 9 issues (3 HIGH, 3 MEDIUM, 3 LOW). H1/H2: Wired `onYearChange` through CalendarView → page wrappers so YearGrid prev/next year navigation updates both display and data fetching. H3/M3: Surfaced `isPending`/`isError`/`refetch` from `useYearActivities` to CalendarView with loading spinner and error+retry UI for year view. M1: Added TODO for Story 7.2 divergence. M2: Fixed silent test guard in YearGrid day click test. L1: Added EN calendar keys to test-utils. L2: Replaced magic Sunday date with `startOfWeek()`. L3: Added explicit i18n abbreviation keys for ViewSwitcher mobile labels. All 461 tests pass.
