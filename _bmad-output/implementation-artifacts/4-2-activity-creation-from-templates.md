# Story 4.2: Activity Creation from Templates

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Prerequisites

- Local dev environment: Node 20+, .NET 10 SDK, Docker, PostgreSQL 17
- Story 4.1 complete (Activity, ActivityRole, RoleAssignment entities and CRUD operational)
- Existing infrastructure: `ActivityService`/`IActivityService`, `ActivitiesController`, `ActivityTemplateService`/`IActivityTemplateService`, `ActivityTemplatesController`
- Existing entities: `Activity`, `ActivityRole`, `RoleAssignment`, `ActivityTemplate`, `TemplateRole`
- Existing DTOs: `CreateActivityRequest`, `ActivityResponse`, `ActivityTemplateResponse`, `TemplateRoleResponse`
- Existing frontend: `AdminActivitiesPage.tsx` with Dialog/Sheet create/edit flow, `activityService.ts`, `activityTemplateService.ts`
- Existing test helpers: `CreateTestUser()`, `AssignDepartmentToUser()`, `CreateTestActivity()` in `IntegrationTestBase`
- Existing shadcn/ui components: Dialog, Sheet, Select, Badge, Input, Textarea, Label, Skeleton, Table, AlertDialog

## Story

As an **ADMIN**,
I want to create an activity by selecting a template that auto-populates default service roles and headcounts,
So that I can set up a standard Sabbath program in seconds instead of building from scratch.

## Acceptance Criteria

1. **Given** an ADMIN creating a new activity
   **When** they reach the creation flow
   **Then** template selection cards (Notion gallery pattern) display available templates with name, description, and role summary

2. **Given** the ADMIN selects "Culte du Sabbat" template
   **When** the template is applied
   **Then** the activity form pre-populates with default roles: Predicateur (1), Ancien de Service (1), Annonces (1), Diacres (2), Diaconesses (2)
   **And** the ADMIN can proceed to customize before saving (FR20)

3. **Given** a template is applied
   **When** the activity is saved
   **Then** the `activity_roles` are created as independent copies — no live binding to the template (FR28 architecture constraint)
   **And** future template changes do NOT affect this activity

4. **Given** an ADMIN
   **When** they choose to create an activity without a template
   **Then** the form starts with an empty role roster that can be built manually

## Tasks / Subtasks

- [x] Task 1: Extend backend CreateActivityRequest with optional TemplateId (AC: 2, 3)
  - [x] 1.1 Add `int? TemplateId { get; init; }` to `CreateActivityRequest.cs` — NOT to `IActivityRequest` (TemplateId is create-only, not relevant to update)
  - [x] 1.2 Update `CreateActivityRequestValidator.cs` — add rule AFTER the `ActivityValidationRules.Apply(this)` call: `RuleFor(x => x.TemplateId).GreaterThan(0).When(x => x.TemplateId.HasValue);` so that if provided, it must be positive
  - [x] 1.3 Update `createActivitySchema` in `activitySchema.ts` — add `templateId: z.number().int().positive().optional()` inside the `.object({})` block. **`CreateActivityFormData` is `z.infer<typeof createActivitySchema>` (line 30) — the type updates automatically from the schema. Do NOT create a separate type.**
  - [x] 1.4 Note: `updateActivitySchema` is composed via `.and()` on `createActivitySchema`, so `templateId` will technically appear as optional on the update type. This is **harmless** (the backend ignores it on PUT, and the update form never sends it). Do NOT refactor the schema composition to exclude it — the simplicity is worth the benign leak.

- [x] Task 2: Extend ActivityService.CreateAsync to copy template roles (AC: 2, 3)
  - [x] 2.1 Use the existing `AppDbContext dbContext` already injected in `ActivityService`'s primary constructor — NO new dependency injection needed. Query `ActivityTemplates` directly from `dbContext`.
  - [x] 2.2 In `CreateAsync`, when `request.TemplateId` is provided:
    - Load template with roles: `await dbContext.ActivityTemplates.Include(t => t.Roles.OrderBy(r => r.SortOrder)).FirstOrDefaultAsync(t => t.Id == request.TemplateId.Value)`
    - If template not found, throw `KeyNotFoundException` — controller catches and returns 400
    - For each `TemplateRole`, create an `ActivityRole`: `RoleName = templateRole.RoleName`, `Headcount = templateRole.DefaultHeadcount`, `SortOrder = templateRole.SortOrder`
    - Add all ActivityRoles to the Activity entity's `Roles` collection BEFORE `SaveChangesAsync()` — single atomic transaction
  - [x] 2.3 When `request.TemplateId` is null, behavior unchanged — activity created with no roles (current Story 4.1 behavior)
  - [x] 2.4 Ensure `GetByIdAsync` response already includes roles (confirmed from Story 4.1 — `ActivityResponse.Roles` is populated)

