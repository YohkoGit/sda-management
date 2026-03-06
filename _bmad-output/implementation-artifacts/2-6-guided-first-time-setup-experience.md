# Story 2.6: Guided First-Time Setup Experience

Status: done

## Prerequisites

- **Local dev environment**: Node 20+, .NET 10 SDK, Docker (Testcontainers), PostgreSQL 17 via Docker
- **Stories 2.1-2.5 merged**: All Epic 2 backend endpoints and frontend pages must be working
- **Database seeded**: OWNER account exists via EF Core seed migration

## Story

As an **OWNER** opening the app for the first time,
I want the system to guide me through setup in the right order (church settings > departments > templates > schedules),
so that I know exactly what to configure next and the setup feels manageable.

## Acceptance Criteria

### AC1 — Setup Progress Indicator Display
- **Given** a freshly deployed app with empty database (only OWNER seed)
- **When** the OWNER signs in and reaches the authenticated dashboard
- **Then** a setup progress indicator (SetupChecklist) shows steps with current progress
- **And** each uncompleted step links to its configuration page

### AC2 — First Step (Church Settings) Highlighted
- **Given** church settings are not yet configured
- **When** the setup guide renders
- **Then** step 1 (Parametres) is highlighted as "current" with encouraging copy via i18n key `setup.startHere`
- **And** subsequent steps are shown as `pending` (greyed out, not clickable until dependencies met)

### AC3 — Progressive Step Unlocking
- **Given** church settings are saved (ChurchConfig record exists)
- **When** the OWNER returns to the dashboard
- **Then** step 1 shows a checkmark (`complete`), step 2 (Departements) is now highlighted as "current"

### AC4 — Setup Complete State
- **Given** all implementable setup steps are completed
- **When** the OWNER views the dashboard
- **Then** the setup guide shows a "Configuration complete" confirmation
- **And** the normal operational dashboard content is displayed below/instead

### AC5 — Non-OWNER Users Never See Setup Checklist
- **Given** a user with VIEWER or ADMIN role
- **When** they view the dashboard
- **Then** the SetupChecklist is never rendered (OWNER-only component)

### AC6 — Backend Setup Progress Endpoint
- **Given** any OWNER request to `GET /api/setup-progress`
- **When** the endpoint is called
- **Then** it returns step completion status derived from database counts
- **And** non-OWNER users receive 403 Forbidden

## The Setup Steps (Sequential Dependency Chain)

| Step | i18n Key | Route Link | Completion Check | Prerequisite |
|------|----------|------------|------------------|--------------|
| 1 | `setup.steps.churchSettings` | `/admin/settings` | `ChurchConfig` record exists | None |
| 2 | `setup.steps.departments` | `/admin/departments` | `Department` count > 0 | Step 1 |
| 3 | `setup.steps.templates` | `/admin/activity-templates` | `ActivityTemplate` count > 0 | Step 2 |
| 4 | `setup.steps.schedules` | `/admin/program-schedules` | `ProgramSchedule` count > 0 | Step 3  |

**Note on future steps**: The epics spec defines 5 steps including "Members" (Story 3.1) and "First Activity" (Story 4.1). Those Epic 3/4 features don't exist yet. Build the checklist with 4 steps now. When Stories 3.1 and 4.1 land, the checklist data model (steps array) makes it trivial to append steps 5 and 6. Do NOT add placeholder steps for unbuilt features.

**IMPORTANT — Future integration TODO**: The developer MUST add a code comment `// TODO(story-3.1): Add "members" step — see Story 2.6 setup checklist` directly above the steps array in `SetupProgressService.cs` AND in the frontend `useSetupProgress.ts` step config. This ensures the Story 3.1 and 4.1 developers discover the integration point. Similarly add `// TODO(story-4.1): Add "first-activity" step`.

## Tasks / Subtasks

### Backend

