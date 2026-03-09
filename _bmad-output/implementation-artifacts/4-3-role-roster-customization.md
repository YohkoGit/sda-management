# Story 4.3: Role Roster Customization

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Prerequisites

- Local dev environment: Node 20+, .NET 10 SDK, Docker, PostgreSQL 17
- Story 4.1 complete (Activity, ActivityRole, RoleAssignment entities, CRUD, cascade deletes)
- Story 4.2 complete (Template-based creation, TemplateSelector, two-step create flow)
- Existing backend infrastructure:
  - `ActivityService` / `IActivityService` with `CreateAsync`, `UpdateAsync`, `GetByIdAsync`, `DeleteAsync`
  - `ActivitiesController` with full CRUD endpoints + optimistic concurrency (409 on stale xmin)
  - `ActivityValidationRules` shared between Create/Update validators
  - `CreateActivityRequest` with optional `TemplateId`
  - `UpdateActivityRequest` with `ConcurrencyToken`
  - `ActivityRoleResponse` DTO with `Id`, `RoleName`, `Headcount`, `SortOrder`, `Assignments`
  - `RoleAssignmentResponse` DTO with `Id`, `UserId`, `FirstName`, `LastName`, `AvatarUrl`
  - `IntegrationTestBase` helpers: `CreateTestUser()`, `AssignDepartmentToUser()`, `CreateTestActivity(roles: [...])`, `CreateTestActivityTemplate()`
- Existing frontend infrastructure:
  - `AdminActivitiesPage.tsx` with two-step create flow (TemplateSelector -> ActivityForm) and edit Dialog/Sheet
  - `TemplateSelector.tsx` component
  - `activityService.ts` with `create()`, `update()`, `getById()`, `delete()` methods
  - `activitySchema.ts` with `createActivitySchema`, `updateActivitySchema`, inferred types
  - `activityTemplateService.ts` with template types (`ActivityTemplateListItem`, `TemplateRoleResponse`)
  - Existing shadcn/ui components: Dialog, Sheet, Select, Badge, Input, Textarea, Label, Skeleton, Table, AlertDialog, Button
  - React Hook Form 7.x + Zod 4.x + @hookform/resolvers 5.x
  - TanStack Query v5 for server state
  - i18next for i18n (French primary, English secondary)
  - MSW mock handlers in `mocks/handlers/activities.ts`

## Story

As an **ADMIN**,
I want to add, remove, and change headcounts for service roles on any activity,
So that I can adapt the roster for special programs (e.g., adding "Musique Speciale" for Women's Day, expanding diaconesses for Sainte-Cene).

## Acceptance Criteria

1. **Given** an activity with pre-populated roles from a template
   **When** the ADMIN adds a new role "Musique Speciale" with headcount 3
   **Then** the role is added to the activity's roster with sort_order after existing roles
   **And** the role appears in the roster with 0/3 assigned indicator

2. **Given** an activity with a "Diacres" role at headcount 2
   **When** the ADMIN changes the headcount to 4
   **Then** the headcount is updated and the UI reflects 4 slots

3. **Given** an activity with role "Annonces" that has no assignments
   **When** the ADMIN removes the role
   **Then** the activity_role is deleted

4. **Given** an activity with role "Predicateur" that has an assignment
   **When** the ADMIN removes the role
   **Then** a confirmation warns that removing will also remove the assignment
   **And** on confirmation, the activity_role and its role_assignments are cascade-deleted

5. **Given** the role roster
   **When** displayed on mobile (375px)
   **Then** each role row shows: role name, headcount indicator (filled/total), and assigned person chips
   **And** all interactions work with 44px minimum touch targets

## Tasks / Subtasks

- [x] Task 1: Create backend DTOs for role input (AC: 1, 2, 3)
  - [x] 1.1 Create `ActivityRoleInput.cs` in `Dtos/Activity/`:
    ```csharp
    public record ActivityRoleInput
    {
        public int? Id { get; init; }         // null = new role, set = existing role to update
        public string RoleName { get; init; } = string.Empty;
        public int Headcount { get; init; }
    }
    ```
    The `Id` field enables the backend to distinguish new roles from existing ones during update reconciliation. `SortOrder` is NOT included — it's derived from array index position (simpler, no client-side drag state to manage).
  - [x] 1.2 Create `ActivityRoleInputValidator.cs` in `Validators/`:
    ```csharp
    public class ActivityRoleInputValidator : AbstractValidator<ActivityRoleInput>
    {
        public ActivityRoleInputValidator()
        {
            RuleFor(x => x.RoleName)
                .NotEmpty()
                .MaximumLength(100)
                .MustNotContainControlCharacters();
            RuleFor(x => x.Headcount)
                .InclusiveBetween(1, 99)
                .WithMessage("Headcount must be between 1 and 99.");
            RuleFor(x => x.Id)
                .GreaterThan(0)
                .When(x => x.Id.HasValue)
                .WithMessage("Role ID must be positive when provided.");
        }
    }
    ```
    **IMPORTANT**: Use the existing `.MustNotContainControlCharacters()` extension from `Validators/ValidationExtensions.cs` — it covers Unicode control chars (U+0000-U+001F, U+007F), RTL overrides (U+202A-U+202E), zero-width chars (U+200B-U+200F), and bidi overrides (U+2066-U+2069). Do NOT use a hand-rolled `.Must()` check — `char.IsControl()` misses these attack vectors. Also use `InclusiveBetween(1, 99)` to align with `TemplateRoleRequestValidator`'s headcount bounds.
  - [x] 1.3 Add `List<ActivityRoleInput>? Roles` to `CreateActivityRequest.cs`:
    ```csharp
    public List<ActivityRoleInput>? Roles { get; init; }
    ```
  - [x] 1.4 Add `List<ActivityRoleInput>? Roles` to `UpdateActivityRequest.cs`:
    ```csharp
    public List<ActivityRoleInput>? Roles { get; init; }
    ```
  - [x] 1.5 Add shared role list validation to `ActivityValidationRules.cs` — extend the existing `Apply<T>()` method (which already validates common IActivityRequest fields). Since `Roles` is on both Create and Update DTOs but NOT on `IActivityRequest`, add a new static method:
    ```csharp
    public static void ApplyRoleRules<T>(AbstractValidator<T> validator) where T : class
    {
        validator.When(x => (x as dynamic).Roles != null, () =>
        {
            validator.RuleFor(x => ((dynamic)x).Roles)
                .Must((IList<ActivityRoleInput> roles) => roles.Count <= 20)
                .WithMessage("Maximum 20 roles per activity.");
            validator.RuleFor(x => ((dynamic)x).Roles)
                .Must((IList<ActivityRoleInput> roles) => roles.Select(r => r.RoleName.Trim().ToLowerInvariant()).Distinct().Count() == roles.Count)
                .WithMessage("Role names must be unique within an activity.");
            validator.RuleForEach(x => ((dynamic)x).Roles).SetValidator(new ActivityRoleInputValidator());
        });
    }
    ```
    **Alternative (simpler)**: If dynamic typing feels fragile, duplicate the `When` block in each validator instead. The key point is: do NOT duplicate validation logic across validators if the existing `ActivityValidationRules` shared pattern can accommodate it. If it can't cleanly (because `Roles` isn't on `IActivityRequest`), then duplicating the 6-line `When` block in both validators is acceptable — just ensure both blocks are **identical**.
  - [x] 1.6 Call `ApplyRoleRules()` in both `CreateActivityRequestValidator` and `UpdateActivityRequestValidator` AFTER the existing `ActivityValidationRules.Apply(this)` call. If using the duplicate approach instead:
    ```csharp
    When(x => x.Roles != null, () =>
    {
        RuleFor(x => x.Roles)
            .Must(roles => roles!.Count <= 20)
            .WithMessage("Maximum 20 roles per activity.");
        RuleFor(x => x.Roles)
            .Must(roles => roles!.Select(r => r.RoleName.Trim().ToLowerInvariant()).Distinct().Count() == roles!.Count)
            .WithMessage("Role names must be unique within an activity.");
        RuleForEach(x => x.Roles).SetValidator(new ActivityRoleInputValidator());
    });
    ```
  - [x] 1.7 Register `ActivityRoleInputValidator` in `ServiceCollectionExtensions.AddApplicationServices()` if FluentValidation DI doesn't auto-discover it (check if `AddValidatorsFromAssemblyContaining<>` is used — if yes, auto-discovered, no manual registration needed).