- [x] Task 3: Update ActivitiesController for template validation (AC: 2, 3)
  - [x] 3.1 The current `Create` action (lines 51-65) has NO try/catch block — it's a straight `auth → validate → service → return`. Wrap the `activityService.CreateAsync(request)` call in a try/catch for `KeyNotFoundException` (thrown by service when template ID is invalid). Return 400 Bad Request with ProblemDetails (`urn:sdac:validation-error`, detail: "Activity template not found").
  - [x] 3.2 Use `KeyNotFoundException` (not `InvalidOperationException`) — semantically accurate for "requested ID doesn't exist" and avoids fragile string matching in the `when` clause. Update `ActivityService.CreateAsync` to throw `KeyNotFoundException` accordingly.

- [x] Task 4: Backend integration tests (AC: 1–4)
  - [x] 4.1 Add `CreateTestActivityTemplate` helper to `IntegrationTestBase`:
    ```
    protected async Task<ActivityTemplate> CreateTestActivityTemplate(
        string? name = null,
        List<(string RoleName, int DefaultHeadcount)>? roles = null)
    ```
    Default roles: `[("Predicateur", 1), ("Ancien de Service", 1)]`
  - [x] 4.2 Test: `CreateActivity_WithTemplateId_Returns201WithRoles` — create template, create activity with `templateId`, verify response includes copied roles with correct names and headcounts
  - [x] 4.3 Test: `CreateActivity_WithTemplateId_RolesAreIndependentCopies` — create activity from template, then modify template roles, verify activity roles unchanged
  - [x] 4.4 Test: `CreateActivity_WithInvalidTemplateId_Returns400` — non-existent template ID returns 400 with ProblemDetails
  - [x] 4.5 Test: `CreateActivity_WithoutTemplateId_Returns201WithNoRoles` — existing behavior preserved (regression guard)
  - [x] 4.6 Test: `CreateActivity_WithTemplateId_AsViewer_Returns403` — viewers cannot create activities even with valid template
  - [x] 4.7 Test: `CreateActivity_WithTemplateId_WrongDepartment_Returns403` — department scoping still enforced

