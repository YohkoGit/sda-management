# Story 4.7: Activity Roster View & Staffing Indicators

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Prerequisites

- Local dev environment: Node 20+, .NET 10 SDK, Docker, PostgreSQL 17
- Story 4.1 complete (Activity entity with CRUD, `ActivityRole`, `RoleAssignment` entities)
- Story 4.2 complete (Template-based creation, two-step create flow)
- Story 4.3 complete (Role roster customization, RoleRosterEditor, HeadcountStepper, AssignmentBadge)
- Story 4.4 complete (Role assignment via contact picker, ContactPicker component, assignment reconciliation)
- Story 4.5 complete (Special activity tagging, visibility filter)
- Story 4.6 complete (Inline guest speaker creation, `IsGuest` flag on `RoleAssignmentResponse`, GuestInlineForm)
- Existing backend infrastructure:
  - `GET /api/activities` returns `ActivityListItem` with `RoleCount` (aggregate count only — NO assignment data)
  - `GET /api/activities/{id}` returns full `ActivityResponse` with `Roles[]` → `Assignments[]` → user details (firstName, lastName, avatarUrl, isGuest)
  - `ActivityService.GetAllAsync()` **already uses inline `.Select()` projection** (lines 29-44) — NOT `.Include()`. Department name/color and `Roles.Count` are accessed directly in the `.Select()` block. EF Core translates these to SQL subqueries. The new staffing fields must be added to this existing `.Select()` block.
  - `ActivityService.GetByIdAsync()` includes full graph: `.Include(a => a.Roles).ThenInclude(r => r.Assignments).ThenInclude(ra => ra.User)`
  - `ActivityService.MapToResponse()` is a private helper that projects entity → DTO with all nested role/assignment data
- Existing frontend infrastructure:
  - `InitialsAvatar` component with sizes: xs (28px), sm (32px), md (40px), lg (48px) — at `src/sdamanagement-web/src/components/ui/initials-avatar.tsx`
  - `AssignmentBadge` (internal to `RoleRosterEditor.tsx`) shows filled/total with green/amber/muted color coding — NOT exported, edit-only context
  - `activityService.getById(id)` returns full `ActivityResponse` with roles and assignments
  - `activityService.getByDepartment(id)` and `activityService.getAll()` return `ActivityListItem[]` (no staffing data)
  - `AdminActivitiesPage.tsx` (702 lines) — main activity management page with **table-based** list view (shadcn `<Table>`) and Sheet/Dialog edit forms. Columns: Title | Date | Time (sm:) | Department | Visibility (sm:) | Actions. No existing row-level click handler — only Edit/Delete buttons per row.

## Story

As an **ADMIN**,
I want to see the full roster of any activity with staffing status indicators,
so that I can quickly identify which roles are fully staffed and which have gaps.

## Acceptance Criteria

1. **Given** an activity with multiple roles
   **When** the roster view loads
   **Then** each role displays: role name, assigned people (with avatars — 28px/xs size, initials fallback), and headcount indicator (filled/total)

2. **Given** a role "Diacres" with 2/2 assigned
   **When** the roster renders
   **Then** a green status indicator (filled circle + "Complet" label) indicates "fully staffed"

3. **Given** a role "Predicateur" with 0/1 assigned
   **When** the roster renders
   **Then** an amber/orange status indicator (half-circle + "X/Y" count) indicates "gap" (FR48)

4. **Given** the activity list table
   **When** displaying multiple upcoming activities
   **Then** each activity table row shows an overall staffing summary with colored indicator dot, `X/Y` count label, and status:
   - Green: all roles filled (`FullyStaffed`)
   - Amber: some gaps (`PartiallyStaffed`)
   - Red: critical roles unfilled — predicateur or ancien (`CriticalGap`)

5. **Given** a mobile device (375px)
   **When** the roster view renders
   **Then** role rows stack vertically with avatar chips wrapping naturally
   **And** status indicators are visible without horizontal scrolling

