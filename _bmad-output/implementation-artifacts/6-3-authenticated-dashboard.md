# Story 6.3: Authenticated Dashboard

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want a dashboard that shows my personal assignments, upcoming activities for my departments, and ministry overview,
So that I have a single operational view of everything relevant to me.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–5 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors and abbreviations
- Activities with role assignments created (from Epic 4) — several across different dates with users assigned to roles, varying staffing levels (fully staffed, partially staffed, critical gaps)
- At least one VIEWER user with role assignments on upcoming activities
- At least one ADMIN user assigned to 1-2 departments with activities in those departments
- OWNER user exists (from seed)
- Stories 6.1 (My Assignments) and 6.2 (Activity Roster View) complete — `MyAssignmentsSection` and activity detail page functional

### Codebase State (Stories 6.1 + 6.2 Complete)

- `ActivitiesController` at `api/activities` with `[Authorize]` + `[EnableRateLimiting("auth")]`. Existing endpoints: `GET /api/activities` (ADMIN+/OWNER), `GET /api/activities/my-assignments` (VIEWER+), `GET /api/activities/{id}` (VIEWER+), `POST`, `PUT`, `DELETE` [Source: `Controllers/ActivitiesController.cs`]
- `IActivityService` / `ActivityService` with methods: `GetAllAsync()`, `GetByIdAsync()`, `CreateAsync()`, `UpdateAsync()`, `DeleteAsync()`, `GetMyAssignmentsAsync()` [Source: `Services/IActivityService.cs`, `Services/ActivityService.cs`]
- `ICurrentUserContext` provides `UserId`, `Role`, `DepartmentIds`, `IsAuthenticated` [Source: `Auth/ICurrentUserContext.cs`]
- `IAuthorizationService` provides `CanView()`, `CanManage(departmentId)`, `IsOwner()`, `IsAuthenticated()` [Source: `Auth/IAuthorizationService.cs`]
- **Backend DTOs** in `Dtos/Activity/`:
  - `ActivityListItem` — id, title, date, startTime, endTime, departmentId, departmentName, departmentColor, visibility, specialType, roleCount, totalHeadcount, assignedCount, staffingStatus, createdAt. **Note: NO `departmentAbbreviation` or predicateur info** — this story adds a new DTO.
  - `ActivityResponse` — full activity with nested Roles[] → Assignments[]
  - `MyAssignmentListItem` — personal assignments with coAssignees
- **Frontend existing components**:
  - `MyAssignmentsSection` at `components/assignments/MyAssignmentsSection.tsx` — renders personal assignment cards with loading/error/empty states [Source: Story 6.1]
  - `AssignmentCard` at `components/assignments/AssignmentCard.tsx` — personal assignment card with dept color, dual date, co-assignees [Source: Story 6.1]
  - `StaffingIndicator` at `components/activity/StaffingIndicator.tsx` — renders colored status icon (filled circle green / half-circle amber / outlined circle red / dash for no roles) with fraction text and tooltip. Accepts `staffingStatus`, `assigned`, `total`, `size` props [Source: Epic 4]
  - `ActivityCard` at `components/public/ActivityCard.tsx` — public-facing card with predicateur, date, dept badge. Uses `PublicActivityListItem` type [Source: Epic 5]
  - `InitialsAvatar` at `components/ui/initials-avatar.tsx` — accepts `firstName`, `lastName`, `avatarUrl?`, `size` ("xs"=28px, "sm"=32px, "md"=40px). Handles photo and initials fallback with deterministic color [Source: Epic 3]
  - `SetupChecklist` at `components/setup/` — OWNER-only setup progress [Source: Epic 2]
- **Frontend hooks/services**:
  - `useMyAssignments()` at `hooks/useMyAssignments.ts` — React Query hook for personal assignments [Source: Story 6.1]
  - `activityService.ts` — typed service with `getByDepartment()`, `getMyAssignments()`, etc. [Source: `services/activityService.ts`]
  - `useAuth()` provides `user` with `userId`, `firstName`, `lastName`, `role`, `departmentIds` [Source: `contexts/AuthContext.tsx`]
  - `hasRole(userRole, requiredRole)` — role hierarchy check: VIEWER < ADMIN < OWNER [Source: `components/ProtectedRoute.tsx`]
- **Layout**: `AuthenticatedLayout` with sidebar + header + main content area. Main content area: `p-4 lg:p-6` padding [Source: `layouts/AuthenticatedLayout.tsx`]
- **Routes**: `/dashboard` under `<ProtectedRoute>` (VIEWER+), `/activities/:id` for detail view [Source: `App.tsx`]
- `DashboardPage.tsx` currently renders: SetupChecklist (OWNER) + h1 title + welcome message + MyAssignmentsSection [Source: `pages/DashboardPage.tsx`]
- `lib/dateFormatting.ts` — `formatActivityDate()`, `formatTime()`, `formatRelativeDate()`, `getDateLocale()` [Source: `lib/dateFormatting.ts`]
- i18n keys under `pages.dashboard.title` ("Tableau de Bord" / "Dashboard"), `pages.dashboard.welcome` ("Bienvenue, {{name}}" / "Welcome, {{name}}"), `pages.dashboard.myAssignments.*` [Source: locale files]
- MSW handler pattern: per-test `setupServer()` with spread imports [Source: `mocks/handlers/`]
- `test-utils.tsx` with inline i18n provider + test translations [Source: `test-utils.tsx`]
- Integration test base: `IntegrationTestBase` with `ViewerClient`, `AdminClient`, `OwnerClient`, `AnonymousClient`, `CreateTestActivity()` [Source: `tests/.../IntegrationTestBase.cs`]

## Acceptance Criteria

1. **Operational greeting with role context**: Given an authenticated user navigating to `/dashboard`, When the page loads, Then a greeting section displays: "Centre de Commande" (FR) / "Command Center" (EN) as a micro-label title, "Bonjour, {{name}}" (FR) / "Hello, {{name}}" (EN) as the primary greeting, the current date formatted with locale (e.g., "Dimanche 16 mars 2026"), And a role badge showing the user's role (Membre/Directeur/Propriétaire), And the My Assignments section uses the "Registre Personnel" (FR) / "Personal Register" (EN) operational vocabulary as a decorative micro-label above the section heading (per epics AC: "operational vocabulary register").

2. **My Assignments section (existing)**: Given an authenticated user, When the dashboard loads, Then the "Mes Affectations" section from Story 6.1 displays below the greeting, And it shows the user's personal upcoming assignments with all existing behavior preserved.

3. **Upcoming activities section — VIEWER**: Given a VIEWER signing in, When the authenticated dashboard loads, Then an "Activités à Venir" section displays below My Assignments, And it shows upcoming activities (next 4 weeks, max 20) across all departments, And both `Public` and `Authenticated` visibility activities are included, And each activity card shows: date (formatted + relative), title, department abbreviation badge with color, predicateur name + avatar (28px), time range, And cards link to `/activities/:id` on click, And cards are sorted by date ASC, startTime ASC.

