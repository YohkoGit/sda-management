# Story 7.3: Admin Quick-Create from Calendar

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **ADMIN**,
I want to create an activity directly from the calendar by tapping a day,
So that I can quickly schedule activities while viewing the calendar without navigating away.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–7.2 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors and abbreviations
- Activities created with **both** `Public` AND `Authenticated` visibility (from Epic 4) — several across different dates, departments
- Activity templates created (from Epic 2/4) — at least 2 templates (e.g., "Culte du Sabbat", "Reunion") for template selection flow
- At least one user per role: VIEWER, ADMIN (with department assignments), OWNER
- Story 7.1 + 7.2 complete — CalendarView, DepartmentFilter, auth hooks, CalendarController all functional
- **CRITICAL: Story 7.2 must be committed before starting 7.3.** Git status shows 7.2 changes are in the working tree but uncommitted. Commit them first to cleanly separate 7.2 and 7.3 changes. If uncommitted, `git add` the 7.2 files listed in `7-2-calendar-visibility-and-department-filtering.md#File List` and commit with `feat(calendar): Story 7.2 — Calendar visibility and department filtering`.

### Codebase State (Story 7.2 Complete)

- **CalendarView** at `components/calendar/CalendarView.tsx` (223 lines) — Shared Schedule-X engine with Day/Week/Month/Year views, Sunday-first, department color coding. Current `onClickDate` callback (line 87-95) navigates to day view on month-grid day click. Props include: `activities`, `yearActivities`, `departments`, `isError`, `onRetry`, `onRangeChange`, `onViewChange`, `onYearChange`, `yearIsPending`, `yearIsError`, `onYearRetry`, `filterSlot`. [Source: `src/sdamanagement-web/src/components/calendar/CalendarView.tsx`]
- **AuthCalendarPage** at `pages/AuthCalendarPage.tsx` (111 lines) — Auth-scoped calendar with department filter. Uses `useAuthCalendarActivities`, `useAuthYearActivities`, `useDepartments`. Renders `CalendarView` with `DepartmentFilter` in `filterSlot`. No role checking currently. [Source: `src/sdamanagement-web/src/pages/AuthCalendarPage.tsx`]
- **PublicCalendarPage** at `pages/PublicCalendarPage.tsx` (102 lines) — Public-scoped calendar using `useCalendarActivities` and `useYearActivities`. No day-click action currently (month-grid click navigates to day view). [Source: `src/sdamanagement-web/src/pages/PublicCalendarPage.tsx`]
- **ActivityForm** — Defined **inline** in `pages/AdminActivitiesPage.tsx:75-294`. Full-featured form with react-hook-form + zod, fields: title, description, date, startTime, endTime, departmentId, visibility, specialType, roles (via RoleRosterEditor). Accepts `defaultValues` prop including `date`. **Must be extracted to shared component for calendar reuse.**
- **TemplateSelector** at `components/activity/TemplateSelector.tsx` (175 lines) — Already a shared component. Renders template cards in radiogroup, calls `onSelect(template | null)`. Props: `onSelect`, `selectedId`, `isOwner`. [Source: `src/sdamanagement-web/src/components/activity/TemplateSelector.tsx`]
- **RoleRosterEditor** at `components/activity/RoleRosterEditor.tsx` — Inline role management with contact picker. Already shared.
- **AdminActivitiesPage** at `pages/AdminActivitiesPage.tsx` (850 lines) — Full activity CRUD. Uses two-step create flow: template selection → form. Uses `Dialog` (desktop) / `Sheet` (mobile) wrapper pattern (lines 536-539). Contains `createMutation` (lines 399-421) that calls `activityService.create()`, invalidates `["activities"]` queries, shows toast.
- **activityService.create** at `services/activityService.ts:90-91` — `api.post<ActivityResponse>("/api/activities", data)`. Appends `:00` to time strings.
- **createActivitySchema** at `schemas/activitySchema.ts:27-57` — Zod schema with `date` as `YYYY-MM-DD` string regex, departmentId as positive int, visibility enum, optional roles array.
- **ActivitiesController.Create** at `Controllers/ActivitiesController.cs:84-121` — `[HttpPost] [Authorize]`, checks `auth.CanManage(request.DepartmentId)`, validates, returns 201 Created.
- **useAuth hook** at `contexts/AuthContext.tsx` — `{ user, isAuthenticated, isLoading }`. `user.role` is "OWNER"|"ADMIN"|"VIEWER". `user.departmentIds: number[]`.
- **useIsMobile** at `hooks/use-mobile.ts` — Returns boolean, breakpoint at 768px.
- **UI Components available**: `Dialog` (Radix), `Sheet` (Radix, side panel), `Drawer` (vaul, mobile bottom sheet), `AlertDialog`, `Button`, `Input`, `Label`, `Select`, `Textarea`, `Separator`, `Badge`, `Skeleton`.
- **Schedule-X callbacks**: `onClickDate(date: Temporal.PlainDate)` fires on month-grid day click. `onClickDateTime(dateTime: Temporal.ZonedDateTime)` fires on week/day **empty time slot** click only. `onEventClick(calendarEvent, e: UIEvent)` fires when clicking existing events — separate callback, no overlap with `onClickDateTime`. All available for intercepting.
- **CalendarController** at `Controllers/CalendarController.cs` — `GET /api/calendar` with auth, returns both Public + Authenticated activities. Created in Story 7.2.
- **calendarService** at `services/calendarService.ts` — `getCalendarActivities(start, end, departmentIds?)` for auth calendar.
- **DepartmentFilter** at `components/calendar/DepartmentFilter.tsx` — Chip-based department toggle, already in CalendarView via `filterSlot`.
- **departmentService** at `services/departmentService.ts` — `getAll()` returns `DepartmentListItem[]` with `id`, `name`, `color`, `abbreviation`.
- **ConflictAlertDialog** at `components/activity/ConflictAlertDialog.tsx` — Reusable conflict resolution dialog.
- **i18n keys**: `pages.adminActivities.*` for form labels, template selector, toasts. `pages.calendar.*` for calendar page.
- **MSW mocks**: `mocks/handlers/calendar.ts` (auth calendar), `mocks/handlers/public.ts` (public calendar). Activity-related MSW handlers in `mocks/handlers/activities.ts` if needed.
- **Test infrastructure**: 461+ tests passing. `test-utils.tsx` has calendar + admin activity i18n keys. MSW handler pattern established.
- **Route config**: `/calendar` → PublicCalendarPage, `/my-calendar` → AuthCalendarPage (auth tree, `ProtectedRoute`), `/admin/activities` → AdminActivitiesPage (admin tree).

