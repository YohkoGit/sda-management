# Story 8.2: Department Activity & Meeting Management

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **ADMIN**,
I want to manage activities and create meetings (Zoom or physical) for my assigned departments,
So that I can coordinate my department's full operational schedule.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–8.1 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments with colors, abbreviations, and descriptions
- Sub-ministries created for at least 2 departments (from Epic 2)
- Activities created with **both** `Public` AND `Authenticated` visibility (from Epic 4) — several across different dates/departments, with varying staffing levels
- Activity templates created (from Epic 2/4) — including at least "Sabbath Worship" and one custom template
- At least one user per role: VIEWER (no department assignments), ADMIN (with department assignments to 1-2 departments), ADMIN (with assignment to a different department for scope testing), OWNER
- All Epics 1–8.1 stories committed and passing

### Codebase State (Story 8.1 Complete)

**Backend — Activity + Department system fully built:**
- `ActivitiesController` at `Controllers/ActivitiesController.cs` — Full CRUD: `POST /api/activities` (CanManage), `PUT /api/activities/{id}` (CanManage + concurrency), `DELETE /api/activities/{id}` (CanManage), `GET /api/activities` (CanView for dept filter, IsOwner for all), `GET /api/activities/{id}` (CanView). **No meeting-specific fields yet.**
- `ActivityService` at `Services/ActivityService.cs` — `CreateAsync()` supports template-based and inline role creation, sanitization, assignment validation. `UpdateAsync()` with concurrency token. `DeleteAsync()`. `GetAllAsync()` with department/visibility filters. `ComputeStaffingStatus()` is `internal static`.
- `DepartmentsController` at `Controllers/DepartmentsController.cs` — `GET /api/departments` (VIEWER+), `GET /api/departments/{id}` (VIEWER+), `GET /api/departments/with-staffing` (IsAuthenticated), full CRUD (OWNER only).
- `DepartmentService` at `Services/DepartmentService.cs` — `GetAllAsync()`, `GetByIdAsync()`, `GetAllWithStaffingAsync()` (two-query aggregate staffing).
- **Activity Entity** (`Data/Entities/Activity.cs`): `Id`, `Title`, `Description?`, `Date`, `StartTime`, `EndTime`, `DepartmentId?`, `Visibility` (enum), `SpecialType?`, `Version` (concurrency), `CreatedAt`, `UpdatedAt`, `Roles[]`. **NO meeting fields (IsMeeting, MeetingType, ZoomLink, LocationName, LocationAddress) — these must be added.**
- **Auth**: `IAuthorizationService` — `CanView()` = authenticated, `CanManage(departmentId)` = ADMIN+ with dept scope OR OWNER bypass, `IsOwner()` = OWNER.
- **DTOs**: `CreateActivityRequest` (Title, Description?, Date, StartTime, EndTime, DepartmentId, Visibility, SpecialType?, TemplateId?, Roles?), `UpdateActivityRequest` (same + ConcurrencyToken), `ActivityResponse` (full with Roles[], StaffingStatus, ConcurrencyToken), `ActivityListItem` (with staffingStatus, departmentColor, assignedCount, totalHeadcount).

**Frontend — Department detail + admin activity management built:**
- `DepartmentDetailPage` at `pages/DepartmentDetailPage.tsx` — Read-only view: breadcrumb, 2-col layout (pipeline left, sidebar right), activity list with StaffingIndicator + Link to `/activities/:id`. **Auth flags computed but unused**: `isAdminWithScope`, `isOwner`. **NO management controls yet** (no create/edit/delete buttons).
- `AdminActivitiesPage` at `pages/AdminActivitiesPage.tsx` — Full CRUD with Dialog/Sheet adaptive modals. 2-step creation: TemplateSelector → ActivityForm. Edit, delete, roster view panels. Conflict detection via ConflictAlertDialog. **Pattern reference for all management modals.**
- `ActivityForm` at `components/activity/ActivityForm.tsx` — Full form: title, description, date, time, department dropdown (filtered by role), visibility radio, special type select, RoleRosterEditor. Accepts `defaultValues` prop. Department dropdown shows all depts for OWNER, assigned depts for ADMIN.
- `RoleRosterEditor` at `components/activity/RoleRosterEditor.tsx` — useFieldArray-based role management with HeadcountStepper, AssignmentBadge, ContactPicker. Supports inline guest creation.
- `TemplateSelector` at `components/activity/TemplateSelector.tsx` — Template selection cards for step 1 of creation flow.
- `ConflictAlertDialog` at `components/activity/ConflictAlertDialog.tsx` — 409 conflict handling with reload/force-save options.
- `activityService` at `services/activityService.ts` — `create()`, `update(id, data, force?)`, `delete(id)`, `getById(id)`, `getByDepartment(departmentId)`, `getAll()`. All interfaces defined.
- `activitySchema` at `schemas/activitySchema.ts` — Zod schemas: `createActivitySchema`, `updateActivitySchema`. `SPECIAL_TYPES` array. **No meeting fields yet.**
- **Shadcn UI components installed**: Dialog, Sheet, AlertDialog, Button, Badge, Skeleton, Card, Separator, Table. **Tabs NOT installed.**
- **Adaptive modal pattern**: `const FormWrapper = isMobile ? Sheet : Dialog` (AdminActivitiesPage pattern — reuse for department detail).
- `useIsMobile` hook at `hooks/use-mobile.tsx` — `(max-width: 768px)` media query.
- `useAuth` from `contexts/AuthContext.tsx` — `{ user, isAuthenticated, isLoading }`. `user.role`, `user.departmentIds: number[]`.
- **i18n keys**: `pages.authDepartments.*` exist (from 8.1). `pages.adminActivities.*` exist (from Epic 4). New keys needed for meeting form and management controls.
- **Routing** (`App.tsx`): `/my-departments/:id` → `DepartmentDetailPage` (lazy, auth). `/admin/activities` → `AdminActivitiesPage` (lazy, ADMIN+).

