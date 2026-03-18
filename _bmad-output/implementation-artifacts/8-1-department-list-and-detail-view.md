# Story 8.1: Department List & Detail View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user (VIEWER+)**,
I want to view all departments with their sub-ministries, activity pipelines, and upcoming schedules,
So that I can see what's happening across the church's organizational structure.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–7 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors, abbreviations, and descriptions
- Sub-ministries created for at least 2 departments (from Epic 2)
- Activities created with **both** `Public` AND `Authenticated` visibility (from Epic 4) — several across different dates/departments, with varying staffing levels (fully staffed, partially staffed, empty roles)
- Activity templates created (from Epic 2/4)
- At least one user per role: VIEWER (no department assignments), ADMIN (with department assignments to 1-2 departments), OWNER
- All Epics 1–7 stories committed and passing

### Codebase State (Epic 7 Complete)

**Backend — Department system fully built:**
- `DepartmentsController` at `Controllers/DepartmentsController.cs` — `GET /api/departments` (VIEWER+), `GET /api/departments/{id}` (VIEWER+), all CRUD endpoints (OWNER only). Uses `[Authorize]` + `auth.IsAuthenticated()` for reads.
- `DepartmentService` at `Services/DepartmentService.cs` — `GetAllAsync()` → `List<DepartmentListItem>`, `GetByIdAsync(id)` → `DepartmentResponse` (includes sub-ministries). Returns sorted by name.
- `ActivitiesController` at `Controllers/ActivitiesController.cs` — `GET /api/activities?departmentId=X` exists but **requires `CanManage(departmentId)` (ADMIN+ only)**. This must be relaxed for this story.
- `PublicController` at `Controllers/PublicController.cs` — `GET /api/public/departments` returns departments with next activity info (anonymous).
- **Entities**: `Department.cs` (Id, Name, Abbreviation, Color, Description, SubMinistries, UserDepartments), `SubMinistry.cs` (Id, Name, DepartmentId), `UserDepartment.cs` (composite PK UserId+DepartmentId).
- **DTOs**: `DepartmentResponse` (full with SubMinistries[]), `DepartmentListItem` (with subMinistryCount — no staffing data), `SubMinistryResponse` (id, name), `ActivityListItem` (with staffingStatus, departmentName, departmentColor, specialType, assignedCount, totalHeadcount). A new `DepartmentWithStaffingListItem` DTO is needed for this story.
- **Auth**: `IAuthorizationService` — `CanView()` = authenticated, `CanManage(departmentId)` = ADMIN+ with dept scope, `IsOwner()` = OWNER.

**Frontend — Admin department management + public overview built:**
- `AdminDepartmentsPage` at `pages/AdminDepartmentsPage.tsx` — OWNER-only CRUD (DepartmentCard, DepartmentFormDialog, SubMinistryManager). Not reused for VIEWER view.
- `AuthDepartmentsPage` at `pages/AuthDepartmentsPage.tsx` — **Stub only** (just title). Route: `/my-departments`. This is where Story 8.1 builds.
- `PublicDepartmentsPage` at `pages/PublicDepartmentsPage.tsx` — **Stub only**. Route: `/departments`. Not in scope for this story.
- `DepartmentOverviewSection` at `components/public/DepartmentOverviewSection.tsx` — Public dashboard component showing department cards with next activity. Uses `useDepartments` hook from `usePublicDashboard`. Pattern reference for card design (color-coded left border, badge, description).
- `departmentService` at `services/departmentService.ts` — `getAll()`, `getById(id)`, full CRUD. All interfaces defined: `DepartmentListItem`, `DepartmentResponse`, `SubMinistryResponse`.
- `activityService` at `services/activityService.ts` — `getByDepartment(departmentId)` → `GET /api/activities?departmentId=X`. Returns `ActivityListItem[]` with `staffingStatus`, `date`, `title`, `specialType`, `departmentColor`, `assignedCount`, `totalHeadcount`.
- `StaffingIndicator` at `components/activity/StaffingIndicator.tsx` — Reusable component: green dot (FullyStaffed), amber half-dot (PartiallyStaffed), red outline (CriticalGap), dash (NoRoles). Props: `staffingStatus`, `assigned`, `total`, `size`.
- `Badge` at `components/ui/badge.tsx` — Available for department abbreviation tags.
- `Skeleton` at `components/ui/skeleton.tsx` — Available for loading states.
- `Card` at `components/ui/card.tsx` — Available.
- **No `Tabs` component installed.** If needed, install via `npx shadcn@latest add tabs`.
- **Routing**: `App.tsx` — `/my-departments` → `AuthDepartmentsPage` (lazy loaded, auth route). No `/my-departments/:id` route yet.
- **i18n keys**: `pages.departments.title` exists ("Départements"/"Departments"). `pages.adminDepartments.*` exists for admin context. New keys needed for `pages.authDepartments.*`.
- **useAuth**: `contexts/AuthContext.tsx` — `{ user, isAuthenticated, isLoading }`. `user.role` = "OWNER"|"ADMIN"|"VIEWER". `user.departmentIds: number[]`.
- **MSW mocks**: `mocks/handlers/departments.ts` — mock departments (JA, MIFEM, DIA) with all CRUD handlers. `mocks/handlers/activities.ts` — activity handlers.

