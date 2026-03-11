# Story 5.1: Public Dashboard — Hero Section & Next Activity

Status: done

## Story

As an anonymous visitor,
I want to see the next scheduled church activity with key details immediately when I open the app,
So that I know what's happening at church without logging in or navigating.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–4 migrations applied (`dotnet ef database update`)

### Codebase State (Epics 1–4 Complete)

- Church identity settings functional (`GET /api/config` returns `PublicChurchConfigResponse` — already public, no auth)
- Activities with `Visibility` field exist (`ActivityVisibility.Public = 0`, `Authenticated = 1`)
- `PublicLayout.tsx` renders at `/` with `TopNav` + content `<Outlet />`
- `HomePage.tsx` is a stub (title + subtitle only) — to be replaced
- `configService.ts` has `getPublic()` calling `GET /api/config` — **REUSE, do not recreate**
- No `PublicController` exists yet — needs to be created
- No `Dtos/Public/` directory exists yet — needs to be created
- No useQuery hooks exist for public config — need to create
- Rate limiting: only "auth" policy exists (5 req/min). Public endpoints need their own policy.

## Acceptance Criteria

1. **Identity-first loading**: Given an anonymous visitor opens the app, When the public dashboard loads, Then the church name and identity render immediately (from cached config) before activity data arrives, And Skeleton loading states display while activity data loads.

2. **Hero section with next activity**: Given activity data is available, When the hero section renders (dark `slate-800` background), Then it shows the next upcoming public activity with: prédicateur name + 48px avatar, department name + abbreviation badge, activity type/special tag (if any), date formatted warmly ("Ce Sabbat" or actual date), And start/end times.

3. **Empty state**: Given no upcoming public activities exist, When the hero section renders, Then a friendly empty state displays: "Aucune activité à venir — revenez bientôt!"

4. **Mobile responsive**: Given the public dashboard on mobile (375px), Then the hero section is full-width, content stacks vertically, prédicateur name + avatar are visible above the fold without scrolling.

5. **Church identity visible**: Given the public dashboard, Then church identity information (name, address, welcome message) is visible.

6. **Public API security**: Given `GET /api/public/next-activity` is called without authentication, Then only the next public-visibility activity is returned, And the response contains NO `isGuest` flag, NO `userId`, NO internal IDs beyond the activity's own, NO staffing counts, NO concurrency tokens.

## Tasks / Subtasks

### Backend

