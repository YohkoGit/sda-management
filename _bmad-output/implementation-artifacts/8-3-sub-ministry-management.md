# Story 8.3: Sub-Ministry Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **ADMIN**,
I want to manage sub-ministries within my assigned departments,
So that I can organize ministry teams and assign leads.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–8.2 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors, abbreviations, and descriptions
- Sub-ministries created for at least 2 departments (from Epic 2) — e.g., "Éclaireurs" and "Ambassadeurs" under JA
- At least one user per role: VIEWER (no department assignments), ADMIN (with department assignments to 1-2 departments), ADMIN (with assignment to a different department for scope testing), OWNER
- Multiple users assigned to the same department (for lead selection testing — at least 3 users in one department)
- All Epics 1–8.2 stories committed and passing

### Codebase State (Story 8.2 Complete)

**Backend — Sub-ministry system built in Epic 2 (OWNER-only):**
- `DepartmentsController` at `Controllers/DepartmentsController.cs` — Sub-ministry endpoints exist: `POST /api/departments/{departmentId}/sub-ministries`, `PUT /api/departments/{departmentId}/sub-ministries/{id}`, `DELETE /api/departments/{departmentId}/sub-ministries/{id}`. **ALL gated by `auth.IsOwner()` — must be changed to `auth.CanManage(departmentId)` for ADMIN access.**
- `DepartmentService` at `Services/DepartmentService.cs` — `AddSubMinistryAsync()`, `UpdateSubMinistryAsync()`, `DeleteSubMinistryAsync()` — all operational. **No lead field handling.**
- `SubMinistry` entity at `Data/Entities/SubMinistry.cs` — `Id`, `Name`, `DepartmentId`, `Department` (navigation), `CreatedAt`, `UpdatedAt`. **NO `LeadUserId` or `Lead` navigation — must be added.**
- `SubMinistryResponse` DTO at `Dtos/Department/SubMinistryResponse.cs` — `Id`, `Name` only. **Must be extended with lead info.**
- `CreateSubMinistryRequest` DTO at `Dtos/Department/CreateSubMinistryRequest.cs` — `Name` only. **Must be extended with `LeadUserId?`.**
- `UpdateSubMinistryRequest` DTO at `Dtos/Department/UpdateSubMinistryRequest.cs` — `Name` only. **Must be extended with `LeadUserId?`.**
- Validators: `CreateSubMinistryRequestValidator`, `UpdateSubMinistryRequestValidator` — validate Name (not empty, max 100, no control chars). **Must add `LeadUserId` validation.**
- `AppDbContext` at `Data/AppDbContext.cs` — SubMinistry configured with composite unique index on `(DepartmentId, Name)`, cascade delete on department, max 100 chars for Name.
- `IAuthorizationService` at `Auth/IAuthorizationService.cs` — `CanView()`, `CanManage(departmentId)`, `IsOwner()`, `IsAuthenticated()`. The `CanManage(departmentId)` method returns true for ADMIN with dept scope OR OWNER bypass — exactly what sub-ministry endpoints need.

**Frontend — Sub-ministry display + management components exist:**
- `SubMinistryManager` at `components/department/SubMinistryManager.tsx` — Inline add/edit/delete for sub-ministries. **Name only — no lead picker.** Uses `departmentService.addSubMinistry()`, `updateSubMinistry()`, `deleteSubMinistry()`. Used in `AdminDepartmentsPage` inside `DepartmentCard` (OWNER-only page).
- `DepartmentDetailPage` at `pages/DepartmentDetailPage.tsx` — Shows sub-ministries as **read-only chips** in sidebar (lines 459-485). `canManage` flag computed (`isAdminWithScope || isOwner`) but NOT used for sub-ministry management — only used for activity/meeting management. **Must integrate SubMinistryManager for canManage users.**
- `departmentService` at `services/departmentService.ts` — `SubMinistryResponse` interface: `{ id: number; name: string }`. **Must be extended with lead info.** Service methods: `addSubMinistry(departmentId, { name })`, `updateSubMinistry(departmentId, id, { name })`, `deleteSubMinistry(departmentId, id)`. **Must be updated to accept `leadUserId`.**
- `departmentSchema` at `schemas/departmentSchema.ts` — `subMinistrySchema`: `{ name: z.string().min(1).max(100) }`. **Must be extended with optional `leadUserId`.**
- `userService` at `services/userService.ts` — `getAssignableOfficers()` returns all non-guest users with their departments — can be reused and filtered client-side for lead picker.
- **i18n keys**: sub-ministry keys exist under `pages.adminDepartments.subMinistry.*` and `pages.authDepartments.subMinistries` / `pages.authDepartments.noSubMinistries`. Need new keys for lead-related labels.
- **MSW handlers**: `departments.ts` — mock sub-ministry CRUD endpoints exist. Must add lead field to mock data.

## Acceptance Criteria

1. **Given** an ADMIN on the MIFEM department detail page
   **When** they navigate to the sub-ministries section
   **Then** existing sub-ministries display (e.g., if any were created by OWNER in Epic 2)
   **And** an "Ajouter un sous-ministère" button is visible