6. **Given** an activity with zero roles defined
   **When** the activity list or roster view renders
   **Then** a muted "No roles" indicator is shown (not green — which would falsely imply "all staffed")

7. **Given** an activity row in the list view
   **When** the ADMIN clicks the row (not the edit button)
   **Then** a read-only roster detail panel opens (Sheet on mobile, Dialog on desktop)
   **And** the existing Edit button remains a separate action that opens the edit form directly

## Tasks / Subtasks

### Backend Tasks

- [x] **Task 1: Enhance `ActivityListItem` DTO with staffing summary fields** (AC: #4, #6)
  - [x]1.1 Add `TotalHeadcount` (int) — sum of all role headcounts
  - [x]1.2 Add `AssignedCount` (int) — sum of all role assignment counts
  - [x]1.3 Add `StaffingStatus` (string) — server-computed enum: `"FullyStaffed"` | `"PartiallyStaffed"` | `"CriticalGap"` | `"NoRoles"`
  - [x]1.4 Update frontend `ActivityListItem` interface to match: `totalHeadcount: number`, `assignedCount: number`, `staffingStatus: string`

- [x] **Task 2: Extend `ActivityService.GetAllAsync()` existing `.Select()` projection** (AC: #4, #6)
  - [x]2.1 **Extend the existing inline `.Select()` block** (lines 29-44) — add new fields alongside the existing `RoleCount`, `DepartmentName`, etc. Do NOT switch to `.Include()`.
  - [x]2.2 Add to projection: `TotalHeadcount = a.Roles.Sum(r => r.Headcount)`
  - [x]2.3 Add to projection: `AssignedCount = a.Roles.Sum(r => r.Assignments.Count)`
  - [x]2.4 Compute `StaffingStatus` in a private helper method after projection:
    - `NoRoles` if `TotalHeadcount == 0`
    - `CriticalGap` if any role matching critical patterns has 0 assignments
    - `FullyStaffed` if `AssignedCount == TotalHeadcount`
    - `PartiallyStaffed` otherwise
  - [x]2.5 Critical role matching: `startsWith("ancien", OrdinalIgnoreCase)` for ancien variants, `contains("predicateur", OrdinalIgnoreCase)` for predicateur
  - [x]2.6 For critical gap detection, include role-level data in the projection (role names + assignment counts) so the helper can evaluate — then discard role-level detail from the final DTO
  - [x]2.7 Verify EF Core generates efficient SQL (single query with subqueries, no N+1)

### Frontend Tasks

- [x] **Task 3: Create `StaffingIndicator` component** (AC: #2, #3, #4, #6)
  - [x]3.1 Create `src/sdamanagement-web/src/components/activity/StaffingIndicator.tsx`
  - [x]3.2 Props: `staffingStatus: string` (enum from backend), `assigned: number`, `total: number`, `size?: 'sm' | 'md'`
  - [x]3.3 Render **shape + color + text** (colorblind accessible — not color alone):
    - `FullyStaffed`: filled circle (green) + "Complet" or "X/X"
    - `PartiallyStaffed`: half-circle (amber) + "X/Y"
    - `CriticalGap`: empty circle (red) + "X/Y" + "Critique" badge
    - `NoRoles`: muted dash + "Aucun role"
  - [x]3.4 `aria-label` on indicator: e.g., "Staffing: 3 of 5 roles filled, critical gap"
  - [x]3.5 Tooltip on hover/focus showing "X/Y postes pourvus" detail
  - [x]3.6 Use shadcn `Tooltip` + `Badge` components, Tailwind color tokens
  - [x]3.7 Add i18n keys under `pages.adminActivities.staffing.*` namespace (consistent with all existing activity keys): `staffing.fullyStaffed`, `staffing.partiallyStaffed`, `staffing.criticalGap`, `staffing.noRoles`, `staffing.filled`, `staffing.ariaLabel`

- [x] **Task 4: Create read-only `ActivityRosterView` component** (AC: #1, #2, #3, #5)
  - [x]4.1 Create `src/sdamanagement-web/src/components/activity/ActivityRosterView.tsx`
  - [x]4.2 Props: `roles: ActivityRoleResponse[]` (from detail endpoint)
  - [x]4.3 Render each role as a row: role name, per-role staffing dot (green/amber), headcount badge (filled/total)
  - [x]4.4 Below role name: avatar chips for assigned people (28px/xs `InitialsAvatar`, name tooltip)
  - [x]4.5 Show "(Invite)" label for guest speakers (`isGuest === true`) — consistent with Story 4.6
  - [x]4.6 Empty slots: show dashed placeholder for unfilled positions (reuse pattern from RoleRosterEditor)
  - [x]4.7 Mobile layout: role rows stack vertically, avatar chips flex-wrap, no horizontal scroll
  - [x]4.8 Sort roles by `sortOrder` (already sorted from API response)
  - [x]4.9 Add i18n keys under `pages.adminActivities.roster.*` namespace (consistent with existing): `roster.title`, `roster.unassigned`, `roster.guest`

- [x] **Task 5: Add staffing summary to activity table rows** (AC: #4, #6)
  - [x]5.1 Add a new `<TableHead>`/`<TableCell>` column to the existing `<Table>` in `AdminActivitiesPage.tsx` for `StaffingIndicator`
  - [x]5.2 Use new `staffingStatus`, `totalHeadcount`, `assignedCount` fields from `ActivityListItem`
  - [x]5.3 Column position: between Department and Visibility columns (always visible, not hidden on mobile)
  - [x]5.4 Render `StaffingIndicator` with `size="sm"` in each row
  - [x]5.5 Mobile: indicator column remains visible (staffing status is critical info for admin scanning)

- [x] **Task 6: Add roster view panel with row click trigger** (AC: #1, #5, #7)
  - [x]6.1 Add `onClick` on `<TableRow>` (not on edit/delete buttons — use `e.stopPropagation()` on buttons) → sets `viewActivityId` state
  - [x]6.2 Reuse existing responsive pattern from edit form: `const ViewWrapper = isMobile ? Sheet : Dialog; const ViewContent = isMobile ? SheetContent : DialogContent;` (same pattern at lines 447-450 of `AdminActivitiesPage.tsx`)
  - [x]6.3 Panel content: `ActivityRosterView` component with overall `StaffingIndicator` at top
  - [x]6.4 Fetch detail: `useQuery({ queryKey: ["activity", viewActivityId], queryFn: () => activityService.getById(viewActivityId!), enabled: !!viewActivityId })`
  - [x]6.5 Show loading skeleton while fetching detail data (use shadcn `<Skeleton>`)
  - [x]6.6 Ensure roster view is distinct from edit mode (read-only, no stepper/picker controls)
  - [x]6.7 Existing Edit button remains unchanged — `e.stopPropagation()` prevents row click from firing
  - [x]6.8 Panel header: activity title, date, department badge (with color), overall staffing indicator
  - [x]6.9 Mobile: Sheet `side="bottom"` with `h-[85vh]`, consistent with existing edit form pattern

### Testing Tasks

- [x] **Task 7: Backend unit tests** (all ACs)
  - [x]7.1 Test `StaffingStatus` computation: fully staffed → `"FullyStaffed"`, partial → `"PartiallyStaffed"`, critical → `"CriticalGap"`, no roles → `"NoRoles"`
  - [x]7.2 Test critical gap detection: "Predicateur" role with 0 assignments → `CriticalGap`
  - [x]7.3 Test critical gap detection: "Ancien de Service" role with 0 assignments → `CriticalGap`
  - [x]7.4 Test critical gap detection: "Ancien du Sabbat" role with 0 assignments → `CriticalGap` (startsWith match)
  - [x]7.5 Test NO false positive: "Ancienne Musique" role → does NOT match (fixed: uses `startsWith("ancien ")` + `equals("ancien")` to avoid feminine-form false positives)
  - [x]7.6 Test no critical gap: all roles assigned or non-critical roles empty → `PartiallyStaffed` (not `CriticalGap`)
  - [x]7.7 Test case-insensitive matching: "predicateur", "Predicateur", "PREDICATEUR" all detected
  - [x]7.8 Test `TotalHeadcount` and `AssignedCount` aggregation with multiple roles

- [x] **Task 8: Backend integration tests** (all ACs)
  - [x]8.1 `GET /api/activities` returns `staffingStatus`, `totalHeadcount`, `assignedCount` for each activity
  - [x]8.2 Staffing fields reflect actual assignment state (fully staffed, partial, critical gap)
  - [x]8.3 Zero-role activities: `TotalHeadcount = 0`, `AssignedCount = 0`, `StaffingStatus = "NoRoles"`
  - [x]8.4 Activity with all roles filled: `StaffingStatus = "FullyStaffed"`
  - [x]8.5 Activity with unfilled critical role (predicateur): `StaffingStatus = "CriticalGap"`
  - [x]8.6 Use existing `CreateTestActivity` helper: `CreateTestActivity(deptId, roles: new List<(string RoleName, int Headcount, List<int>? UserIds)> { ("Predicateur", 1, null), ("Diacres", 2, new List<int> { userId1, userId2 }) })`

- [x] **Task 9: Frontend component tests** (all ACs)
  - [x]9.1 `StaffingIndicator`: renders green filled circle + "Complet" for `FullyStaffed`
  - [x]9.2 `StaffingIndicator`: renders amber half-circle + "X/Y" for `PartiallyStaffed`
  - [x]9.3 `StaffingIndicator`: renders red empty circle + "Critique" for `CriticalGap`
  - [x]9.4 `StaffingIndicator`: renders muted dash + "Aucun role" for `NoRoles`
  - [x]9.5 `StaffingIndicator`: has correct `aria-label` for screen readers
  - [x]9.6 `ActivityRosterView`: renders role names with headcount badges
  - [x]9.7 `ActivityRosterView`: renders assigned people with avatars (InitialsAvatar xs)
  - [x]9.8 `ActivityRosterView`: shows "(Invite)" for guest assignments
  - [x]9.9 `ActivityRosterView`: shows dashed placeholders for unfilled slots
  - [x]9.10 `ActivityRosterView`: handles empty lastName gracefully for guest avatars
  - [x]9.11 `AdminActivitiesPage`: activity table rows show staffing indicator column
  - [x]9.12 `AdminActivitiesPage`: clicking activity row opens read-only roster panel
  - [x]9.13 `AdminActivitiesPage`: edit button still opens edit form (not roster panel) — `stopPropagation` works

- [x] **Task 10: Update MSW handlers** (testing infrastructure)
  - [x]10.1 Update `GET /api/activities` handler in `src/sdamanagement-web/src/mocks/handlers/activities.ts` — add `totalHeadcount`, `assignedCount`, `staffingStatus` to each mock `ActivityListItem` response
  - [x]10.2 Existing mocks: "Culte du Sabbat" (2 roles, has assignments+guests) and "Reunion JA" (0 roles). Add 2 more mock activities to cover all 4 staffing states: `FullyStaffed`, `PartiallyStaffed`, `CriticalGap`, `NoRoles`
  - [x]10.3 Existing mock structure already supports `isGuest` flag — extend, don't rewrite

## Dev Notes

### Architecture Patterns & Constraints

- **Security boundary is the API layer.** Staffing data is computed server-side in `ActivityService`, not client-side. The list endpoint returns pre-computed `StaffingStatus` enum; the detail endpoint returns raw role/assignment data for the roster view. Frontend maps enum → color, never derives status logic.
- **No hardcoded strings — i18n from commit 1.** All user-facing labels (staffing status text, role labels, tooltips) go through `react-i18next`. Layout must accommodate French string lengths (20-30% longer than English).
- **Public DTOs do NOT include staffing data.** FR48 is an operational/admin feature. When Epic 5 adds public endpoints, `PublicActivityListItem` will NOT expose `staffingStatus`, `assignedCount`, or `totalHeadcount`.
- **Mobile-first with sm:/lg: breakpoints only** (md: intentionally unused per architecture). The roster view MUST work at 375px width.
- **Component naming:** PascalCase files — `StaffingIndicator.tsx`, `ActivityRosterView.tsx`. Non-component files: camelCase.
- **One DTO per file (backend):** `ActivityListItem.cs` already exists — add properties in place.
- **TanStack Query is the single source of truth for async state.** Use `isLoading` → skeleton, `isFetching` → subtle indicator. No custom loading state variables.
- **Build `ActivityRosterView` role-agnostic.** Do NOT embed auth checks inside the component. Story 6.2 will reuse it for Viewer access to full activity rosters. The component takes `roles: ActivityRoleResponse[]` — the caller decides who can see it.

### Critical Role Detection Logic

The "critical gap" detection must be robust for the French-language context of this church:
- **Predicateur:** `contains("predicateur", StringComparison.OrdinalIgnoreCase)` — safe, no French words contain this as a substring
- **Ancien:** `startsWith("ancien", StringComparison.OrdinalIgnoreCase)` — catches "Ancien de Service", "Ancien du Sabbat", but avoids false positives like a hypothetical "Ancienne Musique" (note: `startsWith("ancien")` WILL match "Ancienne" — if this is unacceptable, use explicit patterns list instead)
- Rationale: role names are user-defined strings (not enum values), so fuzzy matching is necessary
- Backend computes `StaffingStatus` enum in a private helper method — the logic is server-side and unit-testable
- Edge case: if a template renames "Predicateur" to something else, the critical gap won't fire — this is acceptable for MVP
- The detection only applies to roles with **0 assignments** — a partially-filled predicateur role (0/1) triggers CriticalGap, but a diacres role (1/2) does not

### Staffing Status Color & Shape Logic

Frontend maps the server-computed `StaffingStatus` enum to visual representation. Use **shape + color + text** for colorblind accessibility (WCAG compliance — not color alone).

| `StaffingStatus` | Shape | Color | Label | CSS Tokens |
|-------------------|-------|-------|-------|-----------|
| `FullyStaffed` | Filled circle | Green | "Complet" or "X/X" | `text-emerald-600`, `bg-emerald-500` |
| `PartiallyStaffed` | Half-circle | Amber | "X/Y" | `text-amber-600`, `bg-amber-500` |
| `CriticalGap` | Empty circle | Red | "X/Y" + "Critique" badge | `text-red-600`, `bg-red-500` |
| `NoRoles` | Dash | Muted | "Aucun role" | `text-muted-foreground` |

### Performance Consideration

- `GetAllAsync()` **already uses `.Select()` projection** — extend it, do NOT switch to `.Include()`. The new `TotalHeadcount` and `AssignedCount` fields translate to SQL subqueries (e.g., `SELECT SUM(r.headcount) FROM activity_roles r WHERE r.activity_id = a.id`).
- For `StaffingStatus` computation (which needs per-role names and assignment counts), project role-level data into an intermediate anonymous type, compute status in a private C# helper, then map to the final `ActivityListItem`. The role-level detail is discarded from the DTO.
- Monitor EF Core SQL output to verify single-query execution (no N+1).

### Reuse vs. New Components

- **DO NOT extract `AssignmentBadge` from `RoleRosterEditor.tsx`** — it's edit-mode specific (coupled to form context). Create a new `StaffingIndicator` component for read-only display.
- **DO reuse `InitialsAvatar` (xs size = 28px)** for the roster view avatar chips — same component, consistent rendering.
- **DO reuse the dashed-placeholder pattern** from `RoleRosterEditor` for unfilled slots in the read-only view.
- **DO NOT duplicate the chip removal (x button) interaction** — the roster view is read-only.

### Guest Speaker Display

- Consistent with Story 4.6: guest speakers show "(Invite)" label in authenticated/operational views
- `isGuest` flag is available on `RoleAssignmentResponse` (added in Story 4.6)
- Guest avatars use slate-toned initials (per Story 4.6 convention), regular members use color-varied initials
- **Edge case: empty `lastName` on guests.** Story 4.6 creates guests from a single "Nom complet" field — single-word names like "Damien" produce `firstName="Damien"`, `lastName=""`. The `InitialsAvatar` component computes `firstName.charAt(0) + lastName.charAt(0)` — verify it handles empty `lastName` gracefully (should show single initial, not crash or show empty char). If not handled, add a guard in `ActivityRosterView`.

### Cache Invalidation (Already Handled)

- All 3 existing mutations (create, update, delete) in `AdminActivitiesPage.tsx` already call `queryClient.invalidateQueries({ queryKey: ["activities"] })` in their `onSuccess` handlers. **No changes needed** for list cache — the new staffing fields will be refreshed automatically.
- Activity list query keys: `["activities", "all"]` (OWNER) or `["activities", departmentId]` (ADMIN). The `["activities"]` prefix invalidation catches both.
- The roster view panel detail query should use key `["activity", activityId]` — this is a NEW query key. Add invalidation for `["activity"]` prefix in existing mutation `onSuccess` handlers so the roster panel refreshes after edits.

### UX Interaction Pattern Change

- **Before Story 4.7:** Activity table rows have NO click handler. Only Edit/Delete icon buttons in the Actions column trigger events.
- **After Story 4.7:** Clicking an activity `<TableRow>` opens a **read-only roster detail panel**. Edit/Delete buttons use `e.stopPropagation()` to prevent the row click from firing.
- This is a NEW interaction pattern — not changing an existing one. It adds a "scan and review" workflow matching the UX spec's "quiet serenity" monitoring pattern.
- If this UX approach causes confusion, a fallback: add a dedicated "View" icon button in the Actions column alongside Edit/Delete. Implement the row-click approach first per AC#7.

### Story 4.8 Forward-Compatibility

- Story 4.8 (Concurrent Edit Detection) adds conflict handling to the EDIT form submission — completely separate from the read-only roster panel.
- The row click → roster panel (4.7) and edit button → edit form (existing + 4.8) are orthogonal flows with zero overlap.
- The `concurrencyToken` field in `ActivityResponse` is already present but unused by the roster view (read-only). Story 4.8 will only enhance the edit form's save behavior.

### Project Structure Notes

- Alignment with unified project structure: all new components go in `src/sdamanagement-web/src/components/activity/`
- Backend DTO modification in `src/SdaManagement.Api/Dtos/Activity/ActivityListItem.cs` — existing file
- Service modification in `src/SdaManagement.Api/Services/ActivityService.cs` — existing file
- No new entities, no migrations, no new API endpoints — this story enhances existing data flow
- i18n translations: add keys to `src/sdamanagement-web/public/locales/fr/common.json` and `en/common.json`
- Tests: backend unit in `tests/SdaManagement.Api.UnitTests/`, integration in `tests/SdaManagement.Api.IntegrationTests/Activities/`, frontend co-located
- MSW handlers: `src/sdamanagement-web/src/mocks/handlers/activities.ts` — extend existing mock data, don't rewrite
- Integration test base: `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` — has `CreateTestActivity(deptId, roles)` helper that supports roles with assignments

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.7: Activity Roster View & Staffing Indicators]
- [Source: _bmad-output/planning-artifacts/prd.md#FR48 — unassigned role indicators]
- [Source: _bmad-output/planning-artifacts/prd.md#FR33 — avatar display in roster views]
- [Source: _bmad-output/planning-artifacts/architecture.md#Avatar Storage Convention — 28px size, initials fallback]
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — frontend organization]
- [Source: _bmad-output/planning-artifacts/architecture.md#DTO Naming — ActivityListItem, ActivityRoleResponse]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Emotional Journey — "Serenity" via green staffing indicators, calm department dashboard]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Implications — staffing indicator emotional gradient from "all clear" to "action needed"]
- [Source: _bmad-output/implementation-artifacts/4-6-inline-guest-speaker-creation.md — guest display patterns, IsGuest flag, "(Invite)" label]
- [Source: src/sdamanagement-web/src/components/ui/initials-avatar.tsx — InitialsAvatar with xs/sm/md/lg sizes]
- [Source: src/sdamanagement-web/src/components/activity/RoleRosterEditor.tsx — AssignmentBadge, AssignmentChip, dashed placeholder patterns]
- [Source: src/sdamanagement-web/src/services/activityService.ts — ActivityListItem, ActivityResponse, ActivityRoleResponse interfaces]
- [Source: src/SdaManagement.Api/Dtos/Activity/ActivityListItem.cs — current DTO without staffing fields]
- [Source: src/SdaManagement.Api/Services/ActivityService.cs — GetAllAsync, GetByIdAsync, MapToResponse methods]

### Previous Story Intelligence (from Story 4.6)

- **Pre-existing test failure:** `SystemHealthServiceTests.GetSystemHealthAsync_UptimeSeconds_IsPositive` — IGNORE, unrelated
- **Pre-existing TypeScript warnings** in `programSchedules.ts`, `userSchema.ts` — IGNORE, unrelated
- **Integration tests may not run without Docker/PostgreSQL** — write tests anyway, verify compilation
- **i18n key pattern:** ALL activity keys use `pages.adminActivities.*` namespace. New keys follow the same: `pages.adminActivities.staffing.*` and `pages.adminActivities.roster.*`
- **Guest avatar convention:** slate-toned initials for guests vs color-varied for regular members
- **Request DTOs use `public record`; Response DTOs use `public class`** — follow this pattern for any new DTOs
- **Commit message convention:** `feat(activities): Story 4.7 — Activity roster view & staffing indicators`

### Accessibility Requirements

- **Colorblind support (CRITICAL):** Staffing indicators MUST use shape + color + text — never color alone. Green/amber/red dots are indistinguishable for deuteranopia (red-green colorblindness). Each status gets a distinct shape (filled circle, half-circle, empty circle, dash) plus a text label.
- **`aria-label` on all indicator elements:** e.g., `aria-label="Staffing: 3 of 5 roles filled"` or `aria-label="Staffing: critical gap, 1 of 5 roles filled"`
- **Keyboard navigation:** Roster view panel must be navigable via Tab key. Role rows should be focusable. Tooltip on staffing indicators must be accessible via focus (not just hover).
- **shadcn/ui (Radix)** provides ARIA attributes by default for Tooltip, Dialog, Sheet — leverage these, don't reimplement.

### Context7 Technical Notes

- **TanStack Query `select` option:** Can be used to transform/derive staffing data from query results if needed: `select: (data) => data.map(computeStaffingStatus)`. However, since `StaffingStatus` is now server-computed, frontend just maps enum → visual.
- **TanStack Query dependent queries:** For the roster panel, use `enabled: !!selectedActivityId` to fetch detail only when an activity is selected: `useQuery({ queryKey: ['activity', id], queryFn: () => activityService.getById(id), enabled: !!id })`
- **shadcn/ui Badge:** Use `variant="secondary"` for staffing count display, `variant="destructive"` for "Critique" badge. Available: `default`, `secondary`, `destructive`, `outline`
- **shadcn/ui Avatar + AvatarFallback:** Project already uses custom `InitialsAvatar` — continue using it (not shadcn Avatar) for consistency
- **shadcn/ui Tooltip:** Import `Tooltip, TooltipContent, TooltipTrigger` from `@/components/ui/tooltip` for staffing detail on hover/focus
- **shadcn/ui Sheet:** Import `Sheet, SheetContent, SheetHeader, SheetTitle` for mobile roster panel. Use `side="bottom"` for mobile bottom sheet pattern.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No blocking issues encountered.

### Completion Notes List

- **Backend**: Extended `ActivityListItem` DTO with `TotalHeadcount`, `AssignedCount`, `StaffingStatus` fields. Modified `ActivityService.GetAllAsync()` to use intermediate anonymous type projection with role-level detail for critical gap detection, then map to final DTO via `ComputeStaffingStatus` internal static helper. Frontend `ActivityListItem` interface updated.
- **StaffingIndicator component**: Renders shape + color + text for colorblind accessibility (filled circle/green, half-circle/amber, empty circle/red, dash/muted). Uses shadcn Tooltip + Badge. Full i18n (fr/en) under `pages.adminActivities.staffing.*`. ARIA labels for screen readers.
- **ActivityRosterView component**: Read-only role roster with per-role staffing dots, headcount badges, InitialsAvatar xs chips, guest "(Invité)" labels, dashed placeholders for unfilled slots. Role-agnostic — no embedded auth checks for Story 6.2 reuse.
- **Activity table**: New staffing column between Department and Visibility (always visible on mobile). StaffingIndicator with `size="sm"` per row.
- **Roster panel**: Row click opens read-only roster detail (Sheet on mobile h-[85vh], Dialog on desktop). Edit/delete buttons use `e.stopPropagation()`. TanStack Query with `["activity", id]` key, loading skeleton. Cache invalidation for `["activity"]` prefix added to all mutations.
- **MSW handlers**: Updated `toListItem()` with staffing fields. Added 2 mock activities ("Ecole du Sabbat" — FullyStaffed, "Veillée de Prière" — PartiallyStaffed) covering all 4 staffing states.
- **Tests**: 11 backend unit tests (staffing computation), 5 backend integration tests (endpoint staffing fields), 13 frontend component tests (StaffingIndicator + ActivityRosterView), 3 new page-level tests (column, row click, stopPropagation). All 302 frontend tests pass. All 228 backend unit tests pass. Zero regressions.

### Change Log

- 2026-03-10: Story 4.7 — Activity roster view & staffing indicators implementation complete
- 2026-03-10: Code review fixes — 10 issues resolved (2 critical, 1 high, 3 medium, 4 low)

### File List

**New files:**
- src/sdamanagement-web/src/components/activity/StaffingIndicator.tsx
- src/sdamanagement-web/src/components/activity/StaffingIndicator.test.tsx
- src/sdamanagement-web/src/components/activity/ActivityRosterView.tsx
- src/sdamanagement-web/src/components/activity/ActivityRosterView.test.tsx
- tests/SdaManagement.Api.UnitTests/Services/ActivityServiceStaffingTests.cs
- tests/SdaManagement.Api.IntegrationTests/Activities/ActivityStaffingEndpointTests.cs

**Modified files:**
- src/SdaManagement.Api/Dtos/Activity/ActivityListItem.cs (added TotalHeadcount, AssignedCount, StaffingStatus)
- src/SdaManagement.Api/Services/ActivityService.cs (extended GetAllAsync projection, added ComputeStaffingStatus)
- src/SdaManagement.Api/SdaManagement.Api.csproj (added InternalsVisibleTo for unit tests)
- src/sdamanagement-web/src/services/activityService.ts (updated ActivityListItem interface)
- src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx (staffing column, roster panel, row click)
- src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx (3 new tests, 1 assertion fix)
- src/sdamanagement-web/src/mocks/handlers/activities.ts (staffing fields, 2 new mock activities)
- src/sdamanagement-web/public/locales/fr/common.json (staffing + roster i18n keys)
- src/sdamanagement-web/public/locales/en/common.json (staffing + roster i18n keys)
- src/sdamanagement-web/src/test-utils.tsx (staffing + roster i18n keys for tests)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status: in-progress → review)