- [x] Task 1: Create Public DTOs (AC: #6)
  - [x] 1.1 Create directory `Dtos/Public/`
  - [x] 1.2 Create `Dtos/Public/PublicNextActivityResponse.cs` (record):
    - `int Id`, `string Title`, `DateOnly Date`, `TimeOnly StartTime`, `TimeOnly EndTime`
    - `string? DepartmentName`, `string? DepartmentAbbreviation`, `string? DepartmentColor`
    - `string? PredicateurName`, `string? PredicateurAvatarUrl`
    - `string? SpecialType`
  - [x] 1.3 Verify NO `isGuest`, NO `userId`, NO `version`/`concurrencyToken`, NO staffing fields

- [x] Task 2: Create PublicService (AC: #1, #2, #6)
  - [x] 2.1 Create `Services/IPublicService.cs` with `Task<PublicNextActivityResponse?> GetNextActivityAsync()`
  - [x] 2.2 Create `Services/PublicService.cs` with constructor injection: `PublicService(AppDbContext dbContext, IAvatarService avatarService)`
  - [x] 2.3 `GetNextActivityAsync()` — two-step query (avatar URL requires filesystem check, cannot be in SQL `.Select()`):
    - **Step 1 — SQL query** using `.Include()` chain (same pattern as `ActivityService.GetByIdAsync()`):
      ```csharp
      var today = DateOnly.FromDateTime(DateTime.Now); // server local time — see timezone note below
      var activity = await dbContext.Activities
          .Include(a => a.Department)
          .Include(a => a.Roles).ThenInclude(r => r.Assignments).ThenInclude(ra => ra.User)
          .Where(a => a.Visibility == ActivityVisibility.Public && a.Date >= today)
          .OrderBy(a => a.Date).ThenBy(a => a.StartTime)
          .FirstOrDefaultAsync();
      ```
    - **Step 2 — In-memory mapping** to `PublicNextActivityResponse`:
      - Find prédicateur: `activity.Roles.FirstOrDefault(r => r.RoleName.Equals("Predicateur", StringComparison.OrdinalIgnoreCase) || r.RoleName.Equals("Prédicateur", StringComparison.OrdinalIgnoreCase))` → first assignment's `User.FirstName + " " + User.LastName`
      - Avatar URL: call `avatarService.GetAvatarUrl(predicateurUserId)` — returns `/api/avatars/{id}?v={ticks}` or `null` if no file (same pattern as `ActivityService.MapToResponse()`)
      - Map remaining fields: Id, Title, Date, StartTime, EndTime, Department.Name, Department.Abbreviation, Department.Color, SpecialType
    - Return `null` if no activity found
  - [x] 2.4 Register DI in `ServiceCollectionExtensions.cs`: `services.AddScoped<IPublicService, PublicService>()`

- [x] Task 3: Create PublicController (AC: #6)
  - [x] 3.1 Create `Controllers/PublicController.cs`:
    - `[Route("api/public")]`, `[ApiController]` — NO `[Authorize]` attribute on class
    - Constructor: `PublicController(IPublicService publicService)`
  - [x] 3.2 Add endpoint: `[AllowAnonymous] [HttpGet("next-activity")]`
    - Returns `Ok(result)` when activity found, `NoContent()` (204) when null
  - [x] 3.3 Add rate limiting: create "public" policy in `ServiceCollectionExtensions.cs` (e.g., 30 req/min per IP) and apply `[EnableRateLimiting("public")]`

- [x] Task 4: Backend Integration Tests (AC: #6)
  - [x] 4.1 Create `tests/SdaManagement.Api.IntegrationTests/Public/PublicEndpointTests.cs`
  - [x] 4.2 Test: `GetNextActivity_WithPublicActivities_Returns200WithData` — seed a public activity with prédicateur role + assignment, verify response shape
  - [x] 4.3 Test: `GetNextActivity_NoPublicActivities_Returns204`
  - [x] 4.4 Test: `GetNextActivity_OnlyReturnsPublicVisibility` — seed both Public and Authenticated activities, verify only Public returned
  - [x] 4.5 Test: `GetNextActivity_ReturnsClosestFutureActivity` — seed multiple public activities, verify chronological ordering
  - [x] 4.6 Test: `GetNextActivity_ResponseDoesNotContainSensitiveFields` — assert no isGuest, userId, staffing fields in JSON response
  - [x] 4.7 Use `AnonymousClient` from `IntegrationTestBase` (no auth headers)

### Frontend

- [x] Task 5: Create Public API Types & Service (AC: #1, #2)
  - [x] 5.1 Create `types/public.ts` with `PublicNextActivity` interface matching backend DTO (camelCase)
  - [x] 5.2 Create `services/publicService.ts`:
    - **CRITICAL: Handle 204 No Content** — Axios returns `data: ""` (empty string) on 204, NOT `null`. Must check status:
    ```typescript
    export const publicService = {
      getNextActivity: () =>
        api.get<PublicNextActivity>("/api/public/next-activity")
          .then(res => (res.status === 204 ? null : res.data)),
    };
    ```
    - Return type: `Promise<PublicNextActivity | null>`

- [x] Task 6: Create Public Data Hooks (AC: #1, #2)
  - [x] 6.1 Create `hooks/usePublicDashboard.ts`:
    - `useNextActivity()` — `useQuery<PublicNextActivity | null>({ queryKey: ["public", "next-activity"], queryFn: publicService.getNextActivity, staleTime: 5 * 60 * 1000, retry: 1 })`
    - When `data === null` → empty state (no activities). When `data === undefined` → still loading (`isPending`).
    - `useChurchInfo()` — `useQuery({ queryKey: ["public", "church-info"], queryFn: () => configService.getPublic().then(res => res.data), staleTime: 30 * 60 * 1000 })`
    - Note: `configService.getPublic()` returns `AxiosResponse` (old pattern) — must unwrap `.data` in queryFn

- [x] Task 7: Adjust PublicLayout for Full-Bleed Hero (AC: #4)
  - [x] 7.1 Remove `mx-auto max-w-7xl px-4 py-6` from PublicLayout's `<main>` element — let child pages control their own width/padding
  - [x] 7.2 HomePage (and other public pages using constrained width) must add their own `mx-auto max-w-7xl px-4 py-6` wrapper for non-full-bleed content

- [x] Task 8: Build HeroSection Component (AC: #1, #2, #3, #4, #5)
  - [x] 8.1 Create `components/public/HeroSection.tsx`:
    - Full-width dark `bg-slate-800` background section (public warmth, NOT `slate-900`)
    - Inner content constrained: `mx-auto max-w-7xl px-4 py-12 sm:py-16`
  - [x] 8.2 **Church identity block** (top of hero, renders immediately from `useChurchInfo()`):
    - Church name: `text-3xl font-black text-white`
    - Address + welcome message: `text-sm text-slate-300` (14px min)
  - [x] 8.3 **Next activity block** (below identity, uses `useNextActivity()`):
    - **Loading state** (`isPending`): `<Skeleton>` components matching final layout shape — **CRITICAL: override Skeleton color for dark bg** with `bg-slate-700` (default `bg-accent` is near-white and would be jarring on `slate-800`):
      ```tsx
      <Skeleton className="h-12 w-12 rounded-full bg-slate-700" />
      <Skeleton className="h-6 w-48 bg-slate-700" />
      ```
    - **Loaded state** (`data !== null`): prédicateur 48px avatar (initials fallback via client-rendered div, photo via avatar URL from DTO), name `text-xl font-bold text-white`, department badge (`<Badge variant="secondary">` with department abbreviation), special type badge if applicable, date + time in warm format
    - **Loaded but no prédicateur** (`data.predicateurName === null`): show activity title, department, date/time normally — omit the speaker avatar + name section. Activity may exist without a prédicateur assigned yet.
    - **Empty state** (`data === null`): centered message "Aucune activité à venir — revenez bientôt!" in `text-base text-slate-300`
    - **Error state** (`isError`): show church identity (from separate cached query), hide activity section, subtle message "Impossible de charger les activités" in `text-sm text-slate-400` — do NOT show a full error page
  - [x] 8.4 **Date formatting**: Use `date-fns` with French locale (`import { fr } from 'date-fns/locale'`).
    - "Ce Sabbat" logic — compare activity date to this week's Saturday:
      ```typescript
      import { getDay, addDays, isSameDay, format } from 'date-fns';
      import { fr } from 'date-fns/locale';

      function formatActivityDate(activityDate: Date, t: TFunction): string {
        const today = new Date();
        const dayOfWeek = getDay(today); // 0=Sun, 6=Sat
        const daysUntilSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7;
        const thisSaturday = addDays(today, daysUntilSat);
        if (isSameDay(activityDate, thisSaturday)) return t('pages.home.thisSabbath');
        return format(activityDate, "EEEE d MMMM", { locale: fr });
        // Outputs lowercase French: "samedi 21 mars" (date-fns fr locale is lowercase)
      }
      ```
    - Note: date-fns French locale produces lowercase weekday/month names — this is correct French grammar for mid-sentence dates
  - [x] 8.5 **Responsive**: Mobile (base) → vertically stacked, full-width. Tablet (`sm:`) → 2-column possible. Desktop (`lg:`) → side-by-side identity + activity. **NEVER use `md:` breakpoint.**
  - [x] 8.6 All visible text via `t()` from `useTranslation()` — zero hardcoded strings
  - [x] 8.7 **Accessibility**: `aria-label` on avatar, semantic headings, minimum 4.5:1 contrast (white text on slate-800 passes)

- [x] Task 9: Update HomePage (AC: #1, #2, #3, #4, #5)
  - [x] 9.1 Replace stub content in `pages/HomePage.tsx` with `<HeroSection />`
  - [x] 9.2 Below hero: add empty placeholder `<section>` blocks for future stories (5.2 YouTube, 5.3 upcoming activities, 5.4 departments) — just empty `<div>`s with comments, no UI
  - [x] 9.3 Non-hero sections get their own `mx-auto max-w-7xl px-4 py-6` wrapper

- [x] Task 10: Update Other Public Pages (AC: #4)
  - [x] 10.1 Add `mx-auto max-w-7xl px-4 py-6` wrapper to `PublicCalendarPage.tsx` and `PublicDepartmentsPage.tsx` and `LivePage.tsx` content (since PublicLayout no longer provides it)

- [x] Task 11: i18n Translation Keys (AC: #2, #3, #5)
  - [x] 11.1 Add/update French keys in `public/locales/fr/common.json` under `pages.home`:
    - `pages.home.thisSabbath` → "Ce Sabbat"
    - `pages.home.noActivities` → "Aucune activité à venir — revenez bientôt!"
    - `pages.home.predicateur` → "Prédicateur"
    - `pages.home.loadingActivity` → "Chargement…"
    - `pages.home.loadError` → "Impossible de charger les activités"
    - `pages.home.welcomeDefault` → "Bienvenue"
    - Keep existing `pages.home.title` and `pages.home.subtitle`
  - [x] 11.2 Add English equivalents in `public/locales/en/common.json`

- [x] Task 12: MSW Mock Handlers (AC: #1, #2, #3)
  - [x] 12.1 Create `mocks/handlers/public.ts`:
    - `GET /api/public/next-activity` → 200 with mock `PublicNextActivity` data
    - Export `publicHandlersEmpty` variant → `new HttpResponse(null, { status: 204 })` (for empty state testing)
    - Export `publicHandlersError` variant → 500 (for error state testing)
  - [x] 12.2 Import `publicHandlers` in `HeroSection.test.tsx` and include in per-test `setupServer(...publicHandlers, ...configHandlers)` call — MSW server is per-test-file (NOT in `test-utils.tsx`), consistent with `AdminActivitiesPage.test.tsx` pattern

- [x] Task 13: Frontend Component Tests (AC: #1, #2, #3, #4, #5)
  - [x] 13.1 Create `components/public/HeroSection.test.tsx`:
    - Renders Skeleton loading states (with `bg-slate-700` override) while data loads
    - Renders prédicateur name, department badge, date when data loaded
    - Renders activity without speaker section when `predicateurName` is null (no-prédicateur case)
    - Renders empty state message when no activities (204 → null from API)
    - Renders error state message when API fails (500), church identity still visible
    - Renders church identity (name, address) from config
    - All text renders in French (default locale)
  - [x] 13.2 Create `pages/HomePage.test.tsx` (or update existing):
    - HomePage renders HeroSection
    - Basic smoke test

## Dev Notes

### Critical: Reuse Existing Infrastructure

**DO NOT recreate these — they already exist:**
- `GET /api/config` → public church info endpoint (in `ConfigController.cs` line 18–23, no `[Authorize]`)
- `configService.getPublic()` → frontend API call (in `services/configService.ts` line 24)
- `PublicChurchConfigResponse` → backend DTO (in `Dtos/Config/PublicChurchConfigResponse.cs`) and frontend type (in `services/configService.ts` line 16–21)
- `configHandlers` → MSW handlers for `/api/config` (in `mocks/handlers/config.ts`)
- `api` Axios instance → configured with interceptors (in `lib/api.ts`)

**Only create new:**
- `PublicController` with `GET /api/public/next-activity` — new endpoint
- `PublicService` + `IPublicService` — new service
- `PublicNextActivityResponse` DTO in `Dtos/Public/` — new DTO namespace
- Frontend hooks, components, and service for next-activity

### Architecture Patterns (Mandatory)

**Backend controller pattern** (from `ConfigController.cs`, `ActivitiesController.cs`):
```csharp
[Route("api/public")]
[ApiController]
public class PublicController(IPublicService publicService) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("next-activity")]
    [EnableRateLimiting("public")]
    public async Task<IActionResult> GetNextActivity()
    {
        var result = await publicService.GetNextActivityAsync();
        return result is not null ? Ok(result) : NoContent();
    }
}
```

**Backend service pattern** (from `ActivityService.GetByIdAsync()` — lines 74–86):
- Inject `AppDbContext` + `IAvatarService` via primary constructor
- For single-record queries with avatar URLs: use `.Include()` chains + in-memory mapping (avatar URL requires filesystem check via `avatarService.GetAvatarUrl()` — cannot translate to SQL)
- For list queries without avatars: use `.Select()` projections to anonymous type + in-memory mapping
- Async methods with `Async` suffix

**Frontend service pattern** (from `setupProgressService.ts` — newer pattern, extended for 204 handling):
```typescript
export const publicService = {
  getNextActivity: () =>
    api.get<PublicNextActivity>("/api/public/next-activity")
      .then(res => (res.status === 204 ? null : res.data)),
};
```
**CRITICAL**: Axios returns `data: ""` (empty string) on 204 No Content — NOT `null`. Without the `res.status === 204` check, the component would try to access `.title` on an empty string, causing broken rendering.

Note: `configService.getPublic()` uses the OLD pattern (no `.then(res => res.data)`). The hook must unwrap: `queryFn: () => configService.getPublic().then(res => res.data)`.

**Frontend hook pattern** (from `useSetupProgress.ts`):
```typescript
export function useNextActivity() {
  return useQuery<PublicNextActivity | null>({
    queryKey: ["public", "next-activity"],
    queryFn: publicService.getNextActivity,
    staleTime: 5 * 60 * 1000,
  });
}
// State logic in component:
// isPending → show Skeleton (data is undefined)
// data === null → empty state (API returned 204, no activities)
// data !== null → render activity details
// isError → show error message, church identity still visible
```

**TanStack Query v5 state checks:**
- Use `isPending` (not deprecated `isLoading`) for initial load detection
- Use `isError` + `error` for error states
- `data` is `undefined` while pending, typed `T` when success

### Frontend Design Specifications

**Hero Section Layout** (from UX spec):
- Full-bleed dark background: `bg-slate-800` (#1E293B) — warmer than operational `slate-900`
- Inner content: `mx-auto max-w-7xl px-4 py-12 sm:py-16`
- Fixed-height that never exceeds one viewport height on 375px mobile
- Prédicateur name + 48px avatar always visible above fold without scrolling

**Typography (Public Register Rules — CRITICAL):**
- Minimum text size: 14px (`text-sm`) — NEVER use 11px micro-labels or 12px captions on public layer
- Hero headline: `text-3xl font-black` (30px, weight 900)
- Speaker name: `text-xl font-bold` (20px, weight 700)
- Body: `text-base font-normal` (16px)
- Secondary metadata: `text-sm font-normal` (14px), color `text-slate-300` on dark bg

**Color Tokens:**
- Hero background: `bg-slate-800` (public warmth)
- Primary text on dark: `text-white`
- Secondary text on dark: `text-slate-300`
- Department badge: `<Badge variant="secondary">` with semantic tokens (not raw colors)
- Card border-radius: `rounded-[2rem]` (32px) for any card components
- Indigo-600 accent for interactive elements

**Avatar Rendering:**
- 48px in hero section
- Photo URL: `/api/avatars/{userId}` with ETag caching
- Fallback: client-rendered initials from name (div with first letters, colored background)
- `rounded-full` for circular shape

**Warm Vocabulary (French public layer):**
- "Ce Sabbat" (not "Programme en cours" or operational terms)
- "Aucune activité à venir — revenez bientôt!" (empty state)
- "Prédicateur" (speaker label)
- NO military vocabulary: no "Command Center", "Protocol Node", etc.

**Responsive Breakpoints:**
- Base (375px) → mobile: full-width, vertically stacked
- `sm:` (640px) → tablet: potential 2-column
- `lg:` (1024px) → desktop: side-by-side layout
- **NEVER `md:` (768px)** — intentionally skipped per architecture

**Skeleton Loading Pattern (Dark Background):**
```tsx
// CRITICAL: Override bg-accent (near-white oklch(0.97)) with bg-slate-700 for dark hero
// Default Skeleton uses bg-accent which is jarring on bg-slate-800
<div className="flex items-center gap-4">
  <Skeleton className="h-12 w-12 rounded-full bg-slate-700" />  {/* avatar */}
  <div className="space-y-2">
    <Skeleton className="h-6 w-48 bg-slate-700" />               {/* name */}
    <Skeleton className="h-4 w-32 bg-slate-700" />               {/* department */}
    <Skeleton className="h-4 w-24 bg-slate-700" />               {/* date */}
  </div>
</div>
```

### Security Requirements (NFR9)

- `PublicNextActivityResponse` fields are an explicit whitelist — only include fields the public should see
- Guest speakers appear identical to regular speakers: name + avatar only, NO `isGuest` flag
- No user IDs exposed (except implicitly in avatar URL which is already a public endpoint)
- No staffing details: no role counts, no assigned counts, no staffing status
- No concurrency tokens in public DTOs
- Integration tests must assert sensitive field absence from JSON response

### Testing Standards

**Backend test naming**: `{MethodName}_{Scenario}_{ExpectedResult}`
**Backend test class**: `PublicEndpointTests` in `tests/SdaManagement.Api.IntegrationTests/Public/`
**Backend test client**: Use `AnonymousClient` (no auth headers) from `IntegrationTestBase`
**Backend assertions**: Shouldly (`result.ShouldNotBeNull()`, `response.StatusCode.ShouldBe(...)`)

**Frontend test files**: Co-located (`HeroSection.test.tsx` next to `HeroSection.tsx`)
**Frontend test setup**: Use `render()` from `test-utils.tsx` (wraps Router, i18n, QueryClient, Auth, Tooltip)
**Frontend mock pattern**: MSW handlers + `server.use()` for per-test overrides
**Frontend assertions**: `@testing-library/jest-dom` matchers (`toBeInTheDocument()`, etc.)

### Prédicateur Query Logic (Backend)

The prédicateur is found by joining through the activity's roles:
```
Activity → Roles (ActivityRole where RoleName matches "Predicateur"/"Prédicateur")
         → RoleAssignments → User (first assigned)
         → Extract: FirstName + " " + LastName, avatarService.GetAvatarUrl(UserId)
```

- Use case-insensitive comparison: `r.RoleName.Equals("Predicateur", StringComparison.OrdinalIgnoreCase)` — handles both "Predicateur" and "Prédicateur" stored variants
- If no prédicateur role or no assignments → set `PredicateurName = null`, `PredicateurAvatarUrl = null` — component handles gracefully
- Avatar URL built in-memory via `avatarService.GetAvatarUrl(userId)` (filesystem check, returns `/api/avatars/{id}?v={ticks}` or `null`)

### Timezone Consideration (Date Filter)

Use `DateTime.Now` (server local time) for the date filter, NOT `DateTime.UtcNow`. Quebec (America/Toronto) is UTC-4/5. At 8 PM Saturday in Quebec, `DateTime.UtcNow` is already Sunday UTC — which would incorrectly exclude today's Sabbath activity from the hero section. Since this is a single-congregation app with server co-located in the same timezone, `DateTime.Now` is correct. If the server is hosted in a different timezone (e.g., Azure US West), use explicit timezone conversion:
```csharp
var eastern = TimeZoneInfo.FindSystemTimeZoneById("America/Toronto");
var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, eastern));
```

### Department Entity Field Mapping

The `Department` entity field is `Color` (type `string`, #hex format like `"#4F46E5"`) — confirmed in `Department.cs:8`. Map to DTO as `DepartmentColor = activity.Department?.Color`. The field is NOT named `ColorId` despite what the architecture doc might suggest.

### Rate Limiting for Public Endpoints

Add a "public" rate limiting policy in `ServiceCollectionExtensions.cs`:
```csharp
options.AddFixedWindowLimiter("public", limiterOptions =>
{
    limiterOptions.PermitLimit = configuration.GetValue("RateLimiting:PublicPermitLimit", 30);
    limiterOptions.Window = TimeSpan.FromMinutes(1);
});
```
More generous than "auth" (30 vs 5) since public endpoints are read-only and expected to have higher traffic.

### Project Structure Notes

**New files to create:**
```
src/SdaManagement.Api/
├── Controllers/PublicController.cs                    ← NEW
├── Services/IPublicService.cs                         ← NEW
├── Services/PublicService.cs                          ← NEW
├── Dtos/Public/PublicNextActivityResponse.cs           ← NEW

tests/SdaManagement.Api.IntegrationTests/
└── Public/PublicEndpointTests.cs                      ← NEW

src/sdamanagement-web/src/
├── types/public.ts                                    ← NEW
├── services/publicService.ts                          ← NEW
├── hooks/usePublicDashboard.ts                        ← NEW
├── components/public/HeroSection.tsx                  ← NEW
├── components/public/HeroSection.test.tsx             ← NEW
├── mocks/handlers/public.ts                           ← NEW
```

**Files to modify:**
```
src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs  ← ADD PublicService DI + "public" rate limit policy
src/sdamanagement-web/src/layouts/PublicLayout.tsx               ← REMOVE max-w/padding from <main>
src/sdamanagement-web/src/pages/HomePage.tsx                     ← REPLACE stub with HeroSection
src/sdamanagement-web/src/pages/PublicCalendarPage.tsx           ← ADD own max-w wrapper
src/sdamanagement-web/src/pages/PublicDepartmentsPage.tsx        ← ADD own max-w wrapper
src/sdamanagement-web/src/pages/LivePage.tsx                     ← ADD own max-w wrapper
src/sdamanagement-web/public/locales/fr/common.json              ← ADD pages.home.* keys
src/sdamanagement-web/public/locales/en/common.json              ← ADD pages.home.* keys
```
Note: MSW handlers are set up per-test-file (not in test-utils.tsx). No changes needed to test-utils.tsx.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 5, Story 5.1 acceptance criteria]
- [Source: _bmad-output/planning-artifacts/architecture.md — Public Endpoints, DTO Isolation, Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Hero Section, Public Register Typography, Color Palette]
- [Source: _bmad-output/planning-artifacts/prd.md — FR1, FR7, NFR9, NFR13–NFR18]
- [Source: src/SdaManagement.Api/Controllers/ConfigController.cs:18 — existing public config endpoint]
- [Source: src/sdamanagement-web/src/services/configService.ts:24 — existing getPublic() method]
- [Source: src/sdamanagement-web/src/hooks/useSetupProgress.ts — hook pattern reference]
- [Source: src/sdamanagement-web/src/services/setupProgressService.ts:15 — service .then(res => res.data) pattern]
- [Source: _bmad-output/implementation-artifacts/4-8-concurrent-edit-detection.md — previous story patterns]
- [Context7: TanStack Query v5.84.1 — isPending (not isLoading), staleTime, queryKey]
- [Context7: shadcn/ui — Skeleton, Card, Badge component patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- App.test.tsx regression: Updated test to reflect HomePage now renders HeroSection instead of static heading
- HeroSection error test needed 5s timeout due to `retry: 1` in useNextActivity hook (TanStack Query exponential backoff)

### Completion Notes List

- Backend: Created PublicController, PublicService, IPublicService, PublicNextActivityResponse DTO
- Backend: Added "public" rate limiting policy (30 req/min) in ServiceCollectionExtensions
- Backend: Two-step query pattern (Include chain + in-memory avatar mapping) following ActivityService.GetByIdAsync pattern
- Backend: 5 integration tests covering 200/204 responses, visibility filtering, ordering, and sensitive field exclusion
- Frontend: Created publicService, PublicNextActivity type, usePublicDashboard hooks (useNextActivity, useChurchInfo)
- Frontend: Built HeroSection component with church identity, next activity, loading/empty/error states
- Frontend: Full-bleed hero layout — removed padding from PublicLayout main, added wrappers to child pages
- Frontend: Added i18n keys for FR/EN, MSW mock handlers, 9 frontend tests (7 HeroSection + 2 HomePage)
- Frontend: Updated App.test.tsx to match new HomePage behavior (no regression)
- All 536 backend tests pass (235 unit + 301 integration), all 322 frontend tests pass

**Code review fixes (Sonnet 4.6):**
- [M1] Added `lg:flex lg:items-start lg:justify-between lg:gap-12` layout for desktop side-by-side church identity + activity
- [M2] Fixed skeleton test dead conditional — removed unreachable `animate-pulse` branch
- [M3] Added 2 date formatting tests: "Ce Sabbat" logic + French date-fns locale output with `vi.useFakeTimers()`
- [L1] Decoupled specialType i18n from admin namespace — added `pages.home.specialType.*` keys to FR/EN/test-utils
- [L2] Removed redundant `aria-label` from `<img>` that already has `alt`
- [L3] Removed dead in-memory property assignments in `SeedTestData`
- [L4] Added timezone TODO comment in `PublicService.cs`
- [L5] Changed `ActivityContent` to use `useTranslation()` directly instead of `t` prop
- All 536 backend tests pass, all 324 frontend tests pass (2 new)

### File List

**New files:**
- src/SdaManagement.Api/Dtos/Public/PublicNextActivityResponse.cs
- src/SdaManagement.Api/Services/IPublicService.cs
- src/SdaManagement.Api/Services/PublicService.cs
- src/SdaManagement.Api/Controllers/PublicController.cs
- tests/SdaManagement.Api.IntegrationTests/Public/PublicEndpointTests.cs
- src/sdamanagement-web/src/types/public.ts
- src/sdamanagement-web/src/services/publicService.ts
- src/sdamanagement-web/src/hooks/usePublicDashboard.ts
- src/sdamanagement-web/src/components/public/HeroSection.tsx
- src/sdamanagement-web/src/components/public/HeroSection.test.tsx
- src/sdamanagement-web/src/pages/HomePage.test.tsx
- src/sdamanagement-web/src/mocks/handlers/public.ts

**Modified files:**
- src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs (PublicService DI + "public" rate limit policy)
- src/sdamanagement-web/src/layouts/PublicLayout.tsx (removed max-w/padding from main)
- src/sdamanagement-web/src/pages/HomePage.tsx (replaced stub with HeroSection)
- src/sdamanagement-web/src/pages/PublicCalendarPage.tsx (added own max-w wrapper)
- src/sdamanagement-web/src/pages/PublicDepartmentsPage.tsx (added own max-w wrapper)
- src/sdamanagement-web/src/pages/LivePage.tsx (added own max-w wrapper)
- src/sdamanagement-web/public/locales/fr/common.json (added pages.home.* keys)
- src/sdamanagement-web/public/locales/en/common.json (added pages.home.* keys)
- src/sdamanagement-web/src/test-utils.tsx (added pages.home.* i18n keys)
- src/sdamanagement-web/src/App.test.tsx (updated for new HomePage behavior)

## Change Log

- 2026-03-10: Story 5.1 implemented — Public dashboard hero section with next activity endpoint, church identity display, loading/empty/error states, responsive layout, i18n, full test coverage
- 2026-03-10: Code review — 8 issues found (3M/5L), all fixed: lg: desktop layout, date tests, specialType i18n decoupling, test quality, accessibility, dead code cleanup