- [x] Task 2: Update ActivityService.CreateAsync to accept explicit roles (AC: 1)
  - [x] 2.1 Modify the role creation logic in `CreateAsync`:
    - **If `request.Roles` is provided (not null):** Create `ActivityRole` records from the `Roles` list. Ignore `request.TemplateId` for role copying (explicit roles override template). SortOrder = array index.
    - **If `request.Roles` is null AND `request.TemplateId` is provided:** Copy from template (current Story 4.2 behavior — preserved for backward compatibility).
    - **If both null:** Activity created with no roles (current Story 4.1 behavior).
    ```csharp
    if (request.Roles is { Count: > 0 })
    {
        for (var i = 0; i < request.Roles.Count; i++)
        {
            var roleInput = request.Roles[i];
            activity.Roles.Add(new ActivityRole
            {
                RoleName = sanitizer.Sanitize(roleInput.RoleName),
                Headcount = roleInput.Headcount,
                SortOrder = i,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
    }
    else if (request.TemplateId.HasValue)
    {
        // Existing Story 4.2 template copying logic — unchanged
    }
    ```
  - [x] 2.2 **Critical**: Sanitize role names with `sanitizer.Sanitize()` — the RoleName field is user input and must go through the HtmlSanitizer pipeline.

- [x] Task 3: Update ActivityService.UpdateAsync to reconcile roles (AC: 1, 2, 3, 4)
  - [x] 3.1 When `request.Roles` is provided (not null), implement the **reconcile pattern**.
    **IMPORTANT**: The current `UpdateAsync` does NOT declare `var now = DateTime.UtcNow;` — it uses `DateTime.UtcNow` inline at line 119. Add `var now = DateTime.UtcNow;` at the top of `UpdateAsync` (replacing the inline usage) so the reconcile block can share it:
    ```csharp
    // At the top of UpdateAsync, BEFORE existing field assignments:
    var now = DateTime.UtcNow;

    // ... existing field updates (change activity.UpdatedAt = DateTime.UtcNow to activity.UpdatedAt = now) ...

    if (request.Roles is not null)
    {
        // Load existing roles separately (activity was loaded WITHOUT .Include(a => a.Roles))
        var existingRoles = await dbContext.ActivityRoles
            .Where(r => r.ActivityId == activity.Id)
            .ToListAsync();

        var incomingIds = request.Roles
            .Where(r => r.Id.HasValue)
            .Select(r => r.Id!.Value)
            .ToHashSet();

        // DELETE: existing roles not in request
        var toRemove = existingRoles.Where(r => !incomingIds.Contains(r.Id)).ToList();
        dbContext.ActivityRoles.RemoveRange(toRemove);
        // Cascade delete handles RoleAssignments via FK config

        // UPDATE existing + ADD new
        for (var i = 0; i < request.Roles.Count; i++)
        {
            var roleInput = request.Roles[i];
            if (roleInput.Id.HasValue)
            {
                var existing = existingRoles.FirstOrDefault(r => r.Id == roleInput.Id.Value);
                if (existing is not null)
                {
                    existing.RoleName = sanitizer.Sanitize(roleInput.RoleName);
                    existing.Headcount = roleInput.Headcount;
                    existing.SortOrder = i;
                    existing.UpdatedAt = now;
                }
                // If ID provided but not found, silently skip (race condition safety)
            }
            else
            {
                // Use dbContext.ActivityRoles.Add() — NOT activity.Roles.Add() —
                // because activity was loaded without .Include(a => a.Roles).
                // This is explicit and consistent with the separate-loading pattern.
                dbContext.ActivityRoles.Add(new ActivityRole
                {
                    ActivityId = activity.Id,
                    RoleName = sanitizer.Sanitize(roleInput.RoleName),
                    Headcount = roleInput.Headcount,
                    SortOrder = i,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
        }
    }
    ```
  - [x] 3.2 **Critical**: The reconcile runs inside the existing `UpdateAsync` method, BEFORE `SaveChangesAsync()` — same atomic transaction as the activity field updates. No partial state.
  - [x] 3.3 When `request.Roles` is null: do NOT touch roles (backward compatibility — existing callers that don't send roles won't accidentally delete all roles). This is the key distinction: `null` = "don't modify roles", empty list `[]` = "remove all roles".
  - [x] 3.4 The Activity's `UpdatedAt` is already updated by the existing code. The `Version` (xmin) auto-increments on any row update. Modifying child `ActivityRole` rows does NOT change the Activity's xmin. This is fine — the Activity's xmin protects the Activity fields. Role changes are always sent with the latest concurrency token.
  - [x] 3.5 Load existing roles separately from the activity to avoid tracking issues. The activity is already loaded in UpdateAsync — load roles in the same method.

- [x] Task 4: Backend unit tests for ActivityRoleInputValidator (AC: 1, 2, 3)
  - [x] 4.1 Create `tests/SdaManagement.Api.UnitTests/Validators/ActivityRoleInputValidatorTests.cs` using `FluentValidation.TestHelper`:
    ```csharp
    public class ActivityRoleInputValidatorTests
    {
        private readonly ActivityRoleInputValidator _validator = new();

        [Fact] public void ValidInput_Passes() => _validator.TestValidate(new ActivityRoleInput { RoleName = "Predicateur", Headcount = 1 }).ShouldNotHaveAnyValidationErrors();
        [Fact] public void EmptyRoleName_Fails() => _validator.TestValidate(new ActivityRoleInput { RoleName = "", Headcount = 1 }).ShouldHaveValidationErrorFor(x => x.RoleName);
        [Fact] public void RoleNameTooLong_Fails() => _validator.TestValidate(new ActivityRoleInput { RoleName = new string('a', 101), Headcount = 1 }).ShouldHaveValidationErrorFor(x => x.RoleName);
        [Fact] public void RoleNameWithControlChars_Fails() => _validator.TestValidate(new ActivityRoleInput { RoleName = "Test\u200B", Headcount = 1 }).ShouldHaveValidationErrorFor(x => x.RoleName);
        [Fact] public void HeadcountZero_Fails() => _validator.TestValidate(new ActivityRoleInput { RoleName = "Test", Headcount = 0 }).ShouldHaveValidationErrorFor(x => x.Headcount);
        [Fact] public void HeadcountNegative_Fails() => _validator.TestValidate(new ActivityRoleInput { RoleName = "Test", Headcount = -1 }).ShouldHaveValidationErrorFor(x => x.Headcount);
        [Fact] public void HeadcountOver99_Fails() => _validator.TestValidate(new ActivityRoleInput { RoleName = "Test", Headcount = 100 }).ShouldHaveValidationErrorFor(x => x.Headcount);
        [Fact] public void IdZero_Fails() => _validator.TestValidate(new ActivityRoleInput { Id = 0, RoleName = "Test", Headcount = 1 }).ShouldHaveValidationErrorFor(x => x.Id);
        [Fact] public void IdNull_Passes() => _validator.TestValidate(new ActivityRoleInput { Id = null, RoleName = "Test", Headcount = 1 }).ShouldNotHaveValidationErrorFor(x => x.Id);
        [Fact] public void IdPositive_Passes() => _validator.TestValidate(new ActivityRoleInput { Id = 5, RoleName = "Test", Headcount = 1 }).ShouldNotHaveValidationErrorFor(x => x.Id);
    }
    ```
    Architecture mandates: "unit test for every validator" using FluentValidation.TestHelper.