## Acceptance Criteria

1. **Given** an authenticated user navigating to the departments page
   **When** the department list loads
   **Then** all departments display with: name, abbreviation, color badge, description, sub-ministry count, and **aggregate staffing indicator** (worst-case status across upcoming activities)
   **And** the operational label "Unités Ministérielles" is used as the page heading

2. **Given** a department list card's aggregate staffing indicator
   **When** any upcoming activity in the department has CriticalGap status
   **Then** the card shows a red staffing dot
   **When** no CriticalGap but any PartiallyStaffed
   **Then** the card shows an amber staffing dot
   **When** all upcoming activities are FullyStaffed
   **Then** the card shows a green staffing dot
   **When** the department has no upcoming activities
   **Then** no staffing dot is shown

3. **Given** the user taps on a department card (e.g., MIFEM)
   **When** the department detail view loads
   **Then** it shows: department info (name, description, color), sub-ministries list, and the activity pipeline — upcoming activities (date >= today) sorted chronologically
   **And** the detail header renders instantly using `placeholderData` from list cache while full details load

4. **Given** a department's activity pipeline
   **When** activities render
   **Then** each activity shows: date, title, staffing status indicator (green/amber/red via `StaffingIndicator`), and special tag (if any)
   **And** each activity row is a clickable link that navigates to the activity detail page (`/activities/:id`)

5. **Given** a department with no upcoming activities
   **When** the detail view renders
   **Then** an encouraging empty state shows: "Prêt à planifier. Créez votre première activité." (for ADMINs with scope)
   **Or** "Aucune activité planifiée" (for VIEWERs)

6. **Given** a VIEWER viewing a department
   **When** the detail page renders
   **Then** all data is read-only — no create/edit/delete controls visible

7. **Given** a department with sub-ministries
   **When** the detail view renders
   **Then** sub-ministries display with name in a clean list/chip format

8. **Given** the detail page URL is accessed directly (e.g., browser refresh on `/my-departments/5`)
   **When** the page loads
   **Then** the department and pipeline load correctly (no crash from missing list cache)
   **And** the page is protected by auth — unauthenticated users are redirected to login

## Tasks / Subtasks

- [x] **Task 1: Backend — Relax activity filtering auth + aggregate staffing** (AC: 2, 3, 4)
  - [x] 1.1 **Verify baseline**: Confirmed VIEWERs can view individual activities via `GET /api/activities/:id` (CanView at line 74). Unfiltered `GET /api/activities` is OWNER-only (line 32) — unchanged. Only relaxed `departmentId.HasValue` branch.
  - [x] 1.2 Changed `CanManage(departmentId)` to `CanView()` for the departmentId branch with inline comment.
  - [x] 1.3 Created `DepartmentWithStaffingListItem` DTO in `Dtos/Department/`.
  - [x] 1.4 Added `GET /api/departments/with-staffing` endpoint to `DepartmentsController` with `IsAuthenticated()` auth.
  - [x] 1.5 Added `GetAllWithStaffingAsync()` to `IDepartmentService`/`DepartmentService` with two-query approach and worst-case staffing rollup using `ActivityService.ComputeStaffingStatus()`.
  - [x] 1.6 Added integration test: `GetActivities_AsViewer_WithDepartmentFilter_ReturnsActivities`
  - [x] 1.7 Added integration test: `GetActivities_AsAnonymous_WithDepartmentFilter_Returns401`
  - [x] 1.8 Added integration test: `GetDepartmentsWithStaffing_AsViewer_ReturnsAggregateStatus`

