# Story 5.3: Upcoming Activities & Program Times

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **anonymous visitor**,
I want to see upcoming church activities for the next 4 weeks and recurring program times,
So that I can plan ahead and know the regular church schedule.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–5.2 migrations applied (`dotnet ef database update`)
- YouTube API key configured (from Story 5.2) — not strictly required for this story but needed for full public dashboard testing

### Codebase State (Epic 5.2 Complete)

- `PublicController` exists at `api/public` with two endpoints: `GET /api/public/next-activity` (200/204) and `GET /api/public/live-status` (200)
- `IPublicService` / `PublicService` exist with `GetNextActivityAsync()` — extend with new methods
- `PublicNextActivityResponse` DTO exists in `Dtos/Public/` — reuse pattern for list DTO
- `useNextActivity()`, `useChurchInfo()`, `useLiveStatus()` hooks exist in `hooks/usePublicDashboard.ts` — extend with new hooks
- `publicService.ts` has `getNextActivity()` and `getLiveStatus()` — extend with new methods
- `types/public.ts` has `PublicNextActivity` and `LiveStatus` interfaces — extend with new types
- `HeroSection.tsx` and `YouTubeSection.tsx` exist in `components/public/` — display above this story's sections
- `HomePage.tsx` has placeholder `<section>` comments for Story 5.3 at lines 11–12
- `ProgramSchedule` entity exists (from Epic 2, Story 2.4) with `Title`, `DayOfWeek`, `StartTime`, `EndTime`, `HostName`, `DepartmentId`
- `Activity` entity exists with `Visibility` enum (`Public = 0`, `Authenticated = 1`), `Roles` → `Assignments` → `User`
- MSW handlers exist at `mocks/handlers/public.ts` for next-activity and live-status — extend with new handlers
- "public" rate limiting policy exists (30 req/min per IP) in `ServiceCollectionExtensions.cs`
- `formatTime()` and `formatActivityDate()` are defined locally in `HeroSection.tsx` — need to extract to shared utility for reuse
- `getDateLocale()` helper is local to `HeroSection.tsx` — also needs extraction

## Acceptance Criteria

1. **Upcoming activities list**: Given the public dashboard, When the upcoming activities section renders below the YouTube section, Then it displays public-visibility activities for the next 4 weeks (FR3), And each activity card shows: date (warm format), title, department name + color badge, special tag (if any), prédicateur name, And the warm label "Activités à venir" is used as section heading.

2. **Recurring program times**: Given recurring program schedules are configured (from Epic 2), When the program times section renders below the upcoming activities, Then it displays: program title, day name, start/end times, host name (FR4), And examples render like: "École du Sabbat — Samedi 9h30–10h30", "Culte Divin — Samedi 11h00–12h30", And the warm label "Horaire des programmes" is used as section heading.

