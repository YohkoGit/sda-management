# Story 8.4: OWNER Full Department Access

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **OWNER**,
I want to manage all departments regardless of my department assignments,
So that I have unrestricted administrative access across the entire organizational structure.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–8.3 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors, abbreviations, and descriptions
- Sub-ministries with leads created (from Story 8.3) for at least 2 departments
- At least one user per role: VIEWER, ADMIN (scoped to department A only), ADMIN (scoped to department B only), OWNER (with NO department assignments — critical for this story's edge case)
- Activities and meetings created for at least 2 different departments (from Stories 8.1-8.2)
- All Epics 1–8.3 stories committed and passing

### Codebase State (Story 8.3 Complete)

**Backend — OWNER bypass already implemented across the stack:**
- `AuthorizationService` at `Auth/AuthorizationService.cs` — `CanManage(departmentId)` returns `true` for OWNER immediately (line 14). This bypass was established in earlier epics and is the **foundation** of Story 8.4.
- `DepartmentsController` at `Controllers/DepartmentsController.cs` — Department-level CRUD uses `IsOwner()` (OWNER-only). Sub-ministry CRUD uses `CanManage(departmentId)` (ADMIN+ with OWNER bypass). Both correct.
- `ActivitiesController` at `Controllers/ActivitiesController.cs` — Create/Update use `CanManage(request.DepartmentId)`. Delete uses `CanManage(activity.DepartmentId.Value)` or `IsOwner()`. OWNER bypasses all.
- `DepartmentService` at `Services/DepartmentService.cs` — Returns all departments without filtering. No department scoping at service layer (correct — auth is at controller layer).
- `ICurrentUserContext` at `Auth/CurrentUserContext.cs` — Populates `DepartmentIds` from DB. For OWNER with no assignments, `DepartmentIds` is empty — `CanManage()` bypasses this check entirely.

**Frontend — OWNER detection already correct:**
- `DepartmentDetailPage` at `pages/DepartmentDetailPage.tsx` — `canManage` computed as `isAdminWithScope || isOwner` (lines 131-136). OWNER always gets `canManage = true`.
- `AuthDepartmentsPage` at `pages/AuthDepartmentsPage.tsx` — Fetches all departments via `getDepartmentsWithStaffing()`. No client-side filtering. OWNER sees all.
- `AuthContext` at `contexts/AuthContext.tsx` — Stores `role` and `departmentIds` from `/api/auth/me`. Frontend checks `role === "OWNER"` for bypass logic.
- `SubMinistryManager` at `components/department/SubMinistryManager.tsx` — Receives `canManage` prop. Works for both ADMIN and OWNER.

**Existing integration tests (partial OWNER coverage):**
- `DepartmentEndpointTests.cs` — OWNER CRUD tests exist but use OWNER client which may have department assignments in test setup.
- `SubMinistryCrudEndpointTests.cs` — Lines 281-320 test OWNER managing sub-ministries in unassigned departments.
- **Gap:** No explicit test verifying OWNER with zero department assignments can still manage departments.
- **Gap:** No test verifying OWNER can create/edit/delete activities in departments they're NOT assigned to.
- **Gap:** No frontend test specifically verifying OWNER sees management controls on DepartmentDetailPage.

## Acceptance Criteria

1. **Given** an OWNER viewing any department detail page
   **When** the page loads
   **Then** all edit controls are visible (create/edit/delete activities, meetings, sub-ministries) regardless of department assignment (FR47)

2. **Given** an OWNER on the departments list
   **When** they view the list
   **Then** all departments are accessible with full management capability

3. **Given** the authorization service
   **When** checking department-scoped operations for an OWNER
   **Then** IAuthorizationService returns true for all departments (OWNER bypasses department scoping)

4. **Given** an OWNER with NO department assignments (not assigned to any department)
   **When** they access any department detail page and attempt management operations
   **Then** all operations succeed — OWNER bypass does not depend on having department assignments

5. **Given** an OWNER attempting to create/edit/delete activities for any department
   **When** the API processes the request
   **Then** the operation succeeds with 201/200/204 regardless of OWNER's department assignments

6. **Given** an OWNER attempting to create/edit/delete meetings for any department
   **When** the API processes the request
   **Then** the operation succeeds regardless of OWNER's department assignments

7. **Given** an OWNER attempting to create/edit/delete sub-ministries for any department
   **When** the API processes the request
   **Then** the operation succeeds regardless of OWNER's department assignments
   **Note:** Partially tested in Story 8.3 (SubMinistryCrudEndpointTests lines 281-320). This story adds comprehensive coverage.

## Tasks / Subtasks

- [x] **Task 1: Backend — Create dedicated OWNER department access integration tests** (AC: 1, 3, 4, 5, 6, 7)
  - [x] 1.1 Create `tests/SdaManagement.Api.IntegrationTests/Departments/OwnerFullDepartmentAccessTests.cs` — a dedicated test class using `IntegrationTestBase` focused exclusively on OWNER access patterns.
  - [x] 1.2 **Test setup:** Create a department (e.g., "TestDept") that the OWNER is NOT assigned to. Verify OWNER's `DepartmentIds` does NOT contain this department's ID. This ensures tests prove bypass, not coincidental scope match.
  - [x] 1.3 **Activity tests (OWNER on unassigned department):**
    - `CreateActivity_AsOwner_InUnassignedDepartment_Returns201` — OWNER creates activity in TestDept → 201
    - `UpdateActivity_AsOwner_InUnassignedDepartment_Returns200` — OWNER updates activity in TestDept → 200
    - `DeleteActivity_AsOwner_InUnassignedDepartment_Returns204` — OWNER deletes activity in TestDept → 204
  - [x] 1.4 **Meeting tests (OWNER on unassigned department):**
    - `CreateMeeting_AsOwner_InUnassignedDepartment_Returns201` — OWNER creates Zoom meeting in TestDept → 201
    - `CreatePhysicalMeeting_AsOwner_InUnassignedDepartment_Returns201` — OWNER creates physical meeting in TestDept → 201
    - `UpdateMeeting_AsOwner_InUnassignedDepartment_Returns200` — OWNER updates meeting in TestDept → 200
    - `DeleteMeeting_AsOwner_InUnassignedDepartment_Returns204` — OWNER deletes meeting in TestDept → 204
  - [x] 1.5 **Sub-ministry tests (OWNER on unassigned department):**
    - `CreateSubMinistry_AsOwner_InUnassignedDepartment_Returns201` — OWNER creates sub-ministry in TestDept → 201
    - `UpdateSubMinistry_AsOwner_InUnassignedDepartment_Returns200` — OWNER updates sub-ministry in TestDept → 200
    - `DeleteSubMinistry_AsOwner_InUnassignedDepartment_Returns204` — OWNER deletes sub-ministry in TestDept → 204
    - `AssignSubMinistryLead_AsOwner_InUnassignedDepartment_Returns200` — OWNER assigns lead to sub-ministry in TestDept → 200
  - [x] 1.6 **Department view tests:**
    - `GetAllDepartments_AsOwner_ReturnsAllDepartments` — OWNER sees all departments regardless of assignment
    - `GetDepartmentDetail_AsOwner_UnassignedDepartment_Returns200` — OWNER can view full detail of any department including sub-ministries and activity pipeline
    - `GetDepartmentsWithStaffing_AsOwner_ReturnsAllWithStaffing` — OWNER sees staffing data for all departments
    - `GetActivities_AsOwner_FilterByUnassignedDepartment_ReturnsActivities` — OWNER can fetch activities filtered by a department they're NOT assigned to (verifies ActivityService doesn't scope-filter)
  - [x] 1.7 **Negative control tests (verify ADMIN cannot do what OWNER can):**
    - `CreateActivity_AsAdmin_InUnassignedDepartment_Returns403` — ADMIN scoped to Dept A cannot create in Dept B
    - `CreateMeeting_AsAdmin_InUnassignedDepartment_Returns403` — same for meetings
    - `CreateSubMinistry_AsAdmin_InUnassignedDepartment_Returns403` — same for sub-ministries
  - [x] 1.8 Run all existing tests (`DepartmentEndpointTests`, `SubMinistryCrudEndpointTests`) to verify no regressions.

