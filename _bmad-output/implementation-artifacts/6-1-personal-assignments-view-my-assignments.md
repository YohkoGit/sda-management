# Story 6.1: Personal Assignments View ("My Assignments")

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **VIEWER (officer)**,
I want to see my personal upcoming assignments across all activities,
So that I know exactly what I'm doing, when, and who else is serving alongside me.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–5 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors
- Activities with role assignments created (from Epic 4) — several across different dates with users assigned to roles
- At least one VIEWER user with role assignments on upcoming activities

### Codebase State (Epic 5 Complete)

- `ActivitiesController` exists at `api/activities` with CRUD endpoints: `GET /api/activities` (ADMIN+/OWNER), `GET /api/activities/{id}`, `POST`, `PUT`, `DELETE` — all `[Authorize]` + `[EnableRateLimiting("auth")]` [Source: `Controllers/ActivitiesController.cs`]
- `IActivityService` / `ActivityService` exist with `GetAllAsync()`, `GetByIdAsync()`, `CreateAsync()`, `UpdateAsync()`, `DeleteAsync()` [Source: `Services/IActivityService.cs`, `Services/ActivityService.cs`]
- `ICurrentUserContext` provides `UserId`, `Role`, `DepartmentIds`, `IsAuthenticated` — populated by `CurrentUserContextMiddleware` from JWT claims + DB lookup [Source: `Auth/ICurrentUserContext.cs`, `Auth/CurrentUserContextMiddleware.cs`]
- `IAuthorizationService` provides `CanView()`, `CanManage(departmentId)`, `IsOwner()`, `IsAuthenticated()` [Source: `Auth/IAuthorizationService.cs`]
- **Existing DTOs** in `Dtos/Activity/`:
  - `ActivityListItem` — id, title, date, startTime, endTime, departmentId, departmentName, departmentColor, visibility, specialType, roleCount, totalHeadcount, assignedCount, staffingStatus, createdAt
  - `ActivityResponse` — full activity with nested `Roles[]` → `Assignments[]`
  - `ActivityRoleResponse` — id, roleName, headcount, sortOrder, assignments[]
  - `RoleAssignmentResponse` — id, userId, firstName, lastName, avatarUrl, isGuest
- **Entity chain**: `Activity` → `ActivityRole` (one-to-many) → `RoleAssignment` (one-to-many) → `User` (many-to-one). Unique constraint on `(ActivityRoleId, UserId)` [Source: `Data/AppDbContext.cs` lines 174-188]
- `DashboardPage.tsx` exists as a **stub** showing greeting + SetupChecklist (OWNER only) — **extend** with My Assignments section [Source: `pages/DashboardPage.tsx`]
- Route `/dashboard` already configured in `App.tsx` line 66 under `<ProtectedRoute />` [Source: `App.tsx`]
- `AuthenticatedLayout` with sidebar navigation already exists [Source: `layouts/AuthenticatedLayout.tsx`]
- `useAuth()` hook provides `user` object with `userId`, `firstName`, `lastName`, `role` [Source: `contexts/AuthContext.tsx`]
- `activityService.ts` has typed interfaces: `ActivityListItem`, `ActivityResponse`, `ActivityRoleResponse`, `RoleAssignmentResponse` [Source: `services/activityService.ts`]
- React Query hook pattern established in `usePublicDashboard.ts` — `useQuery` with typed returns, `staleTime`, `retry` [Source: `hooks/usePublicDashboard.ts`]
- `lib/api.ts` — Axios instance with `withCredentials: true`, automatic 401 refresh interceptor [Source: `lib/api.ts`]
- `lib/dateFormatting.ts` — `formatActivityDate()`, `formatTime()`, `getDateLocale()` already exist with `date-fns` v4.1.0, `fr` and `enUS` locales [Source: `lib/dateFormatting.ts`]
- i18n keys under `pages.dashboard.title` ("Dashboard"), `pages.dashboard.welcome` ("Welcome, {{name}}") [Source: `public/locales/en/common.json`]
- MSW handler pattern established at `mocks/handlers/public.ts` [Source: `mocks/handlers/public.ts`]
- `test-utils.tsx` has inline i18n provider with test translations [Source: `test-utils.tsx`]
- Integration test base: `IntegrationTestBase` with `ViewerClient`, `AdminClient`, `OwnerClient`, `AnonymousClient`, `CreateTestActivity()` with roles and assignments, `CreateTestUser()`, `AssignDepartmentToUser()` [Source: `tests/.../IntegrationTestBase.cs`]

## Acceptance Criteria

1. **My Assignments section on authenticated dashboard**: Given an authenticated user (VIEWER+) navigating to `/dashboard`, When the "Mes Affectations" section loads, Then it displays all upcoming activities where the current user has a `role_assignment`, And each assignment card shows: activity date (formatted + relative distance), activity title, the user's assigned role name, department abbreviation badge with color accent, and co-assigned people for the same role with 28px avatars.

2. **Chronological sort with nearest emphasized**: Given the user has multiple upcoming assignments (e.g., deacon this Saturday, preacher in 3 weeks, announcements next month), When the assignments render, Then they are sorted chronologically with the nearest assignment first, And the nearest assignment card is visually emphasized (indigo-50 background or highlighted left border), And each card shows relative time label ("Ce sabbat", "Dans 3 semaines") using the current i18n locale.