3. **Public API security**: Given `GET /api/public/upcoming-activities` is called without authentication, Then only public-visibility activities are returned, And the response uses `PublicActivityListItem` DTOs (no `isGuest` flag, no `userId`, no internal IDs beyond the activity's own, no staffing counts, no concurrency tokens), And no authenticated-only data leaks (NFR9).

4. **Program schedules API**: Given `GET /api/public/program-schedules` is called without authentication, Then all recurring program schedules are returned with only public-safe fields, And no admin-only fields (no `CreatedAt`, no `UpdatedAt`, no internal entity IDs).

5. **Empty states**: Given no upcoming public activities exist, When the upcoming activities section renders, Then a warm empty state displays: "Aucune activité à venir — revenez bientôt!", Given no program schedules are configured, When the program times section renders, Then it is completely hidden (no empty container).

6. **Mobile responsive**: Given the public dashboard on mobile (375px), Then the activity cards stack vertically full-width, And the program times section is readable without horizontal scrolling, And department color badges are visible.

7. **Activity card design**: Given an upcoming activity card in the list, Then it has a 4px left-border colored with the department color, And shows a 28px prédicateur avatar (or initials fallback), And date is formatted warmly ("Ce Sabbat", "samedi 22 mars"), And time is displayed in French format (e.g., "9h30–12h00").

## Tasks / Subtasks

### Backend — DTOs

- [x] Task 1: Create Public Activity List Item DTO (AC: #1, #3)
  - [x] 1.1 Create `Dtos/Public/PublicActivityListItem.cs`:
    ```csharp
    public record PublicActivityListItem(
        int Id,
        string Title,
        DateOnly Date,
        TimeOnly StartTime,
        TimeOnly EndTime,
        string? DepartmentName,
        string? DepartmentAbbreviation,
        string? DepartmentColor,
        string? PredicateurName,
        string? PredicateurAvatarUrl,
        string? SpecialType);
    ```
  - [x] 1.2 Note: Same shape as `PublicNextActivityResponse` — this is intentional. The hero shows ONE activity; the list shows MANY with the same fields. A shared record shape is fine since both represent the same public projection of an activity.
  - [x] 1.3 Verify NO `isGuest`, NO `userId`, NO `version`/`concurrencyToken`, NO `description`, NO staffing fields, NO `createdAt`/`updatedAt`.

- [x] Task 2: Create Public Program Schedule DTO (AC: #2, #4)
  - [x] 2.1 Create `Dtos/Public/PublicProgramScheduleResponse.cs`:
    ```csharp
    public record PublicProgramScheduleResponse(
        string Title,
        DayOfWeek DayOfWeek,
        TimeOnly StartTime,
        TimeOnly EndTime,
        string? HostName,
        string? DepartmentName,
        string? DepartmentColor);
    ```
  - [x] 2.2 Note: No `Id` exposed — public consumers don't need it. No `CreatedAt`/`UpdatedAt` — admin-only metadata. Department info included for optional color-coding.

### Backend — Service

- [x] Task 3: Add Upcoming Activities Method to PublicService (AC: #1, #3)
  - [x] 3.1 Add to `IPublicService.cs`:
    ```csharp
    Task<List<PublicActivityListItem>> GetUpcomingActivitiesAsync();
    Task<List<PublicProgramScheduleResponse>> GetProgramSchedulesAsync();
    ```
  - [x] 3.2 Implement `GetUpcomingActivitiesAsync()` in `PublicService.cs`:
    - Reuse the same timezone-aware `today` calculation as `GetNextActivityAsync()`
    - Calculate `fourWeeksOut = today.AddDays(28)`
    - Query: same `.Include()` chain as `GetNextActivityAsync()` but with date range and safety cap:
      ```csharp
      var activities = await dbContext.Activities
          .Include(a => a.Department)
          .Include(a => a.Roles).ThenInclude(r => r.Assignments).ThenInclude(ra => ra.User)
          .Where(a => a.Visibility == ActivityVisibility.Public
                   && a.Date >= today
                   && a.Date <= fourWeeksOut)
          .OrderBy(a => a.Date).ThenBy(a => a.StartTime)
          .Take(20)
          .ToListAsync();
      ```
    - **Safety cap**: `.Take(20)` prevents unbounded result sets in edge cases (e.g., a church with daily events returning 28+ items). 20 is generous — most churches have 4–8 activities per month.
    - **Query performance note**: The `.Include()` chain generates SQL JOINs (not N+1 queries). EF Core resolves the entire object graph in a single round-trip. For a single-church app with <20 activities, this is well within acceptable performance. If needed in the future, `.AsSplitQuery()` can split into multiple simpler queries — but unnecessary at this scale.
    - **Today's activities**: The `a.Date >= today` filter includes ALL of today's activities regardless of current time. If it's 3 PM Saturday and the morning service was at 9:30 AM, it still appears in the list. This matches `GetNextActivityAsync()` behavior from Story 5.1 and is intentional — visitors checking after the service may still want to see today's program details.
    - Map each activity to `PublicActivityListItem` using same prédicateur extraction logic as `GetNextActivityAsync()` (extract helper method to avoid duplication)
    - Return `List<PublicActivityListItem>` — always returns a list, even if empty (never null)
  - [x] 3.3 **CRITICAL: Extract shared prédicateur mapping helper** to avoid duplicating the `GetNextActivityAsync()` logic:
    ```csharp
    private (string? Name, string? AvatarUrl) ExtractPredicateur(Activity activity)
    {
        var role = activity.Roles.FirstOrDefault(r =>
            r.RoleName.Equals("Predicateur", StringComparison.OrdinalIgnoreCase) ||
            r.RoleName.Equals("Prédicateur", StringComparison.OrdinalIgnoreCase));
        if (role is null) return (null, null);
        var assignment = role.Assignments.FirstOrDefault();
        if (assignment is null) return (null, null);
        return ($"{assignment.User.FirstName} {assignment.User.LastName}",
                avatarService.GetAvatarUrl(assignment.UserId));
    }
    ```
    Then refactor `GetNextActivityAsync()` to also use this helper.

- [x] Task 4: Add Program Schedules Method to PublicService (AC: #2, #4)
  - [x] 4.1 Implement `GetProgramSchedulesAsync()` in `PublicService.cs`:
    ```csharp
    public async Task<List<PublicProgramScheduleResponse>> GetProgramSchedulesAsync()
    {
        return await dbContext.ProgramSchedules
            .Include(ps => ps.Department)
            .OrderBy(ps => ps.DayOfWeek)
                .ThenBy(ps => ps.StartTime)
            .Select(ps => new PublicProgramScheduleResponse(
                ps.Title,
                ps.DayOfWeek,
                ps.StartTime,
                ps.EndTime,
                ps.HostName,
                ps.Department != null ? ps.Department.Name : null,
                ps.Department != null ? ps.Department.Color : null))
            .ToListAsync();
    }
    ```
  - [x] 4.2 Note: `.Select()` projection is safe here (no filesystem check needed — no avatars). Ordering by `DayOfWeek` then `StartTime` gives a natural weekly schedule order (Sunday=0 through Saturday=6).

### Backend — Controller

- [x] Task 5: Add Endpoints to PublicController (AC: #1, #2, #3, #4)
  - [x] 5.1 Add upcoming activities endpoint:
    ```csharp
    [AllowAnonymous]
    [HttpGet("upcoming-activities")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetUpcomingActivities()
    {
        var result = await publicService.GetUpcomingActivitiesAsync();
        return Ok(result);
    }
    ```
    Note: Always returns 200 with a list (empty list `[]` is valid, not 204). This simplifies frontend — no 204 edge case handling needed.
  - [x] 5.2 Add program schedules endpoint:
    ```csharp
    [AllowAnonymous]
    [HttpGet("program-schedules")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetProgramSchedules()
    {
        var result = await publicService.GetProgramSchedulesAsync();
        return Ok(result);
    }
    ```
    Note: Also always returns 200 with a list. Even if no schedules configured, returns `[]`.

### Backend — Tests

- [x] Task 6: Integration Tests for Upcoming Activities (AC: #1, #3)
  - [x] 6.1 Add tests to `tests/SdaManagement.Api.IntegrationTests/Public/PublicEndpointTests.cs`:
    - `GetUpcomingActivities_WithPublicActivities_Returns200WithList` — seed 3 public activities, verify list shape and count
    - `GetUpcomingActivities_NoPublicActivities_Returns200WithEmptyList` — no activities seeded, verify `[]`
    - `GetUpcomingActivities_OnlyReturnsPublicVisibility` — seed both Public and Authenticated activities, verify only Public returned
    - `GetUpcomingActivities_OnlyReturnsNext4Weeks` — seed activity 5 weeks out, verify excluded
    - `GetUpcomingActivities_OrderedByDateThenStartTime` — seed multiple same-day activities, verify order
    - `GetUpcomingActivities_IncludesPredicateurNameAndAvatar` — seed activity with prédicateur role + assignment, verify fields
    - `GetUpcomingActivities_ResponseDoesNotContainSensitiveFields` — assert no isGuest, userId, version, staffing fields in JSON
    - `GetUpcomingActivities_AnonymousAccess_Returns200` — use `AnonymousClient`
  - [x] 6.2 Use existing test data seeding patterns from `PublicEndpointTests.cs`

- [x] Task 7: Integration Tests for Program Schedules (AC: #2, #4)
  - [x] 7.1 Add tests to `PublicEndpointTests.cs`:
    - `GetProgramSchedules_WithSchedules_Returns200WithList` — seed program schedules, verify list shape
    - `GetProgramSchedules_NoSchedules_Returns200WithEmptyList`
    - `GetProgramSchedules_OrderedByDayOfWeekThenStartTime`
    - `GetProgramSchedules_IncludesDepartmentInfo` — seed with department, verify name + color
    - `GetProgramSchedules_ResponseDoesNotContainInternalFields` — assert no Id, no createdAt, no updatedAt
    - `GetProgramSchedules_AnonymousAccess_Returns200` — use `AnonymousClient`

### Frontend — Shared Utility Extraction

- [x] Task 8: Extract Date/Time Formatting Utilities (AC: #1, #7)
  - [x] 8.1 Create `lib/dateFormatting.ts`:
    ```typescript
    import { fr } from "date-fns/locale/fr";
    import { enUS } from "date-fns/locale/en-US";
    import { getDay, addDays, isSameDay, format, parse } from "date-fns";

    export function getDateLocale(lang: string) {
      return lang.startsWith("en") ? enUS : fr;
    }

    export function formatActivityDate(
      dateStr: string,
      t: (key: string) => string,
      lang: string
    ): string {
      const activityDate = parse(dateStr, "yyyy-MM-dd", new Date());
      const today = new Date();
      const dayOfWeek = getDay(today);
      const daysUntilSat = dayOfWeek === 6 ? 0 : ((6 - dayOfWeek + 7) % 7);
      const thisSaturday = addDays(today, daysUntilSat);

      if (isSameDay(activityDate, thisSaturday)) {
        return t("pages.home.thisSabbath");
      }
      return format(activityDate, "EEEE d MMMM", { locale: getDateLocale(lang) });
    }

    export function formatTime(timeStr: string): string {
      // timeStr comes as "HH:mm:ss" from backend
      if (!timeStr || !timeStr.includes(":")) return timeStr ?? "";
      const [h, m] = timeStr.split(":");
      const hour = parseInt(h, 10);
      return `${isNaN(hour) ? h : hour}h${m}`;
    }
    ```
  - [x] 8.2 **Refactor `HeroSection.tsx`** to import from `lib/dateFormatting.ts` instead of defining locally:
    ```typescript
    import { formatActivityDate, formatTime, getDateLocale } from "@/lib/dateFormatting";
    ```
    Remove the local `getDateLocale`, `formatActivityDate`, `formatTime` function definitions.
  - [x] 8.3 Create `lib/dateFormatting.test.ts` — move existing date formatting tests from `HeroSection.test.tsx` into dedicated test file (keep HeroSection tests that test rendering, only move pure function tests):
    - `formatTime_ConvertsHHmmss_ToFrenchFormat` — "09:30:00" → "9h30"
    - `formatTime_HandlesNoonFormat` — "12:00:00" → "12h00"
    - `formatTime_HandlesSingleDigitHour` — "08:00:00" → "8h00"
    - `formatTime_HandlesEmptyString_ReturnsEmpty` — "" → ""
    - `formatTime_HandlesMalformedInput_ReturnsGracefully` — no crash on unexpected input
    - `formatActivityDate_ThisSaturday_ReturnsCeSabbat` — with mocked date
    - `formatActivityDate_OtherDate_ReturnsFrenchFormat` — "samedi 22 mars"
    - `getDateLocale_ReturnsFrForFrench` — "fr" → fr locale
    - `getDateLocale_ReturnsEnUSForEnglish` — "en" → enUS locale

### Frontend — Types & Service

- [x] Task 9: Add Types (AC: #1, #2)
  - [x] 9.1 Add to `types/public.ts`:
    ```typescript
    export interface PublicActivityListItem {
      id: number;
      title: string;
      date: string;
      startTime: string;
      endTime: string;
      departmentName: string | null;
      departmentAbbreviation: string | null;
      departmentColor: string | null;
      predicateurName: string | null;
      predicateurAvatarUrl: string | null;
      specialType: string | null;
    }

    export interface PublicProgramSchedule {
      title: string;
      dayOfWeek: number; // 0=Sunday, 6=Saturday
      startTime: string;
      endTime: string;
      hostName: string | null;
      departmentName: string | null;
      departmentColor: string | null;
    }
    ```

- [x] Task 10: Add Service Methods (AC: #1, #2)
  - [x] 10.1 Add to `services/publicService.ts`:
    ```typescript
    import type { PublicNextActivity, LiveStatus, PublicActivityListItem, PublicProgramSchedule } from "@/types/public";

    export const publicService = {
      // ... existing methods ...
      getUpcomingActivities: () =>
        api.get<PublicActivityListItem[]>("/api/public/upcoming-activities")
          .then(res => res.data),

      getProgramSchedules: () =>
        api.get<PublicProgramSchedule[]>("/api/public/program-schedules")
          .then(res => res.data),
    };
    ```
    Note: Both always return 200 with arrays — no 204 handling needed (unlike `getNextActivity`).

### Frontend — Hooks

- [x] Task 11: Add Hooks (AC: #1, #2)
  - [x] 11.1 Add to `hooks/usePublicDashboard.ts`:
    ```typescript
    import type { PublicNextActivity, LiveStatus, PublicActivityListItem, PublicProgramSchedule } from "@/types/public";

    export function useUpcomingActivities() {
      return useQuery<PublicActivityListItem[]>({
        queryKey: ["public", "upcoming-activities"],
        queryFn: publicService.getUpcomingActivities,
        staleTime: 5 * 60 * 1000,    // 5 min — same as next-activity
        retry: 1,
      });
    }

    export function useProgramSchedules() {
      return useQuery<PublicProgramSchedule[]>({
        queryKey: ["public", "program-schedules"],
        queryFn: publicService.getProgramSchedules,
        staleTime: 30 * 60 * 1000,   // 30 min — schedules change rarely
        retry: 1,
      });
    }
    ```
  - [x] 11.2 `staleTime` rationale: Upcoming activities (5 min) can change when admins update activities. Program schedules (30 min) change very rarely — they represent the permanent weekly church schedule.

### Frontend — Components

- [x] Task 12: Create ActivityCard Component (AC: #1, #6, #7)
  - [x] 12.1 Create `components/public/ActivityCard.tsx`:
    - Props: `activity: PublicActivityListItem`
    - **Left border accent**: 4px left border colored with `activity.departmentColor` (via inline `style={{ borderLeftColor: activity.departmentColor ?? '#E2E8F0' }}`)
    - **Card structure**: `rounded-2xl border border-slate-200 bg-white p-4 sm:p-5` with `border-l-4`
    - **Date line**: Warm date formatted via `formatActivityDate()` — `text-sm font-semibold text-indigo-600`
    - **Time range**: `formatTime(startTime)–formatTime(endTime)` — `text-sm text-slate-600`
    - **Activity title**: `text-lg font-bold text-slate-900` — truncated with `truncate` class + `title` attribute
    - **Department badge**: `<Badge variant="secondary">` with department abbreviation — uses department color as subtle background tint
    - **Special type badge**: Conditional `<Badge>` with `variant="outline"` if `specialType` is non-null — translated via `t('pages.home.specialType.${specialType}')`
    - **Prédicateur row**: 28px avatar (photo or initials fallback) + name in `text-sm text-slate-700`
    - **No prédicateur**: If `predicateurName` is null, omit the prédicateur row entirely (activity may not have a speaker assigned yet)
  - [x] 12.2 **Avatar initials fallback**: Reuse `AvatarInitials` pattern from HeroSection — extract to `components/public/AvatarInitials.tsx` or define inline (prefer inline since it's 5 lines):
    ```tsx
    function AvatarInitials({ name, size = 28 }: { name: string; size?: number }) {
      const initials = name.split(" ").map(n => n[0]).join("").toUpperCase();
      return (
        <div
          className="flex items-center justify-center rounded-full bg-indigo-600 font-semibold text-white"
          style={{ width: size, height: size, fontSize: size * 0.4 }}
        >
          {initials}
        </div>
      );
    }
    ```
  - [x] 12.3 **Responsive**: Full-width on mobile (base), no `md:` breakpoint. On `sm:` allow side-by-side info. On `lg:` maintain constrained card width.
  - [x] 12.4 **Accessibility**: Card uses `<article>` element, `aria-label` with activity title + date, department badge has `title` attribute with full department name.
  - [x] 12.5 All text via `t()` — zero hardcoded strings. Date formatting with French locale.

- [x] Task 13: Create UpcomingActivitiesSection Component (AC: #1, #5, #6)
  - [x] 13.1 Create `components/public/UpcomingActivitiesSection.tsx`:
    - Uses `useUpcomingActivities()` hook
    - Section wrapper: `bg-white` section with `mx-auto max-w-7xl px-4 py-8 sm:py-12`
    - Heading: `<h2 className="text-2xl font-bold text-slate-900">` with `t('pages.home.upcomingActivitiesTitle')` → "Activités à venir"
    - **List layout**: `<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-2">` — 1 column mobile, 2 columns on sm+ (enough width for cards with detail)
    - Map `data` array to `<ActivityCard activity={item} />` with `key={item.id}`
  - [x] 13.2 **Loading state** (`isPending`): Show 4 skeleton cards matching ActivityCard anatomy (with left-border accent):
    ```tsx
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="rounded-2xl border border-l-4 border-slate-200 bg-white p-4">
        <Skeleton className="h-4 w-24" />           {/* date */}
        <Skeleton className="mt-2 h-6 w-48" />      {/* title */}
        <Skeleton className="mt-2 h-5 w-16" />      {/* department badge */}
        <div className="mt-3 flex items-center gap-2">
          <Skeleton className="h-7 w-7 rounded-full" /> {/* avatar */}
          <Skeleton className="h-4 w-28" />          {/* speaker name */}
        </div>
      </div>
    ))}
    ```
  - [x] 13.3 **Empty state** (`data` is empty array `[]`): Show warm message "Aucune activité à venir — revenez bientôt!" via `t('pages.home.noActivities')` — reuse existing i18n key. Centered text in `text-base text-slate-500` with generous padding.
  - [x] 13.4 **Error state** (`isError`): Show subtle error message `t('pages.home.loadError')` — do NOT show a full error page. Just a text message with a retry option.
  - [x] 13.5 **Accessibility**: Semantic `<section>` with `aria-labelledby` pointing to the h2.

- [x] Task 14: Create ProgramTimesSection Component (AC: #2, #5)
  - [x] 14.1 Create `components/public/ProgramTimesSection.tsx`:
    - Uses `useProgramSchedules()` hook
    - **Hidden when empty**: If `data` is empty array or `isPending` is false and `data?.length === 0` → return `null` (completely hidden, no empty container)
    - Section wrapper: `bg-slate-50` section (subtle background contrast from white upcoming section) with `mx-auto max-w-7xl px-4 py-8 sm:py-12`
    - Heading: `<h2 className="text-2xl font-bold text-slate-900">` with `t('pages.home.programSchedulesTitle')` → "Horaire des programmes"
  - [x] 14.2 **Schedule display**: Each program as a clean row in a list:
    ```tsx
    <div className="mt-6 divide-y divide-slate-200">
      {data.map((program, index) => (
        <div key={index} className="flex items-center justify-between py-3 sm:py-4">
          <div>
            <span className="text-base font-semibold text-slate-900">{program.title}</span>
            {program.hostName && (
              <span className="ml-2 text-sm text-slate-500">— {program.hostName}</span>
            )}
          </div>
          <div className="text-right">
            <span className="text-sm font-medium text-slate-700">
              {t(`days.${program.dayOfWeek}`)}
            </span>
            <span className="ml-2 text-sm text-slate-500">
              {formatTime(program.startTime)}–{formatTime(program.endTime)}
            </span>
          </div>
        </div>
      ))}
    </div>
    ```
  - [x] 14.3 **Day of week translation**: Use i18n keys `days.0` through `days.6` for day names:
    - `days.0` = "Dimanche" / "Sunday"
    - `days.6` = "Samedi" / "Saturday"
  - [x] 14.4 **Loading state**: Show 3 skeleton rows while `isPending`:
    ```tsx
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    ```
  - [x] 14.5 **Responsive**: Stack title + time vertically on mobile (base), side-by-side on `sm:+`. **NEVER `md:` breakpoint.**
  - [x] 14.6 All text via `t()` — zero hardcoded strings.

- [x] Task 15: Update HomePage (AC: #1, #2)
  - [x] 15.1 Replace Story 5.3 placeholder comment section in `pages/HomePage.tsx` with:
    ```tsx
    <UpcomingActivitiesSection />
    <ProgramTimesSection />
    ```
  - [x] 15.2 Import both new components.
  - [x] 15.3 Each section internally handles its own max-width/padding — no wrapper needed in HomePage.

### Frontend — i18n

- [x] Task 16: i18n Translation Keys (AC: #1, #2, #5)
  - [x] 16.1 Add French keys in `public/locales/fr/common.json`:
    ```json
    "pages": {
      "home": {
        "upcomingActivitiesTitle": "Activités à venir",
        "programSchedulesTitle": "Horaire des programmes"
      }
    },
    "days": {
      "0": "Dimanche",
      "1": "Lundi",
      "2": "Mardi",
      "3": "Mercredi",
      "4": "Jeudi",
      "5": "Vendredi",
      "6": "Samedi"
    }
    ```
    Note: `pages.home.noActivities` already exists from Story 5.1 — reuse it.
  - [x] 16.2 Add English keys in `public/locales/en/common.json`:
    ```json
    "pages": {
      "home": {
        "upcomingActivitiesTitle": "Upcoming Activities",
        "programSchedulesTitle": "Program Schedule"
      }
    },
    "days": {
      "0": "Sunday",
      "1": "Monday",
      "2": "Tuesday",
      "3": "Wednesday",
      "4": "Thursday",
      "5": "Friday",
      "6": "Saturday"
    }
    ```

### Frontend — Tests

- [x] Task 17: Date Formatting Utility Tests (AC: #7)
  - [x] 17.1 Create `lib/dateFormatting.test.ts`:
    - `formatTime` converts "09:30:00" to "9h30"
    - `formatTime` converts "12:00:00" to "12h00"
    - `formatTime` handles single-digit hours "08:00:00" → "8h00"
    - `formatActivityDate` returns "Ce Sabbat" / "This Sabbath" for this Saturday
    - `formatActivityDate` returns French date format for other dates
    - `getDateLocale` returns `fr` for "fr" and `enUS` for "en"

- [x] Task 18: ActivityCard Component Tests (AC: #1, #7)
  - [x] 18.1 Create `components/public/ActivityCard.test.tsx`:
    - Renders activity title, date, time range
    - Renders department badge with abbreviation
    - Renders prédicateur name when available
    - Does NOT render prédicateur section when `predicateurName` is null
    - Renders special type badge when `specialType` is non-null
    - Renders department color as left border (verify `borderLeftColor` style)
    - Has accessible `<article>` element with `aria-label`
    - Uses French locale for date formatting (default)

- [x] Task 19: UpcomingActivitiesSection Component Tests (AC: #1, #5, #6)
  - [x] 19.1 Create `components/public/UpcomingActivitiesSection.test.tsx`:
    - **MSW setup:** `setupServer(...publicHandlers, ...upcomingActivitiesHandlers)` — must include new handlers
    - Renders section heading "Activités à venir"
    - Renders activity cards when data available
    - Renders empty state message when API returns empty array
    - Renders skeleton loading states while pending
    - Renders error message on API failure
    - Multiple cards rendered for multiple activities

- [x] Task 20: ProgramTimesSection Component Tests (AC: #2, #5)
  - [x] 20.1 Create `components/public/ProgramTimesSection.test.tsx`:
    - Renders section heading "Horaire des programmes"
    - Renders program schedule rows with title, day, time range
    - Renders host name when available
    - Returns null (hidden) when API returns empty array
    - Shows skeleton while loading

- [x] Task 21: MSW Mock Handler Updates (AC: #1, #2, #3)
  - [x] 21.1 Add to `mocks/handlers/public.ts`:
    ```typescript
    const mockUpcomingActivities: PublicActivityListItem[] = [
      {
        id: 2,
        title: "Culte du Sabbat",
        date: "2026-03-14",
        startTime: "09:30:00",
        endTime: "12:00:00",
        departmentName: "Culte",
        departmentAbbreviation: "CU",
        departmentColor: "#F43F5E",
        predicateurName: "Jean Dupont",
        predicateurAvatarUrl: null,
        specialType: null,
      },
      {
        id: 3,
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
        id: 4,
        title: "Sabbat de la Jeunesse",
        date: "2026-03-21",
        startTime: "09:30:00",
        endTime: "12:00:00",
        departmentName: "Jeunesse Adventiste",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        predicateurName: "Marie Lafleur",
        predicateurAvatarUrl: null,
        specialType: "youth",
      },
    ];

    const mockProgramSchedules: PublicProgramSchedule[] = [
      {
        title: "École du Sabbat",
        dayOfWeek: 6,
        startTime: "09:30:00",
        endTime: "10:30:00",
        hostName: "Pierre Martin",
        departmentName: "Culte",
        departmentColor: "#F43F5E",
      },
      {
        title: "Culte Divin",
        dayOfWeek: 6,
        startTime: "11:00:00",
        endTime: "12:30:00",
        hostName: null,
        departmentName: "Culte",
        departmentColor: "#F43F5E",
      },
      {
        title: "Programme AY",
        dayOfWeek: 6,
        startTime: "14:00:00",
        endTime: "16:00:00",
        hostName: "Sophie Bernard",
        departmentName: "Jeunesse Adventiste",
        departmentColor: "#14B8A6",
      },
    ];

    export const upcomingActivitiesHandlers = [
      http.get("/api/public/upcoming-activities", () =>
        HttpResponse.json(mockUpcomingActivities)
      ),
    ];
    export const upcomingActivitiesHandlersEmpty = [
      http.get("/api/public/upcoming-activities", () =>
        HttpResponse.json([])
      ),
    ];
    export const upcomingActivitiesHandlersError = [
      http.get("/api/public/upcoming-activities", () =>
        new HttpResponse(null, { status: 500 })
      ),
    ];

    export const programScheduleHandlers = [
      http.get("/api/public/program-schedules", () =>
        HttpResponse.json(mockProgramSchedules)
      ),
    ];
    export const programScheduleHandlersEmpty = [
      http.get("/api/public/program-schedules", () =>
        HttpResponse.json([])
      ),
    ];
    ```

- [x] Task 22: Update test-utils.tsx (AC: #1, #2)
  - [x] 22.1 Add i18n test keys to `test-utils.tsx` inline translations:
    - `pages.home.upcomingActivitiesTitle`, `pages.home.programSchedulesTitle`
    - `days.0` through `days.6` (French values for tests)

- [x] Task 23: Update HomePage Tests (AC: #1, #2)
  - [x] 23.1 Update `pages/HomePage.test.tsx`:
    - Verify UpcomingActivitiesSection renders on homepage
    - Verify ProgramTimesSection renders on homepage (when schedules exist)
    - Add required MSW handlers for new endpoints

## Dev Notes

### Hero Activity Duplication (Design Decision)

The upcoming activities list WILL include the same activity shown in the HeroSection above. This is intentional and acceptable:
- The **hero** answers "what's happening THIS week?" — large format, spotlight on the prédicateur with 48px avatar, dark background.
- The **list** answers "what's coming up over the next month?" — compact cards, 28px avatars, white background, scannable.
- Different visual treatments make it clear they serve different purposes.
- Excluding the hero activity from the list would require passing state between unrelated components, adding unnecessary coupling.
- Users scanning the list for a specific week benefit from seeing ALL activities, including this week's.

### Program Times Section Heading

The heading "Horaire des programmes" was validated against alternatives:
- "Nos horaires habituels" — warmer but implies the church owns the schedule (slightly possessive)
- "Horaire des programmes" — clear, dignified, describes exactly what it is
- Decision: Keep "Horaire des programmes" as the primary label. It serves first-time visitors well ("When is church?") without being overly casual or formal.

### Existing Infrastructure to Reuse

**DO NOT recreate:**
- `GET /api/config` → public church info with YouTube URL ([Source: Controllers/ConfigController.cs:18])
- `configService.getPublic()` → frontend call ([Source: services/configService.ts:24])
- `useChurchInfo()` → hook fetching config ([Source: hooks/usePublicDashboard.ts])
- `PublicNextActivityResponse` → DTO with same fields as list item ([Source: Dtos/Public/PublicNextActivityResponse.cs])
- `api` Axios instance → configured with interceptors ([Source: lib/api.ts])
- "public" rate limiting policy → already registered ([Source: Extensions/ServiceCollectionExtensions.cs])
- `pages.home.noActivities` i18n key → already exists ([Source: public/locales/fr/common.json])
- `formatActivityDate()`, `formatTime()` → currently in HeroSection, will be extracted to shared utility

**Extend:**
- `PublicController` → add `GetUpcomingActivities()` and `GetProgramSchedules()` endpoints
- `IPublicService` / `PublicService` → add two new methods + extract shared prédicateur helper
- `publicService.ts` → add `getUpcomingActivities()` and `getProgramSchedules()` methods
- `usePublicDashboard.ts` → add `useUpcomingActivities()` and `useProgramSchedules()` hooks
- `types/public.ts` → add `PublicActivityListItem` and `PublicProgramSchedule` interfaces
- `mocks/handlers/public.ts` → add handlers for new endpoints
- `test-utils.tsx` → add new i18n test keys
- `HomePage.tsx` → replace 5.3 placeholder with new section components

### Architecture Patterns (Mandatory)

**Backend controller pattern** (from existing `PublicController.cs`):
```csharp
[AllowAnonymous]
[HttpGet("upcoming-activities")]
[EnableRateLimiting("public")]
public async Task<IActionResult> GetUpcomingActivities()
{
    var result = await publicService.GetUpcomingActivitiesAsync();
    return Ok(result);
}
```
Note: Always return 200 with list (not 204 for empty). The frontend handles empty arrays naturally via `.length === 0`.

**Backend service pattern** (from existing `PublicService.GetNextActivityAsync()`):
- Activities with avatars: use `.Include()` chains + in-memory mapping (avatar URL requires filesystem check)
- Program schedules without avatars: use `.Select()` projection (translatable to SQL)
- Prédicateur extraction: case-insensitive role name match, `FirstOrDefault()` on assignments

**Frontend hook pattern** (from existing `useNextActivity()`):
```typescript
export function useUpcomingActivities() {
  return useQuery<PublicActivityListItem[]>({
    queryKey: ["public", "upcoming-activities"],
    queryFn: publicService.getUpcomingActivities,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
```

**TanStack Query v5 state checks:**
- Use `isPending` (not deprecated `isLoading`) for initial load detection
- Use `isError` for error states
- `data` is `undefined` while pending, typed `T` when success
- For lists: `data` is `T[]` (always array, never null — API always returns 200 with array)

### Frontend Design Specifications

**Activity Card (list variant from UX spec):**
- 4px department-colored left border accent
- White card surface: `bg-white rounded-2xl border border-slate-200 border-l-4`
- 28px prédicateur avatar (smaller than hero's 48px)
- Date in indigo-600 accent color: `text-sm font-semibold text-indigo-600`
- Title: `text-lg font-bold text-slate-900` with `truncate` for overflow
- Time: `text-sm text-slate-600`
- Department badge: `<Badge variant="secondary">` with abbreviation

**Program Times Section:**
- Subtle background contrast: `bg-slate-50` (vs white for activities above)
- Clean list with `divide-y divide-slate-200` dividers
- Title + host name on left, day + time on right
- No cards — simpler row layout for recurring data

**Typography (Public Register Rules — CRITICAL):**
- Minimum text size: 14px (`text-sm`) — NEVER use 11px/12px on public layer
- Section headings: Sentence case, `text-2xl font-bold` ("Activités à venir", not "ACTIVITÉS À VENIR")
- Person references: Full natural name ("Jean Dupont", not "Dupont, J.")
- Information density: Generous, one idea per visual block

**Color Tokens:**
- Section background alternation: `bg-white` (activities) → `bg-slate-50` (program times)
- Card borders: `border-slate-200`
- Department colors: Applied as left-border accent only (never full card tint)
- Accent: `indigo-600` for dates and interactive elements
- Secondary text: `text-slate-600` (5.7:1 contrast on white)
- Muted text: `text-slate-500` for metadata

**Responsive Breakpoints:**
- Base (375px) → mobile: single-column cards, stacked program times
- `sm:` (640px) → tablet: 2-column card grid, side-by-side program info
- `lg:` (1024px) → desktop: content constrained by max-w-7xl
- **NEVER `md:` (768px)** — intentionally skipped per architecture

**Warm Vocabulary (French public layer):**
- "Activités à venir" — section heading (NOT "Pipeline Opérationnel")
- "Horaire des programmes" — section heading (NOT "Schedule Configuration")
- Day names in French: "Samedi", "Dimanche" (NOT "Saturday", "Sunday")
- "Ce Sabbat" for this Saturday's date (reuse existing pattern)
- Zero military vocabulary on public layer

### Security Requirements (NFR9)

- `PublicActivityListItem` fields are an explicit whitelist — only include fields the public should see
- Guest speakers appear identical to regular speakers: name + avatar only, NO `isGuest` flag
- No user IDs exposed (except implicitly in avatar URL which is already a public endpoint)
- No staffing details: no role counts, no assigned counts, no staffing status
- No concurrency tokens in public DTOs
- `PublicProgramScheduleResponse` excludes: `Id`, `CreatedAt`, `UpdatedAt` — admin-only metadata
- Integration tests MUST assert sensitive field absence from JSON responses

### Testing Standards

**Backend integration tests:**
- File: `tests/SdaManagement.Api.IntegrationTests/Public/PublicEndpointTests.cs` (extend existing)
- Naming: `{MethodName}_{Scenario}_{ExpectedResult}`
- Client: `AnonymousClient` from `IntegrationTestBase` (no auth headers)
- Assertions: Shouldly (`result.ShouldNotBeNull()`, `response.StatusCode.ShouldBe(...)`)
- Seed test data using existing patterns from `PublicEndpointTests.cs`

**Frontend test files:** Co-located (`ActivityCard.test.tsx` next to `ActivityCard.tsx`)
**Frontend test setup:** Use `render()` from `test-utils.tsx` (wraps Router, i18n, QueryClient, Auth, Tooltip)
**Frontend mock pattern:** MSW handlers + `server.use()` for per-test overrides
**Frontend assertions:** `@testing-library/jest-dom` matchers

### Previous Story Intelligence (5.1 + 5.2)

From Story 5.1 and 5.2 implementation and code reviews:
- **TanStack Query v5**: Use `isPending` (not deprecated `isLoading`)
- **MSW per-test-file**: Server setup is per-test file, not global
- **test-utils.tsx i18n**: Must add new keys to inline translations for tests
- **204 handling**: Only needed for single-resource endpoints (next-activity). List endpoints return 200 with `[]` — no 204 handling needed.
- **Skeleton on white bg**: Use default `bg-accent` skeleton color on white backgrounds (unlike dark hero which needed `bg-slate-700` override)
- **Avatar fallback**: Use initials div with `bg-indigo-600` background when avatar URL is null
- **formatTime pattern**: "HH:mm:ss" → "NhMM" (e.g., "09:30:00" → "9h30") — strip leading zero from hour
- **Code review fix pattern**: lg: desktop layout is important — always test responsive at lg: breakpoint
- **DatabaseSeeder guard**: `SeedDevData` config flag exists to prevent test interference (from 5.2)
- **FakeYouTubeService**: Already registered in test DI (from 5.2) — no changes needed

### Git Intelligence

Recent commits show:
- `feat(public): Story 5.2 — YouTube live stream embed with API integration` (6b53751)
- `feat(public): Story 5.1 — Public dashboard hero section & next activity with code review fixes` (4ee7aff)
- Pattern: `feat(public):` prefix for Epic 5 stories
- Code review fixes folded into feature commits
- UI validation fixes applied as separate commits

### DayOfWeek Mapping (C# ↔ Frontend)

C# `DayOfWeek` enum: `Sunday = 0`, `Monday = 1`, ..., `Saturday = 6`
JSON serialization: integer values (0–6) — `System.Text.Json` serializes enums as integers by default
Frontend mapping: i18n keys `days.0` through `days.6`

This aligns naturally — no conversion needed between backend and frontend.

### Project Structure Notes

**New files to create:**
```
src/SdaManagement.Api/
├── Dtos/Public/PublicActivityListItem.cs                    ← NEW
├── Dtos/Public/PublicProgramScheduleResponse.cs             ← NEW

src/sdamanagement-web/src/
├── lib/dateFormatting.ts                                    ← NEW (extracted from HeroSection)
├── lib/dateFormatting.test.ts                               ← NEW
├── components/public/ActivityCard.tsx                       ← NEW
├── components/public/ActivityCard.test.tsx                  ← NEW
├── components/public/UpcomingActivitiesSection.tsx          ← NEW
├── components/public/UpcomingActivitiesSection.test.tsx     ← NEW
├── components/public/ProgramTimesSection.tsx                ← NEW
├── components/public/ProgramTimesSection.test.tsx           ← NEW
```

**Files to modify:**
```
src/SdaManagement.Api/
├── Services/IPublicService.cs                               ← ADD 2 new methods
├── Services/PublicService.cs                                ← ADD 2 new methods + extract helper
├── Controllers/PublicController.cs                          ← ADD 2 new endpoints

tests/SdaManagement.Api.IntegrationTests/
└── Public/PublicEndpointTests.cs                            ← ADD ~14 new tests

src/sdamanagement-web/src/
├── types/public.ts                                          ← ADD 2 new interfaces
├── services/publicService.ts                                ← ADD 2 new methods
├── hooks/usePublicDashboard.ts                              ← ADD 2 new hooks
├── pages/HomePage.tsx                                       ← REPLACE 5.3 placeholder with components
├── pages/HomePage.test.tsx                                  ← ADD handler imports + section tests
├── components/public/HeroSection.tsx                        ← REFACTOR: import from dateFormatting.ts
├── mocks/handlers/public.ts                                 ← ADD 6 new handler exports
├── test-utils.tsx                                           ← ADD i18n test keys

src/sdamanagement-web/public/
├── locales/fr/common.json                                   ← ADD pages.home.* + days.* keys
├── locales/en/common.json                                   ← ADD pages.home.* + days.* keys
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md:1133–1156 — Epic 5, Story 5.3 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md:548–561 — API naming and DTO conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md:833–840 — Public controller pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md:34 — Public DTOs, never return entities]
- [Source: _bmad-output/planning-artifacts/architecture.md:89 — Responsive: sm: and lg: only, no md:]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:1117–1149 — ActivityCard component variants]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:595–627 — Public register typography rules]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:524–583 — Color system and semantic tokens]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:280–297 — Warm vocabulary register]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md:1673–1709 — Responsive breakpoints]
- [Source: _bmad-output/planning-artifacts/prd.md — FR3 (upcoming activities), FR4 (program times), NFR9 (data isolation)]
- [Source: src/SdaManagement.Api/Data/Entities/ProgramSchedule.cs — ProgramSchedule entity fields]
- [Source: src/SdaManagement.Api/Data/Entities/Activity.cs — Activity entity with Visibility enum]
- [Source: src/SdaManagement.Api/Services/PublicService.cs — Existing GetNextActivityAsync() pattern]
- [Source: src/SdaManagement.Api/Controllers/PublicController.cs — Existing public endpoints]
- [Source: src/sdamanagement-web/src/components/public/HeroSection.tsx:10–31 — formatTime, formatActivityDate, getDateLocale functions to extract]
- [Source: src/sdamanagement-web/src/hooks/usePublicDashboard.ts — Existing hook patterns]
- [Source: src/sdamanagement-web/src/services/publicService.ts — Existing service methods]
- [Source: src/sdamanagement-web/src/types/public.ts — Existing public type interfaces]
- [Source: src/sdamanagement-web/src/mocks/handlers/public.ts — Existing MSW handler patterns]
- [Source: _bmad-output/implementation-artifacts/5-1-public-dashboard-hero-section-and-next-activity.md — Previous story patterns]
- [Source: _bmad-output/implementation-artifacts/5-2-youtube-live-stream-embed.md — Previous story patterns]
- [Context7: TanStack Query v5.84.1 — useQuery with isPending, staleTime, queryKey, enabled]
- [Context7: shadcn/ui — Card, Badge, Skeleton component patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- HeroSection test updated: `formatTime` now strips leading zero ("09:30:00" → "9h30" not "09h30") — test expectation updated from `/09h30/` to `/9h30/`
- ProgramTimesSection "hidden when empty" test: `container.querySelector("section")` incorrectly matched Toaster's `<section>` — fixed by targeting `[aria-labelledby="program-schedules-heading"]`

### Completion Notes List

- Created `PublicActivityListItem` and `PublicProgramScheduleResponse` DTOs with public-safe field whitelist
- Extended `IPublicService` / `PublicService` with `GetUpcomingActivitiesAsync()` (4-week window, .Take(20) safety cap) and `GetProgramSchedulesAsync()` (ordered by DayOfWeek/StartTime)
- Extracted shared `ExtractPredicateur()` helper in PublicService — refactored `GetNextActivityAsync()` to use it too
- Added two new `[AllowAnonymous]` endpoints to `PublicController`: `/api/public/upcoming-activities` and `/api/public/program-schedules` with "public" rate limiting
- Added 14 integration tests covering: list shape, empty lists, visibility filtering, date range, ordering, prédicateur data, sensitive field absence, anonymous access, department info, internal field absence
- Extracted `formatTime`, `formatActivityDate`, `getDateLocale` from HeroSection into `lib/dateFormatting.ts` — refactored HeroSection to use imports (improved `formatTime` to strip leading zero: "09h30" → "9h30")
- Created `ActivityCard` component: 4px department-colored left border, 28px avatar with initials fallback, warm date formatting, `<article>` with aria-label
- Created `UpcomingActivitiesSection`: grid layout (1 col mobile, 2 col sm+), skeleton loading, empty state, error state, aria-labelledby
- Created `ProgramTimesSection`: bg-slate-50 contrast, divide-y rows, hidden when empty, responsive stacking
- Updated HomePage to render both new sections below YouTubeSection
- Added i18n keys: `upcomingActivitiesTitle` and `programSchedulesTitle` (days.0–6 already existed)
- Created MSW handlers: `upcomingActivitiesHandlers/Empty/Error`, `programScheduleHandlers/Empty`
- All 379 frontend tests pass (44 new + 335 existing, zero regressions)
- Backend compiles with 0 errors (integration tests require Docker for Testcontainers)

### File List

**New files:**
- `src/SdaManagement.Api/Dtos/Public/PublicActivityListItem.cs`
- `src/SdaManagement.Api/Dtos/Public/PublicProgramScheduleResponse.cs`
- `src/sdamanagement-web/src/lib/dateFormatting.ts`
- `src/sdamanagement-web/src/lib/dateFormatting.test.ts`
- `src/sdamanagement-web/src/components/public/ActivityCard.tsx`
- `src/sdamanagement-web/src/components/public/ActivityCard.test.tsx`
- `src/sdamanagement-web/src/components/public/UpcomingActivitiesSection.tsx`
- `src/sdamanagement-web/src/components/public/UpcomingActivitiesSection.test.tsx`
- `src/sdamanagement-web/src/components/public/ProgramTimesSection.tsx`
- `src/sdamanagement-web/src/components/public/ProgramTimesSection.test.tsx`

**Modified files:**
- `src/SdaManagement.Api/Services/IPublicService.cs` — added 2 new method signatures
- `src/SdaManagement.Api/Services/PublicService.cs` — added 2 new methods + extracted ExtractPredicateur helper
- `src/SdaManagement.Api/Controllers/PublicController.cs` — added 2 new endpoints
- `tests/SdaManagement.Api.IntegrationTests/Public/PublicEndpointTests.cs` — added 14 new tests + ProgramSchedule seed helper
- `src/sdamanagement-web/src/types/public.ts` — added PublicActivityListItem and PublicProgramSchedule interfaces
- `src/sdamanagement-web/src/services/publicService.ts` — added getUpcomingActivities and getProgramSchedules methods
- `src/sdamanagement-web/src/hooks/usePublicDashboard.ts` — added useUpcomingActivities and useProgramSchedules hooks
- `src/sdamanagement-web/src/pages/HomePage.tsx` — replaced 5.3 placeholder with section components
- `src/sdamanagement-web/src/pages/HomePage.test.tsx` — added section render tests + new MSW handlers
- `src/sdamanagement-web/src/components/public/HeroSection.tsx` — refactored to import from dateFormatting.ts
- `src/sdamanagement-web/src/components/public/HeroSection.test.tsx` — updated formatTime expectation (9h30 not 09h30)
- `src/sdamanagement-web/src/mocks/handlers/public.ts` — added 6 new handler exports + mock data
- `src/sdamanagement-web/src/test-utils.tsx` — added upcomingActivitiesTitle and programSchedulesTitle i18n keys
- `src/sdamanagement-web/public/locales/fr/common.json` — added upcomingActivitiesTitle, programSchedulesTitle
- `src/sdamanagement-web/public/locales/en/common.json` — added upcomingActivitiesTitle, programSchedulesTitle

### Change Log

- 2026-03-13: Story 5.3 implementation complete — upcoming activities and program times sections with full backend + frontend + tests
- 2026-03-13: Code review fixes (7 issues fixed) — ProgramTimesSection error state handling, ActivityCard aria-label, timezone TODO, redundant Tailwind/EF Core, stable React key, avatar URL test assertion, new error test + MSW handler