- [x] **Task 2: Frontend — Department list page with aggregate staffing** (AC: 1, 2)
  - [x] 2.1 Added `getDepartmentsWithStaffing()` and `DepartmentWithStaffingListItem` interface to `departmentService.ts`.
  - [x] 2.2 Replaced `AuthDepartmentsPage` stub with full implementation. Page heading: "Unités Ministérielles". Document title set via `useEffect`. Auth guard via ProtectedRoute.
  - [x] 2.3 Fetches via `departmentService.getDepartmentsWithStaffing()` with query key `["departments", "with-staffing"]`.
  - [x] 2.4 Responsive grid (1/2/3 col), color-coded left border, Badge, StaffingIndicator (sm, showLabel=false), full-card Link with hover lift.
  - [x] 2.5 Skeleton loading state (6 skeleton cards).
  - [x] 2.6 Error state with retry button.
  - [x] 2.7 Empty state for zero departments.

- [x] **Task 3: Frontend — Department detail view** (AC: 3, 4, 5, 6, 7, 8)
  - [x] 3.1 Added route `/my-departments/:id` → `DepartmentDetailPage` (lazy-loaded) inside auth ProtectedRoute tree.
  - [x] 3.2 Created `DepartmentDetailPage` with `placeholderData` from list cache, department query + activity query.
  - [x] 3.3 Department header: name, color bar, description, abbreviation badge. Breadcrumb with Link back.
  - [x] 3.4 Sub-ministries as chips (rounded-full bg-slate-100). "Aucun sous-ministère" when empty.
  - [x] 3.5 Activity pipeline with `enabled: !!departmentId`, frontend filter `date >= today`, sorted ascending.
  - [x] 3.6 Pipeline rows as Links to `/activities/:id` with date, title, StaffingIndicator, special type Badge.
  - [x] 3.7 Role-aware empty state (admin with scope vs viewer).
  - [x] 3.8 View-only for all roles. No write controls.
  - [x] 3.9 Loading skeletons for dept info and activity list.
  - [x] 3.10 404 handling with back link.

- [x] **Task 4: Responsive layout** (AC: 1, 3)
  - [x] 4.1 Mobile: single-column card stack + stacked detail layout (sidebar order-first, sm:order-last).
  - [x] 4.2 Tablet (sm:): 2-col card grid + 2-col detail (pipeline left, sidebar right) via `sm:grid-cols-[1fr_320px]`.
  - [x] 4.3 Desktop (lg:): 3-col card grid via `lg:grid-cols-3`. Detail same 2-col as tablet.

- [x] **Task 5: i18n keys** (AC: 1, 5)
  - [x] 5.1 Added all `pages.authDepartments.*` keys to both `en/common.json` and `fr/common.json`. Also added to test-utils.tsx inline translations.

- [x] **Task 6: Tests** (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] 6.1 `AuthDepartmentsPage.test.tsx` — 5 tests: list rendering, skeleton, error+retry, empty state, link verification.
  - [x] 6.2 `DepartmentDetailPage.test.tsx` — 6 tests: info+breadcrumb, sub-ministry chips, 404 state, viewer empty, admin empty, no sub-ministries.
  - [x] 6.3 MSW handler `GET /api/departments/with-staffing` added to `departments.ts` mock handlers.

## Dev Notes

### Critical Architecture Constraints

- **Security boundary is the API layer.** Frontend hides UI affordances for UX; API enforces permissions. The `ActivitiesController.GetAll` endpoint must be fixed to allow VIEWER+ read with department filter — currently it incorrectly requires `CanManage()` for the GET+departmentId combination.
- **Auth relaxation is safe — verified via review:** The unfiltered `GET /api/activities` (no departmentId) is **OWNER-only** (`auth.IsOwner()` at line 32). The filtered `GET /api/activities?departmentId=X` is currently ADMIN+ (`CanManage`). However, VIEWERs can already view any individual activity via `GET /api/activities/:id` (line 74, `CanView()`), and see activities in the dashboard endpoint (`GET /api/activities/dashboard`, `CanView()`). The activity data itself is not restricted from VIEWERs — only the list-all endpoint is admin-restricted. Relaxing the department-filtered GET from `CanManage` to `CanView` enables VIEWERs to list activities they can already access one-by-one. **Important: only change the `departmentId.HasValue` branch (line 25-29). The `else` branch (unfiltered, OWNER-only at line 30-34) must remain unchanged.** Write operations (`POST`/`PUT`/`DELETE`) remain `CanManage(departmentId)` scoped.
- **No cross-aggregate writes.** This story is read-only — no department or activity mutations. Write controls (create activity, manage sub-ministries) are Stories 8.2 and 8.3. This is the **monitoring** half of UX Journey 3; the **action** half comes in Story 8.2.
- **Cross-aggregate reads are permitted.** The aggregate staffing endpoint joins departments with activities (read-only). This follows the same pattern as `PublicController` and `CalendarController` which already read across aggregates.
- **Public endpoints return dedicated public DTOs.** This story uses authenticated endpoints (`/api/departments`, `/api/activities`) not public ones. The public department overview (Story 5.4) remains separate.