3. **Empty state**: Given the user has no upcoming assignments, When the "Mes Affectations" section renders, Then a friendly empty state displays: "Aucune affectation à venir" (FR) / "No upcoming assignments" (EN), And includes contextual guidance that assignments appear when admins schedule activities with their name.

4. **My Assignments API endpoint**: Given `GET /api/activities/my-assignments` is called by an authenticated user (VIEWER+), Then it returns only future/today activities where the current user has at least one `role_assignment`, And each item includes: activity id, title, date, startTime, endTime, departmentName, departmentAbbreviation, departmentColor, specialType, the user's role name, and co-assignees (firstName, lastName, avatarUrl) for that same role, And results are ordered by date ASC then startTime ASC, And the endpoint uses `[Authorize]` and `[EnableRateLimiting("auth")]`, And both `Public` and `Authenticated` visibility activities are included (the user is authenticated), And results are capped at 50 items as a safety limit.

5. **Authorization enforcement**: Given an anonymous user calls `GET /api/activities/my-assignments`, Then the API returns 401, Given a VIEWER calls the endpoint, Then they receive only their own assignments (no other users' data), Given an ADMIN or OWNER calls the endpoint, Then they also receive only their own personal assignments (this is a personal view, not an admin overview).

6. **Guest speakers excluded from co-assignee avatars**: Given a role has both regular members and a guest speaker assigned, When displaying co-assignees on an assignment card, Then guest speakers are included (they're legitimate team members for that role), And guest speakers show "(Invité)" label in this authenticated view per FR32.

7. **Loading and error states**: Given the assignments data is loading, When the section renders, Then skeleton cards display matching the final card dimensions, Given the API call fails, Then an error message displays with a retry option.

8. **Accessibility**: Given the "Mes Affectations" section, Then it uses proper heading hierarchy (h2 for section title within the dashboard h1), And assignment cards are focusable with `Enter` to navigate to activity detail (future Story 6.2), And all avatars have `alt` text with person's name, And the empty state is announced to screen readers, And all text meets WCAG 2.1 AA contrast minimums (4.5:1).

## Tasks / Subtasks

### Backend — New DTO for Personal Assignments

- [x] Task 1: Create `MyAssignmentListItem` DTO (AC: #1, #4)
  - [x] 1.1 Create `src/SdaManagement.Api/Dtos/Activity/MyAssignmentListItem.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Activity;

    public class MyAssignmentListItem
    {
        public int ActivityId { get; init; }
        public string ActivityTitle { get; init; } = string.Empty;
        public DateOnly Date { get; init; }
        public TimeOnly StartTime { get; init; }
        public TimeOnly EndTime { get; init; }
        public string DepartmentName { get; init; } = string.Empty;
        public string DepartmentAbbreviation { get; init; } = string.Empty;
        public string DepartmentColor { get; init; } = string.Empty;
        public string? SpecialType { get; init; }
        public string RoleName { get; init; } = string.Empty;
        public List<CoAssigneeResponse> CoAssignees { get; init; } = [];
    }
    ```
  - [x] 1.2 Create `src/SdaManagement.Api/Dtos/Activity/CoAssigneeResponse.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Activity;

    public class CoAssigneeResponse
    {
        public int UserId { get; init; }
        public string FirstName { get; init; } = string.Empty;
        public string LastName { get; init; } = string.Empty;
        public string? AvatarUrl { get; init; }
        public bool IsGuest { get; init; }
    }
    ```
  - [x] 1.3 **Design note**: `CoAssigneeResponse` is nearly identical to `RoleAssignmentResponse` but excludes the `Id` field (the RoleAssignment PK is irrelevant to the viewer). If the dev agent judges the duplication too trivial to warrant a separate class, reusing `RoleAssignmentResponse` is acceptable — just exclude the current user from the list (see 2.2).

### Backend — Service Method

- [x] Task 2: Add `GetMyAssignmentsAsync()` to `IActivityService` and implement in `ActivityService` (AC: #4, #5, #6)
  - [x] 2.1 Add to `IActivityService`:
    ```csharp
    Task<List<MyAssignmentListItem>> GetMyAssignmentsAsync(int userId);
    ```
  - [x] 2.2 Implement in `ActivityService` — EF Core query (**two-step: load then map**):
    - **Step A — Load entities** via `.Include()` chain (NOT `.Select()` — `IAvatarService.GetAvatarUrl()` cannot be translated to SQL inside a LINQ projection):
      ```csharp
      var assignments = await dbContext.RoleAssignments
          .AsNoTracking()
          .Include(ra => ra.ActivityRole)
              .ThenInclude(ar => ar.Activity)
                  .ThenInclude(a => a.Department)
          .Include(ra => ra.ActivityRole)
              .ThenInclude(ar => ar.Assignments)
                  .ThenInclude(ra2 => ra2.User)
          .Where(ra => ra.UserId == userId)
          .Where(ra => ra.ActivityRole.Activity.Date >= DateOnly.FromDateTime(DateTime.UtcNow))
          .OrderBy(ra => ra.ActivityRole.Activity.Date)
              .ThenBy(ra => ra.ActivityRole.Activity.StartTime)
          .Take(50)
          .ToListAsync();
      ```
    - **Step B — Map to DTOs** after materialization (same pattern as existing `MapToResponse()` in `ActivityService.cs` lines 375-412):
      - Iterate loaded `assignments` and build `MyAssignmentListItem` per entry
      - Call `avatarService.GetAvatarUrl(user.Id)` for each co-assignee — `ActivityService` already has `IAvatarService` injected as a constructor dependency (field `avatarService`), no new DI registration needed
      - **Exclude the current user** from `CoAssignees` list: `.Where(a => a.UserId != userId)`
      - Handle nullable `DepartmentId`: when `Activity.Department` is null, use `string.Empty` for `DepartmentName`, `DepartmentAbbreviation`, `DepartmentColor`
    - **Do NOT filter by visibility** — include both `Public` and `Authenticated` activities (the user is authenticated; they should see all their assignments regardless of visibility)
    - **Why not `.Select()` projection?** EF Core cannot translate `avatarService.GetAvatarUrl()` to SQL. Calling it inside `.Select()` throws `InvalidOperationException` at runtime. The existing `GetByIdAsync()` uses the same two-step pattern (`.Include()` → `MapToResponse()`) for this reason.
  - [x] 2.3 **UTC date caveat**: `DateOnly.FromDateTime(DateTime.UtcNow)` may return a different date than the church's local date in Quebec (UTC-5). At 11 PM Saturday in Quebec, UTC is 4 AM Sunday — Saturday activities would be excluded. For MVP, this is an accepted limitation. The window of impact is narrow (late Saturday evening) and the mitigation (using server local time or timezone-aware filtering) adds complexity disproportionate to the risk. Document this as a known behavior.
  - [x] 2.4 **Edge case**: If a user is assigned to multiple roles on the same activity (e.g., both "Diacre" and "Offrandes"), return separate entries — one per role assignment. Each card = one role on one activity.

### Backend — New Endpoint

- [x] Task 3: Add `GET /api/activities/my-assignments` to `ActivitiesController` (AC: #4, #5)
  - [x] 3.1 Add endpoint method:
    ```csharp
    [HttpGet("my-assignments")]
    public async Task<IActionResult> GetMyAssignments()
    {
        if (!auth.CanView())
            return Forbid();

        var assignments = await activityService.GetMyAssignmentsAsync(
            /* userId from ICurrentUserContext — inject via constructor */);
        return Ok(assignments);
    }
    ```
  - [x] 3.2 Inject `ICurrentUserContext` into `ActivitiesController` constructor (add to existing primary constructor parameters alongside `IActivityService` and `IAuthorizationService`)
  - [x] 3.3 Auth: `CanView()` = VIEWER+ (already `[Authorize]` on class level handles 401 for anonymous; `CanView()` handles the VIEWER+ gate)
  - [x] 3.4 Rate limiting: inherited from class-level `[EnableRateLimiting("auth")]` — no additional config needed

### Backend — Integration Tests

- [x] Task 4: Create `tests/SdaManagement.Api.IntegrationTests/Activities/MyAssignmentsEndpointTests.cs` (AC: #4, #5, #6, #7)
  - [x] 4.1 Test: `GetMyAssignments_AsViewer_ReturnsOnlyAssignedActivities` — seed viewer user with 2 role assignments on 2 different activities + 1 activity with no assignment → expect 2 results
  - [x] 4.2 Test: `GetMyAssignments_AsViewer_ExcludesPastActivities` — seed 1 past activity (yesterday) + 1 future activity, both with assignments → expect only future
  - [x] 4.3 Test: `GetMyAssignments_AsViewer_SortedChronologically` — seed 3 activities on different dates → verify order
  - [x] 4.4 Test: `GetMyAssignments_AsViewer_IncludesCoAssigneesButNotSelf` — seed role with 3 people (viewer + 2 others) → expect 2 co-assignees, none matching viewer's userId
  - [x] 4.5 Test: `GetMyAssignments_AsViewer_NoAssignments_ReturnsEmptyArray` — viewer with no assignments → expect `[]`
  - [x] 4.6 Test: `GetMyAssignments_AsAnonymous_Returns401`
  - [x] 4.7 Test: `GetMyAssignments_AsAdmin_ReturnsOnlyPersonalAssignments` — admin with assignments → gets personal assignments only, not all department activities
  - [x] 4.8 Test: `GetMyAssignments_MultipleRolesOnSameActivity_ReturnsSeparateEntries` — user assigned to 2 roles on 1 activity → expect 2 items
  - [x] 4.9 Test: `GetMyAssignments_IncludesGuestCoAssignee` — role with guest speaker co-assigned → guest appears in CoAssignees with `IsGuest = true`
  - [x] 4.10 Test: `GetMyAssignments_IncludesBothPublicAndAuthenticatedActivities` — seed 1 public activity + 1 authenticated-only activity, both with viewer assignments → expect both returned
  - [x] 4.11 Test: `GetMyAssignments_ActivityWithNullDepartment_ReturnsGracefully` — seed activity with `DepartmentId = null` and viewer assignment → expect item with empty departmentName/abbreviation/color
  - [x] 4.12 **SeedTestData pattern — CRITICAL**: Override `SeedTestData()` to create a viewer user with email **`test-viewer@test.local`** — this MUST match the email that `TestAuthHandler` generates for the "Viewer" role header. The `CurrentUserContextMiddleware` resolves `UserId` from the JWT email → DB lookup. If the seeded user has a different email, the middleware won't find the user and `ICurrentUserContext.UserId` will be 0, causing empty results.
    - Use `CreateTestUser("test-viewer@test.local", UserRole.Viewer)` for the viewer user
    - Use `CreateTestUser("test-admin@test.local", UserRole.Admin)` for the admin test case (4.7)
    - Create departments, activities with roles, and assign the test users to roles

### Frontend — TypeScript Types

- [x] Task 5: Create TypeScript types for my assignments (AC: #1)
  - [x] 5.1 Create `src/sdamanagement-web/src/types/assignment.ts`:
    ```typescript
    export interface CoAssignee {
      userId: number;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
      isGuest: boolean;
    }

    export interface MyAssignmentItem {
      activityId: number;
      activityTitle: string;
      date: string;        // "yyyy-MM-dd"
      startTime: string;   // "HH:mm:ss"
      endTime: string;     // "HH:mm:ss"
      departmentName: string;
      departmentAbbreviation: string;
      departmentColor: string;
      specialType: string | null;
      roleName: string;
      coAssignees: CoAssignee[];
    }
    ```

### Frontend — Service & Hook

- [x] Task 6: Add API service method and React Query hook (AC: #1, #7)
  - [x] 6.1 Add to `src/sdamanagement-web/src/services/activityService.ts`:
    ```typescript
    getMyAssignments: () =>
      api.get<MyAssignmentItem[]>("/api/activities/my-assignments").then(res => res.data),
    ```
    Import `MyAssignmentItem` from `@/types/assignment`.
  - [x] 6.2 Create `src/sdamanagement-web/src/hooks/useMyAssignments.ts`:
    ```typescript
    import { useQuery } from "@tanstack/react-query";
    import { activityService } from "@/services/activityService";
    import type { MyAssignmentItem } from "@/types/assignment";

    export function useMyAssignments() {
      return useQuery<MyAssignmentItem[]>({
        queryKey: ["activities", "my-assignments"],
        queryFn: activityService.getMyAssignments,
        staleTime: 5 * 60 * 1000,
        retry: 1,
      });
    }
    ```
  - [x] 6.3 **Query key**: `["activities", "my-assignments"]` — scoped under `activities` domain for future SignalR invalidation (e.g., `ActivityUpdated` → `queryClient.invalidateQueries({ queryKey: ['activities'] })` will also refresh assignments)

### Frontend — AssignmentCard Component

- [x] Task 7: Create `AssignmentCard` component (AC: #1, #2, #6, #8)
  - [x] 7.1 Create `src/sdamanagement-web/src/components/assignments/AssignmentCard.tsx`
  - [x] 7.2 **Visual spec** (from UX design specification):
    - Department color left-border accent (4px solid, using `departmentColor`) — if `departmentColor` is empty (null department), use `border-border` (slate-200) as fallback
    - **Dual date display**:
      - **Primary line**: Formatted date via `formatActivityDate()` from `lib/dateFormatting.ts` (e.g., "Samedi 21 mars") — handles "Ce sabbat" for this Saturday
      - **Secondary line**: Relative distance via `date-fns` `formatDistanceToNow` with `{ addSuffix: true, locale }` (e.g., "dans 3 semaines" / "in 3 weeks") — use `getDateLocale()` from `lib/dateFormatting.ts` to resolve locale
    - Activity title + special type badge (if present)
    - **Department badge**: `departmentAbbreviation` text on a department-colored background chip (e.g., "JA" on teal bg, "MIFEM" on violet bg). If abbreviation is empty (null department), hide the badge entirely.
    - Role name displayed prominently (e.g., "Diacre", "Prédicateur")
    - Co-assignee avatars (28px) — use existing `<InitialsAvatar>` from `@/components/ui/initials-avatar` with `size="xs"` (renders `h-7 w-7` = 28px). Handles `avatarUrl` prop automatically (photo if available, initials circle fallback with deterministic color). Already has `aria-label` with full name.
    - Guest speakers show "(Invité)" micro-label beneath name in this authenticated operational view
    - Time display using existing `formatTime()` from `lib/dateFormatting.ts`
  - [x] 7.3 **First card emphasis**: Accept an `isFirst` boolean prop → apply `bg-primary-light` (indigo-50) background or a thicker left border to visually emphasize the nearest assignment
  - [x] 7.4 **Relative date formatting**: Add a `formatRelativeDate()` utility to `lib/dateFormatting.ts`:
    - Import `formatDistanceToNow` from `"date-fns"` (same import pattern as existing `{ getDay, addDays, isSameDay, format, parse } from "date-fns"` in that file)
    - Pass locale from `getDateLocale(lang)` — **must pass the locale parameter**, otherwise output is English-only
    - Signature: `export function formatRelativeDate(dateStr: string, lang: string): string`
    - Implementation: parse `dateStr` with `parse(dateStr, "yyyy-MM-dd", new Date())`, then `return formatDistanceToNow(parsed, { addSuffix: true, locale: getDateLocale(lang) })`
    - This complements `formatActivityDate()` (which handles "Ce sabbat" / full date) — both functions are used together on the card (primary + secondary date lines)
    - Example output (FR): "dans 3 semaines", "dans 5 jours", "moins d'une minute" / (EN): "in 3 weeks", "in 5 days", "less than a minute"
  - [x] 7.5 **Card layout arrangement** (spatial guide for the dev agent):
    ```
    ┌─ 4px dept color left border ────────────────────────────┐
    │  [Dept abbrev badge]  Samedi 21 mars · dans 3 semaines  │
    │  Culte Divin                          [Special badge]   │
    │  ▸ Diacre                              10h00 – 12h00    │
    │  👤 👤  Jean D., Marie L.                               │
    └─────────────────────────────────────────────────────────┘
    ```
    - Row 1: Department badge (colored chip) + formatted date + relative distance (secondary color)
    - Row 2: Activity title (bold) + special type badge if present (right-aligned)
    - Row 3: Role name (semibold, indigo-600) + time range (right-aligned, secondary color)
    - Row 4: Co-assignee `<InitialsAvatar size="xs">` avatars in a row + names. If guest: "(Invité)" micro-label. If no co-assignees: omit row entirely.
    - On mobile: same layout, full-width card. All rows stack naturally — no horizontal scroll.
  - [x] 7.6 **Accessibility**: Card should be a focusable element (tabIndex="0" or wrap in button/link), with `aria-label` describing the assignment. The card will link to activity detail in Story 6.2 — for now, make it focusable but non-interactive (no click handler yet).
  - [x] 7.7 Card uses semantic tokens only: `bg-background`, `text-foreground`, `text-foreground-secondary`, `border-border`. Never raw Tailwind colors.

### Frontend — MyAssignmentsSection Component

- [x] Task 8: Create `MyAssignmentsSection` wrapper component (AC: #1, #2, #3, #7)
  - [x] 8.1 Create `src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.tsx`
  - [x] 8.2 Uses `useMyAssignments()` hook to fetch data
  - [x] 8.3 **Section heading**: `<h2 className="text-xl font-bold">` with `t("pages.dashboard.myAssignments.title")` — "Mes Affectations" (FR) / "My Assignments" (EN)
  - [x] 8.4 **Loading state**: Render 2–3 skeleton cards matching card dimensions (use shadcn `Skeleton` component)
  - [x] 8.5 **Error state**: Display error message with retry button using `refetch()` from useQuery
  - [x] 8.6 **Empty state**: Centered text with `t("pages.dashboard.myAssignments.empty")` — "Aucune affectation à venir" (FR) / "No upcoming assignments" (EN), plus a secondary line `t("pages.dashboard.myAssignments.emptyHint")` — "Les affectations apparaissent ici lorsqu'un administrateur vous assigne un rôle dans une activité." (FR)
  - [x] 8.7 **Data state**: Map assignments to `<AssignmentCard>` components, passing `isFirst={index === 0}`
  - [x] 8.8 Layout: Vertical stack with `space-y-3` gap between cards

### Frontend — Update DashboardPage

- [x] Task 9: Integrate MyAssignmentsSection into DashboardPage (AC: #1, #2)
  - [x] 9.1 Import and add `<MyAssignmentsSection />` below the welcome message in `DashboardPage.tsx`:
    ```tsx
    <h1 ...>{t("pages.dashboard.title")}</h1>
    <p ...>{t("pages.dashboard.welcome", { name: user?.firstName })}</p>
    <div className="mt-6">
      <MyAssignmentsSection />
    </div>
    ```
  - [x] 9.2 Keep `SetupChecklist` for OWNER — My Assignments appears below it (or alongside, depending on layout)
  - [x] 9.3 **Note for Story 6.3**: The full authenticated dashboard layout (greeting card, assignments section, upcoming activities, department overview) will be finalized in Story 6.3. For now, just add the MyAssignmentsSection to the existing DashboardPage stub.

### Frontend — i18n Keys

- [x] Task 10: Add i18n translation keys (AC: #1, #3)
  - [x] 10.1 Add to `public/locales/fr/common.json` under `pages.dashboard`:
    ```json
    "myAssignments": {
      "title": "Mes Affectations",
      "empty": "Aucune affectation à venir",
      "emptyHint": "Les affectations apparaissent ici lorsqu'un administrateur vous assigne un rôle dans une activité.",
      "loadError": "Impossible de charger vos affectations",
      "retry": "Réessayer",
      "coAssignees": "Aussi assigné(s)",
      "guest": "Invité"
    }
    ```
  - [x] 10.2 Add to `public/locales/en/common.json` under `pages.dashboard`:
    ```json
    "myAssignments": {
      "title": "My Assignments",
      "empty": "No upcoming assignments",
      "emptyHint": "Assignments appear here when an administrator assigns you a role in an activity.",
      "loadError": "Failed to load your assignments",
      "retry": "Retry",
      "coAssignees": "Also assigned",
      "guest": "Guest"
    }
    ```
  - [x] 10.3 Add matching keys to `test-utils.tsx` inline i18n for test stability

### Frontend — MSW Handlers & Component Tests

- [x] Task 11: Create MSW handler and component test (AC: #1, #3, #7, #8)
  - [x] 11.1 Create `src/sdamanagement-web/src/mocks/handlers/assignments.ts`:
    - Export `assignmentHandlers` array with handler for `GET /api/activities/my-assignments` returning mock `MyAssignmentItem[]`
    - Include mock data with varied dates, roles, co-assignees, and at least one guest speaker
    - Pattern: `export const assignmentHandlers = [http.get("/api/activities/my-assignments", () => HttpResponse.json([...]))]`
  - [x] 11.2 **No centralized handler registration needed** — the project uses per-test `setupServer()` with spread imports. Each test file imports only the handlers it needs:
    ```typescript
    import { assignmentHandlers } from "@/mocks/handlers/assignments";
    import { authHandlers } from "@/mocks/handlers/auth";
    const server = setupServer(...authHandlers, ...assignmentHandlers);
    ```
  - [x] 11.3 Create `src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.test.tsx`:
    - Import `{ render, screen, waitFor }` from `@/test-utils` (NOT from `@testing-library/react` — the test-utils re-export wraps with all providers: I18n, QueryClient, AuthContext, Router)
    - Test: renders assignment cards when data is available — `await waitFor(() => expect(screen.getByText("Diacre")).toBeInTheDocument())`
    - Test: renders empty state when no assignments — override MSW handler to return `[]`, assert `screen.getByText("Aucune affectation à venir")`
    - Test: renders loading skeleton state — assert `document.querySelectorAll('[data-slot="skeleton"]').length` > 0 before data loads (established pattern from `PublicCalendarPage.test.tsx`)
    - Test: first card has visual emphasis (isFirst) — check for `bg-indigo-50` or equivalent emphasis class on first card
    - Test: co-assignee avatars display correctly — check `<InitialsAvatar>` renders with correct names
    - Test: guest speaker shows "(Invité)" label
    - Test: section heading uses correct i18n key — `screen.getByRole("heading", { level: 2, name: "Mes Affectations" })`
    - Test: accessibility — heading hierarchy, avatar alt text

## Dev Notes

### Key Architecture Decisions

- **Endpoint placement**: `GET /api/activities/my-assignments` lives on `ActivitiesController` because it queries the Activity aggregate. It's a read operation filtered by the authenticated user's ID — not an admin operation.
- **Authorization**: `auth.CanView()` gate (VIEWER+). The `[Authorize]` class attribute handles 401 for anonymous. No department scoping needed — this endpoint is purely personal.
- **Query approach**: Two-step — `.Include()` chain to load entities, then manual DTO mapping with `IAvatarService`. Cannot use `.Select()` projection because `avatarService.GetAvatarUrl()` is not translatable to SQL. This matches the existing `GetByIdAsync()` → `MapToResponse()` pattern in `ActivityService.cs`. Start from `RoleAssignment` → navigate to `ActivityRole` → `Activity` → `Department`. More efficient than loading all activities and filtering.
- **One item per role**: If a user has 2 roles on one activity, they see 2 cards. This matches the UX intent — each card answers "what role am I filling?"
- **Co-assignees exclude self**: The current user is excluded from the co-assignee list. They already know they're assigned — the value is seeing who else is on the team.
- **No cursor pagination**: For MVP, return all upcoming assignments with a `.Take(50)` safety cap. A church officer typically has 1–5 upcoming assignments, never hundreds. Pagination is unnecessary complexity.
- **Both visibility types included**: The query does NOT filter by `Activity.Visibility`. An authenticated user sees all their assignments — both public and authenticated-only activities. Do not copy the public service's visibility filter.
- **`.AsNoTracking()` mandatory**: Read-only projection query. No entities will be modified.
- **Nullable `DepartmentId` handling**: `Activity.DepartmentId` is nullable (`int?`). The DTO and card must handle gracefully — project empty strings for name/abbreviation/color, hide department badge in the UI.

### Known Limitations (Accepted for MVP)

- **UTC date filtering**: `DateOnly.FromDateTime(DateTime.UtcNow)` may differ from Quebec local date (UTC-5). At 11 PM Saturday in Quebec, UTC is 4 AM Sunday — Saturday activities would be excluded. Impact window is narrow (late Saturday evening). Mitigation deferred — timezone-aware filtering adds disproportionate complexity for MVP.

### UX Design Compliance

- **"Mes Affectations" is THE first thing** after login — answers "am I doing something?" immediately [Source: UX Spec, Journey 2 key decisions]
- Role cards show: role name, date, relative time ("ce sabbat", "dans 3 semaines") [Source: UX Spec, Journey 2 flow]
- 28px avatars per co-assignee [Source: UX Spec, Journey 2 flow, line 862]
- Viewers see roster but **cannot edit** — no edit buttons, no reassignment UI [Source: UX Spec, Journey 2 key decisions]
- Empty state: "Aucune affectation à venir" with encouraging tone [Source: UX Spec, line 875]
- Success criterion: User sees next assignment role + date within 3 seconds of login, without navigation [Source: UX Spec, line 877]
- Department color left-border accent on cards [Source: UX Spec, ActivityCard component spec, lines 1117-1149]
- **Department abbreviation badge** on each card (e.g., "JA", "MIFEM") — abbreviation text on department-colored chip. UX spec shows these badges in all activity card variants [Source: UX Spec, ActivityCard anatomy]
- **Dual date display**: Primary formatted date + secondary relative distance label. Matches Journey 2 pattern: "Role card: Diacre — ce sabbat" with relative context [Source: UX Spec, lines 871-872]
- Guest speakers show "(Invité)" in authenticated/operational view [Source: FR32, UX Spec]

### Project Structure Notes

- **New backend files**:
  - `src/SdaManagement.Api/Dtos/Activity/MyAssignmentListItem.cs`
  - `src/SdaManagement.Api/Dtos/Activity/CoAssigneeResponse.cs`
  - `tests/.../Activities/MyAssignmentsEndpointTests.cs`
- **New frontend files**:
  - `src/sdamanagement-web/src/types/assignment.ts`
  - `src/sdamanagement-web/src/hooks/useMyAssignments.ts`
  - `src/sdamanagement-web/src/components/assignments/AssignmentCard.tsx`
  - `src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.tsx`
  - `src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.test.tsx`
  - `src/sdamanagement-web/src/mocks/handlers/assignments.ts`
- **Modified files**:
  - `src/SdaManagement.Api/Services/IActivityService.cs` — add `GetMyAssignmentsAsync()`
  - `src/SdaManagement.Api/Services/ActivityService.cs` — implement method
  - `src/SdaManagement.Api/Controllers/ActivitiesController.cs` — add endpoint + inject `ICurrentUserContext`
  - `src/sdamanagement-web/src/services/activityService.ts` — add `getMyAssignments()`
  - `src/sdamanagement-web/src/pages/DashboardPage.tsx` — add MyAssignmentsSection
  - `src/sdamanagement-web/public/locales/fr/common.json` — add keys
  - `src/sdamanagement-web/public/locales/en/common.json` — add keys
  - `src/sdamanagement-web/src/test-utils.tsx` — add test translation keys
  - `src/sdamanagement-web/src/lib/dateFormatting.ts` — add `formatRelativeDate()` utility

### Library & Framework Requirements

- **date-fns v4.1.0** (already installed): Use `formatDistanceToNow` with `{ addSuffix: true, locale: fr }` for relative date strings. Import `fr` from `date-fns/locale/fr` (tree-shakes correctly). The existing `formatActivityDate()` already handles "Ce sabbat" — extend or complement with relative distance for other dates.
- **@tanstack/react-query** (already installed): Follow `usePublicDashboard.ts` hook pattern exactly. Query key: `["activities", "my-assignments"]`.
- **shadcn/ui** (already installed): Use `Skeleton` component for loading states (detect in tests via `[data-slot="skeleton"]` selector).
- **`InitialsAvatar`** (already exists at `components/ui/initials-avatar.tsx`): Use with `size="xs"` for 28px co-assignee avatars. Accepts `firstName`, `lastName`, `avatarUrl?`, `size`, `className`. Renders `<img>` if avatarUrl provided, initials circle with deterministic color hash if not. Already has `role="img"` and `aria-label`.
- **No new dependencies required** for this story.

### Testing Requirements

- **Backend integration tests**: 12 tests covering RBAC (401 anonymous, VIEWER/ADMIN/OWNER personal only), data correctness (future-only, sorted, co-assignees exclude self, multi-role same activity, guest in co-assignees, empty result, both visibility types, null department)
- **Frontend component test**: 8+ assertions on MyAssignmentsSection — data rendering, empty state, loading state, first card emphasis, co-assignees, guest label, heading hierarchy, accessibility
- **No E2E test** for this story — E2E will be covered in Story 6.3 when the full dashboard is assembled

### Previous Story Intelligence (Story 5.5 — Public Calendar View)

- `formatActivityDate()` in `lib/dateFormatting.ts` handles Saturday-specific "Ce sabbat" logic — reuse this for assignment cards
- `formatTime()` utility already handles "HH:mm:ss" → "10h00" conversion — reuse for startTime/endTime display
- Lazy loading pattern for new pages is established (Schedule-X) — `DashboardPage` is already lazy-loaded, no additional setup needed
- MSW handler pattern: use `http.get("/api/activities/my-assignments", ...)` with `HttpResponse.json()`
- Test pattern: import `{ render, screen, waitFor }` from `@/test-utils` (custom `render` auto-wraps with all providers — I18n, QueryClient, AuthContext, Router). Assert with `screen.getByText()`, `screen.getByRole()`. Skeleton detection: `document.querySelectorAll('[data-slot="skeleton"]')`

### Git Intelligence (Recent Commits)

- Commit pattern: `feat(scope): Story X.Y — short description`
- For this story: `feat(dashboard): Story 6.1 — Personal assignments view with My Assignments section`
- Recent work completed all of Epic 5 (public dashboard). Code patterns are stable and well-established.
- The `ActivitiesController` was last touched in Epic 4 (Story 4.8 — concurrent edit detection). The controller uses primary constructor injection.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.1] — Acceptance criteria, user story
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 2] — "Check and Confirm" officer personal view, lines 847-877
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience B] — "Check and Confirm" viewer experience, lines 502-507
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#ActivityCard] — Component specification, lines 1117-1149
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication] — JWT cookie, ICurrentUserContext, authorization patterns
- [Source: _bmad-output/planning-artifacts/architecture.md#API Conventions] — Endpoint naming, DTO patterns, controller template
- [Source: _bmad-output/planning-artifacts/prd.md#FR16-FR18] — Personal Assignment Management requirements
- [Source: src/SdaManagement.Api/Controllers/ActivitiesController.cs] — Existing controller pattern
- [Source: src/SdaManagement.Api/Services/IActivityService.cs] — Service interface pattern
- [Source: src/SdaManagement.Api/Data/AppDbContext.cs:174-188] — RoleAssignment entity configuration
- [Source: src/sdamanagement-web/src/hooks/usePublicDashboard.ts] — React Query hook pattern
- [Source: src/sdamanagement-web/src/lib/dateFormatting.ts] — Date formatting utilities
- [Source: tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs] — Test infrastructure

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- EF Core `.AsNoTracking()` causes cycle error with `RoleAssignment → ActivityRole → Assignments` include path. Removed `.AsNoTracking()` to match `GetByIdAsync()` pattern (tracking queries handle cycles via identity map).

### Completion Notes List

- Created `MyAssignmentListItem` and `CoAssigneeResponse` DTOs following existing record-style DTO patterns
- Implemented `GetMyAssignmentsAsync()` in `ActivityService` using two-step Include→Map pattern (same as `GetByIdAsync()` + `MapToResponse()`)
- Added `GET /api/activities/my-assignments` endpoint on `ActivitiesController` with `CanView()` authorization gate
- Injected `ICurrentUserContext` into `ActivitiesController` constructor for userId resolution
- Created 11 comprehensive integration tests covering: RBAC (401 anonymous, VIEWER/ADMIN personal only), data correctness (future-only, sorted, co-assignees exclude self, multi-role same activity, guest in co-assignees, empty result, both visibility types, null department)
- Created `MyAssignmentItem` and `CoAssignee` TypeScript interfaces
- Added `getMyAssignments()` to `activityService.ts` and `useMyAssignments()` React Query hook
- Created `AssignmentCard` component with department color border, dual date display (formatted + relative), department abbreviation badge, role name, time range, co-assignee avatars via `InitialsAvatar`, guest "(Invité)" label
- Created `MyAssignmentsSection` wrapper with loading skeleton, error state with retry, empty state with hint
- Added `formatRelativeDate()` utility to `dateFormatting.ts` using `date-fns` `formatDistanceToNow` with locale
- Integrated `MyAssignmentsSection` into `DashboardPage` below welcome message
- Added i18n keys for FR and EN in both locale files and test-utils
- Created MSW handlers with mock data (3 assignments, guest, co-assignees)
- Created 9 component tests covering rendering, empty state, loading skeleton, error state, first card emphasis, co-assignee avatars, guest label, heading hierarchy, accessibility

### Change Log

- 2026-03-13: Story 6.1 implemented — Personal assignments view with API endpoint, assignment cards, dashboard integration, full test coverage
- 2026-03-13: Code review — 11 issues found (1 HIGH, 5 MEDIUM, 5 LOW), all fixed:
  - H1: AssignmentCard converted from raw Tailwind colors to semantic tokens (bg-background, text-foreground, text-primary, text-muted-foreground, border-border)
  - M1: Added OWNER integration test (GetMyAssignments_AsOwner_ReturnsOnlyPersonalAssignments)
  - M2: Fixed React key collision risk by adding index tiebreaker to AssignmentCard key
  - M3: Normalized activityService.getMyAssignments to return AxiosResponse (unwrap moved to hook)
  - M4: Department badge changed from title to aria-label for screen reader accessibility
  - M5: Added role="alert" to error state for screen reader announcement
  - L1: Captured _ownerUserId in integration test SeedTestData
  - L3: Added EN locale myAssignments keys to test-utils.tsx
  - L4: Added isValid guard to formatRelativeDate
  - L5: Removed hardcoded #E2E8F0 fallback in AssignmentCard (uses border-border via undefined fallback)
  - MyAssignmentsSection also converted to semantic tokens (skeleton, error, empty states)

### File List

**New files:**
- src/SdaManagement.Api/Dtos/Activity/MyAssignmentListItem.cs
- src/SdaManagement.Api/Dtos/Activity/CoAssigneeResponse.cs
- tests/SdaManagement.Api.IntegrationTests/Activities/MyAssignmentsEndpointTests.cs
- src/sdamanagement-web/src/types/assignment.ts
- src/sdamanagement-web/src/hooks/useMyAssignments.ts
- src/sdamanagement-web/src/components/assignments/AssignmentCard.tsx
- src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.tsx
- src/sdamanagement-web/src/components/assignments/MyAssignmentsSection.test.tsx
- src/sdamanagement-web/src/mocks/handlers/assignments.ts

**Modified files:**
- src/SdaManagement.Api/Services/IActivityService.cs — added `GetMyAssignmentsAsync()`
- src/SdaManagement.Api/Services/ActivityService.cs — implemented `GetMyAssignmentsAsync()`
- src/SdaManagement.Api/Controllers/ActivitiesController.cs — added endpoint + injected `ICurrentUserContext`
- src/sdamanagement-web/src/services/activityService.ts — added `getMyAssignments()`
- src/sdamanagement-web/src/pages/DashboardPage.tsx — added `MyAssignmentsSection`
- src/sdamanagement-web/public/locales/fr/common.json — added myAssignments keys
- src/sdamanagement-web/public/locales/en/common.json — added myAssignments keys
- src/sdamanagement-web/src/test-utils.tsx — added myAssignments test translations
- src/sdamanagement-web/src/lib/dateFormatting.ts — added `formatRelativeDate()` utility