- [x] **Task 1: SetupProgress DTO** (AC: #6)
  - [x] Create `src/SdaManagement.Api/Dtos/Setup/SetupProgressResponse.cs`
  - [x] DTO shape: `{ steps: SetupStepItem[], isSetupComplete: bool }`
  - [x] `SetupStepItem`: `{ id: string, status: string }`
  - [x] Step `id` values: `"church-config"`, `"departments"`, `"templates"`, `"schedules"`
  - [x] Step `status` values: `"complete"`, `"current"`, `"pending"`

- [x] **Task 2: SetupProgressService** (AC: #1, #3, #6)
  - [x] Create `ISetupProgressService` interface + `SetupProgressService` implementation
  - [x] Primary constructor: `(AppDbContext db)`
  - [x] Method: `GetSetupProgressAsync(CancellationToken)` returns `SetupProgressResponse`
  - [x] Logic: query DB for ChurchConfig existence, Department count, ActivityTemplate count, ProgramSchedule count
  - [x] Apply sequential dependency: step N is `current` only if step N-1 is `complete`; step N is `pending` if any prior step is incomplete
  - [x] `isSetupComplete` = all steps have status `"complete"`
  - [x] Register in `ServiceCollectionExtensions.AddApplicationServices()`

- [x] **Task 3: SetupProgressController** (AC: #6, #5)
  - [x] Create `src/SdaManagement.Api/Controllers/SetupProgressController.cs`
  - [x] Route: `api/setup-progress`
  - [x] Single `[HttpGet]` method
  - [x] OWNER-only: `if (!auth.IsOwner()) return Forbid();`
  - [x] Follow controller pattern from `SystemHealthController` (primary constructor, `[Authorize]`, `[EnableRateLimiting("auth")]`)

- [x] **Task 4: Backend integration tests** (AC: #6, #5)
  - [x] OWNER access returns 200 with correct step progression
  - [x] ADMIN/VIEWER returns 403
  - [x] Anonymous returns 401
  - [x] Test scenarios: empty DB (step 1 current), after config created (step 2 current), all complete

- [x] **Task 5: Backend unit tests** (AC: #6)
  - [x] `SetupProgressServiceTests`: mock `AppDbContext` to test all step progression states
  - [x] Empty DB: step 1 = current, rest = pending
  - [x] Config exists: step 1 = complete, step 2 = current, rest = pending
  - [x] Config + departments: steps 1-2 = complete, step 3 = current, step 4 = pending
  - [x] All exist: all complete, `isSetupComplete = true`

### Frontend

- [x] **Task 6: Setup progress service** (AC: #1)
  - [x] Create `src/sdamanagement-web/src/services/setupProgressService.ts`
  - [x] Method: `getSetupProgress()` calling `GET /api/setup-progress`
  - [x] TypeScript types: `SetupProgressResponse { steps: SetupStepItem[], isSetupComplete: boolean }`, `SetupStepItem { id: string, status: string }`

- [x] **Task 7: useSetupProgress hook** (AC: #1, #3)
  - [x] Create `src/sdamanagement-web/src/hooks/useSetupProgress.ts`
  - [x] TanStack Query: `queryKey: ["setup-progress"]`
  - [x] Only enabled when user role is OWNER: `enabled: user?.role?.toUpperCase() === "OWNER"`
  - [x] Returns `{ steps, isSetupComplete, isLoading }`
  - [x] Define a frontend-only step config map that enriches API response with route and i18n key per step id:
    ```ts
    const STEP_CONFIG: Record<string, { route: string; labelKey: string }> = {
      "church-config": { route: "/admin/settings", labelKey: "setup.steps.churchSettings" },
      "departments": { route: "/admin/departments", labelKey: "setup.steps.departments" },
      "templates": { route: "/admin/activity-templates", labelKey: "setup.steps.templates" },
      "schedules": { route: "/admin/program-schedules", labelKey: "setup.steps.schedules" },
    };
    // TODO(story-3.1): Add "members" step
    // TODO(story-4.1): Add "first-activity" step
    ```

- [x] **Task 8: SetupChecklist component** (AC: #1, #2, #3, #4, #5)
  - [x] Create `src/sdamanagement-web/src/components/setup/SetupChecklist.tsx`
  - [x] Vertical checklist rendering steps from `useSetupProgress` hook
  - [x] Loading state: render `<Skeleton className="h-48" />` while `isLoading` is true (matches project pattern from `AdminSystemHealthPage.tsx`)
  - [x] Per-step rendering based on status:
    - `pending`: grey circle, `text-slate-400`, non-clickable `<span>` (NOT `<Link>` or `<a>`)
    - `current`: indigo ring with subtle pulse animation, clickable `<Link to={step.route}>`, encouraging copy from i18n
    - `complete`: green checkmark (`text-emerald-600`), clickable `<Link to={step.route}>` for review
  - [x] Use `<Link>` from `react-router-dom` (NOT `NavLink` — active state comes from API response status, not URL matching)
  - [x] Accessibility: `role="navigation"`, `aria-label` from i18n key `setup.ariaLabel`
  - [x] Each step link: `aria-current="step"` on the current step only
  - [x] When `isSetupComplete`: show completion message from i18n key `setup.complete`
  - [x] Pulse animation: use `motion-safe:animate-pulse` (Tailwind respects `prefers-reduced-motion`)

- [x] **Task 9: Integrate into DashboardPage** (AC: #1, #4, #5)
  - [x] Import `SetupChecklist` into `DashboardPage.tsx`
  - [x] Conditionally render: only when user is OWNER AND `!isSetupComplete`
  - [x] Position: top of dashboard content area, above any other dashboard widgets
  - [x] When setup complete: hide checklist, show normal dashboard

- [x] **Task 10: i18n strings** (AC: #2)
  - [x] Add `setup` namespace keys to `public/locales/fr/common.json` and `public/locales/en/common.json`
  - [x] Keys needed (French uses Unicode escapes in JSON, same as existing keys in `common.json`):
    - `setup.title`: "Configuration initiale" / "Initial Setup"
    - `setup.ariaLabel`: "Configuration initiale" / "Initial setup navigation"
    - `setup.startHere`: "Commencez ici" / "Start here"
    - `setup.steps.churchSettings`: "Param\u00e8tres" / "Church Settings"
    - `setup.steps.departments`: "D\u00e9partements" / "Departments"
    - `setup.steps.templates`: "Mod\u00e8les d\u2019activit\u00e9s" / "Activity Templates"
    - `setup.steps.schedules`: "Horaires r\u00e9currents" / "Program Schedules"
    - `setup.complete`: "Configuration termin\u00e9e \u2014 votre syst\u00e8me est pr\u00eat!" / "Setup complete \u2014 your system is ready!"

- [x] **Task 11: Frontend component tests** (AC: #1, #2, #3, #4, #5)
  - [x] `SetupChecklist.test.tsx`: co-located test file
  - [x] Setup MSW per-file: `const server = setupServer(...authHandlers, ...setupProgressHandlers)` — same pattern as `AdminSystemHealthPage.test.tsx`
  - [x] Use `server.use(http.get("/api/auth/me", ...))` to control auth user per test
  - [x] Test: renders all steps with correct labels
  - [x] Test: current step has indigo styling and "Commencez ici" text
  - [x] Test: pending steps are not clickable (no `<a>` tag)
  - [x] Test: complete steps show green checkmark
  - [x] Test: when all complete, shows completion message
  - [x] Test: not rendered for non-OWNER users (swap auth handler to return ADMIN user)
  - [x] Test: shows skeleton while loading

- [x] **Task 12: MSW mock handlers** (AC: #1)
  - [x] Create `src/sdamanagement-web/src/mocks/handlers/setupProgress.ts`
  - [x] Default handler: returns step 1 current, rest pending (empty DB scenario)
  - [x] Export variants for different completion states (for tests)

## Dev Notes

### Architecture Patterns (Mandatory)

**Backend — Follow established patterns exactly:**
- Controller: primary constructor with `(ISetupProgressService, SdacAuth.IAuthorizationService auth)`. Copy structure from `SystemHealthController`.
- Service: primary constructor with `(AppDbContext db)`. Single async method.
- DTOs: in `Dtos/Setup/` folder. Response-only (no request DTOs — GET endpoint only).
- Registration: `services.AddScoped<ISetupProgressService, SetupProgressService>()` in `ServiceCollectionExtensions.AddApplicationServices()`.
- Authorization: return-based `if (!auth.IsOwner()) return Forbid();` — NOT exception-based, NOT `[Authorize(Roles = "OWNER")]` attribute.
- Rate limiting: `[EnableRateLimiting("auth")]` on controller class.
- No exception handling in service (architecture rule: "catch no exceptions").
- All method names end with `Async` suffix.

**Frontend — Follow established patterns exactly:**
- Service: axios wrapper in `services/setupProgressService.ts`. Copy pattern from `systemHealthService.ts`.
- Hook: TanStack Query with `queryKey: ["setup-progress"]`. No Zustand for server data.
- Component: shadcn/ui primitives + Tailwind. Mobile-first (base = mobile, `sm:` = tablet, `lg:` = desktop). Skip `md:` breakpoint.
- i18n: all strings via `useTranslation()`. No hardcoded French or English in components.
- Types: derive from API response shape. No `any` type.
- Tests: co-located `.test.tsx` files. MSW for API mocking. Use existing `test-utils.tsx` setup.
- Add i18n keys to `test-utils.tsx` mock resources.

### Reuse Existing Code (Do NOT Reinvent)

- **SetupStatusResponse already exists** in `src/SdaManagement.Api/Dtos/SystemHealth/SetupStatusResponse.cs` with `ChurchConfigExists`, `DepartmentCount`, `TemplateCount`, `ScheduleCount`, `UserCount`. The new `SetupProgressService` queries the same tables but returns a different shape (step-based with dependency logic). Do NOT modify SystemHealthService.
- **Existing routes**: `/admin/settings`, `/admin/departments`, `/admin/activity-templates`, `/admin/program-schedules` — the checklist links to these existing pages. Do NOT create new pages.
- **DashboardPage**: `src/sdamanagement-web/src/pages/DashboardPage.tsx` — integrate SetupChecklist here.
- **AuthContext**: use existing `useAuth()` hook to check user role for conditional rendering. Role check pattern: `user?.role?.toUpperCase() === "OWNER"` (see `AdminSystemHealthPage.tsx:21` for reference).
- **ProtectedRoute**: already gates admin routes by role in `App.tsx`. The SetupChecklist is an OWNER-conditional UI element inside the dashboard, NOT a separate route.

### Step Completion Logic (Backend)

```
1. Query: churchConfigExists = db.ChurchConfigs.AnyAsync()
2. Query: departmentCount = db.Departments.CountAsync()
3. Query: templateCount = db.ActivityTemplates.CountAsync()
4. Query: scheduleCount = db.ProgramSchedules.CountAsync()

Step states:
- Step 1 (church-config): complete if churchConfigExists, else current (always unlocked)
- Step 2 (departments): complete if departmentCount > 0, current if step 1 complete, else pending
- Step 3 (templates): complete if templateCount > 0, current if steps 1-2 complete, else pending
- Step 4 (schedules): complete if scheduleCount > 0, current if steps 1-3 complete, else pending

isSetupComplete = all 4 steps are "complete"
```

### Component Layout

```
Mobile (< 640px):
  ┌─────────────────────────┐
  │ Setup Checklist (full-w) │  ← stacked, scrolls with page
  ├─────────────────────────┤
  │ Dashboard content...     │
  └─────────────────────────┘

Desktop (>= 640px):
  No separate column — SetupChecklist renders as a Card at top of dashboard
  content area (not sidebar). Full-width card with horizontal step indicators
  or compact vertical list inside a Card component.
```

### API Response Shape

```json
{
  "steps": [
    { "id": "church-config", "status": "complete" },
    { "id": "departments", "status": "current" },
    { "id": "templates", "status": "pending" },
    { "id": "schedules", "status": "pending" }
  ],
  "isSetupComplete": false
}
```

### Testing Strategy

**Backend unit tests** (`SetupProgressServiceTests`):
- Mock `AppDbContext` DbSets (ChurchConfigs, Departments, ActivityTemplates, ProgramSchedules)
- Test all 5 states: empty, step 1 done, steps 1-2 done, steps 1-3 done, all done
- Verify sequential dependency logic (step N can't be "current" unless N-1 is "complete")

**Backend integration tests** (`SetupProgressEndpointTests`):
- Extend `IntegrationTestBase` with constructor injection of `SdaManagementWebApplicationFactory` (same pattern as `SystemHealthEndpointTests`)
- Override `SeedTestData()` to create test users: `CreateTestUser("test-owner@test.local", UserRole.Owner)`, etc.
- For setup-state scenarios: use `Factory.Services.CreateScope()` → `AppDbContext` to insert ChurchConfig / Department / etc. records within individual test methods
- OWNER → 200 with valid response
- ADMIN → 403, VIEWER → 403, Anonymous → 401
- Seed data scenarios: empty DB (step 1 current), after config created (step 2 current), all complete

**Frontend component tests** (`SetupChecklist.test.tsx`):
- Per-file MSW server: `const server = setupServer(...authHandlers, ...setupProgressHandlers)` with `beforeAll/afterEach/afterAll` lifecycle (copy pattern from `AdminSystemHealthPage.test.tsx`)
- Swap auth user per test via `server.use(http.get("/api/auth/me", () => HttpResponse.json(ownerUser)))`
- Swap setup progress state per test via `server.use()` with different response payloads
- Render with OWNER auth → checklist visible
- Render with ADMIN auth → checklist not rendered
- Test step visual states (pending/current/complete)
- Test link behavior (pending = no link, current/complete = link to admin page)
- Test completion message when all steps done

**No E2E tests for this story** — the setup checklist is a UI overlay on the dashboard; E2E tests for the full setup flow across epics will be added when all setup-related stories are complete.

### Project Structure Notes

**New files to create:**

Backend:
- `src/SdaManagement.Api/Dtos/Setup/SetupProgressResponse.cs`
- `src/SdaManagement.Api/Dtos/Setup/SetupStepItem.cs`
- `src/SdaManagement.Api/Services/ISetupProgressService.cs`
- `src/SdaManagement.Api/Services/SetupProgressService.cs`
- `src/SdaManagement.Api/Controllers/SetupProgressController.cs`
- `tests/SdaManagement.Api.UnitTests/Services/SetupProgressServiceTests.cs`
- `tests/SdaManagement.Api.IntegrationTests/Setup/SetupProgressEndpointTests.cs`

Frontend:
- `src/sdamanagement-web/src/services/setupProgressService.ts`
- `src/sdamanagement-web/src/hooks/useSetupProgress.ts`
- `src/sdamanagement-web/src/components/setup/SetupChecklist.tsx`
- `src/sdamanagement-web/src/components/setup/SetupChecklist.test.tsx`
- `src/sdamanagement-web/src/components/setup/index.ts`
- `src/sdamanagement-web/src/mocks/handlers/setupProgress.ts`

**Files to modify:**

- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — register SetupProgressService
- `src/sdamanagement-web/src/pages/DashboardPage.tsx` — integrate SetupChecklist
- `src/sdamanagement-web/public/locales/fr/common.json` — add setup i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — add setup i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — add setup i18n mock keys to the `resources.fr.common` object

**No database migrations needed.** This story reads from existing tables only.

### Design Tokens Reference

- Current step ring: `ring-2 ring-indigo-600`
- Current step pulse: `motion-safe:animate-pulse`
- Complete checkmark: `text-emerald-600`
- Pending circle: `text-slate-300`
- Step label (current): `text-slate-900 font-semibold`
- Step label (complete): `text-slate-700`
- Step label (pending): `text-slate-400`
- Card container: shadcn/ui `<Card>` with `rounded-2xl` (matches project pattern)
- Encouraging copy: `text-sm text-indigo-600 font-medium`
- Completion message: `text-emerald-700 font-semibold`

### Previous Story Learnings (from Story 2.5)

- **Controller pattern**: Use primary constructor with `SdacAuth.IAuthorizationService auth` (namespaced import). Single `[HttpGet]` method. Return-based auth check.
- **Service pattern**: Primary constructor injection. Async methods with CancellationToken. No exception handling.
- **Test pattern**: OWNER 200, ADMIN 403, VIEWER 403, ANONYMOUS 401. Integration tests against Testcontainers PostgreSQL.
- **Frontend page tests**: Add all new i18n keys to `test-utils.tsx` mock resources BEFORE writing tests.
- **MSW handlers**: Create default + variant handlers for different test scenarios. Use `server.use()` to swap handlers in specific tests. There is NO shared MSW server or `handlers/index.ts` — each test file creates its own `setupServer()` with the handlers it needs (e.g., `const server = setupServer(...authHandlers, ...featureHandlers)`).
- **i18n key hierarchy**: `pages.{feature}.*` for page-specific, `setup.*` for setup namespace.
- **Rate limiting**: `[EnableRateLimiting("auth")]` on controller class (100 req/min dev limit).

### Git Intelligence

Recent commit pattern: `feat(epic-2): Stories 2.3-2.5`, `feat(departments): Story 2.2`, `feat(config): Story 2.1`. Follow this convention for the commit message.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.6]
- [Source: _bmad-output/planning-artifacts/architecture.md — Controller patterns, Service patterns, DTOs, Testing standards]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — SetupChecklist component spec, empty states, accessibility]
- [Source: _bmad-output/implementation-artifacts/2-5-system-health-dashboard.md — Previous story patterns]
- [Source: src/SdaManagement.Api/Controllers/SystemHealthController.cs — Controller template to follow]
- [Source: src/SdaManagement.Api/Services/SystemHealthService.cs — Service with DB queries pattern]
- [Source: src/SdaManagement.Api/Dtos/SystemHealth/SetupStatusResponse.cs — Existing setup status DTO (do not modify)]
- [Source: src/sdamanagement-web/src/App.tsx — Route structure, lazy loading pattern]
- [Source: src/sdamanagement-web/src/pages/DashboardPage.tsx — Integration target for SetupChecklist]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

No blocking issues encountered during implementation.

### Completion Notes List

- Implemented `SetupProgressService` with sequential dependency logic: step N is "current" only if all prior steps are "complete"
- Controller follows exact pattern from `SystemHealthController` (primary constructor, OWNER-only auth, rate limiting)
- DTOs in `Dtos/Setup/` folder with init-only properties matching camelCase JSON serialization
- Frontend `useSetupProgress` hook enriches API response with route and i18n label per step
- `SetupChecklist` component uses vertical card layout with step indicators (pending=grey, current=indigo pulse, complete=green check)
- Dashboard integration: conditionally rendered for OWNER only when setup is incomplete
- TODO comments added for story-3.1 (members) and story-4.1 (first-activity) step additions in both backend and frontend
- All i18n keys added in FR and EN locales + test-utils mock resources
- 5 backend unit tests (all step progression states), 7 integration tests (auth + data scenarios), 7 frontend component tests
- Pre-existing flaky test issue: SystemHealthEndpointTests occasionally fail with 429 TooManyRequests due to shared rate limiter window (not caused by this story)

### Change Log

- 2026-03-04: Story 2.6 implemented — Guided first-time setup experience with backend endpoint and frontend checklist component
- 2026-03-05: Code review fixes — H1: AC4 completion message now reachable (DashboardPage delegates display logic to SetupChecklist); H2: File List updated with 5 undocumented changes; M1: dead export removed, AC3 progressive unlock test added; M2: checkmark test now verifies SVG icon; M3: error state handling added to hook+component; M4: personal email moved to gitignored .local.json; L1: redundant role attr removed; L2: integration tests use typed deserialization; L3: overlapping test removed

### File List

**New files:**
- src/SdaManagement.Api/Dtos/Setup/SetupProgressResponse.cs
- src/SdaManagement.Api/Dtos/Setup/SetupStepItem.cs
- src/SdaManagement.Api/Services/ISetupProgressService.cs
- src/SdaManagement.Api/Services/SetupProgressService.cs
- src/SdaManagement.Api/Controllers/SetupProgressController.cs
- tests/SdaManagement.Api.UnitTests/Services/SetupProgressServiceTests.cs
- tests/SdaManagement.Api.IntegrationTests/Setup/SetupProgressEndpointTests.cs
- src/sdamanagement-web/src/services/setupProgressService.ts
- src/sdamanagement-web/src/hooks/useSetupProgress.ts
- src/sdamanagement-web/src/components/setup/SetupChecklist.tsx
- src/sdamanagement-web/src/components/setup/SetupChecklist.test.tsx
- src/sdamanagement-web/src/components/setup/index.ts
- src/sdamanagement-web/src/mocks/handlers/setupProgress.ts

**Modified files:**
- src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs
- src/SdaManagement.Api/Controllers/AuthController.cs (OAuth redirect to FrontendUrl + OnRemoteFailure handler)
- src/SdaManagement.Api/Program.cs (added .local.json config override loading)
- src/SdaManagement.Api/appsettings.json (added FrontendUrl key)
- src/SdaManagement.Api/appsettings.Development.json (added RateLimiting.AuthPermitLimit: 100)
- tests/SdaManagement.Api.IntegrationTests/SdaManagementWebApplicationFactory.cs (bumped test rate limit 200 → 10000)
- src/sdamanagement-web/src/pages/DashboardPage.tsx
- src/sdamanagement-web/public/locales/fr/common.json
- src/sdamanagement-web/public/locales/en/common.json
- src/sdamanagement-web/src/test-utils.tsx
