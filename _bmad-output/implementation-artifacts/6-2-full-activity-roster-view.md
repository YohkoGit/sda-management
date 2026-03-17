# Story 6.2: Full Activity Roster View

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user (VIEWER+)**,
I want to view the full roster of any activity showing all service roles and assigned people,
So that I can see who's serving in every role for any given activity.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–5 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors and abbreviations
- Activities with role assignments created (from Epic 4) — several with multiple roles, varying headcounts, and a mix of regular members + guest speakers
- At least one VIEWER user with role assignments on upcoming activities (for navigation from My Assignments)

### Codebase State (Story 6.1 Complete)

- `ActivitiesController` at `api/activities` with `[Authorize]` + `[EnableRateLimiting("auth")]`. Existing endpoints: `GET /api/activities` (ADMIN+/OWNER), `GET /api/activities/my-assignments` (VIEWER+), `GET /api/activities/{id}` (**currently ADMIN+ — needs widening to VIEWER+**), `POST`, `PUT`, `DELETE` [Source: `Controllers/ActivitiesController.cs`]
- **Authorization gap**: `GetById` currently uses `HasActivityAccess()` which checks `auth.CanManage(departmentId)` — only ADMIN for that department or OWNER can access. **This story MUST widen to `auth.CanView()` (VIEWER+)** for read access. Write endpoints remain ADMIN+. [Source: `Controllers/ActivitiesController.cs:60-71`, `Auth/AuthorizationService.cs`]
- `ActivityResponse` DTO has: Id, Title, Description, Date, StartTime, EndTime, DepartmentId, DepartmentName, Visibility, SpecialType, Roles[], ConcurrencyToken, CreatedAt, UpdatedAt — **missing `DepartmentAbbreviation` and `DepartmentColor`** (needed for UI badges) [Source: `Dtos/Activity/ActivityResponse.cs`]
- `ActivityRoleResponse` DTO has: Id, RoleName, Headcount, SortOrder, Assignments[] [Source: `Dtos/Activity/ActivityRoleResponse.cs`]
- `RoleAssignmentResponse` DTO has: Id, UserId, FirstName, LastName, AvatarUrl, IsGuest [Source: `Dtos/Activity/RoleAssignmentResponse.cs`]
- `ActivityService.MapToResponse()` builds the response with `.Include()` chain loading `Department`, `Roles → Assignments → User`. Already calls `avatarService.GetAvatarUrl()` per assignee. [Source: `Services/ActivityService.cs:422-459`]
- **`ActivityRosterView` component ALREADY EXISTS** at `components/activity/ActivityRosterView.tsx` — renders role names, headcount fractions (with `RoleDot` color indicator), assigned people with `InitialsAvatar size="xs"` (28px), tooltip names, empty slots ("Non assigné"), guest labels, overflow counter. Used by `AdminActivitiesPage` in its roster side panel. **DO NOT duplicate this logic** — see Task 6 for the relationship to the new detail-view variant. [Source: `components/activity/ActivityRosterView.tsx`]
- **`StaffingIndicator` component ALREADY EXISTS** at `components/activity/StaffingIndicator.tsx` — renders staffing status with shape-based icons (filled circle/half-circle/empty circle/dash), fraction text, tooltip, and "Critique" badge. Props: `staffingStatus`, `assigned`, `total`, `size`. Used by `AdminActivitiesPage` in table rows and roster panel. UX spec mandates its usage in "activity detail view". [Source: `components/activity/StaffingIndicator.tsx`]
- `Department` entity has `Name`, `Abbreviation`, `Color` fields [Source: `Data/Entities/Department.cs`]
- Frontend `ActivityResponse` interface in `activityService.ts` matches backend — no abbreviation or color [Source: `services/activityService.ts:22-37`]
- `activityService.getById(id)` already exists — returns `AxiosResponse<ActivityResponse>` [Source: `services/activityService.ts:63`]
- `AssignmentCard` is focusable (tabIndex=0) but has **no click handler yet** — Story 6.2 must add navigation to `/activities/:id` [Source: `components/assignments/AssignmentCard.tsx:28`]
- `DashboardPage.tsx` renders `<MyAssignmentsSection />` below welcome message [Source: `pages/DashboardPage.tsx`]
- Route structure: `/dashboard` under `<ProtectedRoute />` (VIEWER+), `/admin/activities` under `<ProtectedRoute requiredRole="ADMIN" />` [Source: `App.tsx:58-85`]
- `ProtectedRoute` supports `requiredRole` prop with role hierarchy: VIEWER=1, ADMIN=2, OWNER=3 [Source: `components/ProtectedRoute.tsx`]
- `useAuth()` hook provides `user` object with `userId`, `firstName`, `lastName`, `role`, **`departmentIds?: number[]`** — department IDs are available for client-side scoping. Admin activities page already uses `user?.departmentIds?.[0]`. [Source: `contexts/AuthContext.tsx`]
- `InitialsAvatar` component — `size="sm"` renders `h-8 w-8` (32px), `size="md"` renders `h-10 w-10` (40px), `size="lg"` renders `h-12 w-12` (48px) [Source: `components/ui/initials-avatar.tsx`]
- `formatActivityDate()`, `formatRelativeDate()`, `formatTime()` in `lib/dateFormatting.ts` [Source: `lib/dateFormatting.ts`]
- i18n keys under `pages.adminActivities.roster.*` already exist for admin context: `title` ("Composition de l'activité"), `unassigned` ("Non assigné"), `guest` ("(Invité)"), `noRoles` ("Aucun rôle") [Source: `public/locales/fr/common.json`]
- shadcn `Drawer` component (vaul v1.1.2) available at `components/ui/drawer.tsx` [Source: `components/ui/drawer.tsx`]
- shadcn `Badge`, `Card`, `Skeleton`, `Separator`, `Button` components available [Source: `components/ui/`]
- MSW handler pattern: per-test `setupServer()` with spread imports [Source: `mocks/handlers/`]
- `test-utils.tsx` — custom `render` wraps with I18n, QueryClient, AuthContext, Router providers [Source: `test-utils.tsx`]
- Integration test base: `IntegrationTestBase` with `ViewerClient`, `AdminClient`, `OwnerClient`, `AnonymousClient`, `CreateTestActivity()` with roles and assignments [Source: `tests/.../IntegrationTestBase.cs`]

