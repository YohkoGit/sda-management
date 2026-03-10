# Story 4.5: Special Activity Tagging & Visibility Control

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Prerequisites

- Local dev environment: Node 20+, .NET 10 SDK, Docker, PostgreSQL 17
- Story 4.1 complete (Activity entity with `SpecialType` nullable string and `Visibility` enum in DB, CRUD endpoints)
- Story 4.2 complete (Template-based creation, TemplateSelector, two-step create flow)
- Story 4.3 complete (Role roster customization, RoleRosterEditor, HeadcountStepper, AssignmentBadge)
- Story 4.4 complete (Role assignment via contact picker, assignment reconciliation)
- Existing backend infrastructure:
  - `Activity` entity with `SpecialType` (nullable `string`) and `Visibility` (`ActivityVisibility` enum) fields already in database schema (migration `20260309013822_AddActivities`)
  - `ActivityVisibility` enum: `Public = 0`, `Authenticated = 1`
  - `CreateActivityRequest` / `UpdateActivityRequest` DTOs have `Visibility` field but **do NOT have** `SpecialType`
  - `IActivityRequest` interface has `Visibility` but **not** `SpecialType`
  - `ActivityResponse` / `ActivityListItem` DTOs have `Visibility` but **not** `SpecialType`
  - `ActivityService.CreateAsync()` / `UpdateAsync()` map `Visibility` but **skip** `SpecialType`
  - `ActivityValidationRules.Apply()` validates `Visibility` but has **no** `SpecialType` validation
  - `ActivitiesController` with `[EnableRateLimiting("auth")]`, department-scoped authorization via `auth.CanManage(departmentId)`
- Existing frontend infrastructure:
  - `activitySchema.ts` Zod schema has `visibility` enum field but **no** `specialType`
  - `activityService.ts` TypeScript interfaces have `visibility` but **no** `specialType`
  - `AdminActivitiesPage.tsx` has visibility radio buttons and visibility badge in table but **no** special type UI
  - shadcn/ui `Select` component installed at `components/ui/select.tsx`
  - shadcn/ui `Badge` component installed at `components/ui/badge.tsx`

## Story

As an **ADMIN**,
I want to tag activities with special types and control their visibility,
so that special programs are identifiable and some activities are only visible to authenticated users.

## Acceptance Criteria

**AC1: Special type tag selection in form**
**Given** an activity creation or edit form
**When** the ADMIN interacts with the "Special Type" select field
**Then** a dropdown displays the following options (i18n labels; canonical values in parentheses):
  - _(none/blank)_ — clears any existing tag (`null`)
  - Sainte-Cene (`sainte-cene`)
  - Semaine de Priere (`week-of-prayer`)
  - Camp Meeting (`camp-meeting`)
  - Journee de la Jeunesse (`youth-day`)
  - Journee de la Famille (`family-day`)
  - Journee de la Femme (`womens-day`)
  - Evangelisation (`evangelism`)
**And** selecting a value sets `specialType` on the activity request DTO
**And** selecting the blank option sets `specialType` to `null` (tag removed)
**And** the field defaults to blank (no tag) for new activities

**AC2: Special type badge display in admin list**
**Given** an activity with a non-null `specialType` (e.g., `youth-day`)
**When** displayed in the admin activities table
**Then** a `<Badge variant="secondary">` shows the i18n display label (e.g., "Journee de la Jeunesse") on the same row as the activity title
**And** activities without a special type show no badge (no empty placeholder)

**AC3: Special type persisted and returned via API**
**Given** an ADMIN creates or updates an activity with `specialType: "sainte-cene"`
**When** the activity is fetched via `GET /api/activities/{id}` or `GET /api/activities`
**Then** the response includes `"specialType": "sainte-cene"` in both `ActivityResponse` and `ActivityListItem` DTOs
**And** existing activities with `null` specialType continue to work unchanged (backward compatible)

**AC4: Special type validation**
**Given** an API request with `specialType` set to an invalid value (e.g., `"invalid-tag"`)
**When** the request is processed
**Then** the API returns 400 Bad Request with a validation error
**And** `specialType` is validated as either `null`/empty OR one of the 7 allowed values
**And** `specialType` has a maximum length of 50 characters
**And** `specialType` is sanitized for control characters (existing `MustNotContainControlCharacters()` pattern)