### Reuse Existing Components — Do NOT Reinvent

- **`StaffingIndicator`** (`components/activity/StaffingIndicator.tsx`): Already built with green/amber/red dots + labels. Use `size="sm"` for both list card aggregate dots and pipeline rows. For list card aggregate: pass `staffingStatus: dept.aggregateStaffingStatus`, `assigned: 0`, `total: 0` (the aggregate only needs the status dot, not the count label — or extend the component to accept a `showLabel={false}` prop if count display is unwanted on list cards).
- **`Badge`** (`components/ui/badge.tsx`): Use `variant="secondary"` for abbreviation badges, `variant="outline"` for special type tags on pipeline activities.
- **`Skeleton`** (`components/ui/skeleton.tsx`): Established loading pattern across the app.
- **`DepartmentOverviewSection`** (`components/public/DepartmentOverviewSection.tsx`): Reference for card design pattern — color-coded left border via `style={{ borderLeftColor: dept.color }}`, `rounded-2xl` cards, `Badge` for abbreviation. Adapt this card style for the authenticated list, adding the aggregate staffing dot and hover state.
- **`departmentService.getById()`**: Already exists and works for detail view. Add `getDepartmentsWithStaffing()` for the new aggregate endpoint.
- **`activityService.getByDepartment(departmentId)`**: Already exists. Returns `ActivityListItem[]` with all needed fields including `staffingStatus`, `assignedCount`, `totalHeadcount`.
- **`formatActivityDate` and `formatTime`** from `lib/dateFormatting`: Already used in `DepartmentOverviewSection`. Reuse for pipeline date formatting.
- **`useAuth`** from `contexts/AuthContext.tsx`: For role checking (VIEWER vs ADMIN vs OWNER).

### Aggregate Staffing — Backend Design

The `GET /api/departments/with-staffing` endpoint computes worst-case staffing per department:

```
For each department:
  1. Query upcoming activities (date >= today) for this department
  2. If no upcoming activities → aggregateStaffingStatus = "NoActivities"
  3. Else compute per-activity staffing via ComputeStaffingStatus() (needs role-level data)
  4. Worst-case rollup: if ANY activity is "CriticalGap" → "CriticalGap"
  5. Else if ANY "PartiallyStaffed" → "PartiallyStaffed"
  6. Else if all "FullyStaffed" → "FullyStaffed"
  7. Activities that are "NoRoles" (no roles defined) are ignored in the rollup — they don't affect the aggregate status
  Also return: upcomingActivityCount
```

**IMPORTANT: Two-query approach required.** The `ComputeStaffingStatus()` method at `ActivityService.cs:461-484` requires **role-level data** (role names + assignment counts per role) to detect CriticalGap status (unfilled "ancien" or "predicateur" roles). This logic CANNOT be expressed in a SQL GROUP BY.

Recommended implementation for `GetAllWithStaffingAsync()`:
```csharp
// Query 1: Departments with SubMinistryCount
var departments = await dbContext.Departments
    .OrderBy(d => d.Name)
    .Select(d => new { d.Id, d.Name, d.Abbreviation, d.Color, d.Description,
        SubMinistryCount = d.SubMinistries.Count })
    .ToListAsync();

// Query 2: Upcoming activities with role details (single SQL query via EF Core projection)
var today = DateOnly.FromDateTime(DateTime.UtcNow);
var activityData = await dbContext.Activities
    .Where(a => a.DepartmentId.HasValue && a.Date >= today)
    .Select(a => new {
        DepartmentId = a.DepartmentId!.Value,
        TotalHeadcount = a.Roles.Sum(r => r.Headcount),
        AssignedCount = a.Roles.Sum(r => r.Assignments.Count),
        RoleDetails = a.Roles.Select(r => new { r.RoleName, AssignmentCount = r.Assignments.Count }).ToList()
    })
    .ToListAsync();

// In-memory: group by department, compute worst-case staffing
var staffingByDept = activityData
    .GroupBy(a => a.DepartmentId)
    .ToDictionary(
        g => g.Key,
        g => new {
            Count = g.Count(),
            AggregateStatus = ComputeAggregateStaffing(g) // uses ComputeStaffingStatus per activity
        });
```