2. **Given** the ADMIN creates a new sub-ministry
   **When** they enter name and optionally assign a lead (from department members)
   **Then** the sub-ministry is created under the current department (FR45)
   **And** it appears in the department's sub-ministry list

3. **Given** an existing sub-ministry
   **When** the ADMIN edits its name or reassigns the lead
   **Then** the changes are saved and reflected immediately

4. **Given** the sub-ministry list
   **When** rendered
   **Then** each sub-ministry shows: name and lead (with avatar)
   **Note:** "member count" from epics is intentionally deferred — no sub-ministry membership data model exists. This is a future enhancement. Current display is name + lead only.

5. **Given** an ADMIN scoped to JA only
   **When** they view the MIFEM department detail page
   **Then** no sub-ministry management controls are visible
   **And** API calls return 403

6. **Given** an OWNER viewing any department's detail page
   **When** the page renders
   **Then** all sub-ministry management controls are visible regardless of department assignment

7. **Given** a VIEWER viewing any department's detail page
   **When** the page renders
   **Then** sub-ministries display in read-only mode (name + lead info, no edit/delete controls)

## Tasks / Subtasks

- [x] **Task 0: Backend — Create BadRequestException for business rule validation** (AC: 2, 3)
  - [x]0.1 Create `src/SdaManagement.Api/Exceptions/BadRequestException.cs` — a simple exception class: `public class BadRequestException(string message) : Exception(message);`
  - [x]0.2 Update the global exception handler in `Program.cs` (or wherever `UseExceptionHandler` is configured) to catch `BadRequestException` and return 400 ProblemDetails with `Type = "urn:sdac:validation-error"`, `Title = "Validation Error"`, `Status = 400`, `Detail = exception.Message`. This follows the existing `urn:sdac:*` error code convention.
  - [x]0.3 This is a reusable pattern — future stories can throw `BadRequestException` from service methods for business rule violations that aren't covered by FluentValidation (which handles structural validation only).

- [x] **Task 1: Backend — Add LeadUserId to SubMinistry entity + migration** (AC: 2, 3, 4)
  - [x]1.1 Add `int? LeadUserId` property and `User? Lead` navigation to `SubMinistry` entity (`Data/Entities/SubMinistry.cs`)
  - [x]1.2 Configure relationship in `AppDbContext.OnModelCreating()`: `HasOne(sm => sm.Lead).WithMany().HasForeignKey(sm => sm.LeadUserId).IsRequired(false).OnDelete(DeleteBehavior.SetNull)` — setting lead to null when the user is deleted preserves the sub-ministry
  - [x]1.3 Create EF Core migration: `dotnet ef migrations add AddLeadToSubMinistry`
  - [x]1.4 Verify migration: the migration should add a nullable `lead_user_id` column with FK to `users` table and `ON DELETE SET NULL`

- [x] **Task 2: Backend — Update DTOs and validators** (AC: 2, 3, 4)
  - [x]2.1 Update `SubMinistryResponse` DTO: add `int? LeadUserId`, `string? LeadFirstName`, `string? LeadLastName`, `string? LeadAvatarUrl`
  - [x]2.2 Update `CreateSubMinistryRequest` DTO: add `int? LeadUserId` property
  - [x]2.3 Update `UpdateSubMinistryRequest` DTO: add `int? LeadUserId` property
  - [x]2.4 Update `CreateSubMinistryRequestValidator`: add `When(x => x.LeadUserId.HasValue, () => { RuleFor(x => x.LeadUserId).GreaterThan(0); })` — basic FK validation. The service layer validates the user exists and belongs to the department.
  - [x]2.5 Update `UpdateSubMinistryRequestValidator`: same LeadUserId validation as create