- [x] **Task 2: Backend — Confirm and guard OWNER zero-assignment test setup** (AC: 4)
  - [x] 2.1 **CONFIRMED:** `IntegrationTestBase` already seeds the OWNER user with **zero department assignments**. Zero instances of `AssignDepartmentToUser(_ownerUserId, ...)` exist across the test suite. The `OwnerClient` exercises the true OWNER bypass path in `CanManage()`, not ADMIN scope-matching. No changes to test seed needed.
  - [x] 2.2 Add a comment at the top of `OwnerFullDepartmentAccessTests.cs`: `// CRITICAL: OwnerClient user has ZERO department assignments. All tests prove OWNER bypass, not coincidental scope match.`
  - [x] 2.3 Add an explicit guard assertion in the first test or a shared setup method: `GET /api/auth/me` as OwnerClient → assert `departmentIds` is empty array. This prevents future regressions if someone adds OWNER department assignments to the test seed.

- [x] **Task 3: Frontend — Add OWNER access tests to DepartmentDetailPage** (AC: 1, 2)
  - [x] 3.1 Update `src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx` — add test cases for OWNER:
    - `renders management controls for OWNER viewing unassigned department` — OWNER with `departmentIds: []` (no assignments) views a department → "Nouvelle activité", "Nouvelle réunion" buttons visible, SubMinistryManager rendered
    - `renders management controls for OWNER viewing any department` — OWNER sees edit/delete on activities and meetings
    - `OWNER canManage is true regardless of departmentIds` — verify `canManage` computation
  - [x] 3.2 Update `src/sdamanagement-web/src/pages/AuthDepartmentsPage.test.tsx` (if exists, or add to existing tests):
    - `renders all departments for OWNER` — OWNER sees the complete department list
  - [x] 3.3 Ensure MSW handlers return correct data for OWNER test scenarios.