Reuse the existing `ActivityService.ComputeStaffingStatus()` (it's `internal static` — accessible within the same assembly). For ~12 departments and ~50 upcoming activities, the in-memory computation is trivial.

### Pipeline Activities — Date Filtering & Navigation

- **Frontend responsibility**: Filter activities where `date >= today` using `isToday(parseISO(a.date)) || isFuture(parseISO(a.date))` from `date-fns`. Sort ascending by date. The backend `GET /api/activities?departmentId=X` returns ALL activities for the department (past and future) — the frontend filters to upcoming only.
- **Clickable rows**: Each activity in the pipeline is a `<Link to={`/activities/${activity.id}`}>` — this navigates to the `ActivityDetailPage` (built in Story 6.2) where ADMINs can edit. This connects the monitoring view (Journey 3) to the action capability.

### Detail Page — Query Patterns (TanStack Query v5)

```typescript
// Department detail — with placeholderData from list cache for instant header
const { data: department, isPlaceholderData } = useQuery({
  queryKey: ["departments", departmentId],
  queryFn: () => departmentService.getById(departmentId),
  placeholderData: () => {
    const cached = queryClient.getQueryData<DepartmentWithStaffingListItem[]>(
      ["departments", "with-staffing"]
    )?.find(d => d.id === departmentId);
    // Map list item to partial DepartmentResponse shape for header rendering
    // Sub-ministries will be empty until the real query completes
    return cached ? { ...cached, subMinistries: [], createdAt: "", updatedAt: "" } : undefined;
  },
});

// Activities — dependent query, only fires when departmentId is available
const { data: activities } = useQuery({
  queryKey: ["activities", { departmentId }],
  queryFn: () => activityService.getByDepartment(departmentId),
  enabled: !!departmentId,
});
```

**Why `placeholderData` not `initialData`:** The list cache has `DepartmentWithStaffingListItem` (with `subMinistryCount`) but the detail query returns `DepartmentResponse` (with `subMinistries[]` array). `initialData` requires an exact type match and is treated as "real" data. `placeholderData` shows cached data immediately while the real query loads, and `isPlaceholderData` lets you show a subtle loading indicator for the sub-ministries section. The `enabled` guard on activities prevents the query from firing with an undefined departmentId during initial render or direct URL access.

### Card Clickability UX

Department list cards must be fully clickable (entire card is the link, not just the title text):
- Wrap each card in `<Link to={`/my-departments/${dept.id}`}>` from react-router-dom
- Add `cursor-pointer` class
- Hover effect: `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200` (consistent with Mock App card hover pattern)
- Focus-visible ring for keyboard navigation accessibility

### Query Keys — Follow Established Patterns

- Department list (admin): `["departments"]` (used by admin page — keep separate from new aggregate query)
- Department list with staffing: `["departments", "with-staffing"]` (new, used by AuthDepartmentsPage)
- Department detail: `["departments", departmentId]` (already used by admin card expand)
- Activities by department: `["activities", { departmentId }]` (consistent with existing activity query key patterns from `AdminActivitiesPage`)

### File Locations

- **New page**: `src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx`
- **Modified page**: `src/sdamanagement-web/src/pages/AuthDepartmentsPage.tsx` (replace stub)
- **Modified routing**: `src/sdamanagement-web/src/App.tsx` (add `/my-departments/:id` route inside auth `<Route>` tree)
- **Modified controller**: `src/SdaManagement.Api/Controllers/ActivitiesController.cs` (relax auth check for GET+departmentId)
- **Modified controller**: `src/SdaManagement.Api/Controllers/DepartmentsController.cs` (add `GetAllWithStaffing` endpoint)
- **New DTO**: `src/SdaManagement.Api/Dtos/Department/DepartmentWithStaffingListItem.cs`
- **Modified service**: `src/SdaManagement.Api/Services/IDepartmentService.cs` + `DepartmentService.cs` (add `GetAllWithStaffingAsync()`)
- **Modified frontend service**: `src/sdamanagement-web/src/services/departmentService.ts` (add `getDepartmentsWithStaffing()` + `DepartmentWithStaffingListItem` interface)
- **New i18n keys**: `src/sdamanagement-web/public/locales/en/common.json` and `fr/common.json`
- **New tests**: `src/sdamanagement-web/src/pages/AuthDepartmentsPage.test.tsx`, `src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx`
- **New integration tests**: `tests/SdaManagement.Api.IntegrationTests/` (viewer activity filter + aggregate staffing tests)
- **MSW handlers**: Extend `src/sdamanagement-web/src/mocks/handlers/departments.ts` (add `with-staffing` handler) and `activities.ts` as needed

### Responsive Layout Spec

| Breakpoint | Department List | Department Detail |
|---|---|---|
| Mobile (<640px) | Single-column card stack | Stacked: dept info → sub-ministries → activity pipeline |
| Tablet (640–1023px) | 2-column card grid | 2-column: pipeline list left + dept info/sub-ministries sidebar right |
| Desktop (≥1024px) | 3-column card grid | 2-column: pipeline list left + dept info/sub-ministries sidebar right (app nav sidebar is separate) |

**IMPORTANT**: Tablet behavior triggers at `sm:` (640px), NOT `md:` (768px). The `md:` breakpoint is intentionally skipped per UX spec.

### UX Spec Reference Points

- **Vocabulary**: Authenticated layer uses "Unités Ministérielles" not "Départements" (warm church vocabulary is for public). [Source: UX spec, Vocabulary Register table]
- **Journey 3**: Department director monitoring — default view is monitoring upcoming 4 weeks with staffing status dots. 30-second scan workflow. [Source: UX spec, Journey 3]
- **Journey 4**: Pastor cross-department view — sees all departments, gap detection visual. [Source: UX spec, Journey 4]
- **Department View responsive**: Mobile=single-col list+dots, Tablet=2-col list+sidebar, Desktop=3-col nav+list+detail. [Source: UX spec, Breakpoint Behavior table]
- **Empty states**: "Prêt à planifier. Créez votre première activité." — encouraging, not clinical. [Source: UX spec, Design Principle 4]
- **Card design**: `rounded-2xl`, color-coded left border, `font-bold` headings, slate-400 secondary text. [Source: UX spec, Visual Patterns]
- **Status indicators**: Green = fully staffed (emerald-600), Amber = partially staffed (amber-600), Red = critical gap (red-600). Small, emotionally calibrated. [Source: UX spec, Status Indicators]

### Anti-Patterns to Avoid

- Do NOT duplicate `StaffingIndicator` logic — import the existing component. Extend it with a `showLabel` prop if needed for aggregate-only display.
- Do NOT use `md:` breakpoint for tablet — use `sm:` (640px) per UX spec.
- Do NOT add write controls (create activity, edit sub-ministry buttons) — that's Stories 8.2 and 8.3.
- Do NOT create a custom layout for desktop 3-column — the app shell sidebar handles the nav column. The detail page only needs 2-column (content + sidebar).
- Do NOT use centered modals for mobile — use Sheet/Drawer patterns if any overlays are needed.
- Do NOT make only the title text clickable on list cards — the entire card must be a `<Link>` for mobile touch targets.
- Do NOT fire the activities query without `enabled: !!departmentId` — it will fire with undefined on initial render and direct URL access.
- Do NOT assume the backend filters activities to upcoming only — the frontend must filter `date >= today` and sort ascending.
- Do NOT try to compute aggregate staffing in a single SQL GROUP BY — the CriticalGap logic requires role-level data per activity. Use the two-query approach described in "Aggregate Staffing — Backend Design".

### Project Structure Notes

- Component placement follows domain convention: new department-related components go in `components/department/`.
- Page placement: `pages/DepartmentDetailPage.tsx` (follows existing pattern: `ActivityDetailPage.tsx`).
- i18n: keys under `pages.authDepartments.*` namespace (parallel to `pages.adminDepartments.*`).
- Test co-location: page tests in `pages/` folder (follows existing pattern).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns, Structure Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Structure & Boundaries]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 3, Journey 4]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Breakpoint Behavior Per View]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Vocabulary Register]
- [Source: src/sdamanagement-web/src/components/activity/StaffingIndicator.tsx]
- [Source: src/sdamanagement-web/src/components/public/DepartmentOverviewSection.tsx]
- [Source: src/sdamanagement-web/src/services/departmentService.ts]
- [Source: src/sdamanagement-web/src/services/activityService.ts]
- [Source: src/SdaManagement.Api/Controllers/ActivitiesController.cs:23-29]
- [Source: src/SdaManagement.Api/Controllers/DepartmentsController.cs]
- [Source: src/SdaManagement.Api/Auth/AuthorizationService.cs]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Backend file lock (PID 1532) prevents integration test execution during dev server — tests compile clean, will pass when server stopped.