4. **Upcoming activities section — ADMIN (scoped)**: Given an ADMIN assigned to departments MIFEM and Diaconat, When the dashboard loads, Then the upcoming activities section shows only activities for MIFEM and Diaconat, And activities from both departments appear in a unified chronological list, And department color badges distinguish which department each activity belongs to, And each card additionally shows a `StaffingIndicator` with status dot + fraction (e.g., "4/6"), And the section subtitle shows the department scope (e.g., "MIFEM · Diaconat").

5. **Upcoming activities section — OWNER (all departments)**: Given the OWNER signing in, When the dashboard loads, Then the upcoming activities section shows activities across ALL departments, And staffing indicators are visible on all cards, And the section subtitle shows "Vue d'ensemble" (FR) / "Overview" (EN).

6. **Upcoming activities section — Pastor (ADMIN all depts)**: Given an ADMIN assigned to ALL departments, When the dashboard loads, Then it shows activities across all departments (FR43 — cross-department visibility), And the view serves as the "big picture" operational overview (Journey 4), And the section subtitle shows "Vue d'ensemble" since their department scope equals all departments.

7. **Dashboard API endpoint**: Given `GET /api/activities/dashboard` is called by an authenticated user (VIEWER+), Then it returns upcoming activities (Date >= today, ordered by Date ASC, StartTime ASC, max 20), And for VIEWER/OWNER: all upcoming activities are returned (no department filter), And for ADMIN: only activities belonging to the user's assigned departments are returned, And each item includes: id, title, date, startTime, endTime, departmentId, departmentName, departmentAbbreviation, departmentColor, visibility, specialType, predicateurName, predicateurAvatarUrl, roleCount, totalHeadcount, assignedCount, staffingStatus, And the endpoint uses `[Authorize]` and `[EnableRateLimiting("auth")]`, And anonymous users receive 401.