- [x] **Task 4: Frontend — Anti-pattern audit and component verification** (AC: 1, 4)
  - [x] 4.1 **Anti-pattern audit — PRE-VERIFIED SAFE.** The codebase was audited for `departmentIds` usage. **8 occurrences across 6 files — all safe.** Every instance uses the `isOwner ? all : filtered` pattern or early OWNER returns. Verify these are unchanged:
    - `DepartmentDetailPage.tsx:134` — `?.includes()` in `isAdminWithScope`, OR'd with `isOwner` → SAFE
    - `AdminUsersPage.tsx:70` — `?.includes()` for avatar permission, early OWNER return → SAFE
    - `AdminActivitiesPage.tsx:162` — `?.includes()` in ternary, `isOwner` branch returns all → SAFE
    - `BulkUserFormDialog.tsx:85` — `!.includes()` guarded by `isAdmin && hasIds` → SAFE
    - `UserFormDialog.tsx:84` — `!.includes()` guarded by `isAdmin && hasIds` → SAFE
    - `DayDetailDialog.tsx:117` — `?.includes()` in ternary, `isOwner` branch returns all → SAFE
    - `calendar.ts:54,60` (MSW mock) — URL param filter, not user prop → SAFE
  - [x] 4.2 Confirm `DepartmentDetailPage.tsx` lines 131-136 — `canManage` logic: `const isOwner = user?.role === "OWNER"; const canManage = isAdminWithScope || isOwner;`. No changes needed.
  - [x] 4.3 Confirm `AuthDepartmentsPage.tsx` — no client-side filtering of departments. No changes needed.
  - [x] 4.4 Confirm `SubMinistryManager.tsx` — works with `canManage` from OWNER context. No changes needed.
  - [x] 4.5 Confirm activity/meeting creation dialogs — `AdminActivitiesPage.tsx:162` and `DayDetailDialog.tsx:117` both use `isOwner ? all : filtered` for department dropdowns. No OWNER blocking.
  - [x] 4.6 If ANY verification reveals a NEW occurrence not in the list above, audit it and fix if needed.