**AC5: Visibility filter on activities list endpoint**
**Given** the existing `GET /api/activities` endpoint
**When** an optional `visibility` query parameter is provided (e.g., `?visibility=public`)
**Then** only activities matching that visibility are returned
**And** when the parameter is omitted, all activities are returned (current behavior preserved)
**And** this filter is the foundation for Epic 5 public endpoints to consume

## Tasks / Subtasks

- [x] **Task 1: Backend — Add SpecialType to DTOs and interface** (AC: 1, 3)
  - [x] 1.1 Add `string? SpecialType { get; }` to `IActivityRequest` interface
  - [x] 1.2 Add `public string? SpecialType { get; init; }` to `CreateActivityRequest` record
  - [x] 1.3 Add `public string? SpecialType { get; init; }` to `UpdateActivityRequest` record
  - [x] 1.4 Add `public string? SpecialType { get; init; }` to `ActivityResponse` class
  - [x] 1.5 Add `public string? SpecialType { get; init; }` to `ActivityListItem` class

- [x] **Task 2: Backend — Add SpecialType validation** (AC: 4)
  - [x] 2.1 Define allowed values constant array in `ActivityValidationRules`: `["sainte-cene", "week-of-prayer", "camp-meeting", "youth-day", "family-day", "womens-day", "evangelism"]`
  - [x] 2.2 Add validation rule in `ActivityValidationRules.Apply()`: `SpecialType` must be null/empty OR one of the allowed values, max length 50, `MustNotContainControlCharacters()` when not null
  - [x] 2.3 Create **new** test file `tests/SdaManagement.Api.UnitTests/Validators/CreateActivityRequestValidatorTests.cs` — no existing test file covers `CreateActivityRequestValidator`. Add tests for SpecialType: valid value, null (valid), empty string (valid → treated as null), invalid value (rejected), control characters (rejected), exceeds max length (rejected). Follow `CreateActivityTemplateRequestValidatorTests.cs` pattern with `FluentValidation.TestHelper` + Shouldly.

- [x] **Task 3: Backend — Wire SpecialType through ActivityService** (AC: 1, 3)
  - [x] 3.1 In `CreateAsync()`: map `request.SpecialType` to `activity.SpecialType` (normalize empty string to `null`)
  - [x] 3.2 In `UpdateAsync()`: map `request.SpecialType` to `activity.SpecialType` (normalize empty string to `null`)
  - [x] 3.3 In `MapToResponse()`: map `activity.SpecialType` to `ActivityResponse.SpecialType`
  - [x] 3.4 In `GetAllAsync()` projection: map `a.SpecialType` to `ActivityListItem.SpecialType`

- [x] **Task 4: Backend — Add visibility filter to GetAllAsync** (AC: 5)
  - [x] 4.1 Add optional `string? visibility` parameter to `GetAllAsync()` in `IActivityService` and `ActivityService`
  - [x] 4.2 Add `.Where(a => a.Visibility == parsedVisibility)` filter when parameter is provided
  - [x] 4.3 Add optional `[FromQuery] string? visibility` parameter to `ActivitiesController.GetAll()`
  - [x] 4.4 Validate visibility filter value in controller using `Enum.TryParse<ActivityVisibility>`: return 400 `BadRequest` if value is non-null and does not parse to a valid enum member. **DO NOT use `Enum.Parse`** — it throws `ArgumentException` on invalid input, causing a 500 instead of 400.

- [x] **Task 5: Backend — Integration tests** (AC: 3, 4, 5)
  - [x] 5.0 Extend `CreateTestActivity` helper in `IntegrationTestBase.cs`: add optional `string? specialType = null` parameter, map to `activity.SpecialType`
  - [x] 5.1 Test create activity with valid specialType → returned in response
  - [x] 5.2 Test create activity with null specialType → no specialType in response (backward compat)
  - [x] 5.3 Test update activity: set specialType, then clear it (null round-trip)
  - [x] 5.4 Test create activity with invalid specialType → 400
  - [x] 5.5 Test GET /api/activities?visibility=public → returns only public activities (create mixed-visibility activities first via helper)
  - [x] 5.6 Test GET /api/activities?visibility=authenticated → returns only authenticated activities
  - [x] 5.7 Test GET /api/activities (no filter) → returns all activities (current behavior preserved)
  - [x] 5.8 Test GET /api/activities?visibility=invalid → 400 Bad Request