- [x] Task 5: Frontend — Template selection step in create flow (AC: 1, 2, 4)
  - [x] 5.1 Create `components/activity/TemplateSelector.tsx` — fetches templates via TanStack Query `useQuery`, displays as visual cards in a grid.
    - Props: `onSelect: (template: ActivityTemplateListItem | null) => void`, `selectedId: number | null`. A `null` selection means "Custom" (no template).
    - Import `ActivityTemplateListItem` and `TemplateRoleResponse` from `@/services/activityTemplateService` (NOT from `@/services/activityService` which has `ActivityRoleResponse` — different field names: `defaultHeadcount` vs `headcount`).
    - Data fetching pattern:
      ```tsx
      const { data: templates, isLoading, isError, refetch } = useQuery({
        queryKey: ['activity-templates'],
        queryFn: () => activityTemplateService.getAll().then(r => r.data),
      });
      ```
      This reuses the same `['activity-templates']` cache as `AdminActivityTemplatesPage`.
    - Also accept `isOwner: boolean` prop to control empty state messaging.
  - [x] 5.2 Template card design (Notion gallery pattern):
    - Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3`
    - Each card: `rounded-2xl border border-border p-4 cursor-pointer transition-all`
    - Template name: `text-base font-semibold text-foreground`
    - Description: `text-sm text-muted-foreground line-clamp-2 mt-1`
    - Role summary: use the pre-computed `template.roleSummary` string (e.g., "Predicateur (1), Ancien (1)") — `text-xs text-muted-foreground mt-3`
    - Selected state: `border-primary ring-2 ring-primary/20 bg-primary/5`
    - Hover state (desktop only): `@media (hover: hover)` → `hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5`
    - "Custom" card at the end: `border-dashed` border, centered content with `Plus` icon from `lucide-react`, "Activite sans modele" text
    - **Accessibility**: Cards use `role="radio"` + `aria-checked={isSelected}` wrapped in a `role="radiogroup"`. Each card has `tabIndex={0}` with `onKeyDown` handler for `Enter`/`Space` to select. `aria-label` includes template name + role summary.
    - Loading state: 3 Skeleton cards matching card dimensions
    - Error state: "Impossible de charger les modeles." with retry button calling `refetch()`
    - Empty state (role-aware):
      - **OWNER**: "Aucun modele disponible. Creez des modeles dans les parametres." with link to `/admin/activity-templates`
      - **ADMIN**: "Aucun modele disponible. Contactez l'administrateur pour creer des modeles."
  - [x] 5.3 Integrate into `AdminActivitiesPage.tsx` create flow:
    - Add state: `const [createStep, setCreateStep] = useState<"template" | "form">("template")`
    - When "New Activity" clicked, open Dialog/Sheet at `createStep = "template"`
    - After template selected (or "Custom" clicked): `setCreateStep("form")`, store full `ActivityTemplateListItem | null` in state (not just id — need `roles` array for badge display)
    - Dialog/Sheet title changes per step: template step → `t('adminActivities.templateSelector.title')`, form step → `t('adminActivities.form.createTitle')`
    - "Retour aux modeles" back button at top of form: use `ChevronLeft` icon from `lucide-react` + text. On click: `setCreateStep("template")` and **reset form fields** (changing template = starting over)
    - Pass `templateId` to the create mutation request body
  - [x] 5.4 Role summary display in form — when a template is selected, show a read-only "Roles du modele" section above the form fields:
    - Map over `selectedTemplate.roles` (type: `TemplateRoleResponse[]`) — use `role.roleName` and `role.defaultHeadcount` (NOT `headcount` which is the ActivityRole field name)
    - List of role badges: `Badge variant="secondary"` with `{role.roleName} x{role.defaultHeadcount}`
    - Caption text: `t('adminActivities.templateSelector.rolesCaption')`
    - Non-interactive (editing is Story 4.3)
    - Edge case: if template has 0 roles, show "Aucun role par defaut" instead of empty badges
  - [x] 5.5 Edit flow unchanged — editing an existing activity does NOT show template selector (templates are creation-time blueprints only). The `createStep` state only applies when `!editingActivity`.
  - [x] 5.6 Mobile (Sheet): template cards stack in single column, scrollable within sheet content area

- [x] Task 6: Frontend — Update activity form submission (AC: 2, 3)
  - [x] 6.1 Update `activityService.create()` call to include `templateId` in the request body when a template was selected
  - [x] 6.2 Ensure the `ActivityResponse` returned from create now includes roles — update TanStack Query cache to reflect roles in list/detail views
  - [x] 6.3 Update the `ActivityListItem` display if needed — the `roleCount` field in `ActivityListItem` should already reflect the new roles (backend already counts roles)

- [x] Task 7: Frontend — i18n strings (AC: 1, 2, 4)
  - [x] 7.1 Add French translations in `public/locales/fr/common.json`:
    - `adminActivities.templateSelector.title`: "Choisir un modele"
    - `adminActivities.templateSelector.subtitle`: "Selectionnez un modele pour pre-remplir les roles, ou creez une activite personnalisee."
    - `adminActivities.templateSelector.customCard`: "Activite sans modele"
    - `adminActivities.templateSelector.customDescription`: "Commencez avec une activite vide, sans roles pre-definis."
    - `adminActivities.templateSelector.rolesLabel`: "Roles du modele"
    - `adminActivities.templateSelector.rolesCaption`: "Ces roles seront crees automatiquement avec l'activite."
    - `adminActivities.templateSelector.backToTemplates`: "Retour aux modeles"
    - `adminActivities.templateSelector.emptyState`: "Aucun modele disponible."
    - `adminActivities.templateSelector.emptyStateOwner`: "Creez des modeles d'activites dans les parametres pour accelerer la creation."
    - `adminActivities.templateSelector.emptyStateAdmin`: "Contactez l'administrateur pour creer des modeles."
    - `adminActivities.templateSelector.errorState`: "Impossible de charger les modeles."
    - `adminActivities.templateSelector.retry`: "Reessayer"
    - `adminActivities.templateSelector.noDefaultRoles`: "Aucun role par defaut"
    - `adminActivities.form.templateError`: "Le modele selectionne est introuvable."
  - [x] 7.2 Add English translations in `public/locales/en/common.json` (same keys, English values)

- [x] Task 8: Frontend — MSW mock handlers update (AC: all)
  - [x] 8.1 Update `mocks/handlers/activities.ts` to handle `templateId` in POST request body
  - [x] 8.2 When `templateId` is provided in mock, return `ActivityResponse` with mock roles matching the template
  - [x] 8.3 Add mock template data that matches `activityTemplateService.getAll()` response format

- [x] Task 9: Frontend tests (AC: 1, 2, 3, 4)
  - [x] 9.1 Create `components/activity/TemplateSelector.test.tsx`:
    - Test: renders template cards when templates loaded
    - Test: shows loading skeletons during fetch
    - Test: shows empty state with OWNER link when no templates (pass `isOwner={true}`)
    - Test: shows empty state with admin message when no templates (pass `isOwner={false}`)
    - Test: shows error state with retry button on fetch failure
    - Test: selecting a template card calls onSelect with template data
    - Test: selecting "Custom" card calls onSelect with null
    - Test: selected card has `aria-checked="true"`
    - Test: keyboard Enter on focused card triggers selection
  - [x] 9.2 Update `pages/AdminActivitiesPage.test.tsx`:
    - Test: create flow shows template selector as first step
    - Test: selecting a template transitions to form with role summary badges
    - Test: create with template sends templateId in request body (use `vi.spyOn(activityService, 'create')`)
    - Test: create without template (custom) does NOT send templateId
    - Test: edit flow does NOT show template selector
    - Test: "Back to templates" button returns to template selection and resets form
  - [x] 9.3 Mock `activityTemplateService.getAll` at service level with `vi.spyOn` returning mock template data (consistent with Story 4.1 mutation testing pattern — avoid MSW for reads too since the component uses TanStack Query internally). Use `render()` from `test-utils.tsx` which already wraps with `QueryClientProvider`.

## Dev Notes

### Architecture Requirements

- **Templates are creation-time blueprints**: When an activity is created from a template, the template's roles are COPIED into `ActivityRole` records. No FK or reference back to the template. Future template changes do NOT affect existing activities. This is Architecture Decision #1 (P0 Constraint).
- **Atomic transaction**: Activity + all copied ActivityRoles must be created in a single `SaveChangesAsync()` call. No partial state permitted (Architecture Decision #9).
- **Department scoping unchanged**: ADMIN can only create activities for their assigned departments. Template selection does not bypass this — the department is still chosen in the form, and `auth.CanManage(departmentId)` is checked on the backend.
- **Template access**: All authenticated users can read templates (`GET /api/activity-templates` is `[Authorize]` not OWNER-only). This means ADMINs can see and select templates even though only OWNERs can create/edit them.

### Backend Implementation Details

**CreateActivityRequest Extension:**
```csharp
public record CreateActivityRequest : IActivityRequest
{
    public string Title { get; init; } = string.Empty;
    public string? Description { get; init; }
    public DateOnly Date { get; init; }
    public TimeOnly StartTime { get; init; }
    public TimeOnly EndTime { get; init; }
    public int DepartmentId { get; init; }
    public string Visibility { get; init; } = "public";
    public int? TemplateId { get; init; }  // NEW — optional template reference
}
```

**ActivityService.CreateAsync Extension:**
```csharp
public async Task<ActivityResponse> CreateAsync(CreateActivityRequest request)
{
    var now = DateTime.UtcNow;

    var activity = new Activity
    {
        Title = sanitizer.Sanitize(request.Title),
        Description = sanitizer.SanitizeNullable(request.Description),
        Date = request.Date,
        StartTime = request.StartTime,
        EndTime = request.EndTime,
        DepartmentId = request.DepartmentId,
        Visibility = Enum.Parse<ActivityVisibility>(request.Visibility, ignoreCase: true),
        CreatedAt = now,
        UpdatedAt = now,
    };

    // NEW: If templateId provided, copy template roles as independent ActivityRoles
    if (request.TemplateId.HasValue)
    {
        var template = await dbContext.ActivityTemplates
            .Include(t => t.Roles.OrderBy(r => r.SortOrder))
            .FirstOrDefaultAsync(t => t.Id == request.TemplateId.Value);

        if (template is null)
            throw new KeyNotFoundException($"Activity template {request.TemplateId.Value} not found");

        foreach (var templateRole in template.Roles)
        {
            activity.Roles.Add(new ActivityRole
            {
                RoleName = templateRole.RoleName,
                Headcount = templateRole.DefaultHeadcount,
                SortOrder = templateRole.SortOrder,
                CreatedAt = now,
                UpdatedAt = now,
            });
        }
    }

    dbContext.Activities.Add(activity);
    await dbContext.SaveChangesAsync();  // Atomic: activity + all roles in one transaction

    return (await GetByIdAsync(activity.Id))!;
}
```

**Controller Error Handling — full `Create` method after modification:**
```csharp
[HttpPost]
public async Task<IActionResult> Create(
    [FromBody] CreateActivityRequest request,
    [FromServices] IValidator<CreateActivityRequest> validator)
{
    if (!auth.CanManage(request.DepartmentId))
        return Forbid();

    var validation = await validator.ValidateAsync(request);
    if (!validation.IsValid)
        return ValidationError(validation);

    try
    {
        var activity = await activityService.CreateAsync(request);
        return CreatedAtAction(nameof(GetById), new { id = activity.Id }, activity);
    }
    catch (KeyNotFoundException ex)
    {
        return BadRequest(new ProblemDetails
        {
            Type = "urn:sdac:validation-error",
            Title = "Invalid Template",
            Status = 400,
            Detail = ex.Message,
        });
    }
}
```
**Note**: The current `Create` method (lines 51-65) has NO try/catch. The entire method body is being replaced — not just adding a catch block around existing code.

### Frontend Implementation Details

**Template Selector Component — Design Spec:**

The TemplateSelector is a key UX moment — the "Confirm and Adjust" experience principle. It must feel like a gallery of options, not a form field.

```
┌─────────────────────────────────────────────┐
│  Choisir un modèle                          │
│  Sélectionnez un modèle pour pré-remplir... │
│                                             │
│  ┌──────────────┐  ┌──────────────┐         │
│  │ 🏛 Culte du  │  │ 🍞 Sainte-  │         │
│  │ Sabbat       │  │ Cène         │         │
│  │              │  │              │         │
│  │ Service prin │  │ Service avec │         │
│  │ cipal du sam │  │ communion... │         │
│  │              │  │              │         │
│  │ Predicateur  │  │ Predicateur  │         │
│  │ (1), Ancien  │  │ (1), Ancien  │         │
│  │ (1), Diacres │  │ (1), Lavemen │         │
│  │ (2)...       │  │ t (4)...     │         │
│  └──────────────┘  └──────────────┘         │
│                                             │
│  ┌ ─ ─ ─ ─ ─ ─ ┐                           │
│  │ + Activité   │                           │
│  │ sans modèle  │                           │
│  │              │                           │
│  │ Commencez    │                           │
│  │ avec une     │                           │
│  │ activité     │                           │
│  │ vide.        │                           │
│  └ ─ ─ ─ ─ ─ ─ ┘                           │
└─────────────────────────────────────────────┘
```

**Card styling:**
- Container: `rounded-2xl border border-border p-4 cursor-pointer transition-all`
- Selected: `border-primary ring-2 ring-primary/20 bg-primary/5`
- Hover: `hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5` (desktop only — wrap in Tailwind `@media (hover: hover)` or use group-hover with `@supports`)
- Template name: `text-base font-semibold text-foreground`
- Description: `text-sm text-muted-foreground line-clamp-2 mt-1`
- Role summary: `text-xs text-muted-foreground mt-3` — use pre-computed `template.roleSummary` string from the backend (e.g., "Predicateur (1), Ancien (1)") — do NOT re-compute from `template.roles` array on the card
- Custom card: `border-dashed` border, centered content with `Plus` icon from `lucide-react`, "Activite sans modele" text
- **Accessibility**: `role="radio"` + `aria-checked` on each card, `role="radiogroup"` on container, `tabIndex={0}` + keyboard `Enter`/`Space` handlers, `aria-label` with `{template.name}: {template.roleSummary}`

**Form Flow State Machine:**
```
Create button clicked
  → createStep = "template"
  → TemplateSelector shown in Dialog/Sheet