- [x] **Task 5: Frontend — Calendar department filter verification (PRE-VERIFIED)** (AC: 2)
  - [x] 5.1 **CONFIRMED SAFE:** The calendar department filter (`DepartmentFilter.tsx`) is populated from the `useDepartments()` hook which fetches ALL departments via API — NOT from `user.departmentIds`. `AuthCalendarPage.tsx` passes `departments={departments ?? []}` to the filter component. OWNER with zero assignments sees all departments in the filter dropdown. No changes needed.
  - [x] 5.2 Verify this is still the case at implementation time (quick spot-check of `AuthCalendarPage.tsx` lines 31, 119-124).

- [x] **Task 6: Regression verification** (AC: all)
  - [x] 6.1 Run all backend integration tests: `dotnet test` in `tests/SdaManagement.Api.IntegrationTests/` — 426 passed, 0 failed
  - [x] 6.2 Run all frontend tests: `npm test` in `src/sdamanagement-web/` — 539 passed, 0 failed
  - [x] 6.3 Verify all existing tests still pass — zero regressions.

## Dev Notes

### Critical Architecture Constraints

- **This story proves FR47 through comprehensive tests. If tests fail, bugs are found and fixed.** The OWNER bypass via `CanManage(departmentId)` was implemented incrementally across Stories 4.1–8.3. Story 8.4 proves it works comprehensively. The framing is "verification first, fix if needed" — not "nothing to do." Writing comprehensive tests often reveals unexpected issues.
- **OWNER bypass is unconditional.** `CanManage()` returns `true` for OWNER without checking `DepartmentIds`. This means OWNER works even with zero department assignments. The edge case of "OWNER with no assignments" is the **single most important test setup detail** in this story.
- **The test setup matters more than the tests themselves.** If the OWNER test user has department assignments, every test is meaningless — it tests ADMIN scope matching, not OWNER bypass. Task 2 is therefore the highest-priority task.
- **Security boundary is the API layer.** Frontend hides management controls for UX; backend enforces permissions. OWNER bypass is enforced at `AuthorizationService` level, not per-controller.
- **Meetings are activities with meeting fields.** There is no separate `Meeting` entity — meetings are activities with `isMeeting: true`, `meetingType`, `meetingLocation`, and `meetingLink` fields. The same `ActivitiesController` endpoints handle both. Meeting-specific tests verify the same `CanManage()` pathway for meeting-typed activities.
- **The `departmentIds.length` anti-pattern.** Any frontend component that checks `user.departmentIds.length > 0` or `user.departmentIds?.includes(X)` as a proxy for management access is a latent bug. OWNER with zero assignments passes `canManage` checks but fails `departmentIds` checks. The anti-pattern audit in Task 4 is pre-verified safe (8 occurrences, all using correct `isOwner` bypass patterns).
- **OWNER has exclusive list-all-activities capability.** `GET /api/activities` without a `departmentId` param requires `auth.IsOwner()` — only OWNER can list all activities across all departments. With a `departmentId` param, it requires `auth.CanView()` (any authenticated user). The `GetDashboardActivitiesAsync()` method also explicitly skips department filtering for OWNER (comment in code: "OWNER see all activities (no filter)"). This is relevant context for the view tests in Task 1.6.

### Reuse Existing Components — Do NOT Reinvent

- **`IntegrationTestBase`** (`tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs`): Use `OwnerClient` for all OWNER access tests. Verify the OWNER user's department assignments in the seed data.
- **Existing test helpers**: `CreateTestActivity()`, `CreateTestUser()`, etc. from IntegrationTestBase — use these to set up test data for the new test class.
- **MSW handlers** (`src/sdamanagement-web/src/mocks/handlers/`): Already return correct data. May need minor updates for OWNER-specific test scenarios (e.g., OWNER with empty `departmentIds`).
- **`test-utils.tsx`**: Test render utilities with auth context override. Use `renderWithAuth({ user: { role: 'OWNER', departmentIds: [] } })` pattern.

### Test Design Principles

The `OwnerFullDepartmentAccessTests` class should be structured as:

```
OwnerFullDepartmentAccessTests
├── Setup: Create dept that OWNER is NOT assigned to
├── Activity CRUD (3 tests: create, update, delete in unassigned dept)
├── Meeting CRUD (4 tests: create zoom, create physical, update, delete in unassigned dept)
├── Sub-ministry CRUD (4 tests: create, update, delete, assign lead in unassigned dept)
├── View access (3 tests: list all, detail unassigned, staffing all)
└── Negative controls (3 tests: ADMIN blocked on unassigned dept for activity, meeting, sub-ministry)
```