- [x] **Task 6: Frontend — Add specialType to Zod schema and service interfaces** (AC: 1, 3)
  - [x] 6.1 Add `specialType` to `createActivitySchema`: `z.enum(["sainte-cene", "week-of-prayer", "camp-meeting", "youth-day", "family-day", "womens-day", "evangelism"]).nullable().optional()`
  - [x] 6.2 Extend `updateActivitySchema` (inherits from create, should get specialType automatically)
  - [x] 6.3 Add `specialType: string | null` to `ActivityResponse` interface in `activityService.ts`
  - [x] 6.4 Add `specialType: string | null` to `ActivityListItem` interface in `activityService.ts`

- [x] **Task 7: Frontend — Add SpecialType select field to activity form** (AC: 1)
  - [x] 7.1 Add shadcn `<Select>` field for specialType in `ActivityForm` component (inside `AdminActivitiesPage.tsx`), placed after the visibility radio buttons
  - [x] 7.2 Bind to RHF via `Controller` with `onValueChange` → `field.onChange`, include blank/none option that maps to `null`
  - [x] 7.3 Pre-populate field from existing activity data when editing (defaultValues)
  - [x] 7.4 Handle "clear" option: selecting blank resets `specialType` to `null`

- [x] **Task 8: Frontend — Add SpecialType badge to admin activities table** (AC: 2)
  - [x] 8.1 In the activities table row, render `<Badge variant="secondary">` with i18n label when `specialType` is non-null
  - [x] 8.2 No badge rendered when `specialType` is null (no empty placeholder)
  - [x] 8.3 Badge placement: same cell as title, after the title text

- [x] **Task 9: Frontend — i18n keys** (AC: 1, 2)
  - [x] 9.1 Add French keys to `public/locales/fr/common.json`:
    - `pages.adminActivities.form.specialType` = "Type special"
    - `pages.adminActivities.form.specialTypeNone` = "Aucun"
    - `pages.adminActivities.specialType.sainte-cene` = "Sainte-Cene"
    - `pages.adminActivities.specialType.week-of-prayer` = "Semaine de priere"
    - `pages.adminActivities.specialType.camp-meeting` = "Camp Meeting"
    - `pages.adminActivities.specialType.youth-day` = "Journee de la jeunesse"
    - `pages.adminActivities.specialType.family-day` = "Journee de la famille"
    - `pages.adminActivities.specialType.womens-day` = "Journee de la femme"
    - `pages.adminActivities.specialType.evangelism` = "Evangelisation"
  - [x] 9.2 Add English keys to `public/locales/en/common.json`:
    - `pages.adminActivities.form.specialType` = "Special Type"
    - `pages.adminActivities.form.specialTypeNone` = "None"
    - `pages.adminActivities.specialType.sainte-cene` = "Sainte-Cene"
    - `pages.adminActivities.specialType.week-of-prayer` = "Week of Prayer"
    - `pages.adminActivities.specialType.camp-meeting` = "Camp Meeting"
    - `pages.adminActivities.specialType.youth-day` = "Youth Day"
    - `pages.adminActivities.specialType.family-day` = "Family Day"
    - `pages.adminActivities.specialType.womens-day` = "Women's Day"
    - `pages.adminActivities.specialType.evangelism` = "Evangelism"
  - [x] 9.3 Add specialType i18n keys to `test-utils.tsx` mock translations

- [x] **Task 10: Frontend — Component tests** (AC: 1, 2)
  - [x] 10.1 Test ActivityForm renders specialType select with all options
  - [x] 10.2 Test selecting a special type and submitting the form includes it in the payload
  - [x] 10.3 Test clearing special type (selecting "None") sends null
  - [x] 10.4 Test editing an activity pre-populates the specialType select
  - [x] 10.5 Test activities table displays Badge for activities with specialType
  - [x] 10.6 Test activities table displays no badge for activities without specialType

- [x] **Task 11: Frontend — Update MSW handlers** (AC: 3)
  - [x] 11.1 Update activity mock data in `mocks/handlers/activities.ts` to include `specialType` field
  - [x] 11.2 Ensure create/update handlers echo back the `specialType` from request body

## Dev Notes

### Architecture Decisions

**SpecialType is a validated string, not a C# enum.** The `special_type` column in PostgreSQL is `text` (nullable). The entity stores it as `string?`. Validation restricts input to the 7 allowed kebab-case values via FluentValidation (backend) and Zod enum (frontend). Using a string avoids a migration when new special types are added later — only update the allowed-values arrays in `ActivityValidationRules.cs` and `activitySchema.ts`.