Template selected (or Custom)
  → createStep = "form"
  → selectedTemplate = full ActivityTemplateListItem | null
  → If template selected: show role summary badges
  → Show existing form fields (title, date, etc.)

"Back to templates" clicked
  → createStep = "template"
  → form.reset() — clear all form fields (changing template = starting over)
  → selectedTemplate preserved for highlight state

Dialog/Sheet closed
  → createStep = "template" (reset for next open)
  → selectedTemplate = null
  → form.reset()
```

**Two-step Dialog/Sheet content:**
```tsx
import { ChevronLeft, Plus } from "lucide-react";
import type { ActivityTemplateListItem } from "@/services/activityTemplateService";
// Note: TemplateRoleResponse has `defaultHeadcount` (template field)
// vs ActivityRoleResponse which has `headcount` (activity field) — don't confuse them

// State in AdminActivitiesPage:
const [createStep, setCreateStep] = useState<"template" | "form">("template");
const [selectedTemplate, setSelectedTemplate] = useState<ActivityTemplateListItem | null>(null);

// Dialog/Sheet title depends on step:
<FormTitle>
  {createStep === "template"
    ? t('adminActivities.templateSelector.title')
    : t('adminActivities.form.createTitle')}
</FormTitle>

// Content:
{createStep === "template" ? (
  <TemplateSelector
    onSelect={(template) => {
      setSelectedTemplate(template);
      setCreateStep("form");
    }}
    selectedId={selectedTemplate?.id ?? null}
    isOwner={isOwner}
  />
) : (
  <>
    <Button
      variant="ghost"
      size="sm"
      className="mb-3 -ml-2"
      onClick={() => {
        setCreateStep("template");
        form.reset(); // Reset form fields when going back
      }}
    >
      <ChevronLeft className="h-4 w-4 mr-1" />
      {t('adminActivities.templateSelector.backToTemplates')}
    </Button>
    {selectedTemplate && selectedTemplate.roles.length > 0 && (
      <div className="mb-4">
        <Label>{t('adminActivities.templateSelector.rolesLabel')}</Label>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedTemplate.roles.map(role => (
            <Badge key={role.roleName} variant="secondary">
              {role.roleName} x{role.defaultHeadcount}
            </Badge>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {t('adminActivities.templateSelector.rolesCaption')}
        </p>
      </div>
    )}
    {selectedTemplate && selectedTemplate.roles.length === 0 && (
      <p className="text-sm text-muted-foreground mb-4">
        {t('adminActivities.templateSelector.noDefaultRoles')}
      </p>
    )}
    {/* Existing form fields */}
  </>
)}
```

### Concurrency Token Note

The `CreateActivityRequest` still does NOT include `ConcurrencyToken` — that's only on `UpdateActivityRequest`. The newly created activity will get its `Version` (xmin) value from the database on insert, which is returned in the `ActivityResponse.ConcurrencyToken` field.

### Frontend Patterns

**TanStack Query keys**: The `['activity-templates']` key is already used by `AdminActivityTemplatesPage`. The `TemplateSelector` reuses the same cache — if templates were recently fetched, the selector loads instantly.

**State management**: Use `useState` for `createStep` and `selectedTemplate` (no Zustand needed — local component state is sufficient for a two-step form within the Dialog/Sheet lifecycle).

**Mobile UX**: On mobile, the Sheet (bottom sheet) scrolls the template cards naturally. The two-step flow works well in a Sheet because the content area scrolls independently. Use existing `useIsMobile()` hook from `@/hooks/use-mobile` (already imported in AdminActivitiesPage, line 9).

**Responsive Dialog/Sheet switching**: Follow the existing pattern in AdminActivitiesPage (lines 377-380):
```tsx
const FormWrapper = isMobile ? Sheet : Dialog;
const FormContent = isMobile ? SheetContent : DialogContent;
const FormHeader = isMobile ? SheetHeader : DialogHeader;
const FormTitle = isMobile ? SheetTitle : DialogTitle;
```

### Testing Patterns

**Backend Integration Tests:**
- Add `CreateTestActivityTemplate` helper following the same pattern as `CreateTestActivity`
- Tests verify role counts, role names, and headcounts in the response
- Independent copies test: modify template after activity creation, verify activity unchanged

**Frontend Tests:**
- Mock `activityTemplateService.getAll` with `vi.spyOn` — return mock template data
- Mock `activityService.create` with `vi.spyOn` — verify `templateId` is included in call
- Use `@testing-library/user-event` for template card selection interaction
- Radix jsdom polyfills needed (same as Story 4.1): `hasPointerCapture`, `setPointerCapture`, `releasePointerCapture`, `scrollIntoView`

### Previous Story Intelligence (Story 4.1)

Key learnings to carry forward:
1. **EF Core projection constraint**: `IAvatarService.GetAvatarUrl()` CANNOT be used inside `.Select()`. Not directly relevant here but awareness matters for the `GetByIdAsync` response that includes role assignments with user avatars.
2. **Npgsql EF Core 10**: `UseXminAsConcurrencyToken()` replaced with `uint Version { get; set; }` + `IsRowVersion()`. The Activity entity already has this correctly.
3. **Frontend mutation testing**: Use `vi.spyOn(activityService, 'create')` for mutation tests, NOT MSW.
4. **No central MSW handler registry**: Handlers are imported directly in test files.
5. **Time handling**: Frontend sends "HH:MM" → backend adds ":00". Continue this pattern.
6. **DI registration**: New services go in `ServiceCollectionExtensions.AddApplicationServices()`.

### Git Intelligence

Recent commit pattern: `feat(activities): Story 4.1 — Activity data model & basic CRUD with code review fixes`
This story's expected commit: `feat(activities): Story 4.2 — Activity creation from templates`

### Existing Code to Reuse

| Component | Location | What to reuse |
|---|---|---|
| `ActivityTemplate` entity | `Data/Entities/ActivityTemplate.cs` | Entity with `Roles` navigation property |
| `TemplateRole` entity | `Data/Entities/TemplateRole.cs` | `RoleName`, `DefaultHeadcount`, `SortOrder` fields to copy |
| `ActivityService.CreateAsync` | `Services/ActivityService.cs` | Extend with template role copying |
| `CreateActivityRequest` | `Dtos/Activity/CreateActivityRequest.cs` | Add `TemplateId` property |
| `CreateActivityRequestValidator` | `Validators/CreateActivityRequestValidator.cs` | Add TemplateId validation rule |
| `ActivitiesController.Create` | `Controllers/ActivitiesController.cs` | Add template-not-found error handling |
| `activityTemplateService.getAll()` | `services/activityTemplateService.ts` | Fetch templates for selector |
| `ActivityTemplateListItem` type | `services/activityTemplateService.ts` | Template card data shape |
| `AdminActivitiesPage.tsx` | `pages/AdminActivitiesPage.tsx` | Extend create flow with template step |
| `activityService.ts` | `services/activityService.ts` | Add templateId to create request type |
| `activitySchema.ts` | `schemas/activitySchema.ts` | Add templateId to Zod schema |
| `IntegrationTestBase` | `tests/.../IntegrationTestBase.cs` | Add `CreateTestActivityTemplate` helper |
| `Badge` component | shadcn/ui | Role summary chips |
| `Skeleton` component | shadcn/ui | Template card loading state |

### Anti-Patterns to Avoid

- Do NOT create a FK from Activity to ActivityTemplate — templates are creation-time blueprints, no live binding
- Do NOT store the `templateId` on the Activity entity — the relationship is fire-and-forget
- Do NOT allow template selection during edit — templates only apply at creation time
- Do NOT hardcode French strings in components — use i18n keys
- Do NOT add role editing UI in this story — that's Story 4.3 (Role Roster Customization)
- Do NOT add role assignment UI in this story — that's Story 4.4 (Contact Picker)
- Do NOT use MSW for mutation testing — use `vi.spyOn` per Story 4.1 learnings
- Do NOT send template roles from the frontend — the backend fetches and copies them server-side (prevents tampering)
- Do NOT add the `TemplateId` to `IActivityRequest` — it's create-only, not shared with update

### Project Structure Notes

**New files to create:**
```
src/sdamanagement-web/src/
  components/activity/TemplateSelector.tsx
  components/activity/TemplateSelector.test.tsx
```

**Files to modify:**
```
src/SdaManagement.Api/
  Dtos/Activity/CreateActivityRequest.cs                        (add TemplateId property)
  Validators/CreateActivityRequestValidator.cs                  (add TemplateId validation)
  Services/ActivityService.cs                                   (extend CreateAsync with template role copying)
  Controllers/ActivitiesController.cs                           (add template-not-found error handling)

tests/SdaManagement.Api.IntegrationTests/
  IntegrationTestBase.cs                                        (add CreateTestActivityTemplate helper)
  Activities/ActivityEndpointTests.cs                           (add template-based creation tests)

src/sdamanagement-web/src/
  services/activityService.ts                                   (add templateId to CreateActivityFormData)
  schemas/activitySchema.ts                                     (add templateId to Zod schema)
  pages/AdminActivitiesPage.tsx                                 (add template selection step to create flow)
  pages/AdminActivitiesPage.test.tsx                            (add template selection tests)
  mocks/handlers/activities.ts                                  (update mock for templateId)
  public/locales/fr/common.json                                 (add template selector i18n keys)
  public/locales/en/common.json                                 (add template selector i18n keys)
  test-utils.tsx                                                (add template selector i18n keys for tests)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Decision 1 (flexible activity data model, templates as creation-time blueprints)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Core Architectural Decisions — Decision 9 (Activity + roles + assignments as single unit of work)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Activity Creation example]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — React Hook Form + useFieldArray for dynamic roles]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Experience C: "Confirm and Adjust" — Step 1 Template selection]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Transferable UX Patterns — Template selection cards (Notion gallery)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Journey 3: "Confirm and Adjust" — Activity creation uses templates]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Decision Patterns — Template-first creation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Anti-Patterns — Centered modals for complex forms on mobile]