- [x] **Task 3: Backend — Update DepartmentService for lead handling** (AC: 2, 3, 4)
  - [x]3.1 **Add `IAvatarService` to DepartmentService constructor.** Current signature: `DepartmentService(AppDbContext dbContext, ISanitizationService sanitizer)`. Change to: `DepartmentService(AppDbContext dbContext, ISanitizationService sanitizer, IAvatarService avatarService)`. The `IAvatarService` is needed to build `LeadAvatarUrl` from the file system (same pattern as `UserService` and `ActivityService`).
  - [x]3.2 Update `AddSubMinistryAsync()`: accept `LeadUserId` from request, validate user exists and belongs to the department (via `UserDepartments` join), set on entity. After save, build return response with lead info including `LeadAvatarUrl` via `avatarService.GetAvatarUrl(leadUserId)`.
  - [x]3.3 Update `UpdateSubMinistryAsync()`: accept `LeadUserId` from request, validate same as add. Allow setting to `null` to remove lead. After save, build return response with lead info including avatar URL.
  - [x]3.4 Update `GetByIdAsync()` projection — **two-step pattern** (CRITICAL):
    - **Step 1 (LINQ projection):** Access `Lead` navigation inside `.Select()` — EF Core generates a LEFT JOIN automatically, no `.Include()` needed:
      ```csharp
      SubMinistries = d.SubMinistries
          .OrderBy(s => s.Name)
          .Select(s => new SubMinistryResponse
          {
              Id = s.Id,
              Name = s.Name,
              LeadUserId = s.LeadUserId,
              LeadFirstName = s.Lead != null ? s.Lead.FirstName : null,
              LeadLastName = s.Lead != null ? s.Lead.LastName : null,
              // LeadAvatarUrl CANNOT be set here — file system I/O not allowed in LINQ
          })
          .ToList(),
      ```
    - **Step 2 (post-materialization):** After the query executes, loop through sub-ministries and populate avatar URLs:
      ```csharp
      if (result != null)
      {
          foreach (var sm in result.SubMinistries.Where(sm => sm.LeadUserId.HasValue))
              sm.LeadAvatarUrl = avatarService.GetAvatarUrl(sm.LeadUserId!.Value);
      }
      ```
    - This is the same pattern used by `UserService` and `ActivityService` for populating avatar URLs post-query.
  - [x]3.5 Update `AddSubMinistryAsync()` return: after `SaveChangesAsync()`, build `SubMinistryResponse` manually and call `avatarService.GetAvatarUrl()` for `LeadAvatarUrl` if `LeadUserId` is set.
  - [x]3.6 Update `UpdateSubMinistryAsync()` return: same post-save avatar URL population.
  - [x]3.7 **Lead validation:** If `LeadUserId` is provided but user doesn't exist or doesn't belong to the department, throw `new BadRequestException("Lead user is not a member of this department")` (from Task 0). The global exception handler maps this to 400 ProblemDetails with `urn:sdac:validation-error`. **This rule applies to ALL callers including OWNER** — lead must be a department member regardless of who assigns them (data integrity, not authorization).

- [x] **Task 4: Backend — Change authorization from OWNER-only to ADMIN+ (department-scoped)** (AC: 1, 5, 6)
  - [x]4.1 In `DepartmentsController.AddSubMinistry()`: change `if (!auth.IsOwner())` to `if (!auth.CanManage(departmentId))`
  - [x]4.2 In `DepartmentsController.UpdateSubMinistry()`: change `if (!auth.IsOwner())` to `if (!auth.CanManage(departmentId))`
  - [x]4.3 In `DepartmentsController.DeleteSubMinistry()`: change `if (!auth.IsOwner())` to `if (!auth.CanManage(departmentId))`
  - [x]4.4 Verify OWNER bypass still works — `CanManage()` returns true for OWNER regardless of department assignment