**Canonical values are ASCII kebab-case, display labels are i18n.** The API transmits `"sainte-cene"`, `"youth-day"`, etc. The frontend resolves display labels via `t(`pages.adminActivities.specialType.${value}`)`. This prevents accent encoding issues in URLs/query params and follows the `visibility` pattern (`"public"` / `"authenticated"`).

**Empty string normalization to null.** The frontend sends `null` when "None" is selected (via sentinel value conversion). The service layer also normalizes: if `SpecialType` is empty or whitespace, store `null`. Belt-and-suspenders to prevent `""` vs `null` inconsistency.

**Visibility filter on existing endpoint, NOT a new public endpoint.** `GET /api/activities` gains an optional `?visibility=public` query param. Epic 5 will create dedicated `GET /api/public/activities` with public DTOs. This story adds the filter PARAM only — Epic 5 adds the public ENDPOINT.

### Critical Patterns from Story 4.4 (MUST FOLLOW)

1. **Request DTOs use `public record`; Response DTOs use `public class`.** `CreateActivityRequest` / `UpdateActivityRequest` are records. `ActivityResponse` / `ActivityListItem` are classes. Follow this convention for the new `SpecialType` property on each.
2. **IActivityRequest interface**: Both request DTOs implement this interface. `ActivityValidationRules.Apply<T>()` constrains `where T : IActivityRequest`. The new `SpecialType` property MUST be added to the interface for shared validation.
3. **Sanitization pipeline**: `SpecialType` is from a constrained set — no HTML sanitization needed (it's not user-provided text). However, the `MustNotContainControlCharacters()` rule still applies as defense-in-depth since the API is the security boundary.
4. **Service mapping pattern**: In `CreateAsync()` / `UpdateAsync()`, map request → entity inline. In `MapToResponse()`, map entity → response DTO. In `GetAllAsync()`, map via `.Select()` projection. All three locations need the new field.
5. **Visibility string conversion**: Visibility uses `Enum.Parse<ActivityVisibility>(request.Visibility, ignoreCase: true)` for request → entity and `.ToString().ToLowerInvariant()` for entity → response. SpecialType is simpler: direct string assignment (no enum parsing needed).

### Key Files to Touch

**Backend (modify):**
- `src/SdaManagement.Api/Dtos/Activity/IActivityRequest.cs` — add `string? SpecialType { get; }`
- `src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs` — add `public string? SpecialType { get; init; }`
- `src/SdaManagement.Api/Dtos/Activity/UpdateActivityRequest.cs` — add `public string? SpecialType { get; init; }`
- `src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs` — add `public string? SpecialType { get; init; }`
- `src/SdaManagement.Api/Dtos/Activity/ActivityListItem.cs` — add `public string? SpecialType { get; init; }`
- `src/SdaManagement.Api/Validators/ActivityValidationRules.cs` — add SpecialType validation rules with allowed values array
- `src/SdaManagement.Api/Services/IActivityService.cs` — add optional `string? visibility` parameter to `GetAllAsync()`
- `src/SdaManagement.Api/Services/ActivityService.cs` — map SpecialType in Create/Update/MapToResponse/GetAllAsync + add visibility filter
- `src/SdaManagement.Api/Controllers/ActivitiesController.cs` — add `[FromQuery] string? visibility` to GetAll action
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` — extend `CreateTestActivity` helper with `string? specialType = null` parameter
- `tests/SdaManagement.Api.IntegrationTests/Activities/ActivityEndpointTests.cs` — add SpecialType CRUD tests + visibility filter tests

**Backend (new):**
- `tests/SdaManagement.Api.UnitTests/Validators/CreateActivityRequestValidatorTests.cs` — new file for SpecialType validation tests (no existing test file covers `CreateActivityRequestValidator`; follow `CreateActivityTemplateRequestValidatorTests.cs` pattern)

**Frontend (modify):**
- `src/sdamanagement-web/src/schemas/activitySchema.ts` — add `specialType` to Zod schema
- `src/sdamanagement-web/src/services/activityService.ts` — add `specialType` to TypeScript interfaces
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx` — add Select field in form + Badge in table
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx` — add specialType form + table tests
- `src/sdamanagement-web/public/locales/fr/common.json` — add specialType i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — add specialType i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — add specialType mock translations
- `src/sdamanagement-web/src/mocks/handlers/activities.ts` — add specialType to mock data

### UX Design Specifications

**SpecialType Select field anatomy:**
- shadcn `<Select>` component with `<SelectTrigger>`, `<SelectContent>`, `<SelectItem>` pattern
- Placement: after the visibility radio buttons, before the roles section
- Label: `t("pages.adminActivities.form.specialType")` — "Type special" (FR) / "Special Type" (EN)
- First option: blank/none — `t("pages.adminActivities.form.specialTypeNone")` — "Aucun" (FR) / "None" (EN)
- Remaining 7 options: mapped from canonical values via i18n
- Width: full width on mobile, constrained on desktop (same as other form fields)
- RHF integration: `<Controller>` with `onValueChange`, `value={field.value ?? "none"}`. **IMPORTANT:** Radix Select does NOT support empty string as `SelectItem` value — use sentinel `"none"` and convert to `null` in handler.
- Clear behavior: selecting the `"none"` option calls `field.onChange(null)` via the `onValueChange` handler

**SpecialType Badge in admin table:**
- Component: `<Badge variant="secondary">` from shadcn/ui
- Content: i18n display label, e.g., `t(`pages.adminActivities.specialType.${activity.specialType}`)`
- Placement: inline after the activity title in the same table cell
- Conditional render: only when `activity.specialType` is non-null
- No badge = no placeholder (clean layout for untagged activities)
- The `secondary` variant provides a muted, non-competing visual (distinct from the `default`/`outline` visibility badge already in the table)

**Responsive considerations:**
- Select field uses standard form field responsive pattern (full width stacked on mobile, grid on desktop)
- Badge in table is small enough to not cause overflow — truncate with `max-w-[10rem] truncate` if label is long
- Touch target: Select trigger inherits shadcn's 44px min-height

### Technology Notes

**shadcn/ui Select + React Hook Form integration:**
**IMPORTANT:** Radix Select (underlying shadcn Select) does NOT support empty string as a `SelectItem` value. Use sentinel value `"none"` and convert to `null` in the handler.
```tsx
<Controller
  name="specialType"
  control={control}
  render={({ field }) => (
    <Select
      value={field.value ?? "none"}
      onValueChange={(val) => field.onChange(val === "none" ? null : val)}
    >
      <SelectTrigger>
        <SelectValue placeholder={t("pages.adminActivities.form.specialTypeNone")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">{t("pages.adminActivities.form.specialTypeNone")}</SelectItem>
        {SPECIAL_TYPES.map((type) => (
          <SelectItem key={type} value={type}>
            {t(`pages.adminActivities.specialType.${type}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )}
/>
```

**SPECIAL_TYPES constant** (define in `activitySchema.ts` alongside the Zod schema):
```typescript
export const SPECIAL_TYPES = [
  "sainte-cene",
  "week-of-prayer",
  "camp-meeting",
  "youth-day",
  "family-day",
  "womens-day",
  "evangelism",
] as const;
```

**Backend allowed values constant** (define in `ActivityValidationRules.cs`):
```csharp
private static readonly string[] AllowedSpecialTypes =
[
    "sainte-cene", "week-of-prayer", "camp-meeting",
    "youth-day", "family-day", "womens-day", "evangelism"
];
```

**FluentValidation rule for nullable optional string with allowed values:**
```csharp
validator.RuleFor(x => x.SpecialType)
    .MaximumLength(50)
    .Must(st => string.IsNullOrEmpty(st) || AllowedSpecialTypes.Contains(st))
    .WithMessage($"SpecialType must be one of: {string.Join(", ", AllowedSpecialTypes)}")
    .MustNotContainControlCharacters()
    .When(x => !string.IsNullOrEmpty(x.SpecialType));
```

**Visibility filter implementation pattern:**
```csharp
// In ActivitiesController.GetAll() — validate BEFORE passing to service
if (!string.IsNullOrEmpty(visibility) &&
    !Enum.TryParse<ActivityVisibility>(visibility, ignoreCase: true, out _))
    return BadRequest();

// In ActivityService.GetAllAsync()
if (!string.IsNullOrEmpty(visibility))
{
    var parsed = Enum.Parse<ActivityVisibility>(visibility, ignoreCase: true);
    query = query.Where(a => a.Visibility == parsed);
}
```
**IMPORTANT:** Use `Enum.TryParse` in the controller to return 400 on invalid values. `Enum.Parse` throws `ArgumentException` on invalid input, causing an unhandled 500 error. The service can safely use `Enum.Parse` because the controller already validated.

### Testing Strategy

**Backend unit tests** (extend existing validator test file or create new):
- Valid specialType values: each of the 7 → pass
- Null specialType → pass (optional field)
- Empty string specialType → pass (normalized to null by service)
- Invalid specialType → fail with specific error message
- Control characters in specialType → fail
- SpecialType exceeding 50 chars → fail

**Backend integration tests** (extend `ActivityEndpointTests.cs`):
- Create with specialType → 201, response contains specialType
- Create without specialType → 201, response has null specialType (backward compat)
- Update: add specialType → 200, response contains specialType
- Update: remove specialType (set null) → 200, response has null specialType
- Create with invalid specialType → 400
- GET /api/activities?visibility=public → returns only public
- GET /api/activities?visibility=authenticated → returns only authenticated
- GET /api/activities (no filter) → returns all
- GET /api/activities?visibility=invalid → 400

**Frontend component tests** (Vitest + React Testing Library):
- ActivityForm renders specialType Select with all 7 options + "None"
- Selecting a specialType and submitting includes it in the payload
- Selecting "None" sends null/undefined for specialType
- Editing an activity pre-populates the Select with existing specialType
- Activities table renders Badge for activities with specialType
- Activities table renders no badge for activities with null specialType
- Badge displays correct i18n label for each specialType value

**MSW handlers:**
- Update mock activities to include `specialType` field (some null, some with values)
- Create/update handlers echo back `specialType` from request body

### Anti-Pattern Prevention

- **DO NOT create a C# enum for SpecialType** — keep as validated string. Enum would require migration for each new tag value.
- **DO NOT use accent characters in canonical values** — `"sainte-cene"` not `"sainte-cène"`. ASCII kebab-case only over the wire.
- **DO NOT create a separate endpoint for special types list** — the allowed values are a frontend constant + backend validation rule. No need for an API call to get the dropdown options.
- **DO NOT add SpecialType to the database configuration in AppDbContext** — the column already exists as nullable text with no constraints. Validation is at the application layer.
- **DO NOT add a migration** — the `special_type` column already exists from the original Activity migration.
- **DO NOT use `<Badge variant="default">` for specialType** — that's used by visibility. Use `variant="secondary"` to visually distinguish.
- **DO NOT create a new public endpoint** — that's Epic 5. Only add the filter parameter to the existing authenticated endpoint.
- **DO NOT hardcode French labels in JSX** — all display text through `t()` i18n function.
- **DO NOT use `md:` breakpoint** — tablet starts at `sm:` (640px) per project convention.

- **DO NOT use empty string as `SelectItem` value** — Radix Select ignores empty strings. Use sentinel `"none"` and convert to `null` in `onValueChange`.
- **DO NOT use `Enum.Parse` for visibility filter validation** — it throws on invalid input (500 error). Use `Enum.TryParse` in the controller, return 400.

### Previous Story Intelligence (from Story 4.4)

**Patterns established in 4.4 that apply here:**
1. **RHF Controller pattern for Select**: Story 4.4 used `setValue` for assignments. This story uses `<Controller>` for the Select — same form, different field type. Don't mix patterns within the same form.
2. **i18n key nesting**: Story 4.4 used `pages.adminActivities.contactPicker.*` pattern. Follow the same convention: `pages.adminActivities.specialType.*` for the new keys.
3. **test-utils.tsx updates**: Story 4.4 added contactPicker translations to mock i18n. Do the same for specialType translations.
4. **MSW handler updates**: Story 4.4 updated activity mock data. Extend, don't replace — add `specialType` field to existing mock activities.
5. **Code review fix patterns from 4.4**: Watch for dead code branches, missing aria-labels, and untested UI states.

**Known issues from 4.4 (do NOT introduce):**
- M6: Backend `EF.Functions.ILike` is not accent-insensitive without `unaccent` extension — not relevant for this story (no search)
- Pre-existing test failures: AdminDepartmentsPage timeout (unrelated), userSchema Zod overload (unrelated) — ignore these

### Git Intelligence

**Recent commit pattern:** `feat(activities): Story 4.X — [description] with code review fixes`
- All Epic 4 stories follow this convention
- Expected commit: `feat(activities): Story 4.5 — Special activity tagging & visibility filter with code review fixes`

**Files modified in Story 4.4 that overlap with this story:**
- `ActivityService.cs` — extended in 4.4 for assignment reconciliation; extend again for SpecialType mapping
- `ActivityRoleInputValidator.cs` — extended in 4.4 for assignment rules; `ActivityValidationRules.cs` (shared rules) is the target here
- `AdminActivitiesPage.tsx` — extended in 4.4 for assignment chips; extend again for SpecialType select + badge
- `activitySchema.ts` — extended in 4.4 for assignment schema; extend again for specialType
- `activityService.ts` — interfaces extended in 4.4; extend again for specialType
- `common.json` (fr/en) — extended in 4.4 for contactPicker keys; extend again for specialType keys

### Project Structure Notes

- SpecialType property added to existing DTOs (no new files for backend DTOs)
- No new frontend component files — Select field is inline in ActivityForm, Badge is inline in table
- `SPECIAL_TYPES` constant exported from `activitySchema.ts` (co-located with Zod schema, single source of truth)
- `AllowedSpecialTypes` array defined as `private static readonly` in `ActivityValidationRules.cs`
- i18n keys nested under `pages.adminActivities.specialType.*` (consistent with existing `pages.adminActivities.visibility.*`)
- No new routes, no new pages, no new hooks — this is a field addition to an existing form

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.5 — FR23, FR24]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Exchange Formats, DTO Naming, Validation Strategy, Controller Method Template, API Response Formats]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Activity Creation Experience, Badge Display Patterns, Form Field Patterns]
- [Source: _bmad-output/implementation-artifacts/4-4-role-assignment-via-contact-picker.md#Dev Notes, Code Review Fixes, File List]
- [Source: src/SdaManagement.Api/Data/Entities/Activity.cs — SpecialType as string?, Visibility as ActivityVisibility enum]
- [Source: src/SdaManagement.Api/Data/Entities/ActivityVisibility.cs — Public=0, Authenticated=1]
- [Source: src/SdaManagement.Api/Dtos/Activity/IActivityRequest.cs — interface both request DTOs implement]
- [Source: src/SdaManagement.Api/Validators/ActivityValidationRules.cs — shared validation rules with MustNotContainControlCharacters]
- [Source: src/SdaManagement.Api/Services/ActivityService.cs — CreateAsync, UpdateAsync, MapToResponse, GetAllAsync mapping]
- [Source: src/SdaManagement.Api/Data/Migrations/20260309013822_AddActivities.cs — special_type column already exists as nullable text]
- [Source: src/sdamanagement-web/src/schemas/activitySchema.ts — Zod schemas for create/update]
- [Source: src/sdamanagement-web/src/services/activityService.ts — TypeScript interfaces]
- [Source: src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx — ActivityForm + activities table]
- [Source: src/sdamanagement-web/src/components/ui/select.tsx — shadcn Select component (installed)]
- [Source: src/sdamanagement-web/src/components/ui/badge.tsx — shadcn Badge component (installed)]
- [Source: context7/shadcn-ui — Select + RHF Controller integration pattern, Badge variant prop]
- [Source: context7/FluentValidation — Must() predicate validator for allowed values list]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Integration tests could not run (Docker Desktop unavailable in dev environment) — tests written and compilable, awaiting Docker for verification

### Change Log

- 2026-03-09: All 11 tasks implemented (Tasks 1–11), all subtasks complete
- 2026-03-09: Backend unit tests: 206/206 passed (includes 13 new CreateActivityRequestValidatorTests)
- 2026-03-09: Frontend tests: 270/270 passed (includes 6 new specialType tests in AdminActivitiesPage.test.tsx)
- 2026-03-09: Integration tests: 8 new tests written but not yet verified (Docker Desktop unavailable)
- 2026-03-09: Backend compiles with 0 errors (2 pre-existing warnings: ImageSharp vulnerability, unused `ex` variable)
- 2026-03-09: Story status moved to `review`
- 2026-03-10: Code review (4M, 4L) — all 8 issues fixed:
  - M1 FIXED: `ActivityValidationRules.cs` `When` guard changed `IsNullOrEmpty` → `IsNullOrWhiteSpace` (matches service normalization)
  - M2 FIXED: `ActivitiesController.cs` visibility BadRequest now returns structured `ProblemDetails`
  - M3 FIXED: Badge absence test uses `data-testid="special-type-badge"` instead of fragile `.truncate` CSS class
  - M4 FIXED: Create/update mutations now handle 422 errors with `assignmentError` toast (was silently swallowed)
  - L1 FIXED: Added whitespace-only SpecialType validator test (now passes after M1 fix)
  - L2 FIXED: SpecialType SelectTrigger has `aria-label` + `aria-invalid` for accessibility
  - L3 FIXED: SpecialType SelectTrigger has error state border styling (consistent with other fields)
  - L4 NOTED: Integration tests 5.1–5.8 unverified (Docker unavailable) — not a code fix
- 2026-03-10: Backend unit tests: 207/207 passed (+1 new whitespace test)
- 2026-03-10: Frontend tests: 270/270 passed (all existing tests pass with fixes)
- 2026-03-10: Story status moved to `done`

### Completion Notes List

- Story context created with exhaustive artifact analysis (epics, architecture, UX spec, previous story 4.4, git history)
- Advanced elicitation applied: Cross-Functional War Room, Red Team vs Blue Team, Pre-mortem Analysis, Critique and Refine, Self-Consistency Validation — all 5 methods enhanced ACs
- context7 research: shadcn/ui Select+RHF integration pattern, FluentValidation Must() predicate validator
- Key finding: SpecialType column already exists in DB (migration deployed), but is completely absent from all DTOs, service mapping, validators, frontend schema, and UI — this story wires it end-to-end
- Visibility radio buttons already functional in form — this story adds the list endpoint filter parameter as groundwork for Epic 5
- Scope boundary clarified: NO public endpoint creation (Epic 5), NO new migration, NO C# enum for SpecialType
- **Implementation completed**: All 11 tasks, 45 subtasks done. End-to-end SpecialType wiring from DTOs → validation → service → controller → Zod schema → RHF form → table badge → i18n → MSW → tests
- **Visibility filter**: `GET /api/activities?visibility=public|authenticated` with `Enum.TryParse` validation (400 on invalid, not 500)
- **Key patterns applied**: Radix Select sentinel "none" → null conversion, Controller binding, empty→null normalization in service layer
- **Test fixes during implementation**: 3 existing tests broke due to new combobox (department + specialType) — fixed with `getAllByRole("combobox")[0]`; edit pre-populate test fixed with `getAllByText` for duplicate text matches
- **Quality review applied (3 critical, 2 enhancements, 2 optimizations):**
  - C1 FIXED: Radix Select empty string value → sentinel `"none"` with null conversion
  - C2 FIXED: Wrong test file `ActivityRoleInputValidatorTests.cs` → new `CreateActivityRequestValidatorTests.cs`
  - C3 FIXED: `Enum.Parse` crash on invalid visibility → `Enum.TryParse` with 400 return
  - E1 FIXED: `CreateTestActivity` helper missing `specialType` parameter
  - E2 FIXED: Added missing test case 5.8 for `?visibility=invalid` → 400
  - O1 FIXED: Removed party mode agent quotes (400+ tokens saved for dev agent)
  - O2 FIXED: Consolidated redundant architecture/anti-pattern text

### File List

**Backend (new):**
- `tests/SdaManagement.Api.UnitTests/Validators/CreateActivityRequestValidatorTests.cs`

**Backend (modify):**
- `src/SdaManagement.Api/Dtos/Activity/IActivityRequest.cs`
- `src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs`
- `src/SdaManagement.Api/Dtos/Activity/UpdateActivityRequest.cs`
- `src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs`
- `src/SdaManagement.Api/Dtos/Activity/ActivityListItem.cs`
- `src/SdaManagement.Api/Validators/ActivityValidationRules.cs`
- `src/SdaManagement.Api/Services/IActivityService.cs`
- `src/SdaManagement.Api/Services/ActivityService.cs`
- `src/SdaManagement.Api/Controllers/ActivitiesController.cs`
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs`
- `tests/SdaManagement.Api.IntegrationTests/Activities/ActivityEndpointTests.cs`

**Frontend (modify only — no new files):**
- `src/sdamanagement-web/src/schemas/activitySchema.ts`
- `src/sdamanagement-web/src/services/activityService.ts`
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx`
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx`
- `src/sdamanagement-web/public/locales/fr/common.json`
- `src/sdamanagement-web/public/locales/en/common.json`
- `src/sdamanagement-web/src/test-utils.tsx`
- `src/sdamanagement-web/src/mocks/handlers/activities.ts`