Total: ~18 integration tests. This is the comprehensive proof of FR47.

### What If Tests Reveal Bugs? — Risk Assessment

**Pre-verification eliminated the top 3 risks. Remaining risks are LOW:**

1. ~~**IntegrationTestBase seeds OWNER with department assignments**~~ — **ELIMINATED.** Verified: OWNER has zero assignments in test seed. Guard assertion in Task 2.3 prevents future regression.

2. ~~**Frontend component uses `departmentIds` instead of `canManage`**~~ — **ELIMINATED.** Audit found 8 occurrences, all safe (every instance uses `isOwner` bypass).

3. ~~**Calendar department filter populated from `user.departmentIds`**~~ — **ELIMINATED.** Filter uses `useDepartments()` API hook, not user prop.

4. **Backend endpoint uses `IsAdmin()` instead of `CanManage()`** (LOW likelihood)
   - Symptom: OWNER gets 403 on a specific operation
   - Fix: Change to `CanManage(departmentId)` which includes OWNER bypass
   - Detection: Task 1 integration tests

5. **Activity service scope-filters by user's departments** (LOW likelihood — pre-verified NO)
   - `ActivityService.GetAllAsync()` has no user-scope filtering. `GetDashboardActivitiesAsync()` explicitly skips OWNER filtering.
   - Detection: Task 1.6 `GetActivities_AsOwner_FilterByUnassignedDepartment_ReturnsActivities` confirms this at test time

### Previous Story Intelligence (8.3)