## Acceptance Criteria

1. **Given** an ADMIN viewing the calendar (`/my-calendar`) **When** they tap/click on a specific day (month-grid, year grid, or empty time slot in week/day view) **Then** a Day Detail dialog/drawer opens showing that day's activities **And** a "Nouvelle activite" button is prominently displayed at the top of the dialog (FR40).

2. **Given** the Day Detail dialog with "Nouvelle activite" button **When** the ADMIN taps the button **Then** the dialog transitions to the template selection step (same surface, content swaps) **And** on template selection (or "Custom"), transitions to the full activity creation form **And** the date field is pre-filled with the selected day **And** the full activity creation from Epic 4 is available (template selection, role customization, assignment).

3. **Given** the activity creation form within the calendar dialog **When** the ADMIN fills in details and saves **Then** the activity is created via `POST /api/activities` **And** the calendar refreshes immediately showing the new activity (auth calendar queries invalidated) **And** a success toast appears **And** the dialog closes.

4. **Given** a VIEWER viewing the calendar (`/my-calendar`) **When** they tap/click on a specific day **Then** the Day Detail dialog/drawer opens showing that day's activities (both public + authenticated) **And** no "Nouvelle activite" button or creation affordance is visible.

5. **Given** an anonymous user viewing the calendar (`/calendar`) **When** they tap/click on a specific day **Then** a Day Detail dialog/drawer opens showing that day's public-only activities **And** no creation affordance is visible **And** no sign-in is required.

6. **Given** the Day Detail dialog on any view **When** the user wants to navigate to the full day view **Then** a "View full day" link is available that closes the dialog and switches the calendar to day view for that date — preserving the navigation path that previously existed via direct day click.

## Tasks / Subtasks

> **Implementation order**: Tasks 1→2→3→4→5→6→7. Refactor first (Task 1), then shared component changes (Task 2), then new component (Task 3), then page integration (Tasks 4-5), then tests (Task 6), then i18n/a11y (Task 7). Tasks 1 and 2 are independent and can be done in parallel.

- [x] Task 1: Extract ActivityForm to shared component (AC: all — prerequisite for reuse)
  - [x] 1.1 Create `components/activity/ActivityForm.tsx` by **moving** the `ActivityForm` function from `pages/AdminActivitiesPage.tsx:75-294`. This is a pure extraction — zero behavior change.
    - Move the entire `ActivityForm` function (lines 75-293) including its prop types
    - Add all necessary imports to the new file:
      - From `react-i18next`: `useTranslation`
      - From `react-hook-form`: `useForm`, `Controller`
      - From `@hookform/resolvers/zod`: `zodResolver`
      - From `@/schemas/activitySchema`: `createActivitySchema`, `SPECIAL_TYPES`, `type CreateActivityFormData`
      - From `@/components/ui/*`: `Label`, `Input`, `Textarea`, `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue`, `Separator`, `Button`
      - From `@/services/departmentService`: `type DepartmentListItem`
      - From `@/services/userService`: `type AssignableOfficer`
      - From `"./RoleRosterEditor"` (relative — same directory): `RoleRosterEditor`
    - Export `ActivityForm` as named export and also export the props type: `ActivityFormProps`
    - The component signature and props must remain **identical**: `{ onSubmit, isPending, departments, defaultValues?, existingAssignments?, initialGuestOfficers? }`
  - [x] 1.2 Update `pages/AdminActivitiesPage.tsx`:
    - Replace the inline `ActivityForm` function with: `import { ActivityForm } from "@/components/activity/ActivityForm"`
    - Remove now-unused imports that were only needed by `ActivityForm` (if any). Verify no other code in AdminActivitiesPage uses them.
    - **Do NOT change any behavior** — AdminActivitiesPage must function identically before and after extraction
  - [x] 1.3 Run all existing AdminActivitiesPage tests to verify zero regression. All tests must pass before proceeding.