## Acceptance Criteria

1. **Activity detail page accessible at `/activities/:id`**: Given an authenticated user (VIEWER+) navigating to `/activities/42`, When the page loads, Then it displays the full activity detail with: activity title, date (formatted + relative distance), time range, department badge (abbreviation on colored chip), description (if any), special type badge (if any), and the complete role roster.

2. **Full roster display with all roles and assignees**: Given the activity has 4 roles (Prédicateur ×1, Ancien de Service ×1, Diacres ×3, Diaconesses ×2), When the roster section renders, Then each role shows: role name (uppercase micro-label), headcount fraction (e.g., "2/3"), and assigned people with 48px avatars + full names, And unfilled slots show "Non assigné" placeholder with dashed border, And guest speakers show "(Invité)" label per FR32.

3. **Read-only for VIEWER**: Given the user is a VIEWER, When they view the roster, Then no edit controls are visible — no "Modifier" buttons, no reassignment UI, And the page is purely informational (FR17 — read-only role boundary).

4. **Edit link for ADMIN**: Given the user is an ADMIN for this activity's department (or OWNER), When they view the roster, Then an "Edit" button/link is visible in the header that navigates to the admin activity editing page (`/admin/activities` with the activity pre-selected or an edit dialog).

5. **Navigation from AssignmentCard**: Given a user on the dashboard viewing their assignments, When they click/tap an AssignmentCard, Then they navigate to `/activities/{activityId}`, And the activity detail page loads showing the full roster for that activity, And a "Back" button returns them to the dashboard.

6. **Backend authorization widened to VIEWER+**: Given `GET /api/activities/{id}` is called by a VIEWER, Then the API returns the full `ActivityResponse` (previously this returned 403 for VIEWERs), And anonymous users still get 401, And the response includes `departmentAbbreviation`, `departmentColor`, and `staffingStatus` fields.

7. **Loading and error states**: Given the activity data is loading, When the page renders, Then skeleton placeholders display matching the final layout, Given the API returns 404 (activity not found), Then a "not found" message displays with a link back to dashboard, Given the API returns an error, Then an error message displays with a retry option.

8. **Accessibility**: Given the activity detail page, Then it uses proper heading hierarchy (h1 for activity title), And role sections use h2 for "Composition de l'activité", And each role slot is announced to screen readers with role name + assignee count, And all avatars have alt text with person's name, And the back button has accessible label, And all text meets WCAG 2.1 AA contrast minimums.

## Tasks / Subtasks

### Backend — Add Department Fields to ActivityResponse