8. **Empty state for upcoming activities**: Given there are no upcoming activities (or no activities for the admin's departments), When the section renders, Then a friendly empty state displays: "Aucune activité à venir" (FR) / "No upcoming activities" (EN), And ADMIN+ users see a hint: "Créez une activité depuis la page d'administration" / "Create an activity from the admin page".

9. **Loading and error states**: Given the dashboard data is loading, When the page renders, Then the greeting shows immediately (no API dependency), And My Assignments shows skeleton cards (existing), And Upcoming Activities shows 4 skeleton cards matching final card dimensions, Given the upcoming activities API call fails, Then an error message displays with a retry option.

10. **Mobile responsive layout (375px)**: Given the dashboard on mobile, When rendered, Then sections stack vertically: greeting → SetupChecklist (OWNER) → My Assignments → Upcoming Activities, And all content is readable and interactive without horizontal scrolling, And activity cards are full-width single column.

11. **Desktop layout (≥1024px)**: Given the dashboard on desktop, When rendered, Then the layout uses the full content area width within the sidebar layout, And upcoming activity cards display in a 2-column grid (`sm:grid-cols-2`), And the page is visually balanced with appropriate spacing.

12. **Accessibility**: Given the dashboard page, Then it uses proper heading hierarchy: h1 for "Centre de Commande" greeting area, h2 for each section ("Mes Affectations", "Activités à Venir"), And all cards are focusable and clickable (upcoming cards link to activity detail), And activity cards have `aria-label` with title + date, And StaffingIndicator has `role="status"` and descriptive `aria-label`, And role badges and department badges have accessible labels, And all text meets WCAG 2.1 AA contrast minimums (4.5:1).

## Tasks / Subtasks

### Backend — New DTO for Dashboard Activities

- [x] Task 1: Create `DashboardActivityItem` DTO (AC: #7)
  - [x] 1.1 Create `src/SdaManagement.Api/Dtos/Activity/DashboardActivityItem.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Activity;

    public class DashboardActivityItem
    {
        public int Id { get; init; }
        public string Title { get; init; } = string.Empty;
        public DateOnly Date { get; init; }
        public TimeOnly StartTime { get; init; }
        public TimeOnly EndTime { get; init; }
        public int? DepartmentId { get; init; }
        public string DepartmentName { get; init; } = string.Empty;
        public string DepartmentAbbreviation { get; init; } = string.Empty;
        public string DepartmentColor { get; init; } = string.Empty;
        public string Visibility { get; init; } = string.Empty;
        public string? SpecialType { get; init; }
        public string? PredicateurName { get; init; }
        public string? PredicateurAvatarUrl { get; init; }
        public int RoleCount { get; init; }
        public int TotalHeadcount { get; init; }
        public int AssignedCount { get; init; }
        public string StaffingStatus { get; init; } = string.Empty;
    }
    ```
  - [x] 1.2 **Design rationale**: This DTO combines predicateur info (from the public endpoint pattern) with staffing aggregates (from the admin `ActivityListItem` pattern) plus `DepartmentAbbreviation`. It's a purpose-built DTO for the dashboard rather than modifying the existing `ActivityListItem` — avoids changing the admin `GetAllAsync` query that has different performance characteristics.

### Backend — Service Method

- [x]Task 2: Add `GetDashboardActivitiesAsync()` to `IActivityService` and implement in `ActivityService` (AC: #7)
  - [x]2.1 Add to `IActivityService`:
    ```csharp
    Task<List<DashboardActivityItem>> GetDashboardActivitiesAsync(
        UserRole role, IReadOnlyList<int> departmentIds);
    ```
  - [x]2.2 Implement in `ActivityService` — EF Core query with Include chain and manual mapping:
    - **Step A — Build query**:
      ```csharp
      var today = DateOnly.FromDateTime(DateTime.UtcNow);
      var query = dbContext.Activities
          .Include(a => a.Department)
          .Include(a => a.Roles)
              .ThenInclude(r => r.Assignments)
                  .ThenInclude(ra => ra.User)
          .Where(a => a.Date >= today);

      // Role-based department filtering
      if (role == UserRole.Admin)
          query = query.Where(a => a.DepartmentId.HasValue
              && departmentIds.Contains(a.DepartmentId.Value));
      // VIEWER and OWNER see all activities (no filter)

      var activities = await query
          .OrderBy(a => a.Date)
              .ThenBy(a => a.StartTime)
          .Take(20)
          .ToListAsync();
      ```
    - **Step B — Map to DTOs** after materialization:
      - For each activity, extract predicateur from roles: find the first role whose `RoleName` contains "prédicateur" or "predicateur" (case-insensitive), take the first assignment, get their full name and avatar via `avatarService.GetAvatarUrl(user.Id)`
      - Compute staffing using existing `ComputeStaffingStatus()` — **exact calling pattern**:
        ```csharp
        var totalHeadcount = activity.Roles.Sum(r => r.Headcount);
        var assignedCount = activity.Roles.Sum(r => r.Assignments.Count);
        var roleDetails = activity.Roles.Select(r => (r.RoleName, r.Assignments.Count));
        var staffingStatus = ComputeStaffingStatus(totalHeadcount, assignedCount, roleDetails);
        ```
        The method signature is `internal static string ComputeStaffingStatus(int totalHeadcount, int assignedCount, IEnumerable<(string RoleName, int AssignmentCount)> roleDetails)`. It returns: `"NoRoles"` if totalHeadcount==0, `"CriticalGap"` if a role containing "ancien" or "predicateur" has 0 assignments, `"FullyStaffed"` if assignedCount >= totalHeadcount, else `"PartiallyStaffed"`.
      - Handle nullable `Department`: if null, use empty strings for name/abbreviation/color
    - **Why Include chain instead of Select?** Same reason as `GetMyAssignmentsAsync`: `avatarService.GetAvatarUrl()` cannot be translated to SQL. Two-step pattern: load entities → map to DTO.
  - [x]2.3 **Predicateur extraction logic**:
    ```csharp
    var predicateurRole = activity.Roles
        .FirstOrDefault(r => r.RoleName.Contains("prédicateur", StringComparison.OrdinalIgnoreCase)
            || r.RoleName.Contains("predicateur", StringComparison.OrdinalIgnoreCase));
    var predicateur = predicateurRole?.Assignments.FirstOrDefault()?.User;
    ```
    If no predicateur role found, `PredicateurName` and `PredicateurAvatarUrl` are null. This matches the public endpoint pattern from `PublicActivityService`.
  - [x]2.4 **UTC date caveat**: Same as Story 6.1 — `DateOnly.FromDateTime(DateTime.UtcNow)` may differ from Quebec local date (UTC-5). Accepted limitation for MVP.
  - [x]2.5 **Performance note**: `.Take(20)` limits the result set. For a church with ~52 Sabbaths/year + department meetings, 20 covers roughly 4 weeks. The Include chain loads roles+assignments per activity, which is fine for 20 activities. If this becomes slow, switch to a projection query with manual staffing computation.

### Backend — New Endpoint

- [x]Task 3: Add `GET /api/activities/dashboard` to `ActivitiesController` (AC: #7)
  - [x]3.1 Add endpoint method:
    ```csharp
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboardActivities()
    {
        if (!auth.CanView())
            return Forbid();

        var activities = await activityService.GetDashboardActivitiesAsync(
            currentUser.Role, currentUser.DepartmentIds);
        return Ok(activities);
    }
    ```
  - [x]3.2 `ICurrentUserContext` is already injected into `ActivitiesController` (added in Story 6.1). Use `currentUser.Role` and `currentUser.DepartmentIds` directly.
  - [x]3.3 Auth: `CanView()` = VIEWER+ (class-level `[Authorize]` handles 401 for anonymous; `CanView()` gate for VIEWER+ enforcement)
  - [x]3.4 Rate limiting: inherited from class-level `[EnableRateLimiting("auth")]`
  - [x]3.5 **Route placement**: `"dashboard"` route MUST be declared BEFORE the `"{id:int}"` route in the controller to avoid ASP.NET Core treating "dashboard" as an id parameter. Check existing route order — `"my-assignments"` is already correctly placed before `"{id:int}"`. Place `"dashboard"` near `"my-assignments"`.

### Backend — Integration Tests

- [x]Task 4: Create `tests/SdaManagement.Api.IntegrationTests/Activities/DashboardActivitiesEndpointTests.cs` (AC: #7, #4, #5)
  - [x]4.1 Test: `GetDashboard_AsViewer_ReturnsAllUpcomingActivities` — seed activities across 3 departments, viewer has no dept scoping → expect all returned
  - [x]4.2 Test: `GetDashboard_AsAdmin_ReturnsOnlyAssignedDepartmentActivities` — seed admin assigned to dept A and B, create activities in dept A, B, and C → expect only A and B activities
  - [x]4.3 Test: `GetDashboard_AsOwner_ReturnsAllActivities` — owner sees everything, same as viewer
  - [x]4.4 Test: `GetDashboard_AsAnonymous_Returns401`
  - [x]4.5 Test: `GetDashboard_ExcludesPastActivities` — seed 1 past + 1 future → expect only future
  - [x]4.6 Test: `GetDashboard_SortedChronologically` — seed 3 activities on different dates → verify date ASC order
  - [x]4.7 Test: `GetDashboard_LimitedTo20` — seed 25 activities → expect exactly 20 returned
  - [x]4.8 Test: `GetDashboard_IncludesPredicateurInfo` — seed activity with a "Prédicateur" role + assignment → expect predicateurName and predicateurAvatarUrl populated
  - [x]4.9 Test: `GetDashboard_NoPredicateurRole_ReturnsNullPredicateur` — seed activity with only "Diacre" role → expect null predicateur fields
  - [x]4.10 Test: `GetDashboard_IncludesStaffingStatus` — seed fully staffed activity → expect "FullyStaffed", seed partially staffed → expect "PartiallyStaffed"
  - [x]4.11 Test: `GetDashboard_IncludesBothVisibilities` — seed 1 public + 1 authenticated-only activity → expect both for all roles
  - [x]4.12 Test: `GetDashboard_NullDepartment_HandledGracefully` — seed activity with `DepartmentId = null` → expect empty strings for dept fields
  - [x]4.13 Test: `GetDashboard_IncludesDepartmentAbbreviation` — seed dept with abbreviation "JA" → verify abbreviation in response
  - [x]4.14 **SeedTestData pattern**: Follow Story 6.1 pattern — use `CreateTestUser()` with emails matching `TestAuthHandler` expectations. Create departments with abbreviations and colors, activities with roles and assignments at varying staffing levels.

### Frontend — TypeScript Types

- [x]Task 5: Create TypeScript interface for dashboard activities (AC: #3)
  - [x]5.1 Add to `src/sdamanagement-web/src/services/activityService.ts` (colocate with existing `ActivityListItem`):
    ```typescript
    export interface DashboardActivityItem {
      id: number;
      title: string;
      date: string;           // "yyyy-MM-dd"
      startTime: string;      // "HH:mm:ss"
      endTime: string;        // "HH:mm:ss"
      departmentId: number | null;
      departmentName: string;
      departmentAbbreviation: string;
      departmentColor: string;
      visibility: string;
      specialType: string | null;
      predicateurName: string | null;
      predicateurAvatarUrl: string | null;
      roleCount: number;
      totalHeadcount: number;
      assignedCount: number;
      staffingStatus: string;
    }
    ```

### Frontend — Service & Hook

- [x]Task 6: Add API service method and React Query hook (AC: #3, #9)
  - [x]6.1 Add to `src/sdamanagement-web/src/services/activityService.ts`:
    ```typescript
    getDashboardActivities: () =>
      api.get<DashboardActivityItem[]>("/api/activities/dashboard"),
    ```
  - [x]6.2 Create `src/sdamanagement-web/src/hooks/useDashboardActivities.ts`:
    ```typescript
    import { useQuery } from "@tanstack/react-query";
    import { activityService } from "@/services/activityService";
    import type { DashboardActivityItem } from "@/services/activityService";

    export function useDashboardActivities() {
      return useQuery<DashboardActivityItem[]>({
        queryKey: ["activities", "dashboard"],
        queryFn: () => activityService.getDashboardActivities().then(res => res.data),
        staleTime: 5 * 60 * 1000,
        retry: 1,
      });
    }
    ```
  - [x]6.3 **Query key**: `["activities", "dashboard"]` — scoped under `activities` domain. Combined with existing keys `["activities", "my-assignments"]` and `["activities", id]`, a future SignalR push of `queryClient.invalidateQueries({ queryKey: ['activities'] })` will refresh all three queries simultaneously. Do NOT use a non-cascading key like `["dashboard"]`.

### Frontend — DashboardGreeting Component

- [x]Task 7: Create `DashboardGreeting` component (AC: #1, #12)
  - [x]7.1 Create `src/sdamanagement-web/src/components/dashboard/DashboardGreeting.tsx`
  - [x]7.2 **Visual spec** — Operational greeting with military-tone micro-label:
    ```
    ┌──────────────────────────────────────────────────────┐
    │ CENTRE DE COMMANDE                     [Membre]      │
    │ Bonjour, Elisha                                      │
    │ Dimanche 16 mars 2026                                │
    └──────────────────────────────────────────────────────┘
    ```
    - **Micro-label**: "CENTRE DE COMMANDE" (FR) / "COMMAND CENTER" (EN) — `text-xs font-black uppercase tracking-widest text-primary`
    - **Greeting**: "Bonjour, {{name}}" — `text-2xl sm:text-3xl font-black text-foreground` (h1 element for heading hierarchy)
    - **Date**: Current date formatted with locale — `text-sm text-muted-foreground` using `format(new Date(), "EEEE d MMMM yyyy", { locale })` from date-fns with `getDateLocale()`
    - **Role badge**: User role label — use `<Badge variant="outline">` with i18n key:
      - VIEWER → "Membre" / "Member"
      - ADMIN → "Directeur" / "Director"
      - OWNER → "Propriétaire" / "Owner"
    - Badge position: top-right aligned with micro-label
  - [x]7.3 **Props**: None — component reads user from `useAuth()` and date from `new Date()`
  - [x]7.4 **Semantic tokens only**: `text-foreground`, `text-muted-foreground`, `text-primary`, `bg-background`. No raw Tailwind colors.
  - [x]7.5 **Accessibility**: `<h1>` wraps the greeting text. Micro-label is decorative context above h1 (not a heading). Role badge has `aria-label` with full role description.

### Frontend — DashboardActivityCard Component

- [x]Task 8: Create `DashboardActivityCard` component (AC: #3, #4, #5, #12)
  - [x]8.1 Create `src/sdamanagement-web/src/components/dashboard/DashboardActivityCard.tsx`
  - [x]8.2 **Props**:
    ```typescript
    interface DashboardActivityCardProps {
      activity: DashboardActivityItem;
      showStaffing?: boolean;  // true for ADMIN+, false for VIEWER
      isToday?: boolean;       // true if activity.date matches today — visual emphasis
    }
    ```
  - [x]8.3 **Visual spec** — Activity card with department accent + optional staffing:
    ```
    ┌─ 4px dept color left border ─────────────────────────┐
    │  [JA badge]  Samedi 21 mars · dans 3 semaines        │
    │  Culte Divin                        [Special badge]  │
    │  👤 Pasteur Vicuna                   10h00 – 12h00   │
    │  [● Complet 6/6]                                     │  ← only if showStaffing
    └──────────────────────────────────────────────────────┘
    ```
    - **Row 1**: Department abbreviation `<Badge>` with color bg + formatted date + relative time (secondary)
    - **Row 2**: Activity title (bold, truncated) + special type badge (if any)
    - **Row 3**: Predicateur `<InitialsAvatar size="xs">` + name + time range (right-aligned)
    - **Row 4** (conditional): `<StaffingIndicator size="sm">` — only when `showStaffing=true`
    - **Today emphasis**: When `isToday=true`, apply `bg-primary/5` background (same pattern as AssignmentCard's `isFirst` emphasis). This highlights today's activities on the dashboard per Journey 6 ("Authenticated dashboard — today's Sabbath highlighted").
  - [x]8.4 **Department badge styling**: Use inline style `backgroundColor` from `activity.departmentColor` with white text. If abbreviation is empty, hide badge.
    ```tsx
    {activity.departmentAbbreviation && (
      <span
        className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold text-white"
        style={{ backgroundColor: activity.departmentColor || undefined }}
        aria-label={activity.departmentName}
      >
        {activity.departmentAbbreviation}
      </span>
    )}
    ```
  - [x]8.5 **Card is a clickable Link**: Wrap entire card in `<Link to={`/activities/${activity.id}`}>` (from `react-router-dom`) for navigation to activity detail page. The `<article>` goes inside the Link. Match AssignmentCard's exact card class pattern: `rounded-2xl border border-l-4 border-border p-4 transition-colors cursor-pointer hover:bg-accent/50`. Background: `isToday ? "bg-primary/5" : "bg-background"` (mirrors AssignmentCard's `isFirst` pattern). Left border color via inline `style={{ borderLeftColor: activity.departmentColor || undefined }}`.
  - [x]8.6 **Date display**: Primary formatted date via `formatActivityDate()` + relative distance via `formatRelativeDate()` — same dual-date pattern as `AssignmentCard` from Story 6.1.
  - [x]8.7 **Predicateur display**: If `predicateurName` is not null, show `<InitialsAvatar size="xs" firstName={first} lastName={last} avatarUrl={activity.predicateurAvatarUrl} />` + name text. **Name parsing** — `InitialsAvatar` requires separate `firstName` and `lastName` props:
    ```typescript
    function parsePredicateurName(fullName: string): { firstName: string; lastName: string } {
      const spaceIndex = fullName.indexOf(" ");
      if (spaceIndex === -1) return { firstName: fullName, lastName: "" };
      return { firstName: fullName.slice(0, spaceIndex), lastName: fullName.slice(spaceIndex + 1) };
    }
    ```
    Edge cases: single-word name → lastName="" (InitialsAvatar shows single initial). Multi-space names (e.g., "Jean de la Fontaine") → firstName="Jean", lastName="de la Fontaine". Empty string → omit row entirely (guard with `predicateurName?.trim()`). If no predicateur, omit the row.
  - [x]8.8 **StaffingIndicator**: Import from `@/components/activity/StaffingIndicator`. Pass `staffingStatus={activity.staffingStatus}`, `assigned={activity.assignedCount}`, `total={activity.totalHeadcount}`, `size="sm"`.
  - [x]8.9 **Semantic tokens**: `bg-background`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`. No raw Tailwind colors.
  - [x]8.10 **Accessibility**: Article has `aria-label` with activity title + date. Link is focusable. StaffingIndicator already has `role="status"` and aria-label.

### Frontend — DashboardUpcomingSection Component

- [x]Task 9: Create `DashboardUpcomingSection` wrapper component (AC: #3, #4, #5, #8, #9)
  - [x]9.1 Create `src/sdamanagement-web/src/components/dashboard/DashboardUpcomingSection.tsx`
  - [x]9.2 Uses `useDashboardActivities()` hook to fetch data
  - [x]9.3 Uses `useAuth()` to determine role and department context
  - [x]9.4 **Section heading**: `<h2 className="text-xl font-bold text-foreground">` with `t("pages.dashboard.upcoming.title")` — "Activités à Venir" (FR) / "Upcoming Activities" (EN)
  - [x]9.5 **Section subtitle** (role-dependent):
    - VIEWER: no subtitle
    - ADMIN: Show department abbreviations as inline colored badges. Extract unique department abbreviations + colors from the API response data (not from auth context — `user.departmentIds` only has IDs, not names):
      ```typescript
      const deptBadges = useMemo(() => {
        if (!data) return [];
        const seen = new Map<string, string>(); // abbreviation → color
        data.forEach(a => {
          if (a.departmentAbbreviation && !seen.has(a.departmentAbbreviation))
            seen.set(a.departmentAbbreviation, a.departmentColor);
        });
        return Array.from(seen.entries());
      }, [data]);
      ```
      If the number of unique departments in the response is >= 5 (heuristic for "all departments"), show "Vue d'ensemble" instead of individual badges — this handles the pastor case (Journey 4).
    - OWNER: "Vue d'ensemble" / "Overview"
  - [x]9.6 **Show staffing**: `const showStaffing = hasRole(user?.role ?? "", "ADMIN")` — ADMIN+ sees staffing indicators on cards
  - [x]9.7 **Loading state**: Render 4 skeleton cards in a 2-column grid (`sm:grid-cols-2`) matching card dimensions. Use shadcn `<Skeleton>` component. On mobile (single column), only 2 skeletons are visible above the fold — render 4 total but the layout naturally shows 2 at a time. Each skeleton card should match the height of a real `DashboardActivityCard` (~120px) with `rounded-2xl` corners.
  - [x]9.8 **Error state**: Display error message with retry button using `refetch()`. Use `role="alert"` for screen reader announcement.
  - [x]9.9 **Empty state**: Centered text with `t("pages.dashboard.upcoming.empty")` — "Aucune activité à venir" / "No upcoming activities". ADMIN+ hint: `t("pages.dashboard.upcoming.emptyHintAdmin")` — "Créez une activité depuis la page d'administration" / "Create an activity from the admin page".
  - [x]9.10 **Data state**: Map activities to `<DashboardActivityCard>` in a `grid gap-4 sm:grid-cols-2` grid, passing `showStaffing` and `isToday` props. Compute `isToday` by comparing `activity.date` (string "yyyy-MM-dd") to today's date formatted the same way.
  - [x]9.11 **"View All" link** (ADMIN+ only): Below the activity cards grid, render a subtle link: `<Link to="/admin/activities" className="text-sm text-primary hover:underline">` with `t("pages.dashboard.upcoming.viewAll")` — "Voir tout" (FR) / "View all" (EN). Only show for ADMIN+ users (`hasRole(user?.role ?? "", "ADMIN")`). VIEWERs don't have access to `/admin/activities` so no link for them.

### Frontend — Add "Registre Personnel" Micro-Label to MyAssignmentsSection

- [x]Task 10: Add operational vocabulary micro-label to `MyAssignmentsSection` (AC: #1)
  - [x]10.1 In `src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.tsx`, add a micro-label above the existing `<h2>` section heading:
    ```tsx
    <p className="text-xs font-black uppercase tracking-widest text-primary">
      {t("pages.dashboard.personalRegister")}
    </p>
    ```
    This adds "REGISTRE PERSONNEL" / "PERSONAL REGISTER" as a decorative operational micro-label above "Mes Affectations" — matching the "Centre de Commande" micro-label pattern in the greeting. Same styling: `text-xs font-black uppercase tracking-widest text-primary`.
  - [x]10.2 **Do NOT change the existing `<h2>` heading** — it remains "Mes Affectations" for accessibility (h2 is the semantic heading, micro-label is decorative context).

### Frontend — Update DashboardPage Layout

- [x]Task 11: Refactor `DashboardPage` to compose all sections (AC: #1, #2, #10, #11)
  - [x]11.1 Update `src/sdamanagement-web/src/pages/DashboardPage.tsx`:
    ```tsx
    import { useAuth } from "@/contexts/AuthContext";
    import { SetupChecklist } from "@/components/setup";
    import { DashboardGreeting } from "@/components/dashboard/DashboardGreeting";
    import { MyAssignmentsSection } from "@/components/assignments/MyAssignmentsSection";
    import { DashboardUpcomingSection } from "@/components/dashboard/DashboardUpcomingSection";

    export default function DashboardPage() {
      const { user } = useAuth();
      const isOwner = user?.role?.toUpperCase() === "OWNER";

      return (
        <div className="space-y-8">
          <DashboardGreeting />
          {isOwner && <SetupChecklist />}
          <MyAssignmentsSection />
          <DashboardUpcomingSection />
        </div>
      );
    }
    ```
  - [x]11.2 **Remove old h1/p elements** — the greeting is now handled by `<DashboardGreeting />`. The old `t("pages.dashboard.title")` and `t("pages.dashboard.welcome")` are replaced.
  - [x]11.3 **Layout**: `space-y-8` for vertical spacing between sections. Each section manages its own internal spacing.
  - [x]11.4 **Mobile**: Sections stack naturally. No special mobile handling needed — the flex-column default is correct.

### Frontend — i18n Keys

- [x]Task 12: Add i18n translation keys (AC: #1, #3, #8)
  - [x]12.1 Add to `public/locales/fr/common.json` under `pages.dashboard`:
    ```json
    "commandCenter": "CENTRE DE COMMANDE",
    "greeting": "Bonjour, {{name}}",
    "personalRegister": "REGISTRE PERSONNEL",
    "role": {
      "viewer": "Membre",
      "admin": "Directeur",
      "owner": "Propriétaire"
    },
    "upcoming": {
      "title": "Activités à Venir",
      "overview": "Vue d'ensemble",
      "empty": "Aucune activité à venir",
      "emptyHintAdmin": "Créez une activité depuis la page d'administration.",
      "loadError": "Impossible de charger les activités",
      "retry": "Réessayer",
      "viewAll": "Voir tout"
    }
    ```
  - [x]12.2 Add to `public/locales/en/common.json` under `pages.dashboard`:
    ```json
    "commandCenter": "COMMAND CENTER",
    "greeting": "Hello, {{name}}",
    "personalRegister": "PERSONAL REGISTER",
    "role": {
      "viewer": "Member",
      "admin": "Director",
      "owner": "Owner"
    },
    "upcoming": {
      "title": "Upcoming Activities",
      "overview": "Overview",
      "empty": "No upcoming activities",
      "emptyHintAdmin": "Create an activity from the admin page.",
      "loadError": "Failed to load activities",
      "retry": "Retry",
      "viewAll": "View all"
    }
    ```
  - [x]12.3 Keep existing `pages.dashboard.title`, `pages.dashboard.welcome`, and `pages.dashboard.myAssignments.*` keys — they are still used by `MyAssignmentsSection`. The old `title`/`welcome` keys remain for backwards compat (sidebar nav label references `nav.auth.dashboard`).
  - [x]12.4 Add matching keys to `test-utils.tsx` inline i18n for test stability.

### Frontend — MSW Handlers & Component Tests

- [x]Task 13: Create MSW handler and component tests (AC: #1, #3, #4, #8, #9, #12)
  - [x]13.1 Create `src/sdamanagement-web/src/mocks/handlers/dashboard.ts`:
    - Export `dashboardHandlers` array with handler for `GET /api/activities/dashboard` returning mock `DashboardActivityItem[]`
    - Include mock data with: varied dates, multiple departments with colors/abbreviations, predicateur info, mixed staffing statuses (FullyStaffed, PartiallyStaffed, CriticalGap), special type on one activity
    - Pattern: `export const dashboardHandlers = [http.get("/api/activities/dashboard", () => HttpResponse.json([...]))]`
  - [x]13.2 Create `src/sdamanagement-web/src/components/dashboard/DashboardGreeting.test.tsx`:
    - Test: renders greeting with user's first name
    - Test: renders "Centre de Commande" micro-label
    - Test: renders formatted current date
    - Test: renders role badge (test with VIEWER, ADMIN, OWNER)
    - Test: h1 heading exists for accessibility
  - [x]13.3 Create `src/sdamanagement-web/src/components/dashboard/DashboardUpcomingSection.test.tsx`:
    - Import `{ render, screen, waitFor }` from `@/test-utils`
    - Test: renders activity cards when data is available
    - Test: renders empty state when no activities — override MSW handler to return `[]`
    - Test: renders loading skeleton state — assert `document.querySelectorAll('[data-slot="skeleton"]').length > 0`
    - Test: activity cards show department abbreviation badges
    - Test: activity cards show predicateur name when available
    - Test: staffing indicators visible for ADMIN user — render with admin auth context
    - Test: staffing indicators NOT visible for VIEWER user
    - Test: section heading uses correct i18n key
    - Test: cards are links to activity detail — verify `<a>` tag with correct href
    - Test: error state with retry button
    - Test: today's activity card has emphasis styling (`bg-primary/5`)
    - Test: "View All" link visible for ADMIN, hidden for VIEWER
  - [x]13.4 **Per-test server setup**: Use `setupServer(...authHandlers, ...dashboardHandlers, ...assignmentHandlers)`. For role-specific tests, override auth handler to return different role.

## Dev Notes

### Key Architecture Decisions

- **New endpoint over reusing `GET /api/activities`**: The existing endpoint requires `CanManage` (ADMIN+ for specific departments) and returns `ActivityListItem` without predicateur info. The dashboard needs: (a) VIEWER access, (b) predicateur name+avatar, (c) department abbreviation. Creating a dedicated `GET /api/activities/dashboard` with `DashboardActivityItem` is cleaner than modifying the admin endpoint's authorization model and DTO shape.
- **Role-based filtering in service, not controller**: The controller passes `role` and `departmentIds` to the service. The service handles the WHERE clause. This keeps authorization logic (CanView gate) in the controller and data scoping in the service.
- **20-item limit**: A church typically has 1-2 activities per week × 4 weeks = 4-8 activities for a viewer. For an admin managing 2 departments: maybe 2-4 per week. 20 is generous but prevents runaway queries. No pagination needed for MVP.
- **Predicateur extraction**: Pattern already established in `PublicActivityService` — search roles for "prédicateur" (case-insensitive), take first assignment. This is a display optimization, not a data contract.
- **StaffingIndicator reuse**: The component already exists from Epic 4 admin views. Reuse with `size="sm"` on dashboard cards. No modifications needed.
- **DashboardActivityCard vs public ActivityCard**: Separate component justified because: (a) different data type (`DashboardActivityItem` vs `PublicActivityListItem`), (b) conditional staffing rendering, (c) clickable link to detail page, (d) semantic token styling (authenticated register). Future consolidation into a single `ActivityCard` with variants (hero/list/dense per UX spec) can happen in a later refactoring epic.
- **DashboardGreeting replaces old h1/welcome**: The operational vocabulary ("Centre de Commande") replaces the generic "Tableau de Bord". The `pages.dashboard.title` i18n key is kept for backward compatibility (used by sidebar nav label).
- **Department badge inline styling**: The public `ActivityCard` uses `<Badge variant="secondary">` for department badges. The authenticated `AssignmentCard` uses inline `style={{ backgroundColor }}` with white text. For `DashboardActivityCard`, use the **inline approach** matching `AssignmentCard` — this creates visually richer department-colored badges in the authenticated register, as opposed to the muted secondary badges in the public register.
- **"Registre Personnel" vocabulary**: Added as a micro-label to the My Assignments section per epics AC requirement ("operational vocabulary register"). This provides the operational tone without changing the accessible `<h2>` heading hierarchy.

### UX Design Compliance

- **Operational vocabulary register**: "Centre de Commande" / "Command Center" from mock app's military-operational tone [Source: UX Spec, Executive Summary — "Command Center," "Protocol Node," "Registre Personnel"]
- **"Mes Affectations" first after login**: My Assignments section appears before Upcoming Activities, answering "am I doing something?" immediately [Source: UX Spec, Journey 2 key decisions]
- **ActivityCard list variant**: Dashboard cards follow the UX spec's card anatomy: dept color left-border (4px), date + relative time, title, predicateur avatar (28px), staffing indicator [Source: UX Spec, ActivityCard component spec, lines 1117-1149]
- **Staffing status indicators** (actual implementation in `StaffingIndicator.tsx`): FullyStaffed = filled circle (green/emerald-600), PartiallyStaffed = half-filled circle (amber-600), CriticalGap = outlined circle (red-600) + destructive badge label, NoRoles = horizontal dash (muted-foreground). **Note**: the actual implementation differs slightly from UX spec shapes (which specified triangle/diamond) — reuse the existing component as-is, do NOT re-implement shapes [Source: `components/activity/StaffingIndicator.tsx`]
- **Admin scoped view**: ADMIN sees only their departments' activities. Department color badges distinguish departments [Source: UX Spec, Journey 3 — scoped admin monitoring]
- **Pastor cross-department**: ADMIN assigned to all departments sees everything — unified "big picture" view [Source: UX Spec, Journey 4 — pastor oversight loop]
- **Mobile-first**: Sections stack vertically at 375px, single-column cards. Desktop expands to 2-column grid [Source: UX Spec, Platform Strategy — Mobile < 768px single-column]
- **Semantic tokens only**: All color references use semantic tokens — no raw Tailwind colors [Source: UX Spec, Visual Design Foundation — hard rule]

### Project Structure Notes

- **New backend files**:
  - `src/SdaManagement.Api/Dtos/Activity/DashboardActivityItem.cs`
  - `tests/SdaManagement.Api.IntegrationTests/Activities/DashboardActivitiesEndpointTests.cs`
- **New frontend files**:
  - `src/sdamanagement-web/src/hooks/useDashboardActivities.ts`
  - `src/sdamanagement-web/src/components/dashboard/DashboardGreeting.tsx`
  - `src/sdamanagement-web/src/components/dashboard/DashboardGreeting.test.tsx`
  - `src/sdamanagement-web/src/components/dashboard/DashboardActivityCard.tsx`
  - `src/sdamanagement-web/src/components/dashboard/DashboardUpcomingSection.tsx`
  - `src/sdamanagement-web/src/components/dashboard/DashboardUpcomingSection.test.tsx`
  - `src/sdamanagement-web/src/mocks/handlers/dashboard.ts`
- **Modified files**:
  - `src/SdaManagement.Api/Services/IActivityService.cs` — add `GetDashboardActivitiesAsync()`
  - `src/SdaManagement.Api/Services/ActivityService.cs` — implement method
  - `src/SdaManagement.Api/Controllers/ActivitiesController.cs` — add endpoint
  - `src/sdamanagement-web/src/services/activityService.ts` — add `getDashboardActivities()` + `DashboardActivityItem` interface
  - `src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.tsx` — add "Registre Personnel" micro-label
  - `src/sdamanagement-web/src/pages/DashboardPage.tsx` — refactor to compose DashboardGreeting + MyAssignmentsSection + DashboardUpcomingSection
  - `src/sdamanagement-web/public/locales/fr/common.json` — add dashboard i18n keys
  - `src/sdamanagement-web/public/locales/en/common.json` — add dashboard i18n keys
  - `src/sdamanagement-web/src/test-utils.tsx` — add dashboard test translation keys

### Library & Framework Requirements

- **date-fns v4.1.0** (already installed): Use `format(new Date(), "EEEE d MMMM yyyy", { locale })` for current date in greeting. Use existing `formatActivityDate()` and `formatRelativeDate()` for activity cards. Use `getDateLocale()` to resolve FR/EN locale.
- **@tanstack/react-query** (already installed): Follow established hook pattern. Query key: `["activities", "dashboard"]`. StaleTime: 5 minutes.
- **shadcn/ui** (already installed): `Card` (not needed — using article + Tailwind for cards to match existing pattern), `Badge` for department + role badges, `Skeleton` for loading states, `Tooltip` (already in StaffingIndicator).
- **react-router-dom** (already installed): `<Link>` for card navigation to `/activities/:id`.
- **`StaffingIndicator`** (already exists at `components/activity/StaffingIndicator.tsx`): Import and use with `size="sm"` on dashboard cards. Accepts `staffingStatus`, `assigned`, `total`, `size` props.
- **`InitialsAvatar`** (already exists at `components/ui/initials-avatar.tsx`): Use with `size="xs"` for predicateur avatars. Handles photo and initials fallback.
- **`hasRole`** (already exists at `components/ProtectedRoute.tsx`): Import for role-based conditional rendering (staffing visibility).
- **No new dependencies required** for this story.

### Testing Requirements

- **Backend integration tests**: 13 tests covering: RBAC (401 anonymous, VIEWER/ADMIN/OWNER scoping), data correctness (future-only, sorted, limited to 20, both visibilities, null department), predicateur info (present and absent), staffing status, department abbreviation
- **Frontend component tests**: DashboardGreeting (5 tests — greeting, micro-label, date, role badge, h1), DashboardUpcomingSection (12 tests — data rendering, empty state, loading, dept badges, predicateur, staffing for ADMIN, no staffing for VIEWER, heading, links, error state, today emphasis, view all link visibility)
- **No E2E test** for this story — visual validation will be done via ui-validation workflow after implementation

### Previous Story Intelligence (Stories 6.1 + 6.2)

**From Story 6.1 (Personal Assignments):**
- EF Core `.AsNoTracking()` caused cycle error with nested Include paths — Story 6.1 removed it. **For this story**: follow same pattern, do NOT use `.AsNoTracking()` on the dashboard query with nested Includes.
- `avatarService.GetAvatarUrl()` cannot run inside LINQ `.Select()` — must use two-step Include→Map pattern. This story's predicateur avatar follows the same constraint.
- MSW handler pattern: `export const dashboardHandlers = [http.get("...", ...)]` with per-test `setupServer()`.
- Test pattern: import from `@/test-utils`, skeleton detection via `document.querySelectorAll('[data-slot="skeleton"]')`.
- Code review fix from 6.1: `AssignmentCard` converted from raw Tailwind colors to semantic tokens (H1 issue). **Apply semantic tokens from the start** on all new components.
- Code review fix from 6.1: `activityService` methods should return `AxiosResponse` — unwrap `.then(res => res.data)` in the hook, not the service. **Follow this pattern** for `getDashboardActivities()`.

**From Story 6.2 (Activity Roster View):**
- `GET /api/activities/{id}` was widened from ADMIN+ to VIEWER+ (auth.CanView()). The dashboard cards link to this endpoint — VIEWERs can access the detail page.
- ActivityDetailPage uses `useQuery` with key `["activities", id]` — invalidation from dashboard actions will cascade correctly via `["activities"]` prefix.

### Git Intelligence (Recent Commits)

- Commit pattern: `feat(scope): Story X.Y — short description`
- For this story: `feat(dashboard): Story 6.3 — Authenticated dashboard with operational greeting and upcoming activities`
- Recent work: Story 6.2 (activity detail), Story 6.1 (personal assignments). Code patterns stable.
- `ActivitiesController` last touched in Story 6.1 (added `my-assignments` endpoint + `ICurrentUserContext` injection).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.3] — Acceptance criteria, user story
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2] — "Check and Confirm" officer personal view, lines 847-877
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 4] — "The Oversight Loop" pastor cross-department view, lines 929-964
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 6] — "The Hot Swap" — today's Sabbath highlighted on dashboard, lines 974-1012
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ActivityCard] — Component specification, lines 1117-1149
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#StaffingIndicator] — Component specification, lines 1152-1169
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation] — Color system + semantic tokens, lines 520-549
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication] — JWT cookie, ICurrentUserContext, authorization patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#API Conventions] — Endpoint naming, DTO patterns, controller template
- [Source: _bmad-output/planning-artifacts/prd.md#FR16-FR18] — Personal Assignment Management + Authenticated Dashboard requirements
- [Source: _bmad-output/planning-artifacts/prd.md#FR43] — Cross-department admin visibility
- [Source: src/SdaManagement.Api/Controllers/ActivitiesController.cs] — Existing controller pattern
- [Source: src/SdaManagement.Api/Services/ActivityService.cs] — Service pattern, ComputeStaffingStatus(), predicateur extraction
- [Source: src/sdamanagement-web/src/components/activity/StaffingIndicator.tsx] — Existing reusable component
- [Source: src/sdamanagement-web/src/components/ui/initials-avatar.tsx] — Avatar component
- [Source: src/sdamanagement-web/src/components/assignments/AssignmentCard.tsx] — Card pattern with semantic tokens
- [Source: src/sdamanagement-web/src/components/public/ActivityCard.tsx] — Public card pattern
- [Source: src/sdamanagement-web/src/hooks/useMyAssignments.ts] — React Query hook pattern
- [Source: src/sdamanagement-web/src/lib/dateFormatting.ts] — Date formatting utilities
- [Source: _bmad-output/implementation-artifacts/6-1-personal-assignments-view-my-assignments.md] — Previous story learnings
- [Source: _bmad-output/implementation-artifacts/6-2-full-activity-roster-view.md] — Previous story learnings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- App.test.tsx regression: old test expected "Tableau de Bord" h1 + "Bienvenue, Test" — updated to match new "CENTRE DE COMMANDE" + "Bonjour, Test" greeting
- 3 pre-existing LiveStatusEndpointTests failures (unrelated to this story)

### Completion Notes List

- **Task 1**: Created `DashboardActivityItem` DTO with all 17 fields including predicateur info and department abbreviation
- **Task 2**: Implemented `GetDashboardActivitiesAsync()` in ActivityService with role-based department filtering, predicateur extraction (case-insensitive "prédicateur"/"predicateur" match), staffing computation via existing `ComputeStaffingStatus()`, and 20-item limit
- **Task 3**: Added `GET /api/activities/dashboard` endpoint with `CanView()` VIEWER+ auth gate, placed before `{id:int}` route
- **Task 4**: 14 integration tests covering RBAC (401/VIEWER/ADMIN/OWNER), chronological sort, 20-item limit, predicateur extraction (+ avatar URL assertion), staffing status, both visibilities, null department, department abbreviation, and today boundary (code review fix)
- **Task 5**: Added `DashboardActivityItem` TypeScript interface to activityService.ts
- **Task 6**: Added `getDashboardActivities()` service method + `useDashboardActivities()` React Query hook with `["activities", "dashboard"]` key
- **Task 7**: Created `DashboardGreeting` component with "CENTRE DE COMMANDE" micro-label, h1 greeting, locale-formatted date, and role badge
- **Task 8**: Created `DashboardActivityCard` with dept color left-border, abbreviation badge, predicateur avatar, staffing indicator (conditional), today emphasis, and link to detail page
- **Task 9**: Created `DashboardUpcomingSection` with role-dependent subtitle (ADMIN dept badges / OWNER "Vue d'ensemble"), loading skeletons, error/empty states, 2-column grid, and "View All" link for ADMIN+
- **Task 10**: Added "REGISTRE PERSONNEL" micro-label to MyAssignmentsSection above h2
- **Task 11**: Refactored DashboardPage to compose DashboardGreeting + SetupChecklist + MyAssignmentsSection + DashboardUpcomingSection with space-y-8 layout
- **Task 12**: Added i18n keys (FR/EN) for commandCenter, greeting, personalRegister, role labels, upcoming section. Updated test-utils.tsx
- **Task 13**: Created MSW handlers (dashboardHandlers/Empty/Error) and 22 component tests (7 DashboardGreeting + 15 DashboardUpcomingSection). Code review added: today emphasis test, OWNER staffing test, View All href assertion. MSW mock dates converted to dynamic (code review fix).
- Updated App.test.tsx to match new greeting pattern

### Change Log

- 2026-03-16: Story 6.3 implemented — authenticated dashboard with operational greeting, upcoming activities section with role-based filtering and staffing indicators
- 2026-03-16: Code review (Sonnet 4.6) — Fixed 7 issues: [C1] added missing today-emphasis test, [H1] added OWNER staffing visibility test, [H2] added GetDashboard_TodayIsIncluded integration test, [M2] converted mock dates to dynamic, [M4] added predicateurAvatarUrl assertion, [L2] added View All href assertion. Deferred: [M1] admin-with-0-depts edge case (requires test infra), [M3] admin subtitle loading flash (minor UX)

### File List

**New files:**
- src/SdaManagement.Api/Dtos/Activity/DashboardActivityItem.cs
- tests/SdaManagement.Api.IntegrationTests/Activities/DashboardActivitiesEndpointTests.cs
- src/sdamanagement-web/src/hooks/useDashboardActivities.ts
- src/sdamanagement-web/src/components/dashboard/DashboardGreeting.tsx
- src/sdamanagement-web/src/components/dashboard/DashboardGreeting.test.tsx
- src/sdamanagement-web/src/components/dashboard/DashboardActivityCard.tsx
- src/sdamanagement-web/src/components/dashboard/DashboardUpcomingSection.tsx
- src/sdamanagement-web/src/components/dashboard/DashboardUpcomingSection.test.tsx
- src/sdamanagement-web/src/mocks/handlers/dashboard.ts

**Modified files:**
- src/SdaManagement.Api/Services/IActivityService.cs — added GetDashboardActivitiesAsync()
- src/SdaManagement.Api/Services/ActivityService.cs — implemented GetDashboardActivitiesAsync()
- src/SdaManagement.Api/Controllers/ActivitiesController.cs — added GET dashboard endpoint
- src/sdamanagement-web/src/services/activityService.ts — added DashboardActivityItem interface + getDashboardActivities()
- src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.tsx — added "Registre Personnel" micro-label
- src/sdamanagement-web/src/pages/DashboardPage.tsx — refactored to compose DashboardGreeting + sections
- src/sdamanagement-web/public/locales/fr/common.json — added dashboard i18n keys
- src/sdamanagement-web/public/locales/en/common.json — added dashboard i18n keys
- src/sdamanagement-web/src/test-utils.tsx — added dashboard test translation keys
- src/sdamanagement-web/src/App.test.tsx — updated assertion to match new greeting