## Acceptance Criteria

1. **Given** an ADMIN assigned to department MIFEM viewing the MIFEM detail page
   **When** they click "Nouvelle activité"
   **Then** the activity creation flow from Epic 4 opens with department pre-set to MIFEM (FR44)
   **And** the template selection step appears first, followed by the activity form

2. **Given** an ADMIN on a department detail page
   **When** they click "Nouvelle réunion"
   **Then** a meeting creation form appears with: title, date, time, type (Zoom/Physical)

3. **Given** the meeting type is "Zoom"
   **When** the ADMIN fills in the form
   **Then** a Zoom link field appears (FR46)
   **And** the meeting is saved with the Zoom URL

4. **Given** the meeting type is "Physical"
   **When** the ADMIN fills in the form
   **Then** location name and address fields appear (FR46)
   **And** the meeting is saved with the physical location

5. **Given** existing activities and meetings in the department pipeline
   **When** the ADMIN clicks edit or delete
   **Then** they can modify or remove items within their scoped department (FR44)

6. **Given** an ADMIN scoped to JA only
   **When** they attempt to manage activities in MIFEM's department page
   **Then** no edit controls are visible, and API calls return 403

7. **Given** an OWNER viewing any department's detail page
   **When** the page renders
   **Then** all management controls are visible (create/edit/delete) regardless of department assignment

8. **Given** a meeting in the activity pipeline
   **When** the pipeline renders
   **Then** the meeting is visually distinct from regular activities — showing a meeting icon and location/Zoom info instead of staffing indicators

## Tasks / Subtasks