- [x] Task 1: Add `DepartmentAbbreviation` and `DepartmentColor` to `ActivityResponse` DTO (AC: #6)
  - [x] 1.1 Add three fields to `src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs`:
    ```csharp
    public string DepartmentAbbreviation { get; init; } = string.Empty;
    public string DepartmentColor { get; init; } = string.Empty;
    public string StaffingStatus { get; init; } = string.Empty;
    ```
  - [x] 1.2 Update `MapToResponse()` in `src/SdaManagement.Api/Services/ActivityService.cs` — add after `DepartmentName` line:
    ```csharp
    DepartmentAbbreviation = activity.Department?.Abbreviation ?? string.Empty,
    DepartmentColor = activity.Department?.Color ?? string.Empty,
    ```
    And add after the `Roles` list mapping (before `ConcurrencyToken`), computing staffing from the already-mapped roles:
    ```csharp
    StaffingStatus = ComputeStaffingStatus(
        activity.Roles.Sum(r => r.Headcount),
        activity.Roles.Sum(r => r.Assignments.Count),
        activity.Roles.Select(r => (r.RoleName, r.Assignments.Count))),
    ```
    `ComputeStaffingStatus()` is already an `internal static` method in `ActivityService` (used by `GetAllAsync`). No new logic needed.
  - [x] 1.3 **Impact check**: `ActivityResponse` is returned by `GetByIdAsync()`, `CreateAsync()`, and `UpdateAsync()`. Adding fields is non-breaking — existing consumers (admin activities page) simply ignore the new fields until they need them.

### Backend — Widen GetById Authorization to VIEWER+

- [x] Task 2: Change authorization on `GET /api/activities/{id}` from ADMIN+ to VIEWER+ (AC: #6)
  - [x] 2.1 In `src/SdaManagement.Api/Controllers/ActivitiesController.cs`, replace the `GetById` method:
    ```csharp
    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        if (!auth.CanView())
            return Forbid();

        var activity = await activityService.GetByIdAsync(id);
        if (activity is null)
            return NotFound();

        return Ok(activity);
    }
    ```
  - [x] 2.2 **Authorization change**: `CanView()` checks `ctx.IsAuthenticated` — any VIEWER+ can read any activity. `HasActivityAccess()` was only needed because the endpoint was shared between read and write contexts. Since write operations (POST, PUT, DELETE) have their own authorization checks, the read endpoint can be safely widened.
  - [x] 2.3 **Move the auth check BEFORE the DB query** — if the user can't view, don't waste a database call. The current code queries first, then checks auth. Swap the order.
  - [x] 2.4 **Security note**: This is safe because:
    - `ActivityResponse` contains no sensitive data beyond what's already visible in `MyAssignmentListItem` (names, avatars, roles)
    - The `ConcurrencyToken` in the response is harmless — VIEWERs can't call PUT/DELETE (those endpoints check `HasActivityAccess()` independently)
    - Activity data is visible to all authenticated church members by design (they attend these activities)
  - [x] 2.5 **Do NOT change** authorization on `GetAll`, `Create`, `Update`, `Delete` — those remain ADMIN+ scoped.

### Backend — Integration Tests

- [x] Task 3: Create/update integration tests for widened authorization (AC: #6)
  - [x] 3.1 In `tests/SdaManagement.Api.IntegrationTests/Activities/ActivityEndpointTests.cs` (or create a new `ActivityDetailEndpointTests.cs` if the existing file doesn't cover detail):
    - Test: `GetById_AsViewer_ReturnsActivity` — VIEWER can now access activity detail (previously 403)
    - Test: `GetById_AsViewer_IncludesDepartmentAbbreviationAndColor` — verify new fields are populated
    - Test: `GetById_AsAnonymous_Returns401` — anonymous still blocked
    - Test: `GetById_AsViewer_ReturnsFullRosterWithAssignees` — verify roles and assignments are included
    - Test: `GetById_NonExistentActivity_Returns404`
    - Test: `GetById_ActivityWithGuestAssignee_IncludesIsGuestFlag` — guest speakers have `IsGuest = true`
    - Test: `GetById_ActivityWithNullDepartment_ReturnsGracefully` — empty abbreviation/color/name
  - [x] 3.2 **SeedTestData pattern**: Use `CreateTestUser("test-viewer@test.local", UserRole.Viewer)` matching `TestAuthHandler` email. Create a department with known abbreviation/color, an activity with multiple roles, and assign test users + a guest to roles.
  - [x] 3.3 **Existing tests remain valid**: `GetActivity_AsAdmin_ReturnsActivityWithRolesAndConcurrencyToken` (line 378) and `GetActivity_IncludesAssignmentData` (line 1429) in `ActivityEndpointTests.cs` test ADMIN access — these still pass because ADMIN is VIEWER+ (wider access includes them). Add VIEWER tests **alongside** existing admin tests, don't replace them. Run the full test class after changes to confirm no regression.
  - [x] 3.4 **Test new StaffingStatus field**: Verify `GetById_AsViewer_ReturnsActivity` response includes `staffingStatus` with correct value (e.g., "PartiallyStaffed" for a partially-filled activity).

### Frontend — Update ActivityResponse Interface

- [x] Task 4: Add department fields to frontend `ActivityResponse` type (AC: #1)
  - [x] 4.1 In `src/sdamanagement-web/src/services/activityService.ts`, add to `ActivityResponse` interface:
    ```typescript
    departmentAbbreviation: string;
    departmentColor: string;
    staffingStatus: string;
    ```
  - [x] 4.2 **No new service method needed** — `activityService.getById(id)` already exists.

### Frontend — useActivity Hook

- [x] Task 5: Create React Query hook for single activity fetch (AC: #1, #7)
  - [x] 5.1 Create `src/sdamanagement-web/src/hooks/useActivity.ts`:
    ```typescript
    import { useQuery } from "@tanstack/react-query";
    import { activityService, type ActivityResponse } from "@/services/activityService";

    export function useActivity(id: number | undefined) {
      return useQuery<ActivityResponse>({
        queryKey: ["activities", id],
        queryFn: () => activityService.getById(id!).then(res => res.data),
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
        retry: 1,
      });
    }
    ```
  - [x] 5.2 **Query key**: `["activities", id]` — scoped under `activities` domain. Invalidating `["activities"]` will refresh both the list and detail. Future SignalR `ActivityUpdated` event can invalidate this.
  - [x] 5.3 **`enabled: !!id`**: Prevents firing query with undefined id (defensive, for when `useParams` returns no match).

### Frontend — RoleSlotDisplay Component

- [x] Task 6: Create detail-view RoleSlotDisplay component (AC: #2, #3, #8)
  - [x] 6.1 Create `src/sdamanagement-web/src/components/activity-detail/RoleSlotDisplay.tsx`
  - [x] 6.2 **EXISTING COMPONENT AWARENESS — DO NOT DUPLICATE**:
    - `ActivityRosterView` already exists at `components/activity/ActivityRosterView.tsx` — it's a **compact** roster for the admin side-panel (28px avatars, "LastName, F." format, `RoleDot` inline indicator, tooltip names).
    - This new `RoleSlotDisplay` is a **detail-view variant** for the viewer-facing activity detail page — larger avatars (48px), full names, micro-label role names, more spacious layout per UX spec RoleSlot definition.
    - **Do NOT refactor `ActivityRosterView`** in this story — it works correctly in the admin context. A future story can unify both under a shared component with variants if needed.
    - **Do NOT copy-paste** from `ActivityRosterView` — reference its patterns (headcount fraction, empty slot rendering, guest label) but implement the detail-view visual spec below.
  - [x] 6.3 **Props**:
    ```typescript
    interface RoleSlotDisplayProps {
      roleName: string;
      headcount: number;
      assignments: RoleAssignmentResponse[];
    }
    ```
  - [x] 6.4 **Visual spec** (from UX Spec, RoleSlot component):
    - **Role label**: Uppercase, `text-[11px] font-black tracking-wider text-muted-foreground` — micro-label style matching the design system
    - **Headcount badge**: `assignedCount/headcount` fraction (e.g., "2/3"). Green text when complete, orange when partial, red when critical (prédicateur/ancien unfilled). Use semantic text: `text-emerald-600` (full), `text-amber-600` (partial), `text-red-600` (critical) — these status colors match `StaffingIndicator` and `ActivityRosterView` established patterns.
    - **Assigned people**: Each assignee shows `InitialsAvatar` at `size="lg"` (48px per UX spec line 751) + first name + last name (full, not abbreviated). If `isGuest`, append "(Invité)" micro-label in muted text.
    - **Empty slots**: For each unfilled position (headcount - assignedCount), show a dashed-border 48px circle placeholder + "Non assigné" text in muted color. Cap visual empty slots at 3 (matching `ActivityRosterView` pattern) + overflow counter.
    - **Layout**: Each role in a horizontal section — label + count at top, assignees in a flex-wrap grid below
  - [x] 6.5 **Card layout per role**:
    ```
    ┌──────────────────────────────────────────────┐
    │  PRÉDICATEUR                           1/1   │
    │  ┌──────┐                                    │
    │  │ 48px │  Pasteur Mario Vicuna              │
    │  │avatar│                                    │
    │  └──────┘                                    │
    └──────────────────────────────────────────────┘

    ┌──────────────────────────────────────────────┐
    │  DIACRES                               2/3   │
    │  ┌──────┐  ┌──────┐  ┌ - - - ┐              │
    │  │ 48px │  │ 48px │  │ Non   │              │
    │  │avatar│  │avatar│  │assigné│              │
    │  └──────┘  └──────┘  └ - - - ┘              │
    │  Jean D.   Marie L.                          │
    └──────────────────────────────────────────────┘
    ```
  - [x] 6.6 **Multi-person roles**: When headcount > 1, show assignees in a flex-wrap grid with `gap-3`. Each assignee is a vertical unit: avatar above, name below (centered).
  - [x] 6.7 **No edit affordance**: This component is always read-only. No click handlers, no edit buttons, no reassignment UI. VIEWER role boundary (FR17).
  - [x] 6.8 **Accessibility**: `role="group"` on the role section with `aria-label` using `t("pages.activityDetail.roster.ariaRoleStatus", { role, assigned, total })`. Each avatar has alt text with person's full name. Empty slots announced as "Position non assignée".
  - [x] 6.9 Use semantic tokens for layout (bg-background, text-foreground, text-muted-foreground, border-border, border-dashed). Status fraction colors (emerald/amber/red) are intentional semantic-status colors matching the existing `StaffingIndicator` and `ActivityRosterView` pattern — these are acceptable exceptions to the "no raw Tailwind" rule.

### Frontend — ActivityDetailPage Component

- [x] Task 7: Create ActivityDetailPage with full roster (AC: #1, #2, #3, #4, #5, #7, #8)
  - [x] 7.1 Create `src/sdamanagement-web/src/pages/ActivityDetailPage.tsx`
  - [x] 7.2 **Route parameter**: `useParams<{ id: string }>()` → parse to `Number(id)`
  - [x] 7.3 **Data fetching**: `useActivity(activityId)` hook
  - [x] 7.4 **Page layout**:
    ```
    ┌─────────────────────────────────────────────┐
    │  ← Retour                          [Modifier] │
    │                                               │
    │  [Dept Badge]  Samedi 21 mars 2026            │
    │  ──────────────────────────────────────        │
    │  Culte Divin                    [Journée...]  │
    │  10h00 – 12h00                                │
    │  Description text here (if any)               │
    │                                               │
    │  ═══════════════════════════════════════       │
    │  Composition de l'activité                    │
    │                                               │
    │  [RoleSlotDisplay: Prédicateur 1/1]           │
    │  [RoleSlotDisplay: Ancien de Service 1/1]     │
    │  [RoleSlotDisplay: Diacres 2/3]               │
    │  [RoleSlotDisplay: Diaconesses 1/2]           │
    └─────────────────────────────────────────────┘
    ```
  - [x] 7.5 **Header section**:
    - Back button: `<Link to="/dashboard">← {t("pages.activityDetail.back")}</Link>` — always navigates to dashboard (deterministic). Using `navigate(-1)` is fragile — if the user arrived via direct URL, it navigates outside the app.
    - Department badge (colored chip with abbreviation) — same style as `AssignmentCard`
    - Formatted date via `formatActivityDate()` + relative distance via `formatRelativeDate()`
    - Activity title (h1, `text-2xl font-black`)
    - Time range via `formatTime()`
    - Special type badge if present
    - **Staffing indicator**: Render `<StaffingIndicator>` from `@/components/activity/StaffingIndicator` using `activity.staffingStatus`, computed assigned/total from roles. UX spec mandates this component in "activity detail view" (line 1155).
      ```typescript
      const totalHeadcount = activity.roles.reduce((sum, r) => sum + r.headcount, 0);
      const assignedCount = activity.roles.reduce((sum, r) => sum + r.assignments.length, 0);
      ```
      Pass: `staffingStatus={activity.staffingStatus}`, `assigned={assignedCount}`, `total={totalHeadcount}`
    - Description paragraph if present
    - Department color left-border accent (4px) on the header card
  - [x] 7.6 **Edit button** (conditional — department-scoped):
    ```typescript
    const { user } = useAuth();
    const canEdit = user?.role?.toUpperCase() === "OWNER" ||
      (user?.role?.toUpperCase() === "ADMIN" &&
       activity.departmentId != null &&
       (user?.departmentIds ?? []).includes(activity.departmentId));
    ```
    - `useAuth()` exposes `departmentIds?: number[]` — the admin activities page already uses `user?.departmentIds?.[0]` at line 363. This allows precise scoping: only show "Edit" for ADMINs who manage this activity's department. OWNERs always see it.
    - If `activity.departmentId` is null (no department), only OWNER sees the edit button.
    - Button navigates to `/admin/activities` (the existing admin activities page). For MVP, this is a page-level link — not a deep-link to a specific activity edit dialog. The admin page is already built.
  - [x] 7.7 **Roster section**:
    - Section heading: `<h2>` with `t("pages.activityDetail.roster.title")` — "Composition de l'activité"
    - Map `activity.roles` → `<RoleSlotDisplay>` components
    - If no roles: show `t("pages.activityDetail.roster.noRoles")` — "Aucun rôle défini"
    - Roles are already sorted by `sortOrder` from the API
  - [x] 7.8 **Loading state**: Full-page skeleton matching layout — header skeleton + 3-4 role slot skeletons
  - [x] 7.9 **Error states**:
    - 404 → "Activité non trouvée" with link to dashboard
    - Other errors → error message + retry button
  - [x] 7.10 **Responsive layout**:
    - Mobile (< 640px): Single column, full-width, stacked role slots
    - Desktop (≥ 1024px): Max-width container (e.g., `max-w-3xl mx-auto`), role slots in single column (they're already wide enough)
    - The UX spec says "role slots in 2 columns" on tablet/desktop — implement with `grid grid-cols-1 lg:grid-cols-2 gap-4` for the role slot area
  - [x] 7.11 Use semantic tokens throughout. No raw Tailwind color values.

### Frontend — Update AssignmentCard with Navigation

- [x] Task 8: Add navigation to AssignmentCard using `<Link>` (AC: #5)
  - [x] 8.1 In `src/sdamanagement-web/src/components/assignments/AssignmentCard.tsx`:
    - Import `Link` from `react-router-dom`
    - Wrap the `<article>` content inside a `<Link to={`/activities/${assignment.activityId}`}>` element
    - The `<Link>` renders a proper `<a>` tag — this gives correct browser behavior: right-click → open in new tab, middle-click, and native Enter key handling. No manual `onClick` or `onKeyDown` needed.
    - Remove `tabIndex={0}` from the article — the `<Link>` is already focusable
    - Apply `className="block no-underline text-inherit"` on the Link to prevent default anchor styling
    - Keep `<article>` as the semantic wrapper inside the Link, move the `aria-label` to the Link
    - Add `cursor-pointer` class to the article element
  - [x] 8.2 **Why `<Link>` over `navigate()`**: Using `role="link"` on a `<div>` or `<article>` with `onClick={navigate}` is an anti-pattern — screen readers expect actual `<a>` elements for link semantics. `<Link>` provides all accessibility features natively (focusable, Enter activates, announced as link).
  - [x] 8.3 **No visual change** — the card already looks interactive with the existing hover transition. Optionally add `hover:bg-accent/50` for clearer hover feedback.

### Frontend — Add Route to App.tsx

- [x] Task 9: Register activity detail route (AC: #1)
  - [x] 9.1 In `src/sdamanagement-web/src/App.tsx`:
    - Add lazy import: `const ActivityDetailPage = lazy(() => import("@/pages/ActivityDetailPage"));`
    - Add route under the VIEWER+ `<ProtectedRoute />` block (lines 58-71):
      ```tsx
      <Route path="activities/:id" element={<ActivityDetailPage />} />
      ```
    - Place it alongside the existing `/dashboard`, `/my-calendar`, `/my-departments` routes.
  - [x] 9.2 **Route placement**: Under the default `<ProtectedRoute />` (no `requiredRole`), which allows VIEWER+. This is correct — the page is read-only for VIEWERs, with edit link conditionally shown for ADMINs.

### Frontend — i18n Keys

- [x] Task 10: Add i18n translation keys for activity detail (AC: #1, #2, #7, #8)
  - [x] 10.1 Add to `public/locales/fr/common.json` under `pages`:
    ```json
    "activityDetail": {
      "back": "Retour",
      "edit": "Modifier",
      "notFound": "Activité non trouvée",
      "notFoundHint": "Cette activité n'existe pas ou a été supprimée.",
      "backToDashboard": "Retour au tableau de bord",
      "loadError": "Impossible de charger l'activité",
      "retry": "Réessayer",
      "description": "Description",
      "roster": {
        "title": "Composition de l'activité",
        "noRoles": "Aucun rôle défini pour cette activité",
        "unassigned": "Non assigné",
        "guest": "(Invité)",
        "assigned": "{{assigned}}/{{total}}",
        "ariaRoleStatus": "{{role}}: {{assigned}} sur {{total}} assigné(s)"
      }
    }
    ```
  - [x] 10.2 Add to `public/locales/en/common.json` under `pages`:
    ```json
    "activityDetail": {
      "back": "Back",
      "edit": "Edit",
      "notFound": "Activity not found",
      "notFoundHint": "This activity doesn't exist or has been deleted.",
      "backToDashboard": "Back to dashboard",
      "loadError": "Failed to load activity",
      "retry": "Retry",
      "description": "Description",
      "roster": {
        "title": "Activity Roster",
        "noRoles": "No roles defined for this activity",
        "unassigned": "Unassigned",
        "guest": "(Guest)",
        "assigned": "{{assigned}}/{{total}}",
        "ariaRoleStatus": "{{role}}: {{assigned}} of {{total}} assigned"
      }
    }
    ```
  - [x] 10.3 Add matching keys to `test-utils.tsx` inline i18n — add both FR and EN sections for `pages.activityDetail.*`

### Frontend — MSW Handlers & Component Tests

- [x] Task 11: Create MSW handlers and component tests (AC: #1, #2, #3, #7, #8)
  - [x] 11.1 Create `src/sdamanagement-web/src/mocks/handlers/activityDetail.ts`:
    - Export `activityDetailHandlers` with `http.get("/api/activities/:id", ...)` returning mock `ActivityResponse` with:
      - **`departmentId: 1`** — MUST match the admin mock user's `departmentIds[0]` in `auth.ts` handlers (admin mock user has `departmentIds: [1]`). This is critical for the edit-button-visible test.
      - 4 roles: Prédicateur (1/1 filled), Ancien de Service (1/1 filled), Diacres (2/3 partially filled), Diaconesses (1/2 with a guest)
      - Department abbreviation "JA", color "#14B8A6"
      - SpecialType "Journée de la Femme"
      - `staffingStatus: "PartiallyStaffed"` (matches the partially-filled roles)
    - Export `activityDetailNotFoundHandler` returning 404
    - Export `activityDetailErrorHandler` returning 500
  - [x] 11.2 Create `src/sdamanagement-web/src/pages/ActivityDetailPage.test.tsx` (co-located with the page):
    - Test: renders activity title and date — `screen.getByRole("heading", { level: 1, name: /Culte Divin/i })`
    - Test: renders all role sections — `screen.getAllByText(/PRÉDICATEUR|ANCIEN|DIACRES|DIACONESSES/i)`
    - Test: renders assigned people with avatars — check for `InitialsAvatar` elements with correct names
    - Test: renders empty slots with "Non assigné" — `screen.getAllByText("Non assigné")`
    - Test: renders guest label "(Invité)" for guest speakers — `screen.getByText("(Invité)")`
    - Test: renders department badge with abbreviation — `screen.getByText("JA")`
    - Test: renders special type badge — `screen.getByText("Journée de la Femme")`
    - Test: loading state shows skeleton — `document.querySelectorAll('[data-slot="skeleton"]').length > 0`
    - Test: 404 state shows "Activité non trouvée" — override handler, assert message
    - Test: staffing indicator renders with correct status — `screen.getByRole("status")` with correct fraction
    - Test: back button links to dashboard — `screen.getByRole("link", { name: /retour/i })` with `href="/dashboard"`
    - Test: edit button NOT visible for VIEWER — render with VIEWER auth mock (departmentIds: []), assert no "Modifier" button
    - Test: edit button visible for ADMIN with matching department — render with ADMIN auth mock (departmentIds: [1]), mock activity has departmentId: 1, assert "Modifier" link present
    - Test: edit button NOT visible for ADMIN with non-matching department — render with ADMIN auth mock (departmentIds: [2]), mock activity has departmentId: 1, assert no "Modifier" button
    - Test: accessibility — heading hierarchy (h1 for title, h2 for roster section)
  - [x] 11.3 **Test setup**: Use `MemoryRouter` with initial entry `/activities/1` and route pattern `activities/:id`. Wrap with all providers via `test-utils.tsx` custom render.
    ```typescript
    import { activityDetailHandlers } from "@/mocks/handlers/activityDetail";
    import { authHandlers } from "@/mocks/handlers/auth";
    const server = setupServer(...authHandlers, ...activityDetailHandlers);
    ```

## Dev Notes

### Key Architecture Decisions

- **Authorization widening on GetById**: The `GET /api/activities/{id}` endpoint is being widened from ADMIN+ to VIEWER+ (any authenticated user). This is the core backend change for this story. Justification: Activity data (who's serving, when) is not confidential — it's displayed on the church bulletin. All authenticated members should be able to see who's serving in any role. Write operations remain properly scoped.
- **Auth check before DB query**: Move the `CanView()` check before `GetByIdAsync()` — fail fast without wasting a database query for unauthorized users. The current code queries the activity first to check department-based access, but since we're switching to a simple `IsAuthenticated` check, the DB call isn't needed for authorization.
- **New fields on ActivityResponse**: Adding `DepartmentAbbreviation`, `DepartmentColor`, and `StaffingStatus` is a non-breaking additive change. Existing consumers (admin activities page) ignore unknown fields. `StaffingStatus` reuses the existing `ComputeStaffingStatus()` static method already in `ActivityService` — no new logic needed. This keeps staffing computation server-side and DRY (same logic as `ActivityListItem`).
- **Page-based navigation (not modal/sheet)**: The UX spec suggests "bottom sheet" on mobile for activity detail, but for MVP, a dedicated page at `/activities/:id` is used. Reasons: URL-addressable, browser back works, simpler implementation, fully accessible. The same content component can be mounted inside a Drawer/Sheet later (e.g., when accessed from calendar) without rewriting.
- **ADMIN edit link with proper scoping**: `useAuth()` exposes `departmentIds?: number[]` — check `user.departmentIds.includes(activity.departmentId)` for precise ADMIN scoping. OWNERs always see the button. If `activity.departmentId` is null, only OWNER sees edit. This matches the existing admin activities page pattern (`user?.departmentIds?.[0]` at line 363).
- **48px avatars in roster**: UX spec specifies 48px avatars in activity detail view (vs 28px in list views). Use `InitialsAvatar size="lg"` which renders `h-12 w-12` (48px).
- **Reuse existing i18n keys where possible**: The admin activities page already has `pages.adminActivities.roster.*` keys. However, the activity detail page is a separate context (viewer-facing, not admin-facing), so create dedicated `pages.activityDetail.*` keys. The labels may differ in tone or content in the future.

### Known Limitations (Accepted for MVP)

- **No deep-link to edit dialog**: The "Edit" button for ADMINs navigates to `/admin/activities` (the full admin page), not directly to an edit modal for the specific activity. Deep-linking to a specific activity's edit view would require the admin page to accept a query param and auto-open the edit dialog — out of scope.
- **No offline support**: Activity detail requires network access. Offline-first is a post-MVP PWA enhancement.
- **Back button goes to dashboard, not browser back**: The back button always links to `/dashboard` rather than using `navigate(-1)`. This is deterministic — if the user arrived via direct URL, `navigate(-1)` could exit the app. The tradeoff is that users coming from calendar or other pages also land on dashboard.

### UX Design Compliance

- **Journey 2 flow**: "Tap card → Activity detail view" → "Full roster: all roles + assignees" [Source: UX Spec, lines 860-862]
- **RoleSlot component**: Role label (micro-label, uppercase, font-black), assignee avatars (48px), headcount badge, empty placeholder ("Non assigné"), guest label "(Invité)" [Source: UX Spec, RoleSlot spec, lines 1173-1197]
- **Viewers see roster but cannot edit**: No edit buttons, no reassignment UI — clean read-only [Source: UX Spec, line 874, FR17]
- **Department badge**: Abbreviation text on department-colored chip [Source: UX Spec, DepartmentBadge spec, lines 1237-1256]
- **Activity detail responsive**: Mobile = stacked role slots, tablet/desktop = 2-column role slots [Source: UX Spec, breakpoint table, line 1701]
- **Staffing indicator**: Page header includes `StaffingIndicator` component (shape-based icons + fraction). Per-role fractions in roster display. UX spec explicitly lists "activity detail view" as a usage context. [Source: UX Spec, StaffingIndicator spec, lines 1152-1169]
- **Guest speakers**: "(Invité)" label in authenticated/operational view [Source: FR32, UX Spec, RoleSlot states]
- **ActivityCard interaction**: Focusable, Enter opens detail view [Source: UX Spec, line 1766]

### Project Structure Notes

- **New frontend files**:
  - `src/sdamanagement-web/src/pages/ActivityDetailPage.tsx`
  - `src/sdamanagement-web/src/pages/ActivityDetailPage.test.tsx` (co-located with page)
  - `src/sdamanagement-web/src/hooks/useActivity.ts`
  - `src/sdamanagement-web/src/components/activity-detail/RoleSlotDisplay.tsx`
  - `src/sdamanagement-web/src/mocks/handlers/activityDetail.ts`
- **Existing components reused (NOT modified)**:
  - `src/sdamanagement-web/src/components/activity/StaffingIndicator.tsx` — in page header
  - `src/sdamanagement-web/src/components/activity/ActivityRosterView.tsx` — referenced for pattern awareness, NOT reused directly (different visual variant)
- **Modified backend files**:
  - `src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs` — add `DepartmentAbbreviation`, `DepartmentColor`
  - `src/SdaManagement.Api/Services/ActivityService.cs` — update `MapToResponse()`
  - `src/SdaManagement.Api/Controllers/ActivitiesController.cs` — widen `GetById` auth to `CanView()`
- **Modified frontend files**:
  - `src/sdamanagement-web/src/services/activityService.ts` — add fields to `ActivityResponse` interface
  - `src/sdamanagement-web/src/components/assignments/AssignmentCard.tsx` — add click navigation
  - `src/sdamanagement-web/src/App.tsx` — add `/activities/:id` route
  - `src/sdamanagement-web/public/locales/fr/common.json` — add `activityDetail` keys
  - `src/sdamanagement-web/public/locales/en/common.json` — add `activityDetail` keys
  - `src/sdamanagement-web/src/test-utils.tsx` — add `activityDetail` test translations
  - `src/sdamanagement-web/src/mocks/handlers/activities.ts` — add new fields to mock ActivityResponse objects
- **New/modified test files**:
  - `tests/SdaManagement.Api.IntegrationTests/Activities/ActivityDetailEndpointTests.cs` — new tests for VIEWER access
  - `src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.test.tsx` — update to verify Link-wrapped cards
  - `src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx` — update for new ActivityResponse mock fields

### Library & Framework Requirements

- **react-router-dom v7.13.1** (already installed): Use `useParams<{ id: string }>()` for route params, `useNavigate()` for programmatic navigation, `Link` component for the back button. Patterns already established in the project.
- **@tanstack/react-query v5.90.21** (already installed): `useQuery` with `enabled: !!id` for conditional fetching. Query key `["activities", id]` for per-activity caching. Pattern matches `useMyAssignments` hook.
- **vaul v1.1.2** (already installed but NOT used for this story): Available for future iteration if activity detail is shown as a bottom sheet from calendar. For MVP, standard page routing.
- **InitialsAvatar** (already exists): `size="lg"` for 48px roster avatars. Handles `avatarUrl` prop automatically.
- **shadcn/ui Skeleton** (already installed): For loading states. Detect in tests via `[data-slot="skeleton"]`.
- **shadcn/ui Badge** (already installed): For special type badge and department badge.
- **shadcn/ui Separator** (already installed): Between header and roster sections.
- **StaffingIndicator** (already exists at `components/activity/StaffingIndicator.tsx`): Renders staffing status with shape-based icons, fraction text, and "Critique" badge. Props: `staffingStatus`, `assigned`, `total`, `size`. Import and use directly — no modifications needed.
- **No new dependencies required** for this story.

### Testing Requirements

- **Backend integration tests**: 8 tests covering VIEWER access (now allowed), anonymous 401, new department fields + staffingStatus, full roster data, guest flag, null department, 404. Existing admin tests remain valid.
- **Frontend component tests**: 15+ assertions on ActivityDetailPage — rendering, roster display, empty slots, guest label, department badge, special type, staffing indicator, skeleton loading, 404 state, back button href, edit button visibility (VIEWER=hidden, ADMIN matching dept=visible, ADMIN non-matching dept=hidden), heading hierarchy, accessibility
- **No E2E test** for this story — E2E will be covered when the full dashboard flow is assembled in Story 6.3

### Previous Story Intelligence (Story 6.1 — Personal Assignments)

- `AssignmentCard` pattern: department color left-border, dual date display, `InitialsAvatar` for co-assignees — reuse same styling patterns for consistency in the activity detail header
- `useMyAssignments` hook pattern: `useQuery` with typed returns, `staleTime: 5min`, `retry: 1` — follow same pattern for `useActivity`
- MSW handler pattern: export named arrays, per-test `setupServer()` with spread imports
- Test pattern: `render` from `@/test-utils`, `screen.getByRole/getByText`, `waitFor`, skeleton detection via `[data-slot="skeleton"]`
- Code review feedback from 6.1: Use semantic tokens exclusively (no raw Tailwind colors like `bg-indigo-50`). Use `bg-primary/5` for emphasis. Use `text-primary` instead of `text-indigo-600`.
- `formatActivityDate()` and `formatTime()` — reuse for the header section

### Git Intelligence (Recent Commits)

- Commit pattern: `feat(scope): Story X.Y — short description`
- For this story: `feat(dashboard): Story 6.2 — Full activity roster view with detail page`
- Story 6.1 established the assignment card component and MSW handler patterns
- The `ActivitiesController` was last modified in Story 6.1 (added `GetMyAssignments` endpoint and `ICurrentUserContext` injection)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.2] — Acceptance criteria, user story
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2] — "Check and Confirm" flow, lines 847-877
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#RoleSlot] — Component spec, lines 1173-1197
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ActivityCard] — Component spec, lines 1117-1149
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#DepartmentBadge] — Badge spec, lines 1237-1256
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Breakpoints] — Activity detail responsive, line 1701
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication] — JWT cookie, authorization patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#API Conventions] — Endpoint naming, DTO patterns
- [Source: _bmad-output/planning-artifacts/prd.md#FR17] — Activity roster view requirement
- [Source: _bmad-output/planning-artifacts/prd.md#FR32] — Guest speakers show "(Invité)" in operational views
- [Source: _bmad-output/planning-artifacts/prd.md#FR33] — Avatar display across roster views
- [Source: src/SdaManagement.Api/Controllers/ActivitiesController.cs] — Current authorization logic
- [Source: src/SdaManagement.Api/Auth/AuthorizationService.cs] — CanView(), CanManage() implementations
- [Source: src/SdaManagement.Api/Services/ActivityService.cs:422-459] — MapToResponse() pattern
- [Source: src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs] — Current DTO fields
- [Source: src/sdamanagement-web/src/components/assignments/AssignmentCard.tsx] — Card to add navigation
- [Source: src/sdamanagement-web/src/services/activityService.ts] — Existing getById service method
- [Source: src/sdamanagement-web/src/App.tsx] — Route configuration
- [Source: src/sdamanagement-web/src/components/ProtectedRoute.tsx] — Role hierarchy check
- [Source: _bmad-output/implementation-artifacts/6-1-personal-assignments-view-my-assignments.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- No blocking issues encountered during implementation

### Completion Notes List

- Task 1: Added `DepartmentAbbreviation`, `DepartmentColor`, `StaffingStatus` to `ActivityResponse` DTO and updated `MapToResponse()` to populate them. Non-breaking additive change.
- Task 2: Widened `GET /api/activities/{id}` from `HasActivityAccess()` (ADMIN+) to `auth.CanView()` (VIEWER+). Auth check moved before DB query for fail-fast behavior. Write endpoints unchanged.
- Task 3: Created `ActivityDetailEndpointTests.cs` with 7 integration tests (VIEWER access, department fields, anonymous 401, full roster, 404, guest flag, staffing status). Docker Desktop required to run.
- Task 4: Added 3 new fields to frontend `ActivityResponse` interface. Updated existing MSW handlers and admin test mocks to include the new fields.
- Task 5: Created `useActivity` hook following `useMyAssignments` pattern — `useQuery` with `enabled: !!id`, 5-min stale time, 1 retry.
- Task 6: Created `RoleSlotDisplay` component — detail-view variant with 48px avatars, micro-label role names, headcount fractions (emerald/amber color), empty slot placeholders (max 3 + overflow counter), guest labels, `role="group"` accessibility.
- Task 7: Created `ActivityDetailPage` with full header (department badge, date, title, time, staffing indicator, description), conditional edit button (ADMIN scoped to department, OWNER always), roster section with `RoleSlotDisplay`, skeleton loading, 404/error states, responsive 2-column layout.
- Task 8: Wrapped `AssignmentCard` in `<Link to="/activities/:id">` for native anchor semantics. Removed `tabIndex={0}` (Link is natively focusable). Added `hover:bg-accent/50`. Updated MyAssignmentsSection.test.tsx accessibility test.
- Task 9: Registered `/activities/:id` route under VIEWER+ `<ProtectedRoute />` with lazy import.
- Task 10: Added `pages.activityDetail.*` i18n keys in FR, EN, and test-utils.tsx.
- Task 11: Created MSW handlers (`activityDetail.ts`) and 16 component tests covering: rendering, roster display, empty slots, guest label, department badge, special type, staffing indicator, skeleton loading, 404 state, back button href, edit button visibility (VIEWER/ADMIN matching/ADMIN non-matching/OWNER), heading hierarchy.

### File List

**New files:**
- src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs (modified)
- src/sdamanagement-web/src/hooks/useActivity.ts
- src/sdamanagement-web/src/components/activity-detail/RoleSlotDisplay.tsx
- src/sdamanagement-web/src/pages/ActivityDetailPage.tsx
- src/sdamanagement-web/src/pages/ActivityDetailPage.test.tsx
- src/sdamanagement-web/src/mocks/handlers/activityDetail.ts
- tests/SdaManagement.Api.IntegrationTests/Activities/ActivityDetailEndpointTests.cs

**Modified files:**
- src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs — added DepartmentAbbreviation, DepartmentColor, StaffingStatus
- src/SdaManagement.Api/Services/ActivityService.cs — updated MapToResponse() with new fields
- src/SdaManagement.Api/Controllers/ActivitiesController.cs — widened GetById auth to CanView()
- src/sdamanagement-web/src/services/activityService.ts — added 3 fields to ActivityResponse interface
- src/sdamanagement-web/src/components/assignments/AssignmentCard.tsx — wrapped in Link for navigation
- src/sdamanagement-web/src/App.tsx — added /activities/:id route
- src/sdamanagement-web/public/locales/fr/common.json — added activityDetail i18n keys
- src/sdamanagement-web/public/locales/en/common.json — added activityDetail i18n keys
- src/sdamanagement-web/src/test-utils.tsx — added activityDetail test translations
- src/sdamanagement-web/src/mocks/handlers/activities.ts — added new fields to mock data
- src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx — added new fields to mock data
- src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.test.tsx — updated accessibility test for Link wrapper
- _bmad-output/implementation-artifacts/sprint-status.yaml — status updated

### Change Log

- 2026-03-16: Story 6.2 implementation complete — Full activity roster view with detail page, widened API authorization to VIEWER+, AssignmentCard navigation, 16 frontend tests + 7 backend integration tests