- [x] **Task 5: Backend — Integration tests** (AC: 1, 2, 3, 5, 6)
  - [x]5.1 `SubMinistryCrudEndpointTests.cs` — create sub-ministry as ADMIN with scope → 201
  - [x]5.2 Create sub-ministry with lead assignment → 201, response includes lead info
  - [x]5.3 Create sub-ministry with invalid LeadUserId (user not in department) → 400
  - [x]5.4 Update sub-ministry name and lead → 200, response reflects changes
  - [x]5.5 Update sub-ministry to remove lead (set LeadUserId to null) → 200
  - [x]5.6 Delete sub-ministry as ADMIN with scope → 204
  - [x]5.7 ADMIN without scope → 403 for all sub-ministry operations
  - [x]5.8 VIEWER → 403 for all sub-ministry operations
  - [x]5.9 OWNER → 201/200/204 for any department's sub-ministries (bypass)
  - [x]5.10 Duplicate sub-ministry name in same department → 409 Conflict
  - [x]5.11 OWNER assigns lead from a DIFFERENT department (user not in sub-ministry's department) → 400 (data integrity applies to OWNER too — lead must be a department member regardless of caller role)
  - [x]5.12 **Regression check:** Verify existing `DepartmentEndpointTests.cs` still passes after the auth change. The existing tests use OWNER client for sub-ministry operations — OWNER still has access via `CanManage()` bypass, so all existing tests should continue to pass unchanged.

- [x] **Task 6: Frontend — Update types, schema, and service** (AC: 2, 3, 4)
  - [x]6.1 Update `SubMinistryResponse` interface in `departmentService.ts`: add `leadUserId?: number | null`, `leadFirstName?: string | null`, `leadLastName?: string | null`, `leadAvatarUrl?: string | null`
  - [x]6.2 Update `departmentService.addSubMinistry()` to accept `{ name: string; leadUserId?: number | null }` instead of just `{ name: string }`
  - [x]6.3 Update `departmentService.updateSubMinistry()` to accept `{ name: string; leadUserId?: number | null }`
  - [x]6.4 Update `subMinistrySchema` in `departmentSchema.ts`: add `leadUserId: z.number().int().positive().nullable().optional()`

- [x] **Task 7: Frontend — Enhance SubMinistryManager with lead picker** (AC: 2, 3, 4, 7)
  - [x]7.1 **Self-contained data fetching**: Add a `useQuery` for `getAssignableOfficers` INSIDE SubMinistryManager (not as a prop). This makes the component self-contained and prevents regression on AdminDepartmentsPage which doesn't fetch officers externally. Filter the cached officers by `departmentId` prop using `useMemo`.
  - [x]7.2 Add `leadUserId` to mutation payloads in `addMutation` and `updateMutation`
  - [x]7.3 Add a lead picker to each sub-ministry row: use shadcn/ui `<Select>` component showing department members filtered from officers query. Each option shows user name. "Aucun responsable" option to clear lead. The `<Select>` component uses native mobile select behavior (browser-native bottom sheet picker on mobile) — no custom bottom sheet needed.
  - [x]7.4 In display mode (non-editing), show lead info: name + avatar (28px initials fallback). If no lead, show dash or "—".
  - [x]7.5 In edit mode, show name input + lead dropdown side by side (stacked on mobile)
  - [x]7.6 In add mode, show name input + lead dropdown (lead optional)
  - [x]7.7 Handle empty department (0 users assigned): lead picker shows only "Aucun responsable" option — no error state, just an empty-but-usable picker.
  - [x]7.8 Handle avatar display: use initials fallback when `leadAvatarUrl` is null (same pattern as other avatar displays in the app)

- [x] **Task 8: Frontend — Integrate SubMinistryManager into DepartmentDetailPage** (AC: 1, 5, 6, 7)
  - [x]8.1 Replace the read-only sub-ministry chips section (lines 459-485) with conditional rendering: if `canManage` → render `SubMinistryManager` with full edit controls; if not → render read-only list with lead info (name + avatar chip)
  - [x]8.2 Pass `departmentId` to `SubMinistryManager`
  - [x]8.3 Pass `subMinistries` from the department query to `SubMinistryManager`
  - [x]8.4 Ensure read-only view for VIEWER still shows sub-ministry names + lead info (but no edit/delete/add controls)

- [x] **Task 9: Frontend — i18n keys** (AC: 1, 2, 3, 4)
  - [x]9.1 **Reuse existing keys where possible.** The following keys already exist under `pages.adminDepartments.subMinistry.*` from Epic 2: `addSuccess`, `updateSuccess`, `deleteSuccess`, `deleteError`. The enhanced `SubMinistryManager` should continue using these existing keys (they work in both AdminDepartmentsPage and DepartmentDetailPage contexts). Do NOT duplicate them under `pages.authDepartments.subMinistry.*`.
  - [x]9.2 Add **new** lead-related keys to `en/common.json` and `fr/common.json` (these are genuinely new and don't exist yet):
    - `pages.authDepartments.subMinistry.lead`: "Lead" / "Responsable"
    - `pages.authDepartments.subMinistry.noLead`: "No lead" / "Aucun responsable"
    - `pages.authDepartments.subMinistry.selectLead`: "Select a lead" / "Sélectionner un responsable"
    - `pages.authDepartments.subMinistry.leadValidationError`: "Selected user is not a member of this department" / "L'utilisateur sélectionné n'est pas membre de ce département"
  - [x]9.3 Also add the existing `pages.adminDepartments.form.addSubMinistry` key equivalent for the DepartmentDetailPage context if the SubMinistryManager references a different i18n namespace. Check which keys the component uses and ensure all are present.
  - [x]9.4 Add all new keys to `test-utils.tsx` inline translations

- [x] **Task 10: Frontend — Tests** (AC: 1, 2, 3, 4, 5, 6, 7)
  - [x]10.1 **NEW file** `SubMinistryManager.test.tsx` — this is a new test file (does not exist yet). Tests the **enhanced** component with lead picker. Key test cases: renders sub-ministry list with lead names + avatars, lead picker renders with department-filtered members, selecting a lead includes `leadUserId` in mutation payload, "Aucun responsable" option clears lead (sends `null`), add form has both name input + lead dropdown, edit mode shows both fields pre-filled, delete mutation fires correctly, no-lead sub-ministry shows "—", avatar initials fallback when no `leadAvatarUrl`
  - [x]10.2 Update `DepartmentDetailPage.test.tsx` — add tests: SubMinistryManager visible for ADMIN with scope, SubMinistryManager visible for OWNER, read-only sub-ministries for VIEWER, read-only sub-ministries for ADMIN without scope, lead info displayed in read-only mode
  - [x]10.3 Update MSW handlers in `departments.ts` — add `leadUserId`, `leadFirstName`, `leadLastName`, `leadAvatarUrl` to mock sub-ministry data

- [x] **Task 11: Responsive layout** (AC: 1, 2, 3)
  - [x]11.1 Mobile: sub-ministry management in sidebar stacks name input and lead picker vertically. Lead picker is a full-width dropdown. Touch targets ≥ 44px for edit/delete buttons.
  - [x]11.2 Desktop: name input and lead picker side by side in sub-ministry management. Compact layout in the 320px sidebar.

## Dev Notes

### Critical Architecture Constraints

- **Authorization change is the core of this story.** The sub-ministry CRUD endpoints currently check `auth.IsOwner()`. This must change to `auth.CanManage(departmentId)` which returns true for ADMIN+ with department scope OR OWNER bypass. This is the same pattern used for activity management (Epic 4, Story 8.2). The change is three lines in `DepartmentsController.cs`.
- **Lead is an optional FK to User.** The `SubMinistry.LeadUserId` is nullable — sub-ministries can exist without a lead. When the lead user is deleted, the FK is set to null via `OnDelete(DeleteBehavior.SetNull)`. This prevents cascade deletion of sub-ministries when users are removed.
- **Lead must be a department member — unconditionally.** The service layer validates that the `LeadUserId` (if provided) corresponds to a user who belongs to the sub-ministry's department via the `user_departments` junction table. This is a **data integrity rule**, not an authorization rule — it applies to ALL callers including OWNER. An OWNER can manage sub-ministries in any department, but cannot assign a lead from a different department. Enforced in `DepartmentService` via `BadRequestException` (a new exception class created in Task 0 — does NOT exist in the codebase yet, must be created first).
- **`DepartmentService` needs `IAvatarService` injection.** The current constructor is `DepartmentService(AppDbContext dbContext, ISanitizationService sanitizer)`. It must gain `IAvatarService avatarService` to build `LeadAvatarUrl`. Avatar URLs are built via file system I/O (`avatarService.GetAvatarUrl(userId)`) and **cannot be inside EF Core `.Select()` projections** — they must be populated post-materialization (same pattern as `UserService` and `ActivityService`).
- **No separate sub-ministry membership model.** The epics mention "member count if applicable" — this is acknowledged as a display consideration but NOT implemented in this story. The current data model has no sub-ministry membership concept. The story focuses on name + lead management. Member count can be added in a future epic if needed. The read-only display will show lead info only (no member count column).
- **Security boundary is the API layer.** Frontend hides management controls for UX; API enforces permissions via `CanManage(departmentId)`. OWNER bypasses all department scoping. VIEWER sees read-only. ADMIN only sees controls for departments in `user.departmentIds`.
- **SubMinistryManager is reused, not duplicated.** The existing `SubMinistryManager` component (used in `AdminDepartmentsPage`) is enhanced with lead picker functionality and then also used in `DepartmentDetailPage`. One component, two contexts. The AdminDepartmentsPage (OWNER-only) continues to use it as before, now with lead support.
- **Lead picker uses existing `getAssignableOfficers` endpoint.** Rather than creating a new API endpoint for department members, filter the existing `getAssignableOfficers` results client-side by departmentId. The total user count is small (<200) so client-side filtering is efficient. The officers are fetched once and cached by TanStack Query.
- **SubMinistryManager fetches its own officer data.** The component uses an internal `useQuery` for `getAssignableOfficers` rather than expecting officers as a prop. This makes it self-contained and prevents regression on AdminDepartmentsPage (which doesn't fetch officers externally). TanStack Query deduplicates the request if multiple components request the same data.
- **Batch sub-ministry creation remains name-only.** The `DepartmentFormDialog` (used in AdminDepartmentsPage for department creation) supports batch sub-ministry creation with names only. This story does NOT add lead assignment to the batch creation flow — leads are assigned post-creation via SubMinistryManager. This is intentional: batch creation is a quick-start feature during setup, lead assignment is an ongoing management task.

### Reuse Existing Components — Do NOT Reinvent

- **`SubMinistryManager`** (`components/department/SubMinistryManager.tsx`): Enhance with lead picker. Already has add/edit/delete mutations, toast notifications, and inline editing UX. Add lead selection to the existing flow.
- **`getAssignableOfficers`** (`services/userService.ts`): Returns all non-guest users with department info. Filter client-side for lead picker dropdown.
- **Avatar pattern**: Initials fallback when `avatarUrl` is null — used across the app (dashboard, roster, activity detail). For the lead display, use the 28px size variant.
- **Badge** (`components/ui/badge.tsx`): For sub-ministry count or labels.
- **`useIsMobile`** (`hooks/use-mobile.tsx`): For responsive layout of the lead picker.
- **`toast`** from `sonner`: For success/error notifications (already used in SubMinistryManager).
- **Lucide icons**: `Plus`, `Pencil`, `Trash2`, `Check`, `X`, `User` — most already imported in SubMinistryManager.

### Lead Picker Design

The lead picker is a simple `<select>` or custom dropdown (NOT the full cmdk contact picker — overkill for single-user selection). It shows department members with their name and small avatar:

```
┌─────────────────────────────────────┐
│ Éclaireurs                          │
│ Responsable: [▾ Sœur Marie     👤]  │
│                                     │
│ ┌─ Dropdown open ──────────────────┐│
│ │ — Aucun responsable              ││
│ │ 👤 Frère Jean                    ││
│ │ 👤 Sœur Marie          ✓        ││
│ │ 👤 Frère Joseph                  ││
│ └──────────────────────────────────┘│
├─────────────────────────────────────┤
│ Ambassadeurs                        │
│ Responsable: — Aucun responsable    │
│                                     │
│ [+ Ajouter un sous-ministère]       │
└─────────────────────────────────────┘
```

Use shadcn/ui `<Select>` component (already available — it wraps Radix Select). Each option shows user name. The trigger shows selected lead name + small avatar. "Aucun responsable" option to clear lead.

**Mobile UX note:** The shadcn/ui `<Select>` component on mobile provides a native-like dropdown experience (Radix Select with portal). No custom bottom sheet needed — the native behavior is optimal for single-selection from a short list (5-15 department members). This was validated by user persona feedback (Frère Jean's concern about cramped sidebar).

### Sub-Ministry Display in DepartmentDetailPage

**For `canManage` users (ADMIN with scope + OWNER):**
```
┌─ SUB-MINISTRIES ─────────────────────┐
│                                       │
│ Éclaireurs           [Sœur Marie 👤] │
│                          [✏️] [🗑️]  │
│                                       │
│ Ambassadeurs            — aucun      │
│                          [✏️] [🗑️]  │
│                                       │
│ [+ Ajouter un sous-ministère]         │
└───────────────────────────────────────┘
```

**For read-only users (VIEWER + ADMIN without scope):**
```
┌─ SUB-MINISTRIES ─────────────────────┐
│                                       │
│ Éclaireurs           [Sœur Marie 👤] │
│ Ambassadeurs            —            │
│                                       │
│ (no add/edit/delete controls)         │
└───────────────────────────────────────┘
```

### Backend Validation — Lead Assignment

Two-layer validation when `LeadUserId` is provided in create/update:

1. **FluentValidation** (structural — Task 2.4/2.5): `LeadUserId > 0` when present — basic FK validity
2. **Service layer** (business rule — Task 3.7): query `UserDepartments` to verify user belongs to the department. Throw `BadRequestException` (Task 0) if not. This applies to ALL callers including OWNER (data integrity, not authorization). Test 5.11 verifies this.

### Migration Safety

The migration adds 1 column:
- `lead_user_id` (int, NULL, FK to `users.id`, ON DELETE SET NULL) — safe for existing rows (all null)

No data migration needed. All existing sub-ministries have `lead_user_id = null`. The migration is fully backward-compatible.

### Anti-Patterns to Avoid

- Do NOT create a separate `LeadController` or `SubMinistriesController` — sub-ministries are children of departments. All endpoints stay on `DepartmentsController`.
- Do NOT use the full cmdk contact picker for lead assignment — it's designed for multi-select role assignment. A simple `<Select>` dropdown is appropriate for single-user lead selection.
- Do NOT add a sub-ministry membership model in this story — the "member count" from AC4 is acknowledged as a display placeholder for future work. Focus on name + lead.
- Do NOT duplicate SubMinistryManager — enhance the existing component and reuse it in DepartmentDetailPage.
- Do NOT create a new endpoint for department members — filter `getAssignableOfficers` client-side by departmentId. The data set is small.
- Do NOT remove the existing sub-ministry management from AdminDepartmentsPage — it continues to work with the enhanced SubMinistryManager component. Both pages use the same component.
- Do NOT change department-level CRUD authorization (Create/Update/Delete department) — those remain OWNER-only. Only sub-ministry CRUD changes to ADMIN+ (department-scoped).
- Do NOT forget to update both `AdminDepartmentsPage` (OWNER) and `DepartmentDetailPage` (ADMIN+) — both use SubMinistryManager, both benefit from lead support.
- Do NOT use `md:` breakpoint for responsive — use `sm:` (640px) per UX spec.

### Previous Story Intelligence (8.2)

Key learnings from Story 8.2:
- **Meeting fields added to Activity entity** — same pattern of extending an existing entity with optional fields. This story does the same with `LeadUserId` on SubMinistry.
- **DepartmentDetailPage was expanded from read-only to full management** — the management pattern (canManage flag, adaptive modals, mutations, cache invalidation) is established. This story adds sub-ministry management alongside the existing activity/meeting management.
- **Adaptive Dialog/Sheet pattern** — used for activity/meeting modals. Sub-ministry management is inline (no modal needed — the SubMinistryManager uses inline editing).
- **Cache invalidation**: invalidate `["departments", departmentId]` and `["departments"]` after sub-ministry mutations — same keys as activity mutations.
- **Build lock issue from 8.2**: API process blocked EF Core migration. Kill the dev server before running `dotnet ef migrations add`.
- **JSON serialization**: Backend uses `WhenWritingNull` — null fields are omitted from responses. Integration tests should use `TryGetProperty` for nullable fields.

### Git Intelligence

Recent commit pattern: `feat(departments): Story 8.X — description`

Files from Story 8.1 commit (2f4566a):
- Added `DepartmentWithStaffingListItem.cs` DTO
- Added `DepartmentService.GetAllWithStaffingAsync()` with two-query aggregate
- Added `DepartmentDetailPage.tsx` and `AuthDepartmentsPage.tsx`
- StaffingIndicator component enhanced
- Activity mock handlers updated

Story 8.2 (uncommitted but complete):
- Meeting fields added to Activity entity
- MeetingForm component created
- DepartmentDetailPage expanded with full management

### Project Structure Notes

- New exception: `src/SdaManagement.Api/Exceptions/BadRequestException.cs` (reusable business rule exception → 400)
- Modified entity: `src/SdaManagement.Api/Data/Entities/SubMinistry.cs` (add LeadUserId + Lead navigation)
- Modified context: `src/SdaManagement.Api/Data/AppDbContext.cs` (configure Lead relationship)
- New migration: `src/SdaManagement.Api/Migrations/YYYYMMDD_AddLeadToSubMinistry.cs`
- Modified DTOs: `src/SdaManagement.Api/Dtos/Department/SubMinistryResponse.cs`, `CreateSubMinistryRequest.cs`, `UpdateSubMinistryRequest.cs`
- Modified validators: `src/SdaManagement.Api/Validators/CreateSubMinistryRequestValidator.cs`, `UpdateSubMinistryRequestValidator.cs`
- Modified service: `src/SdaManagement.Api/Services/DepartmentService.cs` (add IAvatarService injection, lead handling + post-materialization avatar URL population)
- Modified controller: `src/SdaManagement.Api/Controllers/DepartmentsController.cs` (auth change: IsOwner → CanManage)
- New integration tests: `tests/SdaManagement.Api.IntegrationTests/Departments/SubMinistryCrudEndpointTests.cs`
- Modified component: `src/sdamanagement-web/src/components/department/SubMinistryManager.tsx` (lead picker enhancement)
- Modified page: `src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx` (integrate SubMinistryManager)
- Modified test: `src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx` (sub-ministry management tests)
- New test: `src/sdamanagement-web/src/components/department/SubMinistryManager.test.tsx` (new file — does not exist yet)
- Modified service: `src/sdamanagement-web/src/services/departmentService.ts` (lead fields on types + service calls)
- Modified schema: `src/sdamanagement-web/src/schemas/departmentSchema.ts` (leadUserId field)
- Modified i18n: `src/sdamanagement-web/public/locales/en/common.json`, `fr/common.json`
- Modified test utils: `src/sdamanagement-web/src/test-utils.tsx`
- Modified MSW handlers: `src/sdamanagement-web/src/mocks/handlers/departments.ts` (lead fields on mock data)
- **NOT modified**: Department-level CRUD endpoints (Create/Update/Delete department) remain OWNER-only

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR45, FR47]
- [Source: _bmad-output/planning-artifacts/architecture.md#Centralized Authorization Service, Controller Method Template]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 3]
- [Source: _bmad-output/implementation-artifacts/8-2-department-activity-and-meeting-management.md]
- [Source: _bmad-output/implementation-artifacts/8-1-department-list-and-detail-view.md]
- [Source: src/SdaManagement.Api/Data/Entities/SubMinistry.cs]
- [Source: src/SdaManagement.Api/Controllers/DepartmentsController.cs]
- [Source: src/SdaManagement.Api/Services/DepartmentService.cs]
- [Source: src/SdaManagement.Api/Auth/IAuthorizationService.cs]
- [Source: src/SdaManagement.Api/Dtos/Department/SubMinistryResponse.cs]
- [Source: src/SdaManagement.Api/Dtos/Department/CreateSubMinistryRequest.cs]
- [Source: src/sdamanagement-web/src/components/department/SubMinistryManager.tsx]
- [Source: src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx]
- [Source: src/sdamanagement-web/src/services/departmentService.ts]
- [Source: src/sdamanagement-web/src/services/userService.ts#getAssignableOfficers]
- [Source: context7 — EF Core optional one-to-many with nullable FK and OnDelete SetNull]
- [Source: context7 — FluentValidation When() conditional validation for optional fields]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- **Task 0**: Created `BadRequestException` class and `GlobalExceptionHandler` implementing `IExceptionHandler`. Registered in DI via `AddExceptionHandler<GlobalExceptionHandler>()`. Maps `BadRequestException` to 400 ProblemDetails with `urn:sdac:validation-error`.
- **Task 1**: Added `LeadUserId` (nullable int) and `Lead` (User navigation) to SubMinistry entity. Configured `OnDelete(DeleteBehavior.SetNull)` in AppDbContext. Migration `20260318233736_AddLeadToSubMinistry` creates `lead_user_id` column with FK and index.
- **Task 2**: Extended SubMinistryResponse with lead fields (LeadUserId, LeadFirstName, LeadLastName, LeadAvatarUrl). Added optional LeadUserId to Create/Update request DTOs. Added conditional FluentValidation for LeadUserId > 0 when present.
- **Task 3**: Added `IAvatarService` to DepartmentService constructor. Updated GetByIdAsync with two-step pattern (LINQ projection + post-materialization avatar URLs). Updated Add/Update methods with lead validation and response building via `BuildSubMinistryResponse` helper. Added `ValidateLeadBelongsToDepartment` — throws BadRequestException if user not in department.
- **Task 4**: Changed auth from `IsOwner()` to `CanManage(departmentId)` on all 3 sub-ministry endpoints. OWNER bypass preserved via CanManage() design.
- **Task 5**: Created `SubMinistryCrudEndpointTests.cs` with 18 tests covering ADMIN with/without scope, VIEWER, OWNER bypass, lead assignment, invalid lead (cross-department), duplicate name, and lead removal. All existing 29 DepartmentEndpointTests pass (regression verified).
- **Task 6**: Extended frontend types (SubMinistryResponse interface), service methods (leadUserId param), and Zod schema (optional nullable leadUserId).
- **Task 7**: Enhanced SubMinistryManager with self-contained officer data fetching (useQuery), lead picker using shadcn/ui Select, initials avatar display for leads, and "—" for no-lead sub-ministries. Component is reused in both AdminDepartmentsPage and DepartmentDetailPage.
- **Task 8**: Replaced read-only sub-ministry chips with conditional rendering: canManage users get SubMinistryManager, others get read-only list with lead info and avatar.
- **Task 9**: Added i18n keys for lead/noLead/selectLead/leadValidationError in EN and FR locale files + test-utils.tsx inline translations.
- **Task 10**: Created SubMinistryManager.test.tsx (8 tests) and added 4 new tests to DepartmentDetailPage.test.tsx. Updated MSW handlers with lead fields. All 533 frontend tests pass.
- **Task 11**: Added min-h-[44px] min-w-[44px] touch targets to all SubMinistryManager buttons. Stacked layout with full-width lead picker already handles mobile.

### Code Review Fixes (2026-03-18)

- **H1**: Added 400 error handling to `addMutation.onError` and `updateMutation.onError` — lead validation errors now surface via toast using `leadValidationError` i18n key
- **H3**: Added 2 new tests: `includes leadUserId in update mutation payload from edit state` and `sends null leadUserId in mutation when editing sub-ministry without lead` (10 total tests in SubMinistryManager.test.tsx)
- **H4**: Fixed `DepartmentService.UpdateAsync` — added `.ThenInclude(s => s.Lead)` and populated lead fields in SubMinistryResponse
- **M1**: Strengthened integration test 5.2 assertions — now checks actual name values (`"Test"`, `"Viewer"`)
- **M2**: Made `SubMinistryResponse` property modifiers consistent — all properties now use `set`
- **M3/L3**: Added `aria-label` attributes to all SubMinistryManager icon buttons (Edit, Delete, Confirm, Cancel) — fixes a11y and makes test selectors robust
- **M4**: Removed dead i18n key `pages.authDepartments.subMinistry.lead` from en/fr/test-utils
- **M5**: Eliminated extra DB round-trip — combined `ValidateLeadBelongsToDepartment` + `BuildSubMinistryResponse` into `ValidateAndLoadLead` (returns User) + synchronous `BuildSubMinistryResponse(subMinistry, lead)`
- **M6**: Added distinct error for non-existent user: `"Lead user does not exist"` vs `"Lead user is not a member of this department"`

### Change Log

- **2026-03-18**: Story 8.3 implementation — Sub-ministry management with lead assignment, ADMIN authorization, and lead picker UI
- **2026-03-18**: Code review fixes — 4 HIGH, 6 MEDIUM, 1 LOW issue resolved. All 535 frontend + 18 integration tests pass.
- **2026-03-18**: UI validation — 1 HIGH bug found and fixed. SubMinistryManager queryFn didn't unwrap AxiosResponse.data, so lead picker never showed department members. Fixed, re-validated, all 8 screens pass. 535 tests pass.

### File List

**New files:**
- src/SdaManagement.Api/Exceptions/BadRequestException.cs
- src/SdaManagement.Api/Exceptions/GlobalExceptionHandler.cs
- src/SdaManagement.Api/Migrations/20260318233736_AddLeadToSubMinistry.cs
- src/SdaManagement.Api/Migrations/20260318233736_AddLeadToSubMinistry.Designer.cs
- tests/SdaManagement.Api.IntegrationTests/Departments/SubMinistryCrudEndpointTests.cs
- src/sdamanagement-web/src/components/department/SubMinistryManager.test.tsx

**Modified files:**
- src/SdaManagement.Api/Data/Entities/SubMinistry.cs
- src/SdaManagement.Api/Data/AppDbContext.cs
- src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs
- src/SdaManagement.Api/Dtos/Department/SubMinistryResponse.cs
- src/SdaManagement.Api/Dtos/Department/CreateSubMinistryRequest.cs
- src/SdaManagement.Api/Dtos/Department/UpdateSubMinistryRequest.cs
- src/SdaManagement.Api/Validators/CreateSubMinistryRequestValidator.cs
- src/SdaManagement.Api/Validators/UpdateSubMinistryRequestValidator.cs
- src/SdaManagement.Api/Services/DepartmentService.cs
- src/SdaManagement.Api/Controllers/DepartmentsController.cs
- src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs
- src/sdamanagement-web/src/services/departmentService.ts
- src/sdamanagement-web/src/schemas/departmentSchema.ts
- src/sdamanagement-web/src/components/department/SubMinistryManager.tsx
- src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx
- src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx
- src/sdamanagement-web/public/locales/en/common.json
- src/sdamanagement-web/public/locales/fr/common.json
- src/sdamanagement-web/src/test-utils.tsx
- src/sdamanagement-web/src/mocks/handlers/departments.ts
- _bmad-output/implementation-artifacts/sprint-status.yaml