- [x] Task 2: Add `onDayAction` callback to CalendarView (AC: #1, #4, #5)
  - [x] 2.1 Add new optional prop to `CalendarViewProps` interface in `components/calendar/CalendarView.tsx`:
    ```typescript
    /** Called when user clicks/taps a day. Passes ISO date string "YYYY-MM-DD". When provided, replaces day-view navigation on month-grid click. */
    onDayAction?: (date: string) => void;
    ```
  - [x] 2.2 Modify the `onClickDate` callback (line 87-95) to fire `onDayAction` when provided **instead of** switching to day view:
    ```typescript
    onClickDate(date: Temporal.PlainDate) {
      const isoDate = `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
      if (onDayAction) {
        onDayAction(isoDate);
      } else {
        // Original behavior: switch to day view
        setActiveView("day");
        calendarControls.setView("day");
        calendarControls.setDate(date);
        setSelectedDate(new Date(date.year, date.month - 1, date.day));
        onViewChange("day");
      }
    },
    ```
    When `onDayAction` is NOT provided (e.g., if a page doesn't pass it), the original day-view navigation is preserved — backward compatible.
  - [x] 2.3 Add `onClickDateTime` callback for week/day view time slot clicks (bonus: pre-fills startTime):
    ```typescript
    onClickDateTime(dateTime: Temporal.ZonedDateTime) {
      if (onDayAction) {
        const isoDate = dateTime.toPlainDate().toString();
        onDayAction(isoDate);
      }
    },
    ```
    Note: `onClickDateTime` fires when clicking **empty time slots only** in week/day views. Schedule-X has a **separate** `onEventClick(calendarEvent, e: UIEvent)` callback for clicking existing events — these two callbacks do NOT overlap. No disambiguation logic is needed.
    The `dateTime` includes time, but we only pass the date string to `onDayAction`. Time pre-fill is a future enhancement — keep it simple for now.
    **Note on `onEventClick`**: Schedule-X provides `onEventClick` for event clicks. This is out of scope for Story 7.3 — do NOT add an `onEventClick` handler. If event detail viewing from the calendar is needed later, it would be a separate story.
  - [x] 2.4 Wire `onDayAction` through YearGrid day clicks. Modify `handleYearDayClick` (line 117-128) to check for `onDayAction`:
    ```typescript
    const handleYearDayClick = useCallback(
      (date: Date) => {
        const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        if (onDayAction) {
          onDayAction(isoDate);
        } else {
          // Original behavior
          setSelectedDate(date);
          setActiveView("day");
          const plainDate = Temporal.PlainDate.from(isoDate);
          calendarControls.setView("day");
          calendarControls.setDate(plainDate);
          onViewChange("day");
        }
      },
      [calendarControls, onViewChange, onDayAction],
    );
    ```
  - [x] 2.5 Verify PublicCalendarPage and AuthCalendarPage still work correctly — neither passes `onDayAction` yet, so original behavior is preserved.

- [x] Task 3: Create DayDetailDialog component (AC: #1, #2, #3, #4, #5, #6)
  - [x] 3.1 Create `components/calendar/DayDetailDialog.tsx` — the multi-step dialog component. Props:
    ```typescript
    interface DayDetailDialogProps {
      open: boolean;
      onOpenChange: (open: boolean) => void;
      /** ISO date string "YYYY-MM-DD" for the selected day */
      date: string;
      /** All loaded activities — filtered client-side by date. No new API call. */
      activities: PublicActivityListItem[];
      /** Current user from useAuth — null for anonymous */
      user: AuthUser | null;
      /** Callback fired after successful activity creation. Parent should invalidate queries. */
      onCreated: () => void;
      /** Callback to switch calendar to day view for the selected date. Used by "View full day" link. */
      onNavigateToDay: (date: string) => void;
    }
    ```
    Note: No `departments` prop — DayDetailDialog fetches its own department list internally via `departmentService.getAll()` when `open && isAdmin` (Task 3.5). This avoids type mismatch between `PublicDepartment` (from parent's `useDepartments`) and `DepartmentListItem` (needed by ActivityForm).
    ```
  - [x] 3.2 Implement three-step flow within the dialog using step state:
    ```typescript
    type DialogStep = "detail" | "template" | "form";
    const [step, setStep] = useState<DialogStep>("detail");
    ```
    Reset `step` to `"detail"` whenever `date` changes or dialog opens (`useEffect` on `date` + `open`).
  - [x] 3.3 **Step "detail"** — Day Activity List:
    - Filter `activities` by date: `activities.filter(a => a.date === date)` — client-side, zero API calls
    - Display date as formatted heading (e.g., "Samedi 7 mars 2026" using `Intl.DateTimeFormat` with `i18n.language` locale)
    - Render activity list: each item shows title, time range (`startTime`–`endTime`), department badge (color dot + abbreviation), special type tag if present
    - Empty state: "Aucune activite planifiee" (i18n key)
    - **ADMIN/OWNER only**: Render a prominent `Button` at the top — "Nouvelle activite" (primary variant, `Plus` icon). Clicking sets `step = "template"`. **Disable the button if date is in the past** (compare `date` with today's date string).
    - **VIEWER / null user**: No button rendered. Activity list only.
    - **"View full day" link**: At the bottom of the detail step, render a subtle text link: `t("pages.calendar.dayDetail.viewFullDay")`. Clicking it calls `onOpenChange(false)` then `onNavigateToDay(date)`.
    - Role check: `const isAdmin = user?.role?.toUpperCase() === "OWNER" || user?.role?.toUpperCase() === "ADMIN"`. Do not render role-dependent UI while user is null AND the page is authenticated (this is the auth loading edge case — the parent page already handles `isLoading` so user will be resolved by the time DayDetailDialog renders).
  - [x] 3.4 **Step "template"** — Template Selection:
    - Render a back button: `ChevronLeft` + `t("pages.calendar.dayDetail.backToDay")`. Clicking sets `step = "detail"`.
    - Render `TemplateSelector` component: `<TemplateSelector onSelect={handleTemplateSelect} selectedId={selectedTemplate?.id ?? null} isOwner={isOwner} />`
    - `handleTemplateSelect`: stores template, sets `step = "form"`
    - State: `const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplateListItem | null>(null)`
  - [x] 3.5 **Step "form"** — Activity Creation Form:
    - Render a back button: `ChevronLeft` + `t("pages.adminActivities.templateSelector.backToTemplates")`. Clicking sets `step = "template"`.
    - Render extracted `ActivityForm` with `defaultValues`:
      ```typescript
      defaultValues={{
        date: date, // Pre-filled from calendar day click
        departmentId: availableDepartments.length === 1 ? availableDepartments[0].id : 0,
        roles: selectedTemplate?.roles.map((r) => ({
          roleName: r.roleName,
          headcount: r.defaultHeadcount,
        })) ?? [],
      }}
      ```
      **Department pre-selection**: If ADMIN has exactly 1 department assignment, auto-select it. If OWNER or ADMIN with multiple departments, leave selector open (departmentId: 0).
    - `availableDepartments`: For ADMIN, filter departments by `user.departmentIds`. For OWNER, all departments. Same pattern as `AdminActivitiesPage:395-397`.
    - Departments: fetch via `useQuery(['departments'], departmentService.getAll)` — same as AdminActivitiesPage. OR receive departments from parent prop (already loaded by AuthCalendarPage via `useDepartments()`). **Prefer prop** to avoid duplicate fetch. But note: `useDepartments()` returns `PublicDepartment` (id, name, abbreviation, color, description) while ActivityForm expects `DepartmentListItem` (id, name, color, abbreviation, description, subMinistryCount, createdAt). The department selector only uses `id`, `name`, `color` — fields present in both types. **Solution**: DayDetailDialog fetches its own department list via `departmentService.getAll()` for the form step (same as AdminActivitiesPage), only when step === "form" or "template" (use `enabled` flag). OR define `departments` prop as `{ id: number; name: string; color: string }[]` intersection type. Simplest: fetch via `departmentService.getAll()` inside DayDetailDialog, enabled when `open && isAdmin`.
    - **Department fetch error handling**: If the department query fails (network error, 500), show a retry button in place of the department selector. Use the same error/retry pattern as TemplateSelector (lines 59-69): error message + `<Button variant="outline" onClick={refetch}>`. Do NOT block the entire form — the error is localized to the department field. Alternatively, use the `isError` state from useQuery and render a toast + fallback text.
  - [x] 3.6 **createMutation** inside DayDetailDialog:
    ```typescript
    const createMutation = useMutation({
      mutationFn: (data: CreateActivityFormData) =>
        activityService.create({
          ...data,
          startTime: data.startTime + ":00",
          endTime: data.endTime + ":00",
        }),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["auth", "calendar"] });
        queryClient.invalidateQueries({ queryKey: ["activities"] });
        onCreated();
        onOpenChange(false);
        toast.success(t("pages.adminActivities.toast.created"));
      },
      onError: (error: AxiosError) => {
        if (error.response?.status === 400 && selectedTemplate) {
          toast.error(t("pages.adminActivities.templateSelector.templateError"));
        } else if (error.response?.status === 422) {
          toast.error(t("pages.adminActivities.assignmentError"));
        }
      },
    });
    ```
    **Query invalidation**: `["auth", "calendar"]` matches all auth calendar query keys (range queries + year quarterly queries). `["activities"]` invalidates the AdminActivitiesPage list if the user navigates there later. The `onCreated()` callback lets the parent do any additional cleanup.
  - [x] 3.7 **Responsive wrapper**: Use `useIsMobile()` to choose surface:
    - Mobile (`< 768px`): `Drawer` (vaul bottom sheet) — `DrawerContent` with `className="max-h-[85vh]"`. Content area wrapped in `<div className="overflow-y-auto flex-1 px-4 pb-4">` for independent scrolling. UX spec: "full-screen bottom sheet on mobile" [Source: ux-design-specification.md:511].
    - Desktop (`>= 768px`): `Dialog` — `DialogContent` with `className="max-w-lg max-h-[80vh] overflow-y-auto"`. Centered modal.
    - Use the same `FormWrapper`/`FormContent`/`FormHeader`/`FormTitle` aliasing pattern from AdminActivitiesPage:536-539, but with `Drawer`/`Dialog` instead of `Sheet`/`Dialog`:
      ```typescript
      const FormWrapper = isMobile ? Drawer : Dialog;
      const FormContent = isMobile ? DrawerContent : DialogContent;
      const FormHeader = isMobile ? DrawerHeader : DialogHeader;
      const FormTitle = isMobile ? DrawerTitle : DialogTitle;
      ```
  - [x] 3.8 **Reset state on close/reopen**: When `open` changes to `false` or `date` changes, reset: `step` → `"detail"`, `selectedTemplate` → `null`. Prevents stale creation state if the user opens the dialog for a different day.

- [x] Task 4: Integrate DayDetailDialog into AuthCalendarPage (AC: #1, #2, #3, #4, #6)
  - [x] 4.1 Add state to `AuthCalendarPage`:
    ```typescript
    const [dayDialogDate, setDayDialogDate] = useState<string | null>(null);
    ```
    Dialog open state derived: `const dayDialogOpen = dayDialogDate !== null;`
  - [x] 4.2 Import `useAuth` and get user:
    ```typescript
    const { user } = useAuth();
    ```
  - [x] 4.3 Create `handleDayAction` callback:
    ```typescript
    const handleDayAction = useCallback((date: string) => {
      setDayDialogDate(date);
    }, []);
    ```
  - [x] 4.4 Create `handleNavigateToDay` callback — closes dialog and switches CalendarView to day view:
    ```typescript
    const handleNavigateToDay = useCallback((date: string) => {
      setDayDialogDate(null);
      // CalendarView exposes no imperative "go to day view" API.
      // Workaround: set activeView to "day" and let CalendarView handle via handleViewChange.
      // But CalendarView's internal calendarControls.setView/setDate are not exposed.
      // SOLUTION: Add a new optional prop to CalendarView: onNavigateTo?: { view: CalendarViewType; date: string } | null
      // OR simpler: just close the dialog — the user can use the ViewSwitcher.
      // For AC6, the "View full day" link in DayDetailDialog should trigger a view change.
      // Best approach: expose a ref or callback from CalendarView that allows programmatic navigation.
      // Simplest MVP: DayDetailDialog's "View full day" link sets parent state that triggers CalendarView re-render.
      // Implementation: AuthCalendarPage passes a `navigateTo` state object to CalendarView as a new prop.
    }, []);
    ```
    **Note on "View full day" navigation**: CalendarView's internal `calendarControls.setView()` and `calendarControls.setDate()` are not exposed to parent. Two options:
    - **Option A**: Add `navigateTo?: { view: CalendarViewType; date: string } | null` prop to CalendarView. When set, CalendarView uses `useEffect` to call `calendarControls.setView(navigateTo.view)` + `calendarControls.setDate(Temporal.PlainDate.from(navigateTo.date))` + `setActiveView(navigateTo.view)`, then parent clears it.
    - **Option B**: Expose `calendarControls` via `useImperativeHandle` / ref. Overkill for one use case.
    - **Choose Option A** — minimal, fits existing prop-driven architecture.
  - [x] 4.5 Add `navigateTo` state and prop wiring:
    ```typescript
    const [navigateTo, setNavigateTo] = useState<{ view: CalendarViewType; date: string } | null>(null);

    const handleNavigateToDay = useCallback((date: string) => {
      setDayDialogDate(null);
      setNavigateTo({ view: "day", date });
    }, []);
    ```
    Pass `navigateTo` to CalendarView. CalendarView consumes it via `useEffect`, then parent clears via `onNavigateComplete` callback:
    ```typescript
    <CalendarView
      ...existing props
      onDayAction={handleDayAction}
      navigateTo={navigateTo}
      onNavigateComplete={() => setNavigateTo(null)}
    />
    ```
  - [x] 4.6 Update CalendarView to accept `navigateTo` and `onNavigateComplete` props:
    Add to `CalendarViewProps`:
    ```typescript
    navigateTo?: { view: CalendarViewType; date: string } | null;
    onNavigateComplete?: () => void;
    ```
    Add `useEffect` in CalendarView:
    ```typescript
    useEffect(() => {
      if (navigateTo) {
        const { view, date } = navigateTo;
        setActiveView(view);
        if (view !== "year") {
          calendarControls.setView(view);
          calendarControls.setDate(Temporal.PlainDate.from(date));
        }
        setSelectedDate(new Date(date + "T00:00:00"));
        onViewChange(view);
        onNavigateComplete?.();
      }
    }, [navigateTo, calendarControls, onViewChange, onNavigateComplete]);
    ```
  - [x] 4.7 Render `DayDetailDialog` in AuthCalendarPage:
    ```tsx
    <DayDetailDialog
      open={dayDialogOpen}
      onOpenChange={(open) => { if (!open) setDayDialogDate(null); }}
      date={dayDialogDate ?? ""}
      activities={activities ?? []}
      user={user}
      onCreated={() => {
        refetchCal();
        refetchYear();
      }}
      onNavigateToDay={handleNavigateToDay}
    />
    ```
  - [x] 4.8 Handle `onCreated` — query invalidation happens inside DayDetailDialog's mutation `onSuccess`. The `onCreated` callback on AuthCalendarPage can additionally call `refetchCal()` and `refetchYear()` for immediate UI refresh (belt and suspenders with `invalidateQueries`).

- [x] Task 5: Integrate day detail into PublicCalendarPage (AC: #5)
  - [x] 5.1 Add state to `PublicCalendarPage`:
    ```typescript
    const [dayDialogDate, setDayDialogDate] = useState<string | null>(null);
    const [navigateTo, setNavigateTo] = useState<{ view: CalendarViewType; date: string } | null>(null);
    ```
  - [x] 5.2 Create `handleDayAction` and `handleNavigateToDay` callbacks (same pattern as AuthCalendarPage, simpler — no auth).
  - [x] 5.3 Pass `onDayAction` and `navigateTo`/`onNavigateComplete` to CalendarView.
  - [x] 5.4 Render `DayDetailDialog` with `user={null}`:
    ```tsx
    <DayDetailDialog
      open={dayDialogOpen}
      onOpenChange={(open) => { if (!open) setDayDialogDate(null); }}
      date={dayDialogDate ?? ""}
      activities={activities ?? []}
      user={null}
      onCreated={() => {}}
      onNavigateToDay={handleNavigateToDay}
    />
    ```
    With `user={null}`, DayDetailDialog renders day detail step only — no create button, no template/form steps.

- [x] Task 6: Tests (AC: #1, #2, #3, #4, #5, #6)
  - [x] 6.1 Verify AdminActivitiesPage tests still pass after ActivityForm extraction (Task 1 verification — run first).
  - [x] 6.2 Create `components/calendar/DayDetailDialog.test.tsx` (~10 tests):
    - Renders activity list for the selected date
    - Shows "Nouvelle activite" button when user is ADMIN
    - Hides "Nouvelle activite" button when user is VIEWER
    - Hides "Nouvelle activite" button when user is null (anonymous)
    - Disables "Nouvelle activite" button for past dates
    - Clicking "Nouvelle activite" transitions to template step
    - Back button from template step returns to detail step
    - Shows "View full day" link and calls `onNavigateToDay` on click
    - Shows empty state when no activities for selected date
    - Renders formatted date heading
  - [x] 6.3 Update `pages/AuthCalendarPage.test.tsx` (~3 new tests):
    - Test: clicking a day in the calendar triggers day detail dialog (mock `onDayAction` via CalendarView interaction)
    - Test: ADMIN user sees "Nouvelle activite" button in day detail
    - Test: VIEWER user sees day detail without create button
  - [x] 6.4 Update `pages/PublicCalendarPage.test.tsx` (~2 new tests):
    - Test: clicking a day opens day detail dialog with public activities only
    - Test: no creation affordance visible in anonymous day detail
  - [x] 6.5 Create MSW handlers if needed — DayDetailDialog's creation flow uses `POST /api/activities` (already mocked in existing activity handlers) and `GET /api/activity-templates` (already mocked if TemplateSelector tests exist). May need to add template handlers to test setup if not already present.
  - [x] 6.6 Verify CalendarView tests still pass (6 existing tests) — `onDayAction` is optional so existing tests (which don't pass it) should be unaffected.
  - [x] 6.7 Add 1-2 CalendarView `onDayAction` callback tests to `CalendarView.test.tsx`:
    - Test: when `onDayAction` is provided, it is called with correct ISO date string on day click (mock Schedule-X interaction or test the handler logic)
    - Test: when `onDayAction` is NOT provided, original day-view navigation behavior is preserved
    Note: Existing 6 CalendarView tests cover rendering only — no callback tests exist currently.

- [x] Task 7: i18n and accessibility (AC: #1, #4, #5, #6)
  - [x] 7.1 Add i18n keys to `public/locales/fr/common.json`:
    ```json
    "pages.calendar.dayDetail": {
      "title": "Activites du jour",
      "empty": "Aucune activite planifiee",
      "create": "Nouvelle activite",
      "viewFullDay": "Voir la journee complete",
      "backToDay": "Retour",
      "pastDate": "Impossible de creer une activite dans le passe"
    }
    ```
  - [x] 7.2 Add i18n keys to `public/locales/en/common.json`:
    ```json
    "pages.calendar.dayDetail": {
      "title": "Day activities",
      "empty": "No activities planned",
      "create": "New activity",
      "viewFullDay": "View full day",
      "backToDay": "Back",
      "pastDate": "Cannot create activity in the past"
    }
    ```
  - [x] 7.3 Update `test-utils.tsx` with new i18n keys.
    **Pre-existing gap**: The EN stub in test-utils.tsx is missing `pages.adminActivities.specialType` section. If the extracted ActivityForm renders specialType labels in tests using EN fallback, this may cause raw key display. Fix by adding the specialType entries to the EN stub if encountered during testing.
  - [x] 7.4 DayDetailDialog accessibility:
    - Dialog: `aria-label={t("pages.calendar.dayDetail.title")}` on DialogContent/DrawerContent
    - Activity list: `role="list"` container, `role="listitem"` per activity
    - "Nouvelle activite" button: `aria-label={t("pages.calendar.dayDetail.create")}`, `aria-disabled="true"` for past dates with tooltip explaining why
    - "View full day" link: use `<button>` with `role="link"` style or a styled `<a>` for semantic correctness
    - Step transitions: announce step change to screen readers via `aria-live="polite"` region or focus management (move focus to new step heading)
    - Back buttons: `aria-label` with step context (e.g., "Back to day detail")
    - Mobile Drawer: drag handle is decorative, ensure content is keyboard-navigable

## Dev Notes

### Architecture Patterns & Constraints

- **No new backend endpoints.** Story 7.3 is purely frontend. Activity creation uses existing `POST /api/activities` (ActivitiesController, Epic 4). Calendar reads use existing `GET /api/calendar` (CalendarController, Story 7.2) and `GET /api/public/calendar` (PublicController, Epic 5). Template fetching uses existing `GET /api/activity-templates` (Epic 2). [Source: architecture.md — Requirements Coverage Matrix, line 891: "FR35-FR40 (Calendar): CalendarController + @schedule-x/react + department filtering"]
- **No database migrations.** All data models are unchanged.
- **CalendarView remains a presentational component.** It receives data via props and delegates actions via callbacks. The new `onDayAction` callback follows the same pattern as `onRangeChange` and `onViewChange`. CalendarView does NOT fetch data or manage dialog state.
- **DayDetailDialog owns its creation state.** The dialog manages step transitions, template selection, form state, and the createMutation. Parent pages (AuthCalendarPage, PublicCalendarPage) only manage open/close state and provide data. This keeps pages thin per Winston's architecture guidance.
- **Client-side day filtering.** DayDetailDialog filters activities by date from the already-loaded array — zero additional API calls for the day detail step. Activities are already fetched by `useAuthCalendarActivities` / `useCalendarActivities` in the parent page.
- **Department data for form.** DayDetailDialog fetches its own department list via `departmentService.getAll()` for the ActivityForm department selector. This uses `DepartmentListItem` type (from `departmentService`), not `PublicDepartment` (from `useDepartments`). Fetch is enabled only when dialog is open AND user is ADMIN/OWNER (`enabled: open && isAdmin`). [Source: AdminActivitiesPage.tsx:376-383 for the existing pattern]
- **Namespace convention**: If DayDetailDialog needs `IAuthorizationService` types, use namespace alias. But this is frontend-only — no C# namespace concerns. Frontend role check is via `user.role.toUpperCase()` string comparison.
- **PublicCalendarPage must remain anonymous-safe.** AC #5 specifies no sign-in required. The DayDetailDialog with `user={null}` renders only the day detail step. No authenticated API calls are made. All activities come from the public hooks.
- **Drawer/Dialog aliasing compatibility.** `Drawer` (vaul) and `Dialog` (Radix) share the same `open`/`onOpenChange` API surface, making the `FormWrapper` aliasing pattern safe. `DrawerContent`/`DialogContent`, `DrawerHeader`/`DialogHeader`, `DrawerTitle`/`DialogTitle` all accept `children` and `className`. Key difference: `DrawerContent` auto-renders a drag handle bar when direction is "bottom" (default). This is desirable UX — no suppression needed. Styling should be handled per-variant via conditional `className` rather than through the aliased component (e.g., `className={isMobile ? "max-h-[85vh]" : "max-w-lg max-h-[80vh]"}` on the content element).

### ADR: Unified Day Detail Dialog with Multi-Step Flow

| | |
|---|---|
| **Decision** | Day click in month-grid/year-grid/week-day views opens a unified Day Detail Dialog for ALL roles. ADMINs see a "Nouvelle activite" button that transitions the dialog to template selection → activity form. |
| **Option A (rejected)** | ADMIN click → creation dialog directly, VIEWER click → day detail. Different behavior for the same gesture based on role is confusing and violates the principle of least surprise. |
| **Option B (rejected)** | Always open creation dialog for ADMINs with no day context. User persona focus group revealed ADMINs want to see what's already planned before creating — avoids duplicate scheduling. |
| **Option C (chosen)** | Unified dialog: detail step for all → optional creation steps for ADMIN/OWNER. Single gesture, consistent behavior, role-aware content. One extra tap for ADMINs (tap day → tap "Create") is acceptable — focus group confirmed ADMINs prefer seeing day context first. |
| **Trade-off** | One extra tap vs. immediate creation. Worth it for context awareness and UX consistency across roles. |

### ADR: CalendarView Day-Click Behavior Change

| | |
|---|---|
| **Decision** | New `onDayAction` prop replaces day-view navigation on month-grid/year-grid day click when provided. Original behavior preserved when prop is omitted. |
| **Rationale** | CalendarView is shared by PublicCalendarPage and AuthCalendarPage. Both need day-action behavior. The ViewSwitcher already provides explicit view switching. Month-grid day click is more valuable as "show day details" than "navigate to day view." A "View full day" link in the dialog preserves the old navigation path. |
| **Backward compatibility** | `onDayAction` is optional. Pages that don't pass it get the original behavior (switch to day view). Zero regression risk. |

### ADR: Programmatic Calendar Navigation via `navigateTo` Prop

| | |
|---|---|
| **Decision** | Add `navigateTo?: { view: CalendarViewType; date: string } | null` and `onNavigateComplete?: () => void` props to CalendarView for programmatic view+date changes from parent. |
| **Context** | The "View full day" link in DayDetailDialog needs to close the dialog AND switch CalendarView to day view for the selected date. CalendarView's internal `calendarControls` are not exposed. |
| **Chosen approach** | Prop-driven navigation: parent sets `navigateTo`, CalendarView consumes it via `useEffect` (calls `calendarControls.setView` + `setDate`), parent clears via `onNavigateComplete`. Fits existing prop-driven architecture. |
| **Rejected** | `useImperativeHandle` / ref-based approach — overkill for a single use case and breaks the unidirectional data flow pattern. |

### ADR: Responsive Surface Selection

| | |
|---|---|
| **Decision** | Day detail + creation flow: `Drawer` (vaul bottom sheet) on mobile, `Dialog` (centered modal) on desktop. Single surface for all steps. |
| **Rationale** | UX spec: "tap date → bottom sheet with activities" (mobile), "click date → inline expansion" (desktop) [Source: ux-design-specification.md:1698]. Drawer provides native mobile swipe-to-dismiss. Dialog provides focused desktop modal. Same wrapper aliasing pattern as AdminActivitiesPage. |
| **Content scrolling** | Creation form with RoleRosterEditor is tall. Mobile Drawer content area must have `overflow-y-auto` with independent scrolling to ensure Save button is reachable. Pre-mortem analysis identified this as a failure mode. |

### Project Structure Notes

**New files:**
- `src/sdamanagement-web/src/components/activity/ActivityForm.tsx` — Extracted from AdminActivitiesPage (pure move)
- `src/sdamanagement-web/src/components/calendar/DayDetailDialog.tsx` — Multi-step day detail + creation dialog
- `src/sdamanagement-web/src/components/calendar/DayDetailDialog.test.tsx` — Unit tests

**Modified files:**
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx` — Remove inline ActivityForm, import from shared component
- `src/sdamanagement-web/src/components/calendar/CalendarView.tsx` — Add `onDayAction`, `navigateTo`, `onNavigateComplete` props; modify `onClickDate`, `onClickDateTime`, `handleYearDayClick`
- `src/sdamanagement-web/src/pages/AuthCalendarPage.tsx` — Add useAuth, DayDetailDialog, dayDialogDate state, navigateTo state, onDayAction/onNavigateToDay callbacks
- `src/sdamanagement-web/src/pages/PublicCalendarPage.tsx` — Add DayDetailDialog (user=null), dayDialogDate state, navigateTo state, onDayAction callback
- `src/sdamanagement-web/src/pages/AuthCalendarPage.test.tsx` — Add day detail + role tests
- `src/sdamanagement-web/src/pages/PublicCalendarPage.test.tsx` — Add anonymous day detail test
- `src/sdamanagement-web/public/locales/fr/common.json` — Add dayDetail i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — Add dayDetail i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — Add dayDetail i18n keys

**No changes needed:**
- No backend files — no new endpoints, no new services, no migrations
- CalendarController.cs — unchanged
- ActivitiesController.cs — unchanged (existing POST endpoint reused)
- DepartmentFilter.tsx — unchanged
- calendarService.ts — unchanged
- useAuthCalendarActivities.ts / useAuthYearActivities.ts — unchanged
- useYearActivities.ts / usePublicDashboard.ts — unchanged
- activityService.ts — unchanged (existing create method reused)
- activitySchema.ts — unchanged
- RoleRosterEditor.tsx — unchanged (imported by extracted ActivityForm)
- TemplateSelector.tsx — unchanged (imported by DayDetailDialog)
- ConflictAlertDialog.tsx — not needed (quick-create is new, no concurrency tokens)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 7, Story 7.3] — Story AC and context
- [Source: _bmad-output/planning-artifacts/prd.md#FR40] — "ADMINs can create activities directly from the calendar view"
- [Source: _bmad-output/planning-artifacts/architecture.md#Calendar Integration, line 824] — CalendarController + CalendarService mapping for FR35-FR40
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Boundaries, line 844] — CalendarController as read-only projection
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Boundaries] — Public vs authenticated route trees
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:261] — "Quick-create from calendar (tap day → creation modal pre-filled with date)"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:315] — Interaction pattern: "Quick-create from calendar — Admin taps a day → activity creation pre-filled with date."
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:511] — Experience C: "Admin: full-screen bottom sheet (mobile) or side panel (desktop)"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:343] — "Centered modals for complex forms on mobile → use full-screen slide-up bottom sheet"
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:1698] — Breakpoint table: "Calendar (month): tap date → bottom sheet with activities"
- [Source: _bmad-output/implementation-artifacts/7-2-calendar-visibility-and-department-filtering.md] — Previous story implementation details
- [Source: _bmad-output/implementation-artifacts/7-1-calendar-core-sunday-first-with-multiple-views.md] — Calendar core patterns
- [Source: Context7 Schedule-X docs, schedule-x.dev/docs/calendar/configuration] — `onClickDate(date: Temporal.PlainDate)` fires on month-grid day click. `onClickDateTime(dateTime: Temporal.ZonedDateTime)` fires on week/day empty time slot click. `onEventClick(calendarEvent, e: UIEvent)` fires on event click (separate callback, no overlap). Verified 2026-03-18.

### Library & Framework Requirements

| Library | Version | Purpose | Notes |
|---|---|---|---|
| `@schedule-x/react` | ^4.1.0 | Calendar rendering | Already installed. `onClickDate` and `onClickDateTime` callbacks used for day-action trigger. |
| `@schedule-x/calendar-controls` | ^4.3.1 | Programmatic calendar navigation | Already installed. `setView()` and `setDate()` used by `navigateTo` prop implementation. |
| `@tanstack/react-query` | ^5.90.21 | Data fetching + mutation + cache invalidation | Already installed. `useMutation` for create, `invalidateQueries` for cache refresh after creation. |
| `react-hook-form` | existing | Form state management in ActivityForm | Already installed. Used by extracted ActivityForm. |
| `zod` + `@hookform/resolvers` | existing | Form validation | Already installed. `createActivitySchema` used by ActivityForm. |
| `vaul` | existing | Mobile bottom sheet (Drawer) | Already installed. Used for mobile responsive DayDetailDialog. |
| `sonner` | existing | Toast notifications | Already installed. Success/error toasts after activity creation. |
| `lucide-react` | existing | Icons (Plus, ChevronLeft) | Already installed. |
| `axios` | existing | HTTP client via `api` from `@/lib/api` | Already installed. Used by `activityService.create()` and `departmentService.getAll()`. |

**No new dependencies required.** All libraries already in `package.json`.

### Testing Requirements

**ActivityForm extraction verification** (Task 6.1):
- Run ALL existing AdminActivitiesPage tests — must pass with zero changes after extraction

**DayDetailDialog component tests** (Task 6.2, ~10 tests):
- Activity list rendering for selected date (filter from props)
- "Nouvelle activite" button visibility: shown for ADMIN, hidden for VIEWER, hidden for null user
- "Nouvelle activite" button disabled for past dates
- Step transitions: detail → template → form, back navigation
- "View full day" link calls `onNavigateToDay`
- Empty state when no activities for selected date
- Formatted date heading rendering

**AuthCalendarPage integration tests** (Task 6.3, ~3 tests):
- Day click triggers DayDetailDialog opening
- ADMIN sees create button in day detail
- VIEWER sees day detail without create button

**PublicCalendarPage tests** (Task 6.4, ~2 tests):
- Day click opens day detail with public activities
- No creation affordance visible

**Current test counts** (verify these haven't changed before starting):
- CalendarView.test.tsx: 6 tests (rendering only, no callback tests)
- AuthCalendarPage.test.tsx: 10 tests (rendering, auth data flow, error states)
- PublicCalendarPage.test.tsx: 6 tests (rendering, department loading, error states)

**Total new tests**: ~17 (10 DayDetailDialog + 3 AuthCalendarPage + 2 PublicCalendarPage + 2 CalendarView callback)

### Previous Story Intelligence (Story 7.2)

**From Story 7.2 completion notes:**
- CalendarView is purely presentational — data fetching stays in page wrappers. This pattern must be maintained: DayDetailDialog receives activities via props (not fetching its own calendar data).
- `onViewChange` callback notifies page wrapper when view changes. The new `navigateTo` prop is the inverse — page tells CalendarView to change. These are complementary, not conflicting.
- `filterSlot` prop pattern established for injecting content between heading and calendar. DayDetailDialog is NOT rendered via `filterSlot` — it's a separate overlay rendered alongside CalendarView.
- `isPending` (not `isLoading`) for TanStack Query loading states — use consistently.
- Sonner Toaster renders `<section role="region">` — use specific aria-label when querying by role in tests.
- Hook `enabled: !!start && !!end` pattern — DayDetailDialog's department fetch should use similar `enabled: open && isAdmin` guard.

**From Story 7.2 code review fixes:**
- CalendarView's `filterSlot` prop was added during code review (M1 finding). The component accepts optional content injection. DayDetailDialog is rendered OUTSIDE CalendarView, not inside it.
- `useCallback` deps must include all referenced values — don't use stale closures. Apply to `handleDayAction` and `handleNavigateToDay` callbacks.
- French accents in i18n: ensure "département" not "departement", "activité" not "activite". Use proper Unicode encoding in JSON files.

**From Story 7.1 learnings:**
- `temporal-polyfill` pinned at `0.3.0` — do not upgrade. Used by `onClickDate` callback's `Temporal.PlainDate` parameter.
- Year view data flow: `onYearChange` → page wrapper updates `yearForFetch` → `useAuthYearActivities` refetches. The `navigateTo` prop does NOT affect year view — year navigation is handled separately. `navigateTo` only applies to `view !== "year"` (day/week/month views use `calendarControls`).

### Git Intelligence

- **Commit pattern**: `feat(calendar): Story 7.3 — Admin quick-create from calendar`
- **Recent commits**: Last commit `1e8d8ee` was Story 7.1. Story 7.2 changes are uncommitted (in working tree). Story 7.3 builds on top of 7.2's uncommitted changes.
- **File extraction pattern**: No prior story has extracted a component from a page file. This is a first. Verify git diff shows the extraction clearly (delete from page, add as new file). The diff should show AdminActivitiesPage shrinking by ~220 lines and a new ActivityForm.tsx of ~220 lines.
- **Test infrastructure**: 461+ tests. Recent stories added 10-17 tests each. This story targets ~15.

### Known Risks

| Risk | Severity | Mitigation |
|---|---|---|
| ActivityForm extraction regression | MEDIUM | Task 1.3: Run ALL AdminActivitiesPage tests immediately after extraction. Must pass before proceeding. Watch for: missing imports in new file, broken prop types, stale imports left in AdminActivitiesPage. |
| CalendarView `onDayAction` breaks existing click behavior | LOW | `onDayAction` is optional. When not provided, original behavior preserved. Existing tests don't pass `onDayAction`, so they verify original behavior. |
| Mobile Drawer scroll failure on tall form | MEDIUM | Pre-mortem identified this. Task 3.7 specifies `overflow-y-auto` on content area. Verify manually on mobile viewport (375px) that Save button is reachable with RoleRosterEditor expanded. |
| `navigateTo` useEffect fires on mount | LOW | Guard with `if (navigateTo)` check. Initial value is `null`, so effect is a no-op on mount. |
| Department type mismatch (PublicDepartment vs DepartmentListItem) | LOW | DayDetailDialog fetches its own via `departmentService.getAll()` for the form, avoiding type mismatch with parent's `useDepartments()`. |
| Auth loading flash — role-dependent UI before user resolves | LOW | AuthCalendarPage already guards with `deptPending` skeleton. By the time CalendarView renders and user can click a day, `useAuth` has resolved. DayDetailDialog checks `user` directly. |
| Filter mismatch — admin creates activity outside current department filter | LOW | Acceptable for MVP, no action needed. Calendar query invalidation + refetch will include the new activity in the cache; it becomes visible when filter is cleared or includes that department. A toast or auto-filter-clear is a future enhancement. |
| Test-utils EN stub missing `adminActivities.specialType` | LOW | Pre-existing gap. Extracted ActivityForm may show raw i18n keys in EN locale tests. Fix by adding specialType entries to EN stub in test-utils.tsx if encountered. |

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- **Task 1**: Extracted ActivityForm from AdminActivitiesPage into shared component. Zero behavior change. 31 tests pass.
- **Task 2**: Added onDayAction, navigateTo, onNavigateComplete props to CalendarView. Backward compatible. 5 tests pass.
- **Task 3**: Created DayDetailDialog with 3-step flow (detail/template/form). Responsive Drawer/Dialog. Client-side filtering, createMutation, role-based UI, past-date guard.
- **Task 4**: Integrated DayDetailDialog into AuthCalendarPage with day action and navigate-to-day callbacks.
- **Task 5**: Integrated DayDetailDialog into PublicCalendarPage with user=null (anonymous, no create).
- **Task 6**: 11 DayDetailDialog tests + 2 CalendarView prop tests + 3 AuthCalendarPage role tests + 2 PublicCalendarPage anonymous tests. Full suite: 490 tests pass, zero regressions.
- **Task 7**: i18n keys (FR+EN) for dayDetail section. test-utils updated. Accessibility: aria-labels, role attributes, aria-live.

### Code Review Fixes (2026-03-18)

- **C1 (CRITICAL)**: Added missing tests for Tasks 6.3, 6.4, 6.7 — 3 AuthCalendarPage tests, 2 PublicCalendarPage tests, 2 CalendarView tests.
- **C2 (CRITICAL)**: Department query error handling — destructured `isError`/`refetch`, added retry UI in form step when departments fail to load. Added `departmentError` i18n key (FR+EN).
- **M1 (MEDIUM)**: Generic error toast for non-400/422 errors in createMutation — added `else` branch with `auth.error.generic` toast.
- **M2 (MEDIUM)**: Added full creation flow test (detail → template → form) and department error test to DayDetailDialog.test.tsx.
- **M3 (MEDIUM)**: Added `beforeEach(() => vi.clearAllMocks())` to DayDetailDialog tests to prevent mock pollution.
- **L1 (LOW)**: Exported `AuthUser` from AuthContext, replaced local `DayDetailDialogUser` with `Pick<AuthUser, "role" | "departmentIds">` for type safety.

### Change Log

- 2026-03-18: Story 7.3 complete — Admin quick-create from calendar with DayDetailDialog, ActivityForm extraction, CalendarView day-action callback.
- 2026-03-18: Code review fixes — 8 issues resolved (2 critical, 3 medium, 1 low). 490 tests pass.

### File List

**New:**
- src/sdamanagement-web/src/components/activity/ActivityForm.tsx
- src/sdamanagement-web/src/components/calendar/DayDetailDialog.tsx
- src/sdamanagement-web/src/components/calendar/DayDetailDialog.test.tsx

**Modified:**
- src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx
- src/sdamanagement-web/src/components/calendar/CalendarView.tsx
- src/sdamanagement-web/src/components/calendar/CalendarView.test.tsx
- src/sdamanagement-web/src/pages/AuthCalendarPage.tsx
- src/sdamanagement-web/src/pages/AuthCalendarPage.test.tsx
- src/sdamanagement-web/src/pages/PublicCalendarPage.tsx
- src/sdamanagement-web/src/pages/PublicCalendarPage.test.tsx
- src/sdamanagement-web/src/contexts/AuthContext.tsx
- src/sdamanagement-web/public/locales/fr/common.json
- src/sdamanagement-web/public/locales/en/common.json
- src/sdamanagement-web/src/test-utils.tsx