- [x] **Task 1: Backend — Meeting fields entity extension + migration** (AC: 2, 3, 4, 8)
  - [x] 1.1 Add meeting fields to `Activity` entity: `bool IsMeeting` (default false), `string? MeetingType` ("zoom" | "physical"), `string? ZoomLink`, `string? LocationName`, `string? LocationAddress`
  - [x] 1.2 Update `AppDbContext.OnModelCreating()` with field constraints: `MeetingType` max 20 chars, `ZoomLink` max 500 chars, `LocationName` max 150 chars, `LocationAddress` max 300 chars
  - [x] 1.3 Create EF Core migration: `dotnet ef migrations add AddMeetingFieldsToActivity`
  - [x] 1.4 Update `CreateActivityRequest` and `UpdateActivityRequest` DTOs with nullable meeting fields: `bool? IsMeeting`, `string? MeetingType`, `string? ZoomLink`, `string? LocationName`, `string? LocationAddress`
  - [x] 1.5 Update `ActivityResponse` DTO with meeting fields (same 5 fields)
  - [x] 1.6 Update `ActivityListItem` DTO with `bool isMeeting`, `string? meetingType`, `string? locationName` (enough for pipeline display — no need for full zoom link in list)
  - [x] 1.7 Add FluentValidation rules in `CreateActivityRequestValidator.cs` and `UpdateActivityRequestValidator.cs` (NOT in shared `ActivityValidationRules.cs` — meeting fields are not part of `IActivityRequest`): when `IsMeeting == true`, `MeetingType` is required and must be "zoom" or "physical"; when `MeetingType == "zoom"`, `ZoomLink` is required and must be valid URL (https://); when `MeetingType == "physical"`, `LocationName` is required. Also enforce: when `IsMeeting == true`, `Visibility` must be "authenticated" (meetings cannot be public — prevents Zoom link leakage to anonymous users). When `IsMeeting == false`, all meeting fields must be null.
  - [x] 1.8 **Do NOT modify `IActivityRequest.cs`** — meeting fields belong only on the concrete DTOs (`CreateActivityRequest`, `UpdateActivityRequest`), not the shared interface. The shared `ActivityValidationRules.Apply()` operates on `IActivityRequest` and must remain meeting-agnostic.
  - [x] 1.9 Update `ActivityService.CreateAsync()` and `UpdateAsync()` to map meeting fields from request to entity. When `IsMeeting == true`, skip role/template processing and set `Roles` to empty (meetings don't have service roles)
  - [x] 1.10 Update `ActivityService` projections in `GetAllAsync()`, `GetByIdAsync()` to include meeting fields
  - [x] 1.11 Update `DashboardActivityItem.cs` DTO with `bool IsMeeting`, `string? MeetingType`, `string? LocationName` — meetings with `visibility: "authenticated"` appear on the authenticated dashboard and need visual distinction
  - [x] 1.12 Update `ActivityService.GetDashboardActivitiesAsync()` projection to include meeting fields
  - [x] 1.13 Integration tests: create meeting with Zoom type, create meeting with Physical type, update meeting type from Zoom to Physical, verify meetings have no roles, verify regular activities remain unaffected, verify meeting with `visibility: "public"` is rejected (400)

- [x] **Task 2: Frontend — Meeting schema + service updates** (AC: 2, 3, 4)
  - [x] 2.1 Add meeting fields to `activitySchema.ts`: extend `createActivitySchema` with `isMeeting: z.boolean().optional()`, `meetingType: z.enum(["zoom", "physical"]).optional()`, `zoomLink: z.string().url().max(500).optional()`, `locationName: z.string().max(150).optional()`, `locationAddress: z.string().max(300).optional()`
  - [x] 2.2 Add Zod `.superRefine()` for conditional meeting validation (project uses **Zod v4.3.6** — `.superRefine()` works identically to v3): if `isMeeting`, `meetingType` required; if `meetingType == "zoom"`, `zoomLink` required; if `meetingType == "physical"`, `locationName` required. Use `ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["fieldName"], message: "..." })` to attach errors to specific fields.
  - [x] 2.3 Update `ActivityResponse`, `ActivityListItem`, and `DashboardActivityItem` interfaces in `activityService.ts` with meeting fields (`isMeeting: boolean`, `meetingType?: string | null`, `zoomLink?: string | null`, `locationName?: string | null`, `locationAddress?: string | null`)

- [x] **Task 3: Frontend — MeetingForm component** (AC: 2, 3, 4)
  - [x] 3.1 Create `components/activity/MeetingForm.tsx` — simpler form than ActivityForm: title, description (optional), date, start time, end time, meeting type radio ("Zoom" / "Physique"), conditional fields. Uses React Hook Form + Zod resolver.
  - [x] 3.2 Implement `watch("meetingType")` for conditional field rendering: Zoom → `zoomLink` text input with URL validation; Physical → `locationName` + `locationAddress` text inputs
  - [x] 3.3 Pre-fill hidden fields: `departmentId` from prop, `visibility = "authenticated"`, `isMeeting = true`. No department selector (fixed from context). No roles section.
  - [x] 3.4 Accept `defaultValues` prop for edit mode (pre-fill all fields from existing meeting data)
  - [x] 3.5 Accept `onSubmit` and `isPending` props (same pattern as ActivityForm)

- [x] **Task 4: Frontend — DepartmentDetailPage management enhancements** (AC: 1, 2, 5, 6, 7, 8)
  - [x] 4.1 Add two action buttons next to the "Upcoming Activities" heading: "Nouvelle activité" (Plus icon) and "Nouvelle réunion" (CalendarDays icon). Conditional render: `{(isAdminWithScope || isOwner) && ...}`. Mobile: full-width stacked buttons below heading. Desktop: inline buttons right-aligned.
  - [x] 4.2 Add activity creation modal — adaptive Dialog/Sheet pattern (copy from AdminActivitiesPage). Two steps: TemplateSelector → ActivityForm. Pre-set `defaultValues.departmentId` to current `departmentId`. Department dropdown in ActivityForm should be disabled/locked to current department.
  - [x] 4.3 Add meeting creation modal — adaptive Dialog/Sheet. Single step: MeetingForm with `departmentId` prop.
  - [x] 4.4 Add edit/delete controls on pipeline activity rows: Pencil icon button + Trash2 icon button. Only visible when `isAdminWithScope || isOwner`. Positioned after the staffing indicator / meeting info.
  - [x] 4.5 Edit handler: fetch full activity via `activityService.getById()`, determine if meeting (`isMeeting`) → open MeetingForm in edit mode, else → open ActivityForm in edit mode (skip template step).
  - [x] 4.6 Delete handler: open AlertDialog confirmation with activity/meeting title. On confirm: `deleteMutation.mutate(id)`.
  - [x] 4.7 Meeting visual distinction in pipeline rows: replace StaffingIndicator with meeting type icon (Video icon for Zoom, MapPin icon for Physical) + location text truncated. Show `specialType` badge only for non-meeting activities.
  - [x] 4.8 Update `ActivityDetailPage.tsx` to render meeting-specific info when `isMeeting === true`: show meeting type badge ("Zoom" / "Physique"), clickable Zoom link (for Zoom meetings — `<a href={zoomLink} target="_blank" rel="noopener noreferrer">`), location name + address (for Physical meetings). Hide the "No Roles" empty text for meetings — replace with meeting info section. This page is auth-protected so Zoom links are safe to display.
  - [x] 4.9 Update admin empty state CTA to offer both actions: "Nouvelle activité" and "Nouvelle réunion" buttons when `isAdminWithScope || isOwner`. Use i18n key `pages.authDepartments.noActivitiesAdminCta` for the combined prompt text.

- [x] **Task 5: Frontend — Mutations and cache invalidation** (AC: 1, 2, 5)
  - [x] 5.1 `createMutation` — calls `activityService.create()`, invalidates `["activities", { departmentId }]` + `["departments", "with-staffing"]` (aggregate staffing changes). Reset form state. Toast: `t("pages.authDepartments.toast.created")` / `t("pages.authDepartments.toast.meetingCreated")`.
  - [x] 5.2 `updateMutation` — calls `activityService.update(id, data, force?)`, invalidates same keys + `["activity", id]`. Handle 409 with ConflictAlertDialog (import from existing component). Toast on success.
  - [x] 5.3 `deleteMutation` — calls `activityService.delete(id)`, invalidates same keys. Toast on success.
  - [x] 5.4 Time formatting: append `:00` to `startTime`/`endTime` before API call (same pattern as AdminActivitiesPage lines 168-169).

- [x] **Task 6: i18n keys** (AC: 1, 2, 3, 4, 5)
  - [x] 6.1 Add `pages.authDepartments.newActivity`, `pages.authDepartments.newMeeting`, `pages.authDepartments.editActivity`, `pages.authDepartments.editMeeting`, `pages.authDepartments.deleteConfirmTitle`, `pages.authDepartments.deleteConfirmMessage`, `pages.authDepartments.toast.created`, `pages.authDepartments.toast.meetingCreated`, `pages.authDepartments.toast.updated`, `pages.authDepartments.toast.deleted`, `pages.authDepartments.noActivitiesAdminCta` to both `en/common.json` and `fr/common.json`. Also add `pages.activityDetail.meetingInfo`, `pages.activityDetail.meetingType`, `pages.activityDetail.zoomLink`, `pages.activityDetail.location`, `pages.activityDetail.address` for the meeting detail rendering.
  - [x] 6.2 Add meeting form labels: `meetingForm.title`, `meetingForm.description`, `meetingForm.date`, `meetingForm.startTime`, `meetingForm.endTime`, `meetingForm.meetingType`, `meetingForm.zoom`, `meetingForm.physical`, `meetingForm.zoomLink`, `meetingForm.locationName`, `meetingForm.locationAddress`, `meetingForm.submit`, `meetingForm.zoomLinkPlaceholder`, `meetingForm.locationNamePlaceholder`, `meetingForm.locationAddressPlaceholder`
  - [x] 6.3 Add all new keys to test-utils.tsx inline translations

- [x] **Task 7: Responsive layout** (AC: 1, 2)
  - [x] 7.1 Mobile: action buttons full-width stacked below heading. Forms open as Sheet (bottom) with scrollable content. Edit/delete icons as small icon buttons.
  - [x] 7.2 Desktop/Tablet: action buttons inline right-aligned next to heading. Forms open as Dialog (centered). Edit/delete icons in pipeline row.

- [x] **Task 8: Tests** (AC: 1, 2, 3, 4, 5, 6, 7, 8)
  - [x] 8.1 `MeetingForm.test.tsx` — renders form fields, conditional Zoom/Physical fields via meetingType toggle, validation errors for missing required fields, submit with valid data
  - [x] 8.2 Update `DepartmentDetailPage.test.tsx` — add tests: management buttons visible for ADMIN with scope, management buttons visible for OWNER, management buttons hidden for VIEWER, management buttons hidden for ADMIN without scope, edit button opens correct form type (meeting vs activity), delete confirmation dialog, meeting visual distinction in pipeline (Video/MapPin icons)
  - [x] 8.3 Update `ActivityDetailPage.test.tsx` — add tests: meeting renders Zoom link (clickable), meeting renders location info (physical), meeting hides roster section, regular activity still shows roster
  - [x] 8.4 Backend integration tests: `MeetingCrudEndpointTests.cs` — create Zoom meeting, create Physical meeting, update meeting type, delete meeting, verify VIEWER cannot create, verify ADMIN without scope gets 403, verify OWNER can create in any department, verify meeting with `visibility: "public"` is rejected
  - [x] 8.5 MSW handlers: add meeting-specific mock data with `isMeeting: true` to `activities.ts` handlers

## Dev Notes

### Critical Architecture Constraints

- **Meetings ARE activities with extra fields.** There is NO separate Meeting entity. The `Activity` entity is extended with 5 nullable fields (`IsMeeting`, `MeetingType`, `ZoomLink`, `LocationName`, `LocationAddress`). This keeps the activity pipeline unified — meetings and activities coexist in the same list, same queries, same cache keys. This follows the established single-aggregate pattern.
- **Security boundary is the API layer.** Frontend hides buttons for UX; API enforces permissions via `CanManage(departmentId)`. OWNER bypasses all department scoping. VIEWER sees no management controls. ADMIN only sees controls for departments in `user.departmentIds`.
- **Meetings have NO service roles.** When `IsMeeting == true`, the `Roles` collection is empty. `CreateAsync()` must skip role/template processing for meetings. The `StaffingIndicator` is not shown for meetings — replaced by meeting type icon + location info.
- **Meeting fields do NOT belong on IActivityRequest.** The shared `IActivityRequest` interface defines fields common to ALL activities (Title, Description, Date, times, DepartmentId, Visibility, SpecialType). Meeting-specific fields (`IsMeeting`, `MeetingType`, `ZoomLink`, `LocationName`, `LocationAddress`) are only on the concrete DTOs (`CreateActivityRequest`, `UpdateActivityRequest`). The shared `ActivityValidationRules.Apply()` in `Validators/ActivityValidationRules.cs` operates on `IActivityRequest` and must remain meeting-agnostic. Meeting-specific FluentValidation rules go in `Validators/CreateActivityRequestValidator.cs` and `Validators/UpdateActivityRequestValidator.cs` only.
- **Meetings are always authenticated-only.** When `IsMeeting == true`, `Visibility` must be `"authenticated"`. The backend MUST enforce this (not just the frontend default). This is a security constraint: Zoom links must never appear on public endpoints. `PublicController`/`PublicService` filter by `ActivityVisibility.Public`, so authenticated meetings are inherently excluded — but the validation rule provides defense-in-depth.
- **Backend validation is conditional.** FluentValidation rules in the concrete validators fire based on `IsMeeting` flag: if true, `MeetingType` is required. If `MeetingType == "zoom"`, `ZoomLink` is required and must be a valid URL (https://). If `MeetingType == "physical"`, `LocationName` is required. `LocationAddress` is always optional (nice-to-have for physical meetings).
- **Pipeline is unified.** Both activities and meetings appear in the department detail's activity pipeline, sorted by date. The pipeline row template branches on `isMeeting` to show either staffing indicators (activities) or meeting metadata (meetings).
- **Department is pre-set and locked.** When creating from the department detail page, the `departmentId` is derived from the route param and pre-filled in both ActivityForm and MeetingForm. The department dropdown in ActivityForm should be **disabled** (not hidden — disabled shows context without allowing changes).

### Reuse Existing Components — Do NOT Reinvent

- **`ActivityForm`** (`components/activity/ActivityForm.tsx`): Reuse for activity creation from department detail. Pass `defaultValues={{ departmentId: currentDepartmentId }}`. The form already handles department-filtered display for ADMIN vs OWNER. Add a `lockDepartment?: boolean` prop to disable the department dropdown when creating from department context.
- **`TemplateSelector`** (`components/activity/TemplateSelector.tsx`): Reuse for step 1 of activity creation. No modifications needed.
- **`ConflictAlertDialog`** (`components/activity/ConflictAlertDialog.tsx`): Reuse for 409 conflict handling on update. Import directly.
- **`StaffingIndicator`** (`components/activity/StaffingIndicator.tsx`): Continue using for regular activity pipeline rows. NOT used for meetings.
- **`Badge`** (`components/ui/badge.tsx`): For special type tags on activities and "Réunion" label on meetings.
- **Adaptive Dialog/Sheet pattern** (AdminActivitiesPage lines 301-304): Copy the `FormWrapper = isMobile ? Sheet : Dialog` pattern for department detail modals.
- **`AlertDialog`** (`components/ui/alert-dialog.tsx`): For delete confirmation. Already installed.
- **`useIsMobile`** (`hooks/use-mobile.tsx`): For adaptive modal rendering.
- **`formatActivityDate`, `formatTime`** (`lib/dateFormatting`): For pipeline date/time display. Already used in DepartmentDetailPage.
- **Lucide icons**: `Plus`, `CalendarDays`, `Pencil`, `Trash2`, `Video`, `MapPin` — all from `lucide-react`.
- **`toast`** from `sonner`: For success/error notifications.

### Meeting Form Design

The `MeetingForm` is intentionally simpler than `ActivityForm`:

```
┌─────────────────────────────────────┐
│ Nouvelle réunion                     │
├─────────────────────────────────────┤
│ Titre ________________________     │
│ Description (optionnel) ______     │
│ Date    [____-__-__]               │
│ Début   [__:__]    Fin [__:__]     │
│                                     │
│ Type de réunion                     │
│ ○ Zoom  ● Physique                 │
│                                     │
│ ┌─ if Physical ──────────────────┐ │
│ │ Lieu    [Salle communautaire ] │ │
│ │ Adresse [123 rue Principale  ] │ │
│ └────────────────────────────────┘ │
│                                     │
│ ┌─ if Zoom ──────────────────────┐ │
│ │ Lien Zoom [https://zoom.us/j/]│ │
│ └────────────────────────────────┘ │
│                                     │
│          [Annuler] [Créer]          │
└─────────────────────────────────────┘
```

- **No template selection step** — meetings don't use templates
- **No role roster section** — meetings don't have service roles
- **No visibility toggle** — meetings default to `"authenticated"` (internal church meetings are not public)
- **No special type** — meetings are identified by `isMeeting: true`, not by special type
- **Department is hidden** — pre-set from the page context
- Use `watch("meetingType")` from React Hook Form for conditional field rendering
- Project uses **Zod v4.3.6** — `.superRefine()` and `.refine()` work identically to v3. Optionally, v4's `when` parameter in `.refine()` can simplify conditional checks, but `.superRefine()` is fine for consistency with existing schema patterns.

### Pipeline Row Branching

Activity pipeline rows in DepartmentDetailPage branch on `isMeeting`:

**Regular activity row (existing):**
```
[Mar 22 mar 2026  09:30] [Culte du Sabbat        ] [●] [Sainte-Cène] [✏️🗑️]
 ↑ date + time            ↑ title                  ↑    ↑ special      ↑ admin
                                              staffing   type badge    controls
```

**Meeting row (new):**
```
[Mar 25 mar 2026  19:00] [Réunion du comité      ] [📹 Zoom       ] [✏️🗑️]
 ↑ date + time            ↑ title                  ↑ meeting type   ↑ admin
                                                    + icon            controls
```

Or for physical meetings:
```
[Jeu 27 mar 2026  18:30] [Réunion de planification] [📍 Salle comm.] [✏️🗑️]
```

Use `Video` (lucide) icon for Zoom meetings, `MapPin` (lucide) icon for Physical. Show `locationName` truncated to ~20 chars. For Zoom meetings, show "Zoom" text (no link in pipeline — link visible in detail/edit form only for security per PRD: "No zoom links leak to anonymous users").

### Admin Controls Placement in Pipeline Rows

Edit/delete controls appear ONLY for users with management rights (`isAdminWithScope || isOwner`). They are positioned at the far right of each pipeline row, after the staffing indicator / meeting info:

```tsx
{canManage && (
  <div className="flex shrink-0 gap-1" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(activity)}>
      <Pencil className="h-3.5 w-3.5" />
    </Button>
    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => setDeleteTarget(activity)}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </div>
)}
```

**IMPORTANT**: The pipeline rows are wrapped in `<Link>`. The wrapping `<div>` must call BOTH `e.preventDefault()` AND `e.stopPropagation()` to prevent navigation when clicking management controls.

### Create Activity Flow from Department Detail

The flow mirrors AdminActivitiesPage but with department locked:

1. User clicks "Nouvelle activité" button
2. Modal opens with TemplateSelector (step 1)
3. User selects template → `setCreateStep("form")`
4. ActivityForm renders with `defaultValues={{ departmentId: currentDepartmentId }}` and `lockDepartment={true}`
5. User fills form → `createMutation.mutate(data)`
6. On success: invalidate queries, close modal, show toast

For "Nouvelle réunion":
1. User clicks "Nouvelle réunion" button
2. Modal opens with MeetingForm (single step)
3. Form auto-sets: `isMeeting: true`, `departmentId: currentDepartmentId`, `visibility: "authenticated"`
4. User fills title, date, time, meeting type + conditional fields
5. `createMutation.mutate({ ...data, isMeeting: true, departmentId, visibility: "authenticated" })`
6. On success: invalidate queries, close modal, show toast

### Edit Flow

1. User clicks pencil icon on pipeline row
2. Fetch full activity: `activityService.getById(id)`
3. Check `isMeeting`:
   - If `true` → open MeetingForm with pre-filled `defaultValues`
   - If `false` → open ActivityForm with pre-filled `defaultValues` (skip template step)
4. Submit → `updateMutation.mutate({ id, data: { ...formData, concurrencyToken } })`
5. Handle 409 via ConflictAlertDialog

### Delete Flow

1. User clicks trash icon → `setDeleteTarget(activity)`
2. AlertDialog opens: "Supprimer «{title}»? Cette action est irréversible."
3. User confirms → `deleteMutation.mutate(activity.id)`
4. On success: invalidate queries, close dialog, show toast

### Query Invalidation Strategy

On create/update/delete, invalidate these query keys:
- `["activities", { departmentId }]` — refreshes the pipeline list
- `["departments", "with-staffing"]` — aggregate staffing may change
- `["activity", activityId]` — (on update/delete) refreshes any cached detail
- `["activities"]` — invalidate admin page cache too (cross-page consistency)

### Migration Safety

The migration adds 5 columns:
- `IsMeeting` (bool, NOT NULL, DEFAULT false) — safe for existing rows
- `MeetingType` (varchar(20), NULL) — safe
- `ZoomLink` (varchar(500), NULL) — safe
- `LocationName` (varchar(150), NULL) — safe
- `LocationAddress` (varchar(300), NULL) — safe

No data migration needed. All existing activities remain as `IsMeeting = false` with all meeting fields null. The migration is fully backward-compatible.

### Backend Validation Rules (FluentValidation)

Add these rules to `Validators/CreateActivityRequestValidator.cs` and `Validators/UpdateActivityRequestValidator.cs` (NOT to the shared `Validators/ActivityValidationRules.cs` which operates on `IActivityRequest` and has no meeting fields):

```
When IsMeeting == true:
  - MeetingType REQUIRED, must be "zoom" or "physical"
  - Visibility MUST be "authenticated" (meetings cannot be public — security constraint)
  - Roles MUST be null or empty (meetings don't have roles)
  - When MeetingType == "zoom":
    - ZoomLink REQUIRED, must be valid URL (https://)
    - LocationName must be null
    - LocationAddress must be null
  - When MeetingType == "physical":
    - LocationName REQUIRED
    - LocationAddress optional
    - ZoomLink must be null

When IsMeeting == false (or null/omitted):
  - MeetingType must be null
  - ZoomLink must be null
  - LocationName must be null
  - LocationAddress must be null
  - Normal activity validation applies (existing shared rules via ActivityValidationRules.Apply())
```

### Anti-Patterns to Avoid

- Do NOT create a separate `Meeting` entity or `MeetingsController` — meetings are activities with extra fields in a unified pipeline.
- Do NOT show `StaffingIndicator` for meetings — meetings have no roles. Branch on `isMeeting` in the pipeline row template.
- Do NOT allow roles/template selection for meetings — the MeetingForm is intentionally role-free. `CreateAsync()` must skip role processing when `IsMeeting == true`.
- Do NOT expose Zoom links in the pipeline list view — only show "Zoom" text + icon. The link is visible in the edit form and activity detail page (both auth-protected). This prevents Zoom link leakage per PRD security requirements.
- Do NOT let the department dropdown change when creating from department context — pass `lockDepartment={true}` to disable it.
- Do NOT duplicate the Dialog/Sheet adaptive pattern — import the same approach from AdminActivitiesPage (or extract to a shared utility if the duplication is excessive).
- Do NOT forget `e.preventDefault()` + `e.stopPropagation()` on edit/delete button containers — the pipeline rows are `<Link>` elements. Without this, clicking edit/delete navigates away.
- Do NOT use `md:` breakpoint for responsive — use `sm:` (640px) per UX spec.
- Do NOT add "Nouvelle activité" or "Nouvelle réunion" buttons for VIEWER or ADMIN without scope — `canManage` flag must gate all management controls.
- Do NOT show meeting creation on the empty state CTA for VIEWERs — the encouraging empty state ("Prêt à planifier...") is admin-only and should offer both activity and meeting creation.
- Do NOT create meetings with `visibility: "public"` — the backend enforces `"authenticated"` for meetings. The MeetingForm hides the visibility toggle and defaults to "authenticated".
- Do NOT modify `Validators/ActivityValidationRules.cs` or `IActivityRequest.cs` for meeting fields — these are shared across all activity types. Meeting validation goes in the concrete validator files only.
- **Calendar note**: Meetings will automatically appear on `AuthCalendarPage` since they're Activity records. Calendar event blocks will render meetings identically to activities unless branching is added. This is acceptable for 8.2 scope — calendar meeting distinction is a future enhancement. The color coding (department color) still works since meetings have a departmentId.
- **Pipeline row complexity**: The `isMeeting` branching in pipeline rows adds conditional rendering. Consider extracting a `<PipelineRow>` component if the inline JSX becomes hard to read. This is optional but improves maintainability.

### Project Structure Notes

- New component: `src/sdamanagement-web/src/components/activity/MeetingForm.tsx` (follows existing activity component folder convention)
- New test: `src/sdamanagement-web/src/components/activity/MeetingForm.test.tsx`
- Modified page: `src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx` (major expansion — from read-only to full management)
- Modified test: `src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx` (add management control tests)
- Modified entity: `src/SdaManagement.Api/Data/Entities/Activity.cs` (5 new fields)
- Modified DTOs: `src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs`, `UpdateActivityRequest.cs`, `ActivityResponse.cs`, `ActivityListItem.cs`, `DashboardActivityItem.cs`
- **NOT modified**: `src/SdaManagement.Api/Dtos/Activity/IActivityRequest.cs` (meeting fields are NOT on the shared interface)
- Modified service: `src/SdaManagement.Api/Services/ActivityService.cs` (meeting field mapping + projection updates + dashboard projection)
- Modified validators: `src/SdaManagement.Api/Validators/CreateActivityRequestValidator.cs`, `UpdateActivityRequestValidator.cs` (meeting-specific FluentValidation rules)
- Modified context: `src/SdaManagement.Api/Data/AppDbContext.cs` (field constraints)
- New migration: `src/SdaManagement.Api/Data/Migrations/YYYYMMDD_AddMeetingFieldsToActivity.cs`
- Modified schema: `src/sdamanagement-web/src/schemas/activitySchema.ts` (meeting fields + conditional validation)
- Modified service: `src/sdamanagement-web/src/services/activityService.ts` (meeting field interfaces)
- Modified i18n: `src/sdamanagement-web/public/locales/en/common.json`, `fr/common.json`
- Modified test utils: `src/sdamanagement-web/src/test-utils.tsx`
- Modified MSW handlers: `src/sdamanagement-web/src/mocks/handlers/activities.ts`
- New integration tests: `tests/SdaManagement.Api.IntegrationTests/Activities/MeetingCrudEndpointTests.cs`
- Modified: `src/sdamanagement-web/src/components/activity/ActivityForm.tsx` (add `lockDepartment` prop to disable department dropdown)
- Modified: `src/sdamanagement-web/src/pages/ActivityDetailPage.tsx` (add meeting info rendering: Zoom link, location, meeting type badge)
- Modified test: `src/sdamanagement-web/src/pages/ActivityDetailPage.test.tsx` (meeting rendering tests)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 8, Story 8.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR44, FR46]
- [Source: _bmad-output/planning-artifacts/architecture.md#Project Context Analysis, Key Principles]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 3, Experience C]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Template Selection Cards]
- [Source: _bmad-output/implementation-artifacts/8-1-department-list-and-detail-view.md]
- [Source: src/SdaManagement.Api/Data/Entities/Activity.cs]
- [Source: src/SdaManagement.Api/Controllers/ActivitiesController.cs]
- [Source: src/SdaManagement.Api/Services/ActivityService.cs]
- [Source: src/SdaManagement.Api/Auth/AuthorizationService.cs]
- [Source: src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs]
- [Source: src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx]
- [Source: src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx]
- [Source: src/sdamanagement-web/src/components/activity/ActivityForm.tsx]
- [Source: src/sdamanagement-web/src/components/activity/RoleRosterEditor.tsx]
- [Source: src/sdamanagement-web/src/components/activity/ConflictAlertDialog.tsx]
- [Source: src/sdamanagement-web/src/services/activityService.ts]
- [Source: src/sdamanagement-web/src/schemas/activitySchema.ts]
- [Source: context7 — EF Core nullable properties auto-configure as optional columns]
- [Source: context7 — React Hook Form watch() for conditional field rendering]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Build lock issue: API process (PID 170380) blocked EF Core migration; killed process, retried successfully
- JSON serialization: Backend uses `WhenWritingNull` — integration tests updated to use `TryGetProperty` instead of `GetProperty().ValueKind == Null`

### Completion Notes List

- Meetings are implemented as Activity records with 5 extra nullable fields (IsMeeting, MeetingType, ZoomLink, LocationName, LocationAddress) — no separate entity
- Backend validation enforces meetings must have `visibility: "authenticated"` (defense-in-depth against Zoom link leakage)
- Created `IMeetingRequest` interface and `MeetingValidationRules` shared helper to DRY validation rules across Create/Update validators
- `IActivityRequest.cs` was NOT modified per story constraints
- DepartmentDetailPage expanded from read-only to full management: create activity, create meeting, edit, delete with adaptive Dialog/Sheet modals
- ActivityForm gained `lockDepartment` prop to disable department dropdown when creating from department context
- ActivityDetailPage branches on `isMeeting` to show meeting info (Zoom link, location) instead of roster
- Pipeline rows branch on `isMeeting` for visual distinction (Video/MapPin icons vs StaffingIndicator)
- All 389 backend integration tests pass (12 new meeting-specific tests)
- All 60 frontend test files pass (517 tests total, including new MeetingForm, DepartmentDetailPage, and ActivityDetailPage tests)

### Change Log

- 2026-03-18: Story 8.2 implementation — Department activity & meeting management. Added meeting fields to Activity entity, backend validation, frontend MeetingForm component, DepartmentDetailPage management enhancements, ActivityDetailPage meeting rendering, i18n keys, and comprehensive tests.

### File List

**New files:**
- src/SdaManagement.Api/Dtos/Activity/IMeetingRequest.cs
- src/SdaManagement.Api/Validators/MeetingValidationRules.cs
- src/SdaManagement.Api/Data/Migrations/*_AddMeetingFieldsToActivity.cs (migration + snapshot)
- src/sdamanagement-web/src/components/activity/MeetingForm.tsx
- src/sdamanagement-web/src/components/activity/MeetingForm.test.tsx
- tests/SdaManagement.Api.IntegrationTests/Activities/MeetingCrudEndpointTests.cs

**Modified files:**
- src/SdaManagement.Api/Data/Entities/Activity.cs (5 meeting fields added)
- src/SdaManagement.Api/Data/AppDbContext.cs (meeting field constraints)
- src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs (snapshot update for meeting fields)
- src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs (meeting fields + IMeetingRequest)
- src/SdaManagement.Api/Dtos/Activity/UpdateActivityRequest.cs (meeting fields + IMeetingRequest)
- src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs (meeting fields)
- src/SdaManagement.Api/Dtos/Activity/ActivityListItem.cs (meeting fields for pipeline)
- src/SdaManagement.Api/Dtos/Activity/DashboardActivityItem.cs (meeting fields)
- src/SdaManagement.Api/Services/ActivityService.cs (meeting field mapping, projection updates, role skip for meetings)
- src/SdaManagement.Api/Validators/CreateActivityRequestValidator.cs (meeting rules)
- src/SdaManagement.Api/Validators/UpdateActivityRequestValidator.cs (meeting rules)
- src/sdamanagement-web/src/schemas/activitySchema.ts (meeting fields + superRefine)
- src/sdamanagement-web/src/services/activityService.ts (meeting field interfaces)
- src/sdamanagement-web/src/components/activity/ActivityForm.tsx (lockDepartment prop)
- src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx (full management enhancement)
- src/sdamanagement-web/src/pages/ActivityDetailPage.tsx (meeting info rendering)
- src/sdamanagement-web/src/pages/DepartmentDetailPage.test.tsx (management control tests)
- src/sdamanagement-web/src/pages/ActivityDetailPage.test.tsx (meeting rendering tests)
- src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx (isMeeting: false on mocks)
- src/sdamanagement-web/src/mocks/handlers/activities.ts (meeting mock data + isMeeting field)
- src/sdamanagement-web/src/mocks/handlers/activityDetail.ts (isMeeting: false)
- src/sdamanagement-web/src/mocks/handlers/dashboard.ts (isMeeting: false)
- src/sdamanagement-web/public/locales/en/common.json (meeting i18n keys)
- src/sdamanagement-web/public/locales/fr/common.json (meeting i18n keys)
- src/sdamanagement-web/src/test-utils.tsx (meeting i18n keys)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status update)
- _bmad-output/implementation-artifacts/8-2-department-activity-and-meeting-management.md (story file)
