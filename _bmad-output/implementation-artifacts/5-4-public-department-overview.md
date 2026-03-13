# Story 5.4: Public Department Overview

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **anonymous visitor**,
I want to see a department overview showing all departments with their next scheduled activity,
So that I understand the church's organizational structure and what each department has coming up.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–5.3 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2, Story 2.1/2.2) — at least 3-4 departments with colors and descriptions
- Activities with public visibility created (from Epic 4) — some linked to departments for next-activity display

### Codebase State (Story 5.3 Complete)

- `PublicController` exists at `api/public` with four endpoints: `GET /api/public/next-activity` (200/204), `GET /api/public/live-status` (200), `GET /api/public/upcoming-activities` (200), `GET /api/public/program-schedules` (200)
- `IPublicService` / `PublicService` exist with `GetNextActivityAsync()`, `GetUpcomingActivitiesAsync()`, `GetProgramSchedulesAsync()` — extend with new method
- Public DTOs exist in `Dtos/Public/`: `PublicNextActivityResponse`, `PublicActivityListItem`, `PublicProgramScheduleResponse`, `PublicLiveStatusResponse` — add new DTO
- `Department` entity has: `Id`, `Name`, `Abbreviation`, `Color` (#hex), `Description` (nullable), `CreatedAt`, `UpdatedAt`, `SubMinistries`, `UserDepartments` [Source: `Data/Entities/Department.cs`]
- `Activity` entity has `Visibility` enum (`Public = 0`, `Authenticated = 1`), `DepartmentId` FK, `Date`, `StartTime`, `Title`
- `useNextActivity()`, `useChurchInfo()`, `useLiveStatus()`, `useUpcomingActivities()`, `useProgramSchedules()` hooks exist in `hooks/usePublicDashboard.ts` — extend with new hook
- `publicService.ts` has 4 methods: `getNextActivity`, `getLiveStatus`, `getUpcomingActivities`, `getProgramSchedules` — extend with new method
- `types/public.ts` has 4 interfaces: `PublicNextActivity`, `LiveStatus`, `PublicActivityListItem`, `PublicProgramSchedule` — extend with new type
- `HeroSection.tsx`, `YouTubeSection.tsx`, `UpcomingActivitiesSection.tsx`, `ProgramTimesSection.tsx` exist in `components/public/`
- `HomePage.tsx` has placeholder at line 17-18: `{/* Future: Story 5.4 — Public department overview */}` with empty `<section>` — replace with `<DepartmentOverviewSection />`
- MSW handlers exist at `mocks/handlers/public.ts` for all 4 existing endpoints — extend with department handler
- "public" rate limiting policy exists (30 req/min per IP) in `ServiceCollectionExtensions.cs`
- i18n keys exist under `pages.home.*` in both `en/common.json` and `fr/common.json` — add department-related keys
- Section wrapper pattern established: `<section className="bg-white" aria-labelledby={headingId}>` with `<div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">`
- Card pattern established in `ActivityCard.tsx`: `rounded-2xl border border-l-4 border-slate-200 bg-white p-4 sm:p-5` with inline `borderLeftColor` from department color
- Test pattern established in `UpcomingActivitiesSection.test.tsx`: MSW server setup, `authHandlers` + domain handlers, vitest + `@/test-utils` render, `waitFor` for async assertions

## Acceptance Criteria

1. **Department overview section on public dashboard**: Given the public dashboard, When the department overview section renders below the Program Times section, Then it displays all departments in a responsive card grid with: department name (bold), abbreviation badge, description (2-line truncated), department color left-border, and next scheduled public activity (FR5), And the warm label "Nos Departements" is used as section heading, And the section has a `bg-slate-50` background for visual separation.

2. **Department card layout**: Given a department card in the grid, Then it uses the compact card style: `rounded-2xl border border-l-4 border-slate-200 bg-white p-4 sm:p-5` with inline `borderLeftColor` set to the department's hex color, And displays: department name (bold, `text-lg`), abbreviation as a small badge, description truncated to 2 lines with `line-clamp-2`, And a separator line before the next activity info, And cards are static (no click/tap navigation for MVP — navigation deferred to Epic 8).

3. **Next activity per department**: Given a department has upcoming public-visibility activities, When the card renders, Then it shows the next activity below the description: formatted date (warm locale-aware format, e.g., "22 mars") + time (e.g., "14h00") + activity title, Given a department has NO upcoming public activities, When the card renders, Then it shows "Aucune activite planifiee" in `text-slate-400` italic instead of a next activity line.

4. **Responsive grid**: Given the dashboard on mobile (< 640px), Then the grid is single-column (`grid-cols-1`), Given tablet (640px–1023px), Then the grid is 2-column (`sm:grid-cols-2`), Given desktop (>= 1024px), Then the grid is 3-column (`lg:grid-cols-3`), And gap between cards is `gap-4`.

5. **Public API endpoint**: Given `GET /api/public/departments` is called without authentication, Then all departments are returned with: `id`, `name`, `abbreviation`, `color`, `description`, and optional next activity fields (`nextActivityTitle`, `nextActivityDate`, `nextActivityStartTime`), And no sub-ministry details, no internal meeting info, no `createdAt`/`updatedAt`, no user counts, no `userId` fields (NFR9), And the endpoint uses `[AllowAnonymous]` and `[EnableRateLimiting("public")]`, And departments are ordered alphabetically by name.

6. **Empty states**: Given no departments exist in the system, When the department overview section renders, Then the entire section is hidden (no empty container, no heading), Given departments exist but the API call fails, Then an error message displays: `pages.home.loadError` i18n key.

7. **Skeleton loading**: Given the department data is loading, When the section renders, Then skeleton placeholders display in the grid layout (6 skeleton cards matching the card dimensions), And skeletons have the same `rounded-2xl` shape as real cards.

8. **Accessibility**: Given the department overview section, Then the section has `aria-labelledby` pointing to the heading `id`, And department descriptions that are truncated have a `title` attribute with the full text, And all color usage is paired with text labels (department abbreviation badge always visible alongside color border), And heading follows semantic hierarchy (`h2`).

## Tasks / Subtasks

### Backend — DTO

- [x] Task 1: Create Public Department Response DTO (AC: #5)
  - [x] 1.1 Create `src/SdaManagement.Api/Dtos/Public/PublicDepartmentResponse.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Public;

    public record PublicDepartmentResponse(
        int Id,
        string Name,
        string Abbreviation,
        string Color,
        string? Description,
        string? NextActivityTitle,
        DateOnly? NextActivityDate,
        TimeOnly? NextActivityStartTime);
    ```
  - [x] 1.2 Verify NO `createdAt`, NO `updatedAt`, NO `subMinistries`, NO `userDepartments`, NO `userId`, NO `userCount` fields. This is a flat record — no nested objects.

### Backend — Service

- [x] Task 2: Add GetPublicDepartmentsAsync to PublicService (AC: #5, #6)
  - [x] 2.1 Add method signature to `src/SdaManagement.Api/Services/IPublicService.cs`:
    ```csharp
    Task<List<PublicDepartmentResponse>> GetPublicDepartmentsAsync();
    ```
  - [x] 2.2 Implement in `src/SdaManagement.Api/Services/PublicService.cs` using a **single correlated subquery** (NOT three separate ones):
    ```csharp
    public async Task<List<PublicDepartmentResponse>> GetPublicDepartmentsAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Now);

        var departments = await dbContext.Departments
            .AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new
            {
                d.Id,
                d.Name,
                d.Abbreviation,
                d.Color,
                d.Description,
                NextActivity = dbContext.Activities
                    .Where(a => a.DepartmentId == d.Id
                             && a.Visibility == ActivityVisibility.Public
                             && a.Date >= today)
                    .OrderBy(a => a.Date)
                        .ThenBy(a => a.StartTime)
                    .Select(a => new { a.Title, a.Date, a.StartTime })
                    .FirstOrDefault()
            })
            .ToListAsync();

        return departments.Select(d => new PublicDepartmentResponse(
            d.Id,
            d.Name,
            d.Abbreviation,
            d.Color,
            d.Description,
            d.NextActivity?.Title,
            d.NextActivity?.Date,
            d.NextActivity?.StartTime))
            .ToList();
    }
    ```
  - [x] 2.3 **CRITICAL entity detail**: `Activity.DepartmentId` is `int?` (nullable) with `OnDelete(DeleteBehavior.SetNull)`. There is **NO inverse navigation** `Department.Activities` — always query via `dbContext.Activities.Where(a => a.DepartmentId == d.Id)`, never `d.Activities`.
  - [x] 2.4 **Fallback approach** if EF Core/Npgsql fails to translate the correlated subquery: two-query in-memory join:
    ```csharp
    var departments = await dbContext.Departments.AsNoTracking().OrderBy(d => d.Name).ToListAsync();
    var nextActivities = await dbContext.Activities
        .Where(a => a.Visibility == ActivityVisibility.Public && a.Date >= today && a.DepartmentId != null)
        .GroupBy(a => a.DepartmentId!.Value)
        .Select(g => new
        {
            DepartmentId = g.Key,
            Activity = g.OrderBy(a => a.Date).ThenBy(a => a.StartTime)
                .Select(a => new { a.Title, a.Date, a.StartTime }).FirstOrDefault()
        })
        .ToListAsync();
    var activityLookup = nextActivities.ToDictionary(a => a.DepartmentId, a => a.Activity);
    return departments.Select(d => {
        activityLookup.TryGetValue(d.Id, out var next);
        return new PublicDepartmentResponse(d.Id, d.Name, d.Abbreviation, d.Color, d.Description,
            next?.Title, next?.Date, next?.StartTime);
    }).ToList();
    ```
  - [x] 2.5 **WARNING**: The GroupBy approach (Task 2.4) may not translate in Npgsql/PostgreSQL. If it throws at runtime, use the primary approach (Task 2.2) or split into two simple queries without GroupBy. Test with `dotnet ef` logging to verify the generated SQL.

### Backend — Controller

- [x] Task 3: Add Departments Endpoint to PublicController (AC: #5)
  - [x] 3.1 Add to `src/SdaManagement.Api/Controllers/PublicController.cs`:
    ```csharp
    [AllowAnonymous]
    [HttpGet("departments")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetPublicDepartments()
    {
        var result = await publicService.GetPublicDepartmentsAsync();
        return Ok(result);
    }
    ```
  - [x] 3.2 Note: Always returns 200 with array (empty array if no departments). No 204 — the frontend hides the section client-side when array is empty.

### Frontend — Types

- [x] Task 4: Add PublicDepartment Interface (AC: #1, #3)
  - [x] 4.1 Add to `src/sdamanagement-web/src/types/public.ts`:
    ```typescript
    export interface PublicDepartment {
      id: number;
      name: string;
      abbreviation: string;
      color: string;
      description: string | null;
      nextActivityTitle: string | null;
      nextActivityDate: string | null;   // ISO DateOnly "2026-03-22"
      nextActivityStartTime: string | null; // ISO TimeOnly "14:00:00"
    }
    ```

### Frontend — Service

- [x] Task 5: Add getDepartments to publicService (AC: #5)
  - [x] 5.1 Add to `src/sdamanagement-web/src/services/publicService.ts`:
    ```typescript
    getDepartments: () =>
      api
        .get<PublicDepartment[]>("/api/public/departments")
        .then((res) => res.data),
    ```
  - [x] 5.2 Add `PublicDepartment` to the import from `@/types/public`.

### Frontend — Hook

- [x] Task 6: Add useDepartments Hook (AC: #1)
  - [x] 6.1 Add to `src/sdamanagement-web/src/hooks/usePublicDashboard.ts`:
    ```typescript
    export function useDepartments() {
      return useQuery<PublicDepartment[]>({
        queryKey: ["public", "departments"],
        queryFn: publicService.getDepartments,
        staleTime: 30 * 60 * 1000, // 30 minutes — departments rarely change
        retry: 1,
      });
    }
    ```
  - [x] 6.2 Add `PublicDepartment` to the type import from `@/types/public`.

### Frontend — Component

- [x] Task 7: Create DepartmentOverviewSection Component (AC: #1, #2, #3, #4, #6, #7, #8)
  - [x] 7.1 Create `src/sdamanagement-web/src/components/public/DepartmentOverviewSection.tsx`:
    - Import: `useTranslation`, `Skeleton`, `Badge` from `@/components/ui/badge`, `useDepartments` hook, `formatActivityDate`, `formatTime` from `@/lib/dateFormatting`
    - Section wrapper: `<section className="bg-slate-50" aria-labelledby={headingId}>`
    - Inner container: `<div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">`
    - Heading: `<h2 id={headingId} className="text-2xl font-bold text-slate-900">{t("pages.home.departmentsTitle")}</h2>`
    - **Empty state** (AC #6): If `data` is defined AND `data.length === 0`, return `null` (hide entire section, no heading, no container)
    - **Loading state** (AC #7): Show 6 skeleton cards in the grid with `rounded-2xl border border-slate-200 bg-white p-4` containing stacked `<Skeleton>` elements
    - **Error state** (AC #6): Show `<p>` with `t("pages.home.loadError")`
    - **Data state**: Render grid `<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">`
  - [x] 7.2 Department card markup (inline, no separate component):
    ```tsx
    <article
      key={dept.id}
      className="rounded-2xl border border-l-4 border-slate-200 bg-white p-4 sm:p-5"
      style={{ borderLeftColor: dept.color || "#E2E8F0" }}
      aria-label={dept.name}
    >
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-bold text-slate-900">{dept.name}</h3>
        <Badge variant="secondary" title={dept.name}>
          {dept.abbreviation}
        </Badge>
      </div>
      {dept.description && (
        <p
          className="mt-1 line-clamp-2 text-sm text-slate-600"
          title={dept.description}
        >
          {dept.description}
        </p>
      )}
      <div className="mt-3 border-t border-slate-100 pt-3">
        {dept.nextActivityTitle ? (
          <p className="text-sm text-slate-500">
            {formatDeptActivityDate(dept.nextActivityDate, dept.nextActivityStartTime, t, i18n.language)}
            {" — "}
            {dept.nextActivityTitle}
          </p>
        ) : (
          <p className="text-sm italic text-slate-400">
            {t("pages.home.noPlannedActivity")}
          </p>
        )}
      </div>
    </article>
    ```
    - **Note**: Uses `<Badge variant="secondary">` (same as ActivityCard.tsx line 58) for abbreviation — NOT a hand-crafted `<span>`. Also includes `aria-label` on `<article>` for screen reader users (same pattern as ActivityCard).
  - [x] 7.3 Date/time formatting — use the **existing shared utilities** at `@/lib/dateFormatting.ts`:
    ```typescript
    import { formatActivityDate, formatTime } from "@/lib/dateFormatting";

    // Local helper combining date + time for department card display:
    function formatDeptActivityDate(
      date: string | null,
      time: string | null,
      t: (key: string) => string,
      lang: string
    ): string {
      if (!date) return "";
      const dateStr = formatActivityDate(date, t, lang);
      // formatActivityDate returns "Ce Sabbat" or "samedi 22 mars"
      const timeStr = time ? formatTime(time) : "";
      // formatTime returns "14h00" format (French-only — established pattern)
      return timeStr ? `${dateStr} ${timeStr}` : dateStr;
    }
    ```
  - [x] 7.4**DO NOT create new date utilities.** The shared module already exists and is fully tested (`lib/dateFormatting.test.ts`, 26 test cases). Functions: `formatActivityDate(dateStr, t, lang)` → "Ce Sabbat" or "samedi 14 mars", `formatTime(timeStr)` → "9h30", `getDateLocale(lang)` → date-fns locale. Imported at `@/lib/dateFormatting`. Same imports used by `HeroSection.tsx`, `ActivityCard.tsx`, and `ProgramTimesSection.tsx`.
  - [x] 7.4a **Note on formatTime()**: Returns French format ("9h30") regardless of locale. This is the established pattern across all public components. Do NOT "fix" this — it's intentional for this primarily-French church app.
  - [x] 7.5 No hover effects on cards — no `cursor-pointer`, no `hover:shadow-md`, no `translateY`. Cards are static display for MVP.
  - [x] 7.6 No click handlers, no navigation. Static informational cards only.

### Frontend — Wire Into HomePage

- [x] Task 8: Replace Placeholder in HomePage (AC: #1)
  - [x] 8.1 In `src/sdamanagement-web/src/pages/HomePage.tsx`:
    - Add import: `import DepartmentOverviewSection from "@/components/public/DepartmentOverviewSection";`
    - Replace lines 17-18 (the placeholder comment + empty section) with: `<DepartmentOverviewSection />`
  - [x] 8.2 Final HomePage order: HeroSection → YouTubeSection → UpcomingActivitiesSection → ProgramTimesSection → DepartmentOverviewSection

### Frontend — i18n

- [x] Task 9: Add Translation Keys (AC: #1, #3, #6)
  - [x] 9.1 Add to `src/sdamanagement-web/public/locales/fr/common.json` under `pages.home`:
    ```json
    "departmentsTitle": "Nos Departements",
    "noPlannedActivity": "Aucune activite planifiee"
    ```
  - [x] 9.2 Add to `src/sdamanagement-web/public/locales/en/common.json` under `pages.home`:
    ```json
    "departmentsTitle": "Our Departments",
    "noPlannedActivity": "No planned activities"
    ```
  - [x] 9.3 **Use proper French characters**: "Nos Departements" → "Nos D\u00e9partements", "Aucune activite planifiee" → "Aucune activit\u00e9 planifi\u00e9e". Check the existing pattern — the JSON file uses Unicode escapes for accented characters.
  - [x] 9.4 **CRITICAL: Update test-utils.tsx hardcoded translations.** The file `src/sdamanagement-web/src/test-utils.tsx` has INLINE French translations (NOT loaded from JSON files). Add the new keys to the `pages.home` object at approximately line 71 (after `programSchedulesTitle`):
    ```typescript
    departmentsTitle: "Nos Départements",
    noPlannedActivity: "Aucune activité planifiée",
    ```
    Without this, all test assertions checking for French text will fail.

### Frontend — MSW Mock Handlers

- [x] Task 10: Add Department Mock Data and Handlers (AC: #1, #3, #6)
  - [x] 10.1 Add to `src/sdamanagement-web/src/mocks/handlers/public.ts`:
    ```typescript
    import type { PublicDepartment } from "@/types/public";

    const mockDepartments: PublicDepartment[] = [
      {
        id: 1,
        name: "Culte",
        abbreviation: "CU",
        color: "#F43F5E",
        description: "Organisation des cultes et services religieux chaque sabbat.",
        nextActivityTitle: "Culte du Sabbat",
        nextActivityDate: "2026-03-14",
        nextActivityStartTime: "09:30:00",
      },
      {
        id: 2,
        name: "Jeunesse Adventiste",
        abbreviation: "JA",
        color: "#14B8A6",
        description: "Activites pour les jeunes et les Explorateurs de notre communaute.",
        nextActivityTitle: "Programme JA",
        nextActivityDate: "2026-03-14",
        nextActivityStartTime: "14:00:00",
      },
      {
        id: 3,
        name: "Ministere de la Femme",
        abbreviation: "MIFEM",
        color: "#8B5CF6",
        description: "Soutien, formation et activites pour les femmes de la communaute.",
        nextActivityTitle: null,
        nextActivityDate: null,
        nextActivityStartTime: null,
      },
    ];

    export const departmentHandlers = [
      http.get("/api/public/departments", () =>
        HttpResponse.json(mockDepartments)
      ),
    ];

    export const departmentHandlersEmpty = [
      http.get("/api/public/departments", () =>
        HttpResponse.json([])
      ),
    ];

    export const departmentHandlersError = [
      http.get("/api/public/departments", () =>
        new HttpResponse(null, { status: 500 })
      ),
    ];
    ```
  - [x] 10.2 Export `mockDepartments` for test reuse.

### Frontend — Update HomePage Test

- [x] Task 11: Update HomePage.test.tsx to Include Department Handlers (AC: #1)
  - [x] 11.1 In `src/sdamanagement-web/src/pages/HomePage.test.tsx`:
    - Add import: `import { departmentHandlers } from "@/mocks/handlers/public";`
    - Add `...departmentHandlers` to the `setupServer()` call (line 14-21)
    - Existing tests should continue to pass unchanged
  - [x] 11.2 Optionally add a new test:
    ```typescript
    it("renders DepartmentOverviewSection", async () => {
      render(<HomePage />);
      await waitFor(() => {
        expect(screen.getByText("Nos Départements")).toBeInTheDocument();
      });
    });
    ```

### Frontend — Tests

- [x] Task 12: Create DepartmentOverviewSection Tests (AC: #1, #2, #3, #6, #7, #8)
  - [x] 12.1 Create `src/sdamanagement-web/src/components/public/DepartmentOverviewSection.test.tsx`:
    - Follow exact pattern from `UpcomingActivitiesSection.test.tsx`
    - Setup: `setupServer(...authHandlers, ...departmentHandlers)`
    - Tests:
      1. **Renders section heading** — `await waitFor(() => expect(screen.getByText("Nos Départements")).toBeInTheDocument())`
      2. **Renders department cards** — check for "Culte", "Jeunesse Adventiste", "Ministere de la Femme"
      3. **Renders correct card count** — `screen.getAllByRole("article").length === 3`
      4. **Renders next activity for dept with activity** — check for "Culte du Sabbat"
      5. **Renders "Aucune activite planifiee" for dept without activity** — check for the empty state text
      6. **Hides section when no departments** — `server.use(...departmentHandlersEmpty)`, verify section heading NOT in document
      7. **Renders skeleton loading states** — `document.querySelectorAll('[data-slot="skeleton"]').length > 0`
      8. **Renders error message on API failure** — `server.use(...departmentHandlersError)`, check for error text

## Dev Notes

### Architecture Patterns & Constraints

- **Public endpoint pattern**: `[AllowAnonymous]` + `[EnableRateLimiting("public")]` on controller method. No auth service injection needed. Always returns 200 with array. [Source: `Controllers/PublicController.cs`]
- **Service pattern**: `PublicService` queries `dbContext` directly with `.AsNoTracking()` for read-only data. Uses `.Select()` projection to DTO — services return DTOs, never entities. [Source: `Services/PublicService.cs`]
- **DTO pattern**: Flat `record` type in `Dtos/Public/` namespace. One DTO per file. Explicitly whitelisted fields only — no `[JsonIgnore]` as security mechanism. [Source: `Dtos/Public/PublicActivityListItem.cs`]
- **EF Core query**: Use `.Select()` projection with correlated subquery for next activity. If EF Core struggles, fall back to two-query approach (fetch departments + fetch next activities grouped by dept, join in-memory). Use `.AsNoTracking()`. [Source: architecture.md — "EF Core `.Select()` projections for all list/dashboard endpoints"]
- **No pagination**: Department count is small (8-12 max). Return full list always. No cursor-based pagination needed.
- **Ordering**: `OrderBy(d => d.Name)` alphabetically.
- **No `IsActive` flag**: The `Department` entity has no active/inactive status. Return all departments.
- **Activity.DepartmentId is `int?` (nullable)**: Activities can exist without a department. The FK uses `OnDelete(DeleteBehavior.SetNull)`. There is **no inverse navigation property** `Department.Activities` — always query via `dbContext.Activities.Where(a => a.DepartmentId == d.Id)`. [Source: `Data/Entities/Activity.cs` line 11, `Data/AppDbContext.cs` lines 144-158]

### Frontend Patterns

- **Hook pattern**: `useQuery<T[]>` with `queryKey: ["public", "departments"]`, `staleTime: 30 * 60 * 1000` (departments rarely change), `retry: 1`. [Source: `hooks/usePublicDashboard.ts`]
- **Service pattern**: Method on `publicService` object using `api.get<T>()` then `.then(res => res.data)`. [Source: `services/publicService.ts`]
- **Component pattern**: Section wrapper → heading → loading/error/empty/data states. Use `isPending` (not `isLoading`) for TanStack Query v5. [Source: `components/public/UpcomingActivitiesSection.tsx`]
- **Card pattern**: `<article>` element with `rounded-2xl border border-l-4 border-slate-200 bg-white p-4 sm:p-5`. Inline `style={{ borderLeftColor }}` for department color. [Source: `components/public/ActivityCard.tsx`]
- **Skeleton pattern**: Match card shape with `<Skeleton>` components. Use `data-slot="skeleton"` attribute (from shadcn/ui Skeleton). Show 6 skeleton cards (two full rows at 3-col desktop). [Source: `UpcomingActivitiesSection.tsx` lines 23-37]
- **i18n pattern**: `useTranslation()` hook, keys under `pages.home.*`. Unicode escapes for French accented characters in JSON files. [Source: `locales/fr/common.json`]
- **MSW pattern**: Named handler arrays (`departmentHandlers`, `departmentHandlersEmpty`, `departmentHandlersError`). Export mock data for test reuse. [Source: `mocks/handlers/public.ts`]

### UX Design Compliance

- **Section heading**: "Nos Departements" (FR warm label) / "Our Departments" (EN). NOT "Unites Ministerielles" — that's the operational register vocabulary. [Source: ux-design-specification.md — Vocabulary Register table, line 291]
- **Background**: `bg-slate-50` for visual separation from ProgramTimesSection above.
- **Department color**: 4px left-border accent is the primary visual signal. Colors are stored as #hex in database. Department abbreviation badge is NEUTRAL (`bg-slate-100 text-slate-600`) — NOT colored. Color is secondary identifier, text is primary. [Source: ux-design-specification.md — "Department colors never appear without an accompanying text label"]
- **Description truncation**: `line-clamp-2` with `title` attribute for full text on hover. [Source: ux-design-specification.md — accessibility]
- **No hover effects**: Cards are static for MVP. No `cursor-pointer`, no `hover:shadow-md`, no lift animation. [Source: Elicitation decision — static display only]
- **Grid layout**: 1-col mobile → 2-col tablet → 3-col desktop. `gap-4`. Uses CSS Grid (not Flexbox) for equal card heights per row.
- **Empty section**: Hidden entirely when no departments (return `null`). No empty container, no heading.
- **Touch targets**: Cards don't need 44px touch targets since they're non-interactive.
- **Motion**: No animations on cards. Skeleton pulse respects `prefers-reduced-motion`.

### Date/Time Formatting

- **Shared utilities ALREADY exist** at `src/sdamanagement-web/src/lib/dateFormatting.ts` — fully tested (26 test cases in `dateFormatting.test.ts`):
  - `formatActivityDate(dateStr, t, lang)` — returns "Ce Sabbat" (if this Saturday) or locale-formatted date like "samedi 22 mars" (format: `EEEE d MMMM`)
  - `formatTime(timeStr)` — converts "HH:mm:ss" to "9h30" French format. **Always French — intentional design choice for this primarily-French app.** Do NOT "fix" to English format.
  - `getDateLocale(lang)` — returns `fr` or `enUS` date-fns locale
- Import path: `import { formatActivityDate, formatTime } from "@/lib/dateFormatting"`
- Same imports used by `HeroSection.tsx`, `ActivityCard.tsx`, `ProgramTimesSection.tsx` — do NOT create new utilities.
- For the department card, combine date + time: `"samedi 22 mars 14h00 — Culte du Sabbat"`

### Project Structure Notes

- All new files align with established structure:
  - Backend DTO: `src/SdaManagement.Api/Dtos/Public/PublicDepartmentResponse.cs`
  - Backend service: modify existing `Services/PublicService.cs` and `Services/IPublicService.cs`
  - Backend controller: modify existing `Controllers/PublicController.cs`
  - Frontend type: modify existing `types/public.ts`
  - Frontend service: modify existing `services/publicService.ts`
  - Frontend hook: modify existing `hooks/usePublicDashboard.ts`
  - Frontend component: new `components/public/DepartmentOverviewSection.tsx`
  - Frontend page: modify existing `pages/HomePage.tsx`
  - Frontend mocks: modify existing `mocks/handlers/public.ts`
  - Frontend tests: new `components/public/DepartmentOverviewSection.test.tsx`
  - i18n: modify existing `locales/en/common.json` and `locales/fr/common.json`
  - Test infra: modify existing `test-utils.tsx` (add hardcoded i18n keys)
  - HomePage test: modify existing `pages/HomePage.test.tsx` (add department handlers)
- No new directories needed. All files go into existing folders.
- No database migration needed — Department entity already has all required fields.
- No new dependencies needed — all libraries (date-fns, TanStack Query, MSW, vitest) already installed.

### References

- [Source: `src/SdaManagement.Api/Controllers/PublicController.cs`] — Public endpoint pattern (AllowAnonymous, EnableRateLimiting)
- [Source: `src/SdaManagement.Api/Services/PublicService.cs`] — Service query pattern (Include, Select, AsNoTracking)
- [Source: `src/SdaManagement.Api/Services/IPublicService.cs`] — Interface pattern
- [Source: `src/SdaManagement.Api/Dtos/Public/PublicActivityListItem.cs`] — DTO record pattern
- [Source: `src/SdaManagement.Api/Data/Entities/Department.cs`] — Department entity (Id, Name, Abbreviation, Color, Description)
- [Source: `src/sdamanagement-web/src/components/public/UpcomingActivitiesSection.tsx`] — Section component pattern
- [Source: `src/sdamanagement-web/src/components/public/ActivityCard.tsx`] — Card pattern (left-border, department color)
- [Source: `src/sdamanagement-web/src/hooks/usePublicDashboard.ts`] — Hook pattern (queryKey, staleTime, retry)
- [Source: `src/sdamanagement-web/src/services/publicService.ts`] — Service method pattern
- [Source: `src/sdamanagement-web/src/types/public.ts`] — Type interface pattern
- [Source: `src/sdamanagement-web/src/mocks/handlers/public.ts`] — MSW handler pattern
- [Source: `src/sdamanagement-web/src/components/public/UpcomingActivitiesSection.test.tsx`] — Test pattern
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Vocabulary Register`] — "Nos Departements" warm label
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Department Color Palette`] — Color system (muted tints, always with text labels)
- [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Layout System`] — Card grid responsive breakpoints
- [Source: `_bmad-output/planning-artifacts/architecture.md`] — Public API patterns, DTO constraints, EF Core projections
- [Source: `_bmad-output/planning-artifacts/epics.md#Story 5.4`] — Original acceptance criteria and BDD scenarios

### Previous Story Intelligence (Story 5.3)

- **Pattern proven**: Section wrapper → heading → isPending/isError/data/empty conditional rendering. This exact pattern works for DepartmentOverviewSection.
- **Date formatting**: Story 5.3 extracted `formatTime()`, `formatActivityDate()`, and `getDateLocale()` to `@/lib/dateFormatting.ts`. Already shared and fully tested. Import and reuse — do NOT create duplicates.
- **MSW handler structure**: Story 5.3 added `upcomingActivitiesHandlers`, `upcomingActivitiesHandlersEmpty`, `upcomingActivitiesHandlersError` — exact same pattern needed for departments.
- **Test structure**: Story 5.3's `UpcomingActivitiesSection.test.tsx` has 6 tests covering heading, cards, count, empty, skeleton, error. Same test suite structure for departments plus 2 additional tests (next activity text, "aucune activite" text).
- **Card border pattern**: `ActivityCard.tsx` uses `style={{ borderLeftColor: activity.departmentColor ?? "#E2E8F0" }}` — reuse same fallback color `#E2E8F0` (slate-200) when department color is null/empty.

### Git Intelligence

- Recent commits show Story 5.x features landing rapidly (5.1, 5.2, 5.3 all committed)
- UI validation fixes are a recurring theme — expect a UI validation pass after implementation
- Commit style: `feat(public): Story 5.4 — Public department overview with next activity`
- No breaking changes in recent history — straightforward feature addition

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Backend correlated subquery (Task 2.2) used as primary approach; compiles and builds successfully
- All 8 DepartmentOverviewSection tests pass on first run
- All 6 HomePage tests pass (including new department test)
- Full regression: 389 frontend tests pass, 566 backend tests pass (246 unit + 320 integration)

### Completion Notes List

- Created `PublicDepartmentResponse` DTO as flat record with 8 fields (no internal fields exposed per NFR9)
- Implemented `GetPublicDepartmentsAsync()` with correlated subquery for next public activity per department
- Added `GET /api/public/departments` endpoint with `[AllowAnonymous]` + `[EnableRateLimiting("public")]`
- Created `DepartmentOverviewSection` component with: bg-slate-50 background, responsive 1/2/3-col grid, department cards with color left-border, abbreviation badge, 2-line truncated description, next activity date/time, empty/loading/error states
- Reused existing `formatActivityDate` and `formatTime` shared utilities (no new date utilities created)
- Added i18n keys for FR ("Nos Departements", "Aucune activite planifiee") and EN equivalents
- Added MSW mock handlers with 3 department variants (data, empty, error)
- 8 dedicated component tests + 1 HomePage integration test covering all ACs

### Change Log

- 2026-03-13: Story 5.4 implementation complete — public department overview with next activity per department

### File List

**New files:**
- src/SdaManagement.Api/Dtos/Public/PublicDepartmentResponse.cs
- src/sdamanagement-web/src/components/public/DepartmentOverviewSection.tsx
- src/sdamanagement-web/src/components/public/DepartmentOverviewSection.test.tsx

**Modified files:**
- src/SdaManagement.Api/Services/IPublicService.cs
- src/SdaManagement.Api/Services/PublicService.cs
- src/SdaManagement.Api/Controllers/PublicController.cs
- src/sdamanagement-web/src/types/public.ts
- src/sdamanagement-web/src/services/publicService.ts
- src/sdamanagement-web/src/hooks/usePublicDashboard.ts
- src/sdamanagement-web/src/pages/HomePage.tsx
- src/sdamanagement-web/src/pages/HomePage.test.tsx
- src/sdamanagement-web/src/mocks/handlers/public.ts
- src/sdamanagement-web/src/test-utils.tsx
- src/sdamanagement-web/public/locales/fr/common.json
- src/sdamanagement-web/public/locales/en/common.json
- _bmad-output/implementation-artifacts/sprint-status.yaml