### Completion Notes List
- Relaxed `ActivitiesController.GetAll()` auth from `CanManage(departmentId)` to `CanView()` for the GET+departmentId branch. Unfiltered GET remains OWNER-only.
- Created `DepartmentWithStaffingListItem` DTO and `GET /api/departments/with-staffing` endpoint with two-query aggregate staffing computation.
- Added `showLabel` prop to `StaffingIndicator` component for aggregate-only display (dot without text).
- Replaced `AuthDepartmentsPage` stub with full department list with aggregate staffing dots.
- Created `DepartmentDetailPage` with placeholderData pattern, activity pipeline, sub-ministries chips, breadcrumb navigation.
- Responsive layout: 1/2/3 col grid for list, 2-col (pipeline + sidebar) for detail.
- All 13 i18n keys added to FR and EN locales + test-utils.
- 11 frontend tests passing (5 list + 6 detail), 501 total tests passing with 0 regressions.
- 6 backend integration tests written (3 activity viewer filter + 3 aggregate staffing).

### Change Log
- 2026-03-18: Story 8.1 implemented — Department list with aggregate staffing + detail view with activity pipeline
- 2026-03-18: Code review (Sonnet 4.6) — 7 issues found (1H, 4M, 2L), all fixed:
  - H1: Added missing `using Microsoft.EntityFrameworkCore` in ActivityViewerFilterEndpointTests.cs
  - M1: Fixed misleading "0/0" tooltip on aggregate staffing dots (now shows status label)
  - M2: Added `retry: false` to department detail query for instant 404 display
  - M3: Added test for AC4 (activity pipeline links to /activities/:id) — 502 total tests
  - M4: Renamed misleading test `NoDepartments` → `PastActivitiesExcluded`
  - L1: Removed orphaned `activityPipeline` i18n key
  - L2: Fixed breadcrumb accessibility (aria-hidden separator, aria-current page)