- [x] Task 5: Backend integration tests for role roster operations (AC: 1, 2, 3, 4)
  - [x] 5.1 Test: `CreateActivity_WithExplicitRoles_Returns201WithRoles` — send `roles` array in create request (no templateId), verify response contains exactly those roles with correct names, headcounts, sortOrders.
  - [x] 5.2 Test: `CreateActivity_WithRolesAndTemplateId_RolesOverrideTemplate` — send both `templateId` AND `roles`, verify response uses `roles` (not template defaults).
  - [x] 5.3 Test: `CreateActivity_WithDuplicateRoleNames_Returns400` — send two roles with same name, verify validation error.
  - [x] 5.4 Test: `CreateActivity_WithInvalidRoleHeadcount_Returns400` — send role with headcount 0, verify validation error.
  - [x] 5.5 Test: `CreateActivity_WithRoleNameTooLong_Returns400` — send role with >100 char name, verify validation error.
  - [x] 5.6 Test: `UpdateActivity_AddNewRole_Returns200WithAddedRole` — update existing activity, include existing roles + one new role (no Id), verify all roles in response.
  - [x] 5.7 Test: `UpdateActivity_ChangeRoleHeadcount_Returns200WithUpdatedHeadcount` — update existing role's headcount, verify change persisted.
  - [x] 5.8 Test: `UpdateActivity_RemoveRole_Returns200WithoutRemovedRole` — omit a role from the update request, verify it's deleted.
  - [x] 5.9 Test: `UpdateActivity_RemoveRoleWithAssignments_CascadeDeletes` — create activity with role that has assignments, update without that role, verify role AND assignments are deleted.
  - [x] 5.10 Test: `UpdateActivity_NullRoles_PreservesExistingRoles` — send update with `roles: null`, verify existing roles unchanged (null = don't modify).
  - [x] 5.11 Test: `UpdateActivity_EmptyRoles_RemovesAllRoles` — send update with `roles: []`, verify all roles deleted.
  - [x] 5.12 Test: `UpdateActivity_RolesWithStaleToken_Returns409` — verify optimistic concurrency still works when updating roles.
  - [x] 5.13 Test: `UpdateActivity_DuplicateRoleNames_Returns400` — duplicate names in update roles array.
  - [x] 5.14 Test: `UpdateActivity_ReorderRoles_UpdatesSortOrder` — send roles in different order, verify SortOrder matches new positions.
  - [x] 5.15 Test: `UpdateActivity_Roles_AsViewer_Returns403` — viewers cannot modify roles.
  - [x] 5.16 Test: `UpdateActivity_Roles_WrongDepartment_Returns403` — department scoping enforced.
  - [x] 5.17 Test: `CreateActivity_WithMaxRoles_Succeeds` — 20 roles (max), verify success.
  - [x] 5.18 Test: `CreateActivity_WithTooManyRoles_Returns400` — 21 roles, verify validation error.

- [x] Task 6: Frontend — Update Zod schemas and service types (AC: 1, 2, 3)
  - [x] 6.1 Add role input schema to `activitySchema.ts`:
    ```typescript
    export const activityRoleInputSchema = z.object({
      id: z.number().int().positive().optional(),
      roleName: z.string().min(1).max(100),
      headcount: z.number().int().min(1),
    });

    export type ActivityRoleInputData = z.infer<typeof activityRoleInputSchema>;
    ```
  - [x] 6.2 Add `roles` field to `createActivitySchema` — **CRITICAL: add INSIDE the `z.object({})` block, BEFORE the `.refine()` call.** The current schema is `z.object({...}).refine(...)`. After `.refine()`, the type becomes `ZodEffects` and you CANNOT use `.extend()` or `.merge()`. The `roles` field must be placed alongside `title`, `description`, etc. inside the `.object({})`:
    ```typescript
    // Inside z.object({ ... }) block, add after the visibility field:
    roles: z.array(activityRoleInputSchema).max(20).optional(),
    ```
  - [x] 6.3 The `updateActivitySchema` uses `.and()` on `createActivitySchema`, so `roles` automatically flows to the update schema. No separate addition needed. Verify that `UpdateActivityFormData` includes `roles` via `z.infer`.
  - [x] 6.4 Add client-side uniqueness refinement — chain a SECOND `.refine()` on `createActivitySchema` (chaining `.refine()` on `ZodEffects` is valid and returns another `ZodEffects`). Since `updateActivitySchema` uses `.and()` on the full refined schema, it inherits this refinement:
    ```typescript
    .refine(
      (data) => {
        if (!data.roles) return true;
        const names = data.roles.map(r => r.roleName.trim().toLowerCase());
        return new Set(names).size === names.length;
      },
      { message: "Role names must be unique", path: ["roles"] }
    )
    ```
  - [x] 6.5 Update `activityService.ts` — the `CreateActivityFormData` and `UpdateActivityFormData` types auto-update from `z.infer`. No manual type changes needed. Verify that `activityService.create()` and `activityService.update()` send the `roles` array in the request body when present.

- [x] Task 7: Frontend — Create RoleRosterEditor component (AC: 1, 2, 3, 4, 5)
  - [x] 7.1 Create `components/activity/RoleRosterEditor.tsx`:
    - Props: `control: Control<any>`, `register: UseFormRegister<any>`, `setValue: UseFormSetValue<any>`, `errors: FieldErrors`, `existingAssignments?: Map<number, number>` (roleId -> assignmentCount, for edit mode only)
    - Uses `useFieldArray({ control, name: "roles" })` — returns `fields`, `append`, `remove`
    - **Role row layout** (each field item):
      - Visible `<label>` with `htmlFor` linking to role name input: use `<Label htmlFor={\`role-name-${index}\`} className="sr-only sm:not-sr-only sm:text-sm sm:font-medium">{t('adminActivities.roleRoster.roleNamePlaceholder')}</Label>` — visually hidden on mobile (placeholder sufficient), visible on desktop. Every form field must have a visible label per UX spec.
      - Role name: `<Input id={\`role-name-${index}\`}>` with `{...register(\`roles.${index}.roleName\`)}`, placeholder "Nom du role"
      - Validation error linked via `aria-describedby={\`role-name-error-${index}\`}` on the Input, and `id={\`role-name-error-${index}\`}` on the error message `<p>` element.
      - Hidden `id` field: `<input type="hidden" {...register(\`roles.${index}.id\`, { valueAsNumber: true })} />`
      - Headcount stepper: Two `<Button variant="outline" size="icon">` (Minus/Plus from lucide-react) flanking a centered count display. Min = 1, max = 99. Stepper decrements/increments via `setValue(\`roles.${index}.headcount\`, currentValue +/- 1)`.
      - Assignment indicator: Read-only badge showing `{assignedCount}/{headcount}` with shape indicator. During create: always `0/{headcount}`. During edit: `existingAssignments.get(roleId) ?? 0` / `headcount`.
      - Remove button: `<Button variant="ghost" size="icon">` with `Trash2` icon from lucide-react
    - **Add role button**: At bottom of role list. `<Button variant="outline" size="sm" onClick={() => append({ roleName: "", headcount: 1 })}>` with `Plus` icon + "Ajouter un role" text.
    - **Remove logic**: When remove is clicked:
      - If role has assignments (`existingAssignments.get(field.id) > 0`): Show `AlertDialog` with warning. "Supprimer" button uses `variant="destructive"` (red — irreversible cascade delete per UX spec). "Annuler" uses `variant="outline"`. On confirm: `remove(index)`.
      - If role has no assignments: `remove(index)` immediately, no confirmation (reversible action).
    - **Empty state**: When no roles, show "Aucun role. Ajoutez des roles pour definir les postes necessaires." with the add button.
    - **Validation errors**: Display per-role errors (roleName required, duplicate name) inline below the relevant input with `aria-describedby` linking. Display array-level errors (max 20, duplicates) above the role list with `role="alert"`.
    - **Accessibility**:
      - Each role row: `role="group"` with `aria-label="Role {index + 1}: {roleName || 'nouveau role'}"`
      - Role name input: `aria-describedby` linked to error message element
      - Headcount stepper buttons: `aria-label` using i18n keys
      - Remove button: `aria-label="Supprimer le role {roleName}"`
      - Add button: clearly labeled with text
    - **Mobile (< 640px)**: Single column, stacked layout. Role name takes full width. Headcount stepper and remove button on second row, flex between them. All touch targets >= 44px.
    - **Desktop (>= 640px)**: Single row per role: `flex items-center gap-3`. Role name input flex-grows. Headcount stepper, assignment indicator, and remove button are fixed width.
    - **Reference pattern**: See `ActivityTemplateFormDialog.tsx` which uses the same `useFieldArray` + prop-passing convention in this codebase — follow its component structure.
  - [x] 7.2 **Headcount stepper detail** — `setValue` is passed as a prop from `ActivityForm` (see Task 8 for form refactoring):
    ```tsx
    const HeadcountStepper = ({ index, control, setValue }: {
      index: number;
      control: Control;
      setValue: UseFormSetValue<any>;
    }) => {
      const value = useWatch({ control, name: `roles.${index}.headcount` });
      const { t } = useTranslation();
      return (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-9 sm:w-9"
            disabled={value <= 1}
            onClick={() => setValue(`roles.${index}.headcount`, value - 1)}
            aria-label={t('pages.adminActivities.roleRoster.decreaseHeadcount')}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-sm font-medium tabular-nums">{value}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-9 sm:w-9"
            disabled={value >= 99}
            onClick={() => setValue(`roles.${index}.headcount`, value + 1)}
            aria-label={t('pages.adminActivities.roleRoster.increaseHeadcount')}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      );
    };
    ```
    **Touch target sizing**: Mobile = `h-11 w-11` (44px — meets WCAG 2.5.5 minimum). Desktop = `sm:h-9 sm:w-9` (36px — mouse precision allows smaller). AC #5 requires 44px on mobile.
    **Props pattern**: `ActivityForm` does NOT use `<FormProvider>` — it uses `useForm()` internally. Pass `control`, `register`, `setValue` as props to `RoleRosterEditor`. This matches the existing codebase convention in `ActivityTemplateFormDialog.tsx` which also uses prop-passing (not `useFormContext`).
  - [x] 7.3 **Assignment indicator badge** — uses shape + color (UX spec: "color is never the sole indicator of state"):
    ```tsx
    const AssignmentBadge = ({ assigned, total }: { assigned: number; total: number }) => {
      // Shape indicator: filled circle (full), half circle (partial), empty circle (none)
      // Color is supplementary, not sole indicator — per UX spec accessibility requirement
      const isFull = assigned >= total;
      const isPartial = assigned > 0 && !isFull;
      return (
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border",
          isFull && "bg-primary/10 text-primary border-primary/20",
          isPartial && "bg-warning/10 text-warning border-warning/20",
          !isFull && !isPartial && "bg-muted text-muted-foreground border-border"
        )}>
          <span className={cn(
            "inline-block h-2 w-2 rounded-full",
            isFull && "bg-primary",
            isPartial && "bg-warning border border-warning",
            !isFull && !isPartial && "border border-muted-foreground"
          )} aria-hidden="true" />
          {assigned}/{total}
        </span>
      );
    };
    ```
    **Semantic tokens**: Uses `bg-primary/10`, `text-primary`, `bg-warning/10`, `text-warning`, `bg-muted`, `text-muted-foreground` — all semantic tokens, NOT raw Tailwind colors. If `warning` token doesn't exist in the theme, define CSS variables `--warning` and `--warning-foreground` in `globals.css` using amber values (e.g., `45 93% 47%` for `oklch` or `38 92% 50%`). Check existing theme tokens before adding.
    **Shape indicator**: Filled circle = fully staffed, bordered circle = partially staffed, empty outlined circle = no assignments. This ensures color-blind users can distinguish states.

- [x] Task 8: Frontend — Refactor ActivityForm and integrate RoleRosterEditor (AC: 1, 2, 3, 4, 5)

  **CRITICAL ARCHITECTURE NOTE**: `ActivityForm` (lines 68-236 of `AdminActivitiesPage.tsx`) is a self-contained child component with its OWN `useForm()` at line 87. The parent `AdminActivitiesPage` has **zero access** to the form instance. There is no `form` variable in the parent scope. All form interactions happen through props (`onSubmit`, `defaultValues`). When `createStep` switches from `"form"` to `"template"`, React unmounts `ActivityForm` — its form state is destroyed naturally. No explicit `form.reset()` exists or is needed in the parent.

  - [x] 8.1 **Refactor `ActivityForm` to accept and use roles**:
    - Add `roles` to the `defaultValues` prop type (already partially there since `defaultValues` is typed from the schema).
    - Add `roles: []` to the create-flow `defaultValues` and `roles: editActivity.roles.map(...)` to the edit-flow `defaultValues`.
    - Inside `ActivityForm`: the `useForm()` call at line 87 already accepts `defaultValues` — adding `roles` to `defaultValues` auto-populates the field array.
    - Add `useFieldArray({ control, name: "roles" })` inside `ActivityForm` — returns `fields`, `append`, `remove`.
    - Extract `control`, `register`, `setValue`, `formState: { errors }` from the existing `useForm()` call.
    - Pass these as props to `<RoleRosterEditor control={control} register={register} setValue={setValue} errors={errors} existingAssignments={existingAssignments} />`.
    - Add `existingAssignments?: Map<number, number>` to `ActivityForm` props interface.
  - [x] 8.2 **Create flow template pre-population**:
    - In the parent `AdminActivitiesPage`, when `TemplateSelector.onSelect` fires, compute the `defaultValues` for `ActivityForm` including template roles:
      ```typescript
      const handleTemplateSelect = (template: ActivityTemplateListItem | null) => {
        setSelectedTemplate(template);
        setCreateStep("form");
        // Roles are passed via defaultValues when ActivityForm mounts.
        // No form.setValue() needed — ActivityForm remounts with new defaults.
      };

      // In the render, pass defaultValues to ActivityForm:
      <ActivityForm
        defaultValues={{
          ...emptyDefaults,
          roles: selectedTemplate?.roles.map(r => ({
            roleName: r.roleName,
            headcount: r.defaultHeadcount,
          })) ?? [],
        }}
        // ...
      />
      ```
    - When "Custom" (no template) selected: `roles: []` in defaultValues.
    - When "Back to templates" clicked: `setCreateStep("template")` unmounts `ActivityForm`, destroying form state. When remounted, fresh `defaultValues` are used. No explicit reset needed.
  - [x] 8.3 **Edit flow role pre-population**:
    - Pass existing roles in `defaultValues`:
      ```typescript
      <ActivityForm
        defaultValues={{
          title: editActivity.title,
          description: editActivity.description ?? "",
          date: editActivity.date,
          startTime: editActivity.startTime,
          endTime: editActivity.endTime,
          departmentId: editActivity.departmentId,
          visibility: editActivity.visibility,
          roles: editActivity.roles.map(r => ({
            id: r.id,
            roleName: r.roleName,
            headcount: r.headcount,
          })),
        }}
        existingAssignments={new Map(
          editActivity.roles.map(r => [r.id, r.assignments.length])
        )}
        // ...
      />
      ```
  - [x] 8.4 **Remove Story 4.2 read-only role summary badges**: Delete the badge section (lines 538-556) that displays template roles as non-interactive `Badge` components. Replace with the `<RoleRosterEditor>` rendered inside `ActivityForm`.
  - [x] 8.5 **Form submission**: `ActivityForm.onSubmit` already sends the full form data to the parent's mutation handler. Since `roles` is now part of the Zod schema, it's automatically included:
    - Create: sends `{ ...fields, templateId, roles }` — backend uses `roles` if provided, ignoring `templateId` for role copying.
    - Update: sends `{ ...fields, concurrencyToken, roles }` — backend reconciles.
  - [x] 8.6 **RoleRosterEditor placement in form**: Place it AFTER the visibility field and BEFORE the submit button. Use a `<Separator>` above the role section. Add a section heading with proper semantic HTML: `<h3 className="text-lg font-semibold">{t('pages.adminActivities.roleRoster.title')}</h3>` — use `<h3>` not `<Label>` (section heading, not a form label). Typography matches UX spec H3 level (18px/semibold).
  - [x] 8.7 **Mobile Sheet behavior**: The role roster scrolls naturally within the Sheet content area. No special handling needed — existing Sheet scroll behavior accommodates dynamic content height.

- [x] Task 9: Frontend — i18n strings (AC: 1, 2, 3, 4, 5)
  - [x] 9.1 Add French translations to `public/locales/fr/common.json` under `adminActivities.roleRoster`:
    - `title`: "Roles de l'activite"
    - `addRole`: "Ajouter un role"
    - `roleNamePlaceholder`: "Nom du role"
    - `headcountLabel`: "Nombre"
    - `decreaseHeadcount`: "Diminuer le nombre"
    - `increaseHeadcount`: "Augmenter le nombre"
    - `assignedIndicator`: "{{assigned}}/{{total}} assigne(s)"
    - `removeRole`: "Supprimer le role"
    - `removeRoleConfirmTitle`: "Supprimer le role ?"
    - `removeRoleConfirmDescription`: "Supprimer ce role supprimera egalement {{count}} assignation(s) existante(s). Cette action est irreversible."
    - `removeRoleConfirmButton`: "Supprimer"
    - `cancelButton`: "Annuler"
    - `emptyState`: "Aucun role. Ajoutez des roles pour definir les postes necessaires."
    - `maxRolesReached`: "Maximum 20 roles atteint."
    - `duplicateRoleName`: "Les noms de role doivent etre uniques."
    - `roleNameRequired`: "Le nom du role est requis."
    - `roleNameTooLong`: "Le nom du role ne doit pas depasser 100 caracteres."
  - [x] 9.2 Add English translations to `public/locales/en/common.json` (same keys, English values):
    - `title`: "Activity Roles"
    - `addRole`: "Add Role"
    - `roleNamePlaceholder`: "Role name"
    - `headcountLabel`: "Count"
    - `decreaseHeadcount`: "Decrease count"
    - `increaseHeadcount`: "Increase count"
    - `assignedIndicator`: "{{assigned}}/{{total}} assigned"
    - `removeRole`: "Remove role"
    - `removeRoleConfirmTitle`: "Remove role?"
    - `removeRoleConfirmDescription`: "Removing this role will also delete {{count}} existing assignment(s). This action is irreversible."
    - `removeRoleConfirmButton`: "Remove"
    - `cancelButton`: "Cancel"
    - `emptyState`: "No roles. Add roles to define required positions."
    - `maxRolesReached`: "Maximum 20 roles reached."
    - `duplicateRoleName`: "Role names must be unique."
    - `roleNameRequired`: "Role name is required."
    - `roleNameTooLong`: "Role name must not exceed 100 characters."
  - [x] 9.3 **CRITICAL**: Update `src/sdamanagement-web/src/test-utils.tsx` — this file contains **hardcoded inline French translations** for `adminActivities` used in test rendering. Adding keys to the JSON locale files is insufficient. Tests will FAIL unless the same `roleRoster` keys are also added to the inline translations object in `test-utils.tsx`. Find the `adminActivities` section in the `resources` object and add all `roleRoster` sub-keys.

- [x] Task 10: Frontend — Update MSW mock handlers (AC: 1, 2, 3, 4)
  - [x] 10.1 Update `POST /api/activities` handler in `mocks/handlers/activities.ts`:
    - When `roles` array is provided in request body: create mock `ActivityRoleResponse[]` from the roles array (assign incrementing IDs, empty assignments).
    - When `roles` is null/undefined AND `templateId` is provided: keep existing template-to-roles conversion.
    - When both absent: empty roles.
  - [x] 10.2 Update `PUT /api/activities/:id` handler:
    - When `roles` array is provided: return response with those roles (assign IDs, preserve assignments from existing mock data where role IDs match).
    - When `roles` is null: return response with unchanged roles from existing mock data.
  - [x] 10.3 Ensure mock data includes at least one activity with roles that have assignments (for testing the delete-with-assignments confirmation flow).

- [x] Task 11: Frontend — RoleRosterEditor tests (AC: 1, 2, 3, 4, 5)
  - [x] 11.1 Create `components/activity/RoleRosterEditor.test.tsx`:
    - Test: renders empty state when no roles
    - Test: renders role rows with name, headcount, and assignment indicator
    - Test: clicking "Add Role" appends a new empty role row
    - Test: typing in role name input updates the field
    - Test: clicking headcount "+" increases count by 1
    - Test: clicking headcount "-" decreases count by 1 (minimum 1)
    - Test: headcount "-" button is disabled when count is 1
    - Test: clicking remove on role without assignments removes immediately (no dialog)
    - Test: clicking remove on role with assignments shows confirmation AlertDialog
    - Test: confirming removal in AlertDialog removes the role
    - Test: canceling removal in AlertDialog keeps the role
    - Test: add button disabled when 20 roles exist (max reached)
    - Test: displays validation error for empty role name
    - Test: displays validation error for duplicate role names
    - Test: assignment indicator shows correct colors (green=full, amber=partial, gray=empty)
    - Test: keyboard Enter on add button triggers add
    - Test: role rows have correct aria-labels
  - [x] 11.2 Test setup:
    - Wrap in a form with `useForm` + `FormProvider` or pass control/register props
    - Use `@testing-library/user-event` for interactions
    - Use `vi.fn()` for callbacks
    - Radix jsdom polyfills needed (same as Story 4.2): `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView`
  - [x] 11.3 Update `pages/AdminActivitiesPage.test.tsx`:
    - Test: create flow with template pre-populates RoleRosterEditor with template roles
    - Test: create flow with custom starts with empty role roster
    - Test: adding a role in create flow includes it in submit request
    - Test: edit flow pre-populates RoleRosterEditor with existing activity roles
    - Test: modifying roles in edit flow sends updated roles in request
    - Test: removing all roles in edit sends empty roles array
    - Test: "Back to templates" resets role roster
    - Test: role section appears with heading in form

## Dev Notes

### Architecture Requirements

- **Activity + roles + assignments as single unit of work**: All role modifications happen as part of the activity create/update transaction. No separate CRUD endpoints for roles. `SaveChangesAsync()` saves activity field changes + role changes atomically. [Source: architecture.md#Core Architectural Decisions — Decision #9]
- **Flexible activity data model**: Normalized Activity -> ActivityRole -> RoleAssignment. Templates are creation-time blueprints. DB constraints: cascade deletes, unique (ActivityRoleId, UserId). [Source: architecture.md#Core Architectural Decisions — Decision #1]
- **Reconcile pattern for child collections**: The update endpoint receives the full desired role list. Backend compares with existing roles: adds new, updates existing (matched by Id), removes missing. Cascade FK handles RoleAssignment cleanup.
- **Null vs empty roles semantics**: `null` roles in request = "don't modify roles" (backward compat). Empty `[]` roles = "remove all roles" (intentional clear). This distinction prevents accidental mass deletion by callers that don't send the roles field.
- **Security boundary is the API layer**: Frontend hides UI affordances for UX; API enforces permissions. All role modifications go through the same `auth.CanManage(departmentId)` check already on the controller. No additional authorization needed. [Source: architecture.md#Security — Key Principle #1]
- **Input sanitization**: Role names are user-provided text — must pass through `sanitizer.Sanitize()` before persistence. 4-layer defense: FluentValidation -> HtmlSanitizer -> EF Core parameterized queries -> React JSX auto-escaping. [Source: architecture.md#Security — Input Validation Pipeline]

### Backend Implementation Details

**Reconcile pattern in UpdateAsync:**

The reconcile is the most complex piece. The key rules:
1. Match incoming roles to existing roles by `Id` (for updates)
2. Roles without `Id` are new — create them
3. Existing roles not in the incoming list — delete them (cascade handles assignments)
4. `SortOrder` is always reassigned from array index (position in the incoming list)
5. All changes happen in a single `SaveChangesAsync()` call

**Why not separate role endpoints?**
- Architecture Decision #9 mandates atomic transactions for activity + roles
- Separate endpoints would require the frontend to orchestrate multiple API calls in sequence, with error handling for partial failures
- The batch approach is simpler, safer, and aligns with the form-based UX

**Unique constraint enforcement:**
- DB: `ix_activity_roles_activity_id_role_name` unique index on `(ActivityId, RoleName)`
- Backend validator: Checks uniqueness BEFORE hitting the DB (case-insensitive, trimmed)
- Frontend schema: Zod `.refine()` checks uniqueness client-side for instant feedback
- Triple enforcement prevents any path to duplicate role names

**Controller changes:**
- The `Create` and `Update` controller methods do NOT need modification — they already call `activityService.CreateAsync(request)` and `activityService.UpdateAsync(id, request)`. The service handles the new `Roles` field. The validators handle the new validation rules. The DTOs carry the new field. This is the beauty of the thin-controller pattern.

### Frontend Implementation Details

**CRITICAL: ActivityForm architecture**

`ActivityForm` (lines 68-236 of `AdminActivitiesPage.tsx`) is a **self-contained child component** with its own `useForm()` call at line 87. The parent `AdminActivitiesPage` has NO access to the form instance. All data flows through:
- **In**: `defaultValues` prop (populates form at mount time)
- **Out**: `onSubmit` callback (receives form data on submit)

There is NO `form.setValue()` or `form.reset()` callable from the parent. When the parent changes `createStep` from `"form"` to `"template"`, React unmounts `ActivityForm` and its form state is destroyed. When remounted, fresh `defaultValues` are used.

**useFieldArray integration (inside ActivityForm):**

```typescript
// Inside ActivityForm component:
const { control, register, setValue, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(createActivitySchema), // or updateActivitySchema
  defaultValues, // includes roles: []
});
const { fields, append, remove } = useFieldArray({ control, name: "roles" });

// Pass to RoleRosterEditor:
<RoleRosterEditor
  control={control}
  register={register}
  setValue={setValue}
  errors={errors}
  existingAssignments={existingAssignments}
/>
```

Key React Hook Form behaviors to know:
- `fields` array has auto-generated `id` properties (NOT the database ID) — use `field.id` as React key
- The database role ID is a separate form field at `roles.${index}.id` — accessed via `form.getValues(\`roles.${index}.id\`)`
- `append()` adds to end, `remove(index)` removes by index
- `useWatch({ control, name: \`roles.${index}.headcount\` })` for reactive headcount display in the stepper
- Field array validation errors are at `errors.roles?.[index]?.roleName` and `errors.roles?.root`

**Template role pre-population (via defaultValues, NOT form.setValue):**

```typescript
// In the parent, when rendering ActivityForm for create:
<ActivityForm
  defaultValues={{
    title: "", description: "", date: "", startTime: "", endTime: "",
    departmentId: departments[0]?.id ?? 0, visibility: "public",
    roles: selectedTemplate?.roles.map(r => ({
      roleName: r.roleName,
      headcount: r.defaultHeadcount,
    })) ?? [],
  }}
  onSubmit={handleCreateSubmit}
  // ...
/>
```

**Edit flow role pre-population (via defaultValues):**

```typescript
// In the parent, when rendering ActivityForm for edit:
<ActivityForm
  defaultValues={{
    title: editActivity.title,
    description: editActivity.description ?? "",
    // ... other fields ...
    roles: editActivity.roles.map(r => ({
      id: r.id,
      roleName: r.roleName,
      headcount: r.headcount,
    })),
  }}
  existingAssignments={new Map(
    editActivity.roles.map(r => [r.id, r.assignments.length])
  )}
  onSubmit={handleEditSubmit}
  // ...
/>
```

**Confirmation dialog for removing roles with assignments:**

The confirmation uses the existing `AlertDialog` component (already imported in AdminActivitiesPage). The dialog shows:
- Title: "Supprimer le role ?"
- Description: "Supprimer ce role supprimera egalement {count} assignation(s) existante(s). Cette action est irreversible."
- Cancel button: `variant="outline"`
- Confirm button: `variant="destructive"` (red — irreversible cascade delete)

Implementation: Use a state variable `roleToRemove: { index: number; assignmentCount: number } | null` inside `RoleRosterEditor`. When set, AlertDialog opens. On confirm: `remove(roleToRemove.index)` and clear state.

**Form layout change:**

The current form layout in `ActivityForm` (lines 68-236 of AdminActivitiesPage.tsx):
1. Title
2. Description
3. Date + StartTime + EndTime
4. Department
5. Visibility
6. **[NEW] Separator + `<h3>` heading + RoleRosterEditor**
7. Submit/Cancel buttons

The RoleRosterEditor sits in the form between Visibility and the submit buttons. On mobile, it scrolls naturally within the Sheet.

### UX Design Requirements

**Role row design (from UX spec):**
- Each role row is a distinct visual section within the form
- Role name input: full-width on mobile, flex-grow on desktop
- Headcount: Number stepper (minus/plus buttons) — NOT a free-text number input [Source: ux-design-specification.md#Form Patterns]
- Assignment indicator: colored badge (green/amber/gray) showing assigned/total count
- Remove button: ghost icon button (Trash2), 44px touch target
- Spacing: 8px minimum between adjacent touch targets

**Mobile-first responsive design:**
- Base (< 640px): Stacked layout. Role name full width first row. Headcount stepper + remove button second row, justified.
- Desktop (>= 640px): Single row. `flex items-center gap-3`. Name input grows, stepper and buttons fixed width.
- Breakpoints: Mobile = base (no modifier), Desktop = `sm:` (640px+). Do NOT use `md:` for tablet. [Source: ux-design-specification.md#Explicit Tailwind Breakpoint Mapping]

**Button hierarchy:**
- "Add Role" button: `outline` variant (secondary action) [Source: ux-design-specification.md#Button Hierarchy]
- Remove role: `ghost` variant icon button (tertiary action)
- Headcount steppers: `outline` variant icon buttons

**Destructive action handling:**
- Role removal with assignments: requires AlertDialog confirmation (irreversible cascade)
- Role removal without assignments: instant, no confirmation (reversible — can re-add) [Source: ux-design-specification.md#Destructive vs Reversible Actions]

**Form validation patterns:**
- Validate on blur for role name fields (not on keystroke)
- Show error inline: red border + message below field
- Clear error when user starts editing
- "Add Role" button disabled when at 20 roles (max)
[Source: ux-design-specification.md#Form Patterns]

### Concurrency Note

Activity's `Version` (xmin) changes when the Activity row itself is updated. Modifying child `ActivityRole` rows does NOT change the Activity's xmin — only the child rows' own xmin values change. This is fine for Story 4.3 because:
1. The role roster update is always part of an Activity update (which touches Activity.UpdatedAt, triggering xmin change)
2. Two admins editing the same activity will hit the 409 conflict on the Activity's concurrency token
3. Role-level concurrency is not needed at this stage (roles are edited as part of the parent activity form)

### SignalR Broadcast Note

Story 4.3 does NOT add SignalR broadcasting for role changes. Real-time updates are Epic 9 scope. However, verify that the existing `ActivityUpdated` signal (if any) still fires correctly after role modifications — the update endpoint's response already includes the full role list, so clients that refresh on signal will get current data. No new signals or hub methods needed.

### Unique Constraint Edge Case

If two admins add the same role name simultaneously and both pass frontend validation, the second `SaveChangesAsync()` will throw a `DbUpdateException` with a PostgreSQL unique violation (error code 23505). The existing `ProblemDetails` exception middleware should catch this and return a 409 or 422. **Do not add special handling in this story** — the existing error pipeline is sufficient. If the error message is unclear to users, that can be improved in a follow-up.

### Previous Story Intelligence (Story 4.2)

Key learnings to carry forward:
1. **Frontend mutation testing**: Use `vi.spyOn(activityService, 'create')` and `vi.spyOn(activityService, 'update')` for mutation tests, NOT MSW. [Source: 4-2-activity-creation-from-templates.md#Completion Notes]
2. **Radix jsdom polyfills**: Tests need `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView` polyfills. Already present in test files — reuse same pattern.
3. **No central MSW handler registry**: Handlers are imported directly in test files.
4. **Template data available client-side**: `TemplateSelector` already fetches full template data including `roles` array. This data is available via `selectedTemplate` state in AdminActivitiesPage.
5. **Two-step create flow**: `createStep` state machine (`"template"` | `"form"`) and `selectedTemplate` state already exist. The role roster editor integrates into the `"form"` step.
6. **i18n key pattern**: Keys are under `adminActivities.` namespace. Follow `adminActivities.roleRoster.{key}` pattern.
7. **Form unmount on back**: When user clicks "Back to templates", React unmounts `ActivityForm` (conditional rendering in parent). All form state including role fields is destroyed. On remount, fresh `defaultValues` are used. There is no explicit `form.reset()` — the unmount/remount cycle handles cleanup.
8. **Code review fix C1**: The `aria-checked` bug fix on custom card — reminder to test all aria attributes properly.

### Git Intelligence

Recent commit pattern: `feat(activities): Story 4.2 — Activity creation from templates with code review fixes`
This story's expected commit: `feat(activities): Story 4.3 — Role roster customization`

Recent work confirms:
- Activity entity, roles, and assignments are all operational
- Template-based creation flow is working
- Frontend two-step create Dialog/Sheet pattern is established
- Integration test helpers for activities with roles exist
- MSW mock handlers cover activity CRUD with template support

### Existing Code to Reuse

| Component | Location | What to reuse |
|---|---|---|
| `ActivityRole` entity | `Data/Entities/ActivityRole.cs` | Entity definition — no changes needed |
| `RoleAssignment` entity | `Data/Entities/RoleAssignment.cs` | FK cascade config ensures cleanup |
| `ActivityService.CreateAsync` | `Services/ActivityService.cs` | Extend with explicit roles support |
| `ActivityService.UpdateAsync` | `Services/ActivityService.cs` | Add reconcile pattern for roles |
| `CreateActivityRequest` | `Dtos/Activity/CreateActivityRequest.cs` | Add `Roles` property |
| `UpdateActivityRequest` | `Dtos/Activity/UpdateActivityRequest.cs` | Add `Roles` property |
| `CreateActivityRequestValidator` | `Validators/CreateActivityRequestValidator.cs` | Add role list validation |
| `UpdateActivityRequestValidator` | `Validators/UpdateActivityRequestValidator.cs` | Add role list validation |
| `ActivitiesController` | `Controllers/ActivitiesController.cs` | NO changes needed (thin controller) |
| `AdminActivitiesPage.tsx` | `pages/AdminActivitiesPage.tsx` | Integrate RoleRosterEditor into form |
| `activitySchema.ts` | `schemas/activitySchema.ts` | Add role fields to schemas |
| `activityService.ts` | `services/activityService.ts` | Types auto-update from schema |
| `IntegrationTestBase` | `tests/.../IntegrationTestBase.cs` | `CreateTestActivity(roles: [...])` helper |
| `AlertDialog` | shadcn/ui | Delete confirmation for roles with assignments |
| `Badge` | shadcn/ui | Assignment indicator |
| `Separator` | shadcn/ui | Visual section divider for role roster |
| `Input` | shadcn/ui | Role name input |
| `Button` | shadcn/ui | Stepper, add, remove buttons |
| `useFieldArray` | react-hook-form | Dynamic role array management |
| `useWatch` | react-hook-form | Reactive headcount display in stepper |
| `TemplateSelector` | `components/activity/TemplateSelector.tsx` | Unchanged — still used for template selection |
| `ActivityTemplateFormDialog` | `components/activity/ActivityTemplateFormDialog.tsx` | Reference for form-in-dialog pattern, field layout conventions |

### Anti-Patterns to Avoid

- Do NOT create separate API endpoints for individual role CRUD — roles are part of the activity unit of work
- Do NOT store `SortOrder` in the frontend form — derive it from array index position at submit time
- Do NOT add role assignment UI — that's Story 4.4 (Contact Picker)
- Do NOT implement drag-and-drop reordering — out of scope, array order determines SortOrder
- Do NOT add `RoleAssignment` management — assignments are read-only in this story (display only)
- Do NOT hardcode French strings — use i18n keys
- Do NOT use MSW for mutation testing — use `vi.spyOn` per Story 4.2 learnings
- Do NOT use a free-text number input for headcount — use stepper (UX spec requirement)
- Do NOT use `md:` breakpoint — use base (mobile) and `sm:` (desktop) only per UX spec
- Do NOT send roles from frontend when only updating activity fields (backward compat) — but since the form always includes roles after this story, this is moot. The schema always sends roles.
- Do NOT modify the `ActivitiesController` — it's thin and doesn't need changes. All logic is in the service.
- Do NOT use `useFormContext` without wrapping in `FormProvider` — pass form props instead (per codebase convention)
- Do NOT use `field.id` (RHF auto-generated) as the database role ID — they are different. Use `form.getValues(\`roles.${index}.id\`)` for the database ID.
- Do NOT call `form.reset()` or `form.setValue()` from the parent component — `ActivityForm` owns its form instance. Pass data via `defaultValues` prop instead.
- Do NOT pass `control` as a prop FROM the parent — `ActivityForm` creates its own `control` internally and passes it DOWN to `RoleRosterEditor`.

### Project Structure Notes

**New files to create:**
```
src/SdaManagement.Api/
  Dtos/Activity/ActivityRoleInput.cs
  Validators/ActivityRoleInputValidator.cs

tests/SdaManagement.Api.UnitTests/
  Validators/ActivityRoleInputValidatorTests.cs

src/sdamanagement-web/src/
  components/activity/RoleRosterEditor.tsx
  components/activity/RoleRosterEditor.test.tsx
```

**Files to modify:**
```
src/SdaManagement.Api/
  Dtos/Activity/CreateActivityRequest.cs          (add Roles property)
  Dtos/Activity/UpdateActivityRequest.cs          (add Roles property)
  Validators/CreateActivityRequestValidator.cs    (add role list validation)
  Validators/UpdateActivityRequestValidator.cs    (add role list validation)
  Services/ActivityService.cs                     (extend CreateAsync + UpdateAsync for roles)

tests/SdaManagement.Api.IntegrationTests/
  Activities/ActivityEndpointTests.cs             (add 18 role roster tests)

src/sdamanagement-web/src/
  schemas/activitySchema.ts                       (add role fields to schemas)
  pages/AdminActivitiesPage.tsx                   (integrate RoleRosterEditor, update template flow)
  pages/AdminActivitiesPage.test.tsx              (add role roster integration tests)
  mocks/handlers/activities.ts                    (update POST/PUT mocks for roles)
  public/locales/fr/common.json                   (add roleRoster i18n keys)
  public/locales/en/common.json                   (add roleRoster i18n keys)
  test-utils.tsx                                  (add roleRoster inline translations)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.3 — Role Roster Customization]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Decision #1 (flexible activity data model)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Decision #9 (Activity + roles + assignments as single unit of work)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — React Hook Form + useFieldArray for dynamic roles]
- [Source: _bmad-output/planning-artifacts/architecture.md#Security — Input Validation Pipeline (4-layer defense)]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns — ProblemDetails, HTTP status codes, endpoint naming]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience C "Confirm and Adjust" — Step 2 Review & adjust roles]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Form Patterns — Number stepper for headcount]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Destructive vs Reversible Actions — Confirmation for irreversible role deletion]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Mobile-First Approach — Tailwind breakpoints, touch targets]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Button Hierarchy — Three-tier system]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#RoleSlot Component — States and anatomy]
- [Source: _bmad-output/planning-artifacts/prd.md#FR20 — ADMINs can create activities from templates and customize roles]
- [Source: _bmad-output/implementation-artifacts/4-2-activity-creation-from-templates.md — Previous story learnings, code review fixes, mutation testing pattern]
- [Source: Context7 — react-hook-form/documentation — useFieldArray API: append, remove, useWatch, field.id as key]
- [Source: Context7 — shadcn-ui/ui — Form with dynamic fields, useFieldArray integration, remove button pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

- `useFieldArray` injects a string `id` for React keys that conflicts with the database role `id` field in zod schemas. Fixed with `.catch(undefined)` on the `id` field to silently discard non-numeric IDs during validation.
- `useWatch` for `roles.${index}.headcount` returns `T | undefined` — must handle `undefined` with fallback (`?? 1`).
- `control._formValues` is a private API — replaced with `useWatch({ control, name: "roles" })` for accessing watched role values.

### Completion Notes List

- All 11 tasks completed: backend DTOs, service logic, validators, unit tests, integration tests, frontend schema, RoleRosterEditor component, ActivityForm integration, i18n, MSW handlers, frontend tests.
- Backend: 183 unit tests pass. 18 integration tests written and compile-verified (require Docker for execution).
- Frontend: 239 tests pass across 30 test files. RoleRosterEditor: 17 tests. AdminActivitiesPage: 17 tests.
- Added `--warning` CSS custom property in OKLCH color space for partial assignment indicators.
- Reconcile pattern in UpdateAsync: compares incoming vs existing roles, performs add/update/delete atomically.
- `null` roles = don't modify; empty `[]` roles = remove all roles (semantic distinction).

### Code Review Fixes (Post-Review)

| ID | Severity | Fix Applied |
|----|----------|-------------|
| M1 | Medium | `activitySchema.ts`: Added `.max(99)` to headcount in Zod schema (was unbounded, backend enforces 1-99) |
| M2 | Medium | `AdminActivitiesPage.tsx`: Removed buggy `templateId` override in createMutation that silently re-applied template roles when user removed them |
| M3 | Medium | `AdminActivitiesPage.test.tsx`: Added 3 missing integration tests (role in create, role modify in edit, remove all roles in edit) |
| M4 | Medium | `RoleRosterEditor.test.tsx`: Added 4 missing unit tests (name input, empty name validation, duplicate name validation, keyboard Enter) |
| L2 | Low | `activitySchema.ts`: Changed duplicate role name error message from English to French |
| L3 | Low | `AdminActivitiesPage.tsx`: Removed dead `useFieldArray` call and unused import |
| L4 | Low | Story file: Corrected "Modified files (13)" to "Modified files (14)" |
| BUG | Bug | `RoleRosterEditor.tsx`: Fixed field array root error display — RHF v7 `useFieldArray` stores root-level errors at `.root`, not directly on `errors.roles`. Added fallback check for both locations. |

### Change Log

| File | Change |
|------|--------|
| `src/SdaManagement.Api/Dtos/Activity/ActivityRoleInput.cs` | **NEW** — DTO for role input (Id?, RoleName, Headcount) |
| `src/SdaManagement.Api/Validators/ActivityRoleInputValidator.cs` | **NEW** — FluentValidation rules for role input |
| `src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs` | Added `List<ActivityRoleInput>? Roles` property |
| `src/SdaManagement.Api/Dtos/Activity/UpdateActivityRequest.cs` | Added `List<ActivityRoleInput>? Roles` property |
| `src/SdaManagement.Api/Validators/CreateActivityRequestValidator.cs` | Added role list validation (max 20, unique names, per-role validator) |
| `src/SdaManagement.Api/Validators/UpdateActivityRequestValidator.cs` | Added role list validation (same as create) |
| `src/SdaManagement.Api/Services/ActivityService.cs` | Extended CreateAsync for explicit roles; added reconcile pattern in UpdateAsync |
| `tests/SdaManagement.Api.UnitTests/Validators/ActivityRoleInputValidatorTests.cs` | **NEW** — 10 unit tests for role input validation |
| `tests/SdaManagement.Api.IntegrationTests/Activities/ActivityEndpointTests.cs` | Added 18 integration tests for role roster CRUD operations |
| `src/sdamanagement-web/src/schemas/activitySchema.ts` | Added `activityRoleInputSchema` with `.catch(undefined)` for RHF id conflict; added `roles` to schemas |
| `src/sdamanagement-web/src/index.css` | Added `--warning` OKLCH color token (light + dark) |
| `src/sdamanagement-web/src/components/activity/RoleRosterEditor.tsx` | **NEW** — RoleRosterEditor with useFieldArray, HeadcountStepper, AssignmentBadge, AlertDialog for delete confirmation |
| `src/sdamanagement-web/src/components/activity/RoleRosterEditor.test.tsx` | **NEW** — 13 unit tests for RoleRosterEditor |
| `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx` | Integrated RoleRosterEditor, updated template→form flow, roles in create/edit mutations |
| `src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx` | Updated template tests, added 4 new tests for role roster integration |
| `src/sdamanagement-web/src/mocks/handlers/activities.ts` | Updated POST/PUT handlers to support explicit roles with assignments |
| `src/sdamanagement-web/src/test-utils.tsx` | Added roleRoster i18n translations for test rendering |
| `src/sdamanagement-web/public/locales/fr/common.json` | Added `roleRoster` section with 18 French i18n keys |
| `src/sdamanagement-web/public/locales/en/common.json` | Added `roleRoster` section with 18 English i18n keys |

### File List

**New files (6):**
- `src/SdaManagement.Api/Dtos/Activity/ActivityRoleInput.cs`
- `src/SdaManagement.Api/Validators/ActivityRoleInputValidator.cs`
- `tests/SdaManagement.Api.UnitTests/Validators/ActivityRoleInputValidatorTests.cs`
- `src/sdamanagement-web/src/components/activity/RoleRosterEditor.tsx`
- `src/sdamanagement-web/src/components/activity/RoleRosterEditor.test.tsx`

**Modified files (14):**
- `src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs`
- `src/SdaManagement.Api/Dtos/Activity/UpdateActivityRequest.cs`
- `src/SdaManagement.Api/Validators/CreateActivityRequestValidator.cs`
- `src/SdaManagement.Api/Validators/UpdateActivityRequestValidator.cs`
- `src/SdaManagement.Api/Services/ActivityService.cs`
- `tests/SdaManagement.Api.IntegrationTests/Activities/ActivityEndpointTests.cs`
- `src/sdamanagement-web/src/schemas/activitySchema.ts`
- `src/sdamanagement-web/src/index.css`
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx`
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx`
- `src/sdamanagement-web/src/mocks/handlers/activities.ts`
- `src/sdamanagement-web/src/test-utils.tsx`
- `src/sdamanagement-web/public/locales/fr/common.json`
- `src/sdamanagement-web/public/locales/en/common.json`