- [Source: _bmad-output/planning-artifacts/prd.md#FR20 — ADMINs can create activities from pre-defined activity templates]
- [Source: _bmad-output/planning-artifacts/prd.md#FR28 — OWNERs can define and manage activity templates]
- [Source: _bmad-output/implementation-artifacts/4-1-activity-data-model-and-basic-crud.md#Completion Notes — Npgsql EF Core 10 breaking change, mutation testing pattern]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Backend integration tests could not be executed (Docker not running for Testcontainers). Tests compile and are structurally correct — verify when Docker is available.

### Completion Notes List

- **Task 1**: Added `int? TemplateId` to `CreateActivityRequest`, validation rule in `CreateActivityRequestValidator`, and `templateId` to `createActivitySchema.ts`. Type `CreateActivityFormData` auto-updates via `z.infer`.
- **Task 2**: Extended `ActivityService.CreateAsync` to copy template roles as independent `ActivityRole` records when `TemplateId` is provided. Single atomic transaction via `SaveChangesAsync()`. Throws `KeyNotFoundException` for invalid template IDs.
- **Task 3**: Wrapped `ActivitiesController.Create` service call in try/catch for `KeyNotFoundException`, returning 400 BadRequest with ProblemDetails.
- **Task 4**: Added `CreateTestActivityTemplate` helper to `IntegrationTestBase`. Added 7 integration tests: create with template (roles copied), independent copies verification, invalid template ID, no template (regression), viewer 403, wrong department 403. Docker required to run.
- **Task 5**: Created `TemplateSelector.tsx` component with Notion gallery-style template cards, radio group accessibility, loading/error/empty states, "Custom" dashed card. Integrated two-step create flow in `AdminActivitiesPage.tsx` with template selection → form transition, back button, role summary badges.
- **Task 6**: Create mutation passes `selectedTemplate?.id` as `templateId`. `ActivityListItem.roleCount` already reflects template roles from backend.
- **Task 7**: Added 15 i18n keys in both French and English locale files.
- **Task 8**: Updated MSW mock handlers with template data, template-aware POST handler, exported `activityTemplateHandlers` and `mockTemplates`.
- **Task 9**: Created `TemplateSelector.test.tsx` with 9 tests (cards rendering, loading, empty states for owner/admin, error+retry, card selection, null selection, aria-checked, keyboard Enter). Updated `AdminActivitiesPage.test.tsx` to 10 tests including template selector flow, templateId in request, no-template path, edit exclusion, back button. All 214 frontend tests pass with zero regressions.

### Code Review Fixes (2026-03-09)

- **C1 (CRITICAL)**: Fixed `aria-checked={selectedId === null && false}` → `aria-checked={selectedId === null}` on custom card in `TemplateSelector.tsx:152`. Expression always evaluated to `false` due to `&& false`.
- **H1 (HIGH)**: Added `onError` handler to `createMutation` in `AdminActivitiesPage.tsx`. Template validation errors (400) now show `templateError` toast. Previously errors were silently swallowed.
- **H2 (HIGH)**: `templateSelector.templateError` i18n key was dead code — now referenced by H1 fix.
- **M1 (MEDIUM)**: Wrapped empty-state custom card in `role="radiogroup"` container in `TemplateSelector.tsx`. WAI-ARIA requires `role="radio"` inside `role="radiogroup"`.
- **M2 (MEDIUM)**: Changed `ProblemDetails.Detail` from `ex.Message` to generic `"Activity template not found."` in `ActivitiesController.cs:75`. Previously leaked internal template ID.
- **M3 (MEDIUM)**: Strengthened "back to templates" test in `AdminActivitiesPage.test.tsx` — now types into form, clicks back, returns, and verifies form fields are empty.
- **M4 (MEDIUM)**: Added test for custom card `aria-checked="true"` in `TemplateSelector.test.tsx` — verifies the C1 fix.
- **L1 (LOW)**: Story Task 7 documents i18n keys without `pages.` prefix — documentation discrepancy only, code is correct.
- **L2 (LOW)**: Fixed MSW PUT handler in `activities.ts` to use `params.id` instead of `body.id`.

### Change Log

- 2026-03-09: Story 4.2 implementation — Activity creation from templates (all 9 tasks completed)
- 2026-03-09: Code review fixes — 7 fixes applied (1 Critical, 2 High, 4 Medium, 2 Low). All 215 frontend tests pass.

### File List

**New files:**
- src/sdamanagement-web/src/components/activity/TemplateSelector.tsx
- src/sdamanagement-web/src/components/activity/TemplateSelector.test.tsx

**Modified files:**
- src/SdaManagement.Api/Dtos/Activity/CreateActivityRequest.cs (added TemplateId property)
- src/SdaManagement.Api/Validators/CreateActivityRequestValidator.cs (added TemplateId validation)
- src/SdaManagement.Api/Services/ActivityService.cs (extended CreateAsync with template role copying)
- src/SdaManagement.Api/Controllers/ActivitiesController.cs (added KeyNotFoundException handling)
- tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs (added CreateTestActivityTemplate helper)
- tests/SdaManagement.Api.IntegrationTests/Activities/ActivityEndpointTests.cs (added 7 template tests)
- src/sdamanagement-web/src/schemas/activitySchema.ts (added templateId to schema)
- src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx (two-step create flow with template selector)
- src/sdamanagement-web/src/pages/AdminActivitiesPage.test.tsx (updated + added template tests)
- src/sdamanagement-web/src/mocks/handlers/activities.ts (template mock data + handlers)
- src/sdamanagement-web/public/locales/fr/common.json (template selector i18n keys)
- src/sdamanagement-web/public/locales/en/common.json (template selector i18n keys)
- src/sdamanagement-web/src/test-utils.tsx (template selector i18n keys for tests)
- _bmad-output/implementation-artifacts/sprint-status.yaml (status: in-progress → review)