Key learnings from Story 8.3:
- `CanManage(departmentId)` was changed from `IsOwner()` on sub-ministry endpoints — proving the pattern works for ADMIN+ access
- `SubMinistryCrudEndpointTests` lines 281-320 already test OWNER on unassigned department — this is the template for Story 8.4's broader test suite
- JSON serialization uses `WhenWritingNull` — null fields omitted
- Integration tests use `TryGetProperty` for nullable fields
- Build lock issue: kill dev server before running EF Core migrations (shouldn't apply here — no migrations in this story)

### Git Intelligence

Recent commit pattern: `feat(departments): Story 8.X — description`

Last commit (2c7a90a): `feat(departments): Stories 8.2–8.3 — Meeting management and sub-ministry lead assignment`
- Stories 8.2 and 8.3 were committed together
- All department management features are in place

### Project Structure Notes

- **New test file**: `tests/SdaManagement.Api.IntegrationTests/Departments/OwnerFullDepartmentAccessTests.cs` — dedicated OWNER access test class (~18 tests)
- **Modified test file**: `src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx` — OWNER access test cases added
- **Potentially modified test file**: `src/sdamanagement-web/src/pages/AuthDepartmentsPage.test.tsx` — OWNER visibility test (if file exists)
- **No migrations** — no data model changes
- **No i18n changes** — no new UI strings
- **Production code changes: expect zero, prepare for small fixes.** If anti-pattern audit (Task 4) or calendar filter check (Task 5) reveals issues, the fixes will be small and localized (e.g., replacing `departmentIds.includes()` with `canManage` pattern). Document any fixes in Dev Agent Record.

### Anti-Patterns to Avoid

- Do NOT create new endpoints for OWNER-specific access — the existing endpoints with `CanManage()` bypass are the correct pattern
- Do NOT add `IsOwner()` checks alongside `CanManage()` — `CanManage()` already includes OWNER bypass
- Do NOT filter departments by user assignment on the frontend — all authenticated users see all departments (intentional design)
- Do NOT create a separate `OwnerDepartmentsPage` — the same `DepartmentDetailPage` works for all roles via the `canManage` flag
- Do NOT add OWNER-specific UI elements (e.g., "You have full access" banner) — not in the acceptance criteria
- Do NOT skip negative control tests — proving ADMIN is blocked on unassigned departments is as important as proving OWNER is not
- Do NOT use `user.departmentIds.length > 0` or `user.departmentIds?.includes(X)` as a proxy for management access — OWNER with zero assignments would be blocked. Always use the `canManage` pattern (`isAdminWithScope || isOwner`)
- Do NOT assume the OWNER test user in IntegrationTestBase has zero department assignments — verify explicitly before trusting test results

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR47]
- [Source: _bmad-output/planning-artifacts/architecture.md#Centralized Authorization Service]
- [Source: _bmad-output/implementation-artifacts/8-3-sub-ministry-management.md]
- [Source: src/SdaManagement.Api/Auth/AuthorizationService.cs — CanManage() OWNER bypass]
- [Source: src/SdaManagement.Api/Controllers/DepartmentsController.cs — all endpoint auth checks]
- [Source: src/SdaManagement.Api/Controllers/ActivitiesController.cs — CanManage() on CRUD]
- [Source: src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx — canManage computation]
- [Source: src/sdamanagement-web/src/pages/AuthDepartmentsPage.tsx — all depts fetched]
- [Source: tests/SdaManagement.Api.IntegrationTests/Departments/SubMinistryCrudEndpointTests.cs — OWNER unassigned dept tests]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Guard assertion initially used `"Owner"` but API returns `"OWNER"` (uppercase enum serialization). Fixed to match.
- Frontend test used `getByText("New Activity")` but responsive layout renders two instances (desktop + mobile). Fixed to `getAllByText`.

### Completion Notes List

- Created `OwnerFullDepartmentAccessTests.cs` with 20 integration tests proving OWNER bypass on unassigned departments: 3 activity CRUD, 4 meeting CRUD, 4 sub-ministry CRUD, 4 department views, 4 negative controls (ADMIN blocked), 1 guard assertion.
- OWNER has zero department assignments in test setup — guard test `OwnerHasZeroDepartmentAssignments` prevents future regressions.
- Added 3 frontend tests to `DepartmentDetailPage.test.tsx`: OWNER sees management controls on unassigned dept (dept 2 MIFEM), edit/delete icons on activities in unassigned dept, SubMinistryManager on unassigned dept (dept 3 Diaconat).
- Added 1 frontend test to `AuthDepartmentsPage.test.tsx`: OWNER with zero assignments sees all departments.
- Anti-pattern audit verified all `departmentIds` usages across 14 frontend files — all safe with correct OWNER bypass patterns.
- Calendar department filter confirmed safe: populated from `useDepartments()` API hook, not `user.departmentIds`.
- Minor production code change: added `aria-label="Edit"` / `aria-label="Delete"` to activity row icon buttons in `DepartmentDetailPage.tsx` for accessibility and test specificity.
- All 427 backend integration tests pass, all 539 frontend tests pass.

### Change Log

- 2026-03-19: Story 8.4 implementation — comprehensive OWNER access verification tests (backend + frontend), anti-pattern audit, zero production code changes needed.
- 2026-03-19: Code review fixes — 3 MEDIUM, 4 LOW issues resolved: replaced hardcoded April 2026 dates with `FutureDate()` helper; strengthened `GetAllDepartments` assertion to verify unassigned dept visibility; added `aria-label` to activity edit/delete buttons + updated test assertions to use named button queries; extracted `CreateMeetingInUnassignedDept` helper; added `zoomLink` round-trip assertion; added staffing field verification to `GetDepartmentsWithStaffing`; added `GetAllActivities_AsAdmin_NoFilter_Returns403` negative control test.

### File List

- `tests/SdaManagement.Api.IntegrationTests/Departments/OwnerFullDepartmentAccessTests.cs` (NEW) — 20 integration tests for OWNER department access bypass
- `src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx` (MODIFIED) — aria-label attributes on activity edit/delete buttons
- `src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx` (MODIFIED) — 3 OWNER access tests added, icon button assertions use named queries
- `src/sdamanagement-web/src/pages/AuthDepartmentsPage.test.tsx` (MODIFIED) — 1 OWNER visibility test added
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (MODIFIED) — Story 8.4 status tracking
- `_bmad-output/implementation-artifacts/8-4-owner-full-department-access.md` (MODIFIED) — Task checkboxes, Dev Agent Record