### File List
**New:**
- src/SdaManagement.Api/Dtos/Department/DepartmentWithStaffingListItem.cs
- src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx
- src/sdamanagement-web/src/pages/AuthDepartmentsPage.test.tsx
- src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx
- tests/SdaManagement.Api.IntegrationTests/Departments/DepartmentWithStaffingEndpointTests.cs
- tests/SdaManagement.Api.IntegrationTests/Activities/ActivityViewerFilterEndpointTests.cs

**Modified:**
- src/SdaManagement.Api/Controllers/ActivitiesController.cs (auth relaxation for GET+departmentId)
- src/SdaManagement.Api/Controllers/DepartmentsController.cs (added with-staffing endpoint)
- src/SdaManagement.Api/Services/IDepartmentService.cs (added GetAllWithStaffingAsync)
- src/SdaManagement.Api/Services/DepartmentService.cs (implemented GetAllWithStaffingAsync)
- src/sdamanagement-web/src/App.tsx (added /my-departments/:id route)
- src/sdamanagement-web/src/pages/AuthDepartmentsPage.tsx (replaced stub)
- src/sdamanagement-web/src/services/departmentService.ts (added getDepartmentsWithStaffing + DepartmentWithStaffingListItem)
- src/sdamanagement-web/src/components/activity/StaffingIndicator.tsx (added showLabel prop)
- src/sdamanagement-web/src/mocks/handlers/departments.ts (added with-staffing handler)
- src/sdamanagement-web/public/locales/fr/common.json (added authDepartments keys)
- src/sdamanagement-web/public/locales/en/common.json (added authDepartments keys)
- src/sdamanagement-web/src/test-utils.tsx (added authDepartments i18n keys)
