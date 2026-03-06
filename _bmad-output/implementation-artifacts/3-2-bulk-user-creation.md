# Story 3.2: Bulk User Creation

Status: done

## Prerequisites

- **Local dev environment**: Node 20+, .NET 10 SDK, Docker (Testcontainers), PostgreSQL 17 via Docker
- **Story 3.1 complete**: Single user creation, UsersController, UserService, cursor pagination, department-scoped authorization all working
- **Database seeded**: OWNER account exists via EF Core seed migration
- **Departments exist**: At least one department created (Story 2.2)
- **Existing user infrastructure**: `UsersController`, `IUserService`/`UserService`, `CreateUserRequest`, `CreateUserRequestValidator`, `PagedResponse<T>`, all frontend user components from Story 3.1

## Story

As an **ADMIN**,
I want to create multiple user accounts efficiently in a single workflow,
so that I can onboard the ~30 officers without 30 individual form submissions.

## Acceptance Criteria

### AC1 — Bulk Creation Mode Access
- **Given** an ADMIN or OWNER on the user list page (AdminUsersPage)
- **When** they click "Creation en lot"
- **Then** a bulk entry dialog/sheet appears with a multi-row form where each row has: first name, last name, email, role, department(s)
- **And** the form starts with 3 empty rows by default
- **And** VIEWERs do not see this button

### AC2 — Dynamic Row Management
- **Given** the bulk entry form is open
- **When** the ADMIN clicks "Ajouter une ligne"
- **Then** a new empty row is appended to the form (useFieldArray `append`)
- **And** rows can be removed individually via a delete button per row
- **And** the form enforces a minimum of 1 row and a maximum of 30 rows

### AC3 — Successful Batch Submission
- **Given** 10 valid user entries filled in
- **When** the ADMIN submits the batch
- **Then** all 10 users are created in a single API call (`POST /api/users/bulk`)
- **And** all users are created atomically within a single database transaction
- **And** a "X utilisateurs crees" toast confirms the action (with actual count)
- **And** the user list refreshes (invalidate `["users"]` query) to show all new users
- **And** the dialog closes on success

### AC4 — Per-Row Validation Errors
- **Given** a batch with some invalid entries (e.g., row 3 missing email, row 7 invalid role)
- **When** submitted
- **Then** the API returns 400 with per-row validation errors in ProblemDetails format
- **And** the frontend shows inline errors on the specific fields of the failing rows
- **And** valid rows remain untouched (form state preserved) so the ADMIN can fix errors and resubmit
- **And** NO users are created if any row has validation errors (all-or-nothing)

### AC5 — Duplicate Email Handling
- **Given** a batch containing an email that already exists in the database
- **When** submitted
- **Then** the API returns 409 Conflict identifying the duplicate email(s)
- **And** the frontend shows inline errors on the email fields of the conflicting rows
- **And** NO users are created (all-or-nothing transaction)
- **Given** a batch containing duplicate emails within the same batch (e.g., row 2 and row 5 have same email)
- **When** client-side or server-side validation runs
- **Then** the duplicate-within-batch is flagged with an error on the duplicate rows

### AC6 — Department-Scoped Authorization (Batch)
- **Given** an ADMIN scoped to department JA
- **When** they submit a batch where any row assigns a department outside their scope (e.g., MIFEM)
- **Then** the API returns 403 for the entire batch
- **And** ADMINs only see their managed departments in the department picker for all rows
- **Given** an ADMIN
- **When** any row in the batch assigns the OWNER role
- **Then** the API returns 403 for the entire batch

### AC7 — OWNER Full Access (Batch)
- **Given** an OWNER on the bulk creation form
- **When** they submit a batch
- **Then** they can assign any role (VIEWER, ADMIN, OWNER) and any department in all rows

### AC8 — Backend API Endpoint
- `POST /api/users/bulk` — create multiple users atomically (ADMIN+ only)
- Request body: `{ "users": [{ firstName, lastName, email, role, departmentIds }, ...] }`
- Success: 201 with `{ created: UserResponse[], count: number }`
- Validation error: 400 with ProblemDetails containing per-row errors keyed as `users[0].email`, `users[2].firstName`, etc.
- Duplicate email: 409 with ProblemDetails identifying conflicting emails
- Authorization: 403 if ADMIN tries OWNER role or out-of-scope departments
- Anonymous: 401
- VIEWERs: 403

## Tasks / Subtasks

### Backend

- [x] **Task 1: BulkCreateUsersRequest DTO** (AC: #3, #8)
  - [x] Create `src/SdaManagement.Api/Dtos/User/BulkCreateUsersRequest.cs`
  - [x] Shape: `record BulkCreateUsersRequest { List<CreateUserRequest> Users { get; init; } = []; }`
  - [x] Reuses existing `CreateUserRequest` for each row

- [x] **Task 2: BulkCreateUsersResponse DTO** (AC: #3, #8)
  - [x] Create `src/SdaManagement.Api/Dtos/User/BulkCreateUsersResponse.cs`
  - [x] Shape: `class BulkCreateUsersResponse { List<UserResponse> Created { get; init; } = []; int Count { get; init; } }`

- [x] **Task 3: BulkCreateUsersRequestValidator** (AC: #4, #5)
  - [x] Create `src/SdaManagement.Api/Validators/BulkCreateUsersRequestValidator.cs`
  - [x] Rules:
    - `Users`: NotNull, NotEmpty (at least 1), Must have Count <= 30
    - `RuleForEach(x => x.Users).SetValidator(new CreateUserRequestValidator())` — reuse existing validator
    - Custom rule: no duplicate emails within the batch (`Users.Select(u => u.Email.ToLower()).Distinct().Count() == Users.Count`)
  - [x] Error keys use `{CollectionIndex}` format: `users[0].email`, `users[2].firstName`

- [x] **Task 4: IUserService.BulkCreateAsync** (AC: #3, #4, #5)
  - [x] Add to `src/SdaManagement.Api/Services/IUserService.cs`:
    - `BulkCreateAsync(List<CreateUserRequest> requests)` returns `List<UserResponse>`
  - [x] Implement in `UserService.cs`:
    - Single transaction wrapping all user + UserDepartment inserts
    - Sanitize all inputs per user (reuse same sanitization pattern from CreateAsync)
    - `SaveChangesAsync()` once at the end (not per user)
    - Return list of UserResponse with departments loaded

- [x] **Task 5: UsersController.BulkCreate endpoint** (AC: #3, #5, #6, #7, #8)
  - [x] Add `[HttpPost("bulk")]` to existing `UsersController.cs`
  - [x] Authorization: same pattern as Create — authenticate, role >= Admin, ADMIN restrictions
  - [x] ADMIN restrictions applied to ALL rows: if any row has OWNER role or out-of-scope department, return 403 for entire batch
  - [x] Inject `[FromServices] IValidator<BulkCreateUsersRequest>`
  - [x] Catch `DbUpdateException` with `PostgresException { SqlState: "23505" }` → 409 Conflict with duplicate email detail
  - [x] Return `CreatedAtAction` not applicable for bulk — return `StatusCode(201, response)` with BulkCreateUsersResponse

- [x] **Task 6: Backend unit tests** (AC: #4, #5)
  - [x] Create `tests/SdaManagement.Api.UnitTests/Validators/BulkCreateUsersRequestValidatorTests.cs`
  - [x] Cases: valid batch passes; empty users list fails; > 30 users fails; per-row validation delegated (invalid email in row 2); duplicate emails within batch fails

- [x] **Task 7: Backend integration tests** (AC: #3, #4, #5, #6, #7, #8)
  - [x] Add to `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs` (extend existing test class)
  - [x] Tests:
    - POST /api/users/bulk as OWNER with 5 valid users returns 201 with count=5
    - POST /api/users/bulk as ADMIN with valid users in own departments returns 201
    - POST /api/users/bulk as ADMIN with OWNER role in any row returns 403
    - POST /api/users/bulk as ADMIN with out-of-scope department in any row returns 403
    - POST /api/users/bulk as VIEWER returns 403
    - POST /api/users/bulk as Anonymous returns 401
    - POST /api/users/bulk with invalid data returns 400 with per-row errors
    - POST /api/users/bulk with duplicate email (existing in DB) returns 409
    - POST /api/users/bulk with duplicate email within batch returns 400
    - POST /api/users/bulk with empty users array returns 400
    - POST /api/users/bulk with > 30 users returns 400
    - POST /api/users/bulk atomicity: if DB error on user 5 of 10, no users created

### Frontend

- [x] **Task 8: Bulk create Zod schema** (AC: #2, #4)
  - [x] Add to `src/sdamanagement-web/src/schemas/userSchema.ts`:
    - `bulkCreateUsersSchema = z.object({ users: z.array(createUserSchema).min(1).max(30) })`
    - Add custom refinement: no duplicate emails within the array
  - [x] Export: `type BulkCreateUsersFormData = z.infer<typeof bulkCreateUsersSchema>`

- [x] **Task 9: User service bulk method** (AC: #3)
  - [x] Add to `src/sdamanagement-web/src/services/userService.ts`:
    - `bulkCreateUsers(data: { users: CreateUserFormData[] })` calls `POST /api/users/bulk`
  - [x] Response type: `BulkCreateUsersResponse { created: UserResponse[], count: number }`

- [x] **Task 10: BulkUserFormDialog component** (AC: #1, #2, #3, #4, #5, #6, #7)
  - [x] Create `src/sdamanagement-web/src/components/user/BulkUserFormDialog.tsx`
  - [x] **Responsive**: `Dialog` on desktop (>=640px), bottom `Sheet` on mobile (<640px) — same pattern as `UserFormDialog`
  - [x] React Hook Form + zodResolver(bulkCreateUsersSchema) + `useFieldArray({ control, name: "users" })`
  - [x] Default: 3 empty rows on open
  - [x] Each row: firstName `<Input>`, lastName `<Input>`, email `<Input type="email">`, role `<Select>`, departments `<Popover>` with checkbox chips
  - [x] Role options per row: VIEWER/ADMIN for ADMINs, VIEWER/ADMIN/OWNER for OWNERs
  - [x] Department picker per row: filtered for ADMIN scope (reuse same logic from UserFormDialog)
  - [x] "Ajouter une ligne" button to append row; "X" button per row to remove; min 1 row enforced
  - [x] Row count indicator: "3 / 30 lignes"
  - [x] Per-row inline validation errors: `errors.users?.[index]?.fieldName?.message`
  - [x] Server-side errors (409): parse error response and map to specific email fields using `setError(`users.${index}.email`, ...)`
  - [x] Submit: call `userService.bulkCreateUsers()`, invalidate `["users"]` query, toast with count, close
  - [x] **Scrollable form area**: the row list should be in a scrollable container (max-h with overflow-y-auto) so the dialog doesn't overflow viewport
  - [x] **Accessibility**: Focus trap, `aria-label` on add/remove row buttons, per-row error announcements

- [x] **Task 11: AdminUsersPage — add bulk button** (AC: #1)
  - [x] Modify `src/sdamanagement-web/src/pages/AdminUsersPage.tsx`
  - [x] Add "Creation en lot" button next to existing "Ajouter un utilisateur" button (visible to ADMIN+ only)
  - [x] Wire to BulkUserFormDialog open state
  - [x] Button style: shadcn Button `variant="outline"` to differentiate from primary single-create button

- [x] **Task 12: i18n strings** (AC: #1, #2, #3, #4)
  - [x] Add to `public/locales/fr/common.json` and `en/common.json`:
    - `pages.adminUsers.bulkCreateButton`: "Creation en lot" / "Bulk Create"
    - `pages.adminUsers.bulkForm.title`: "Creation en lot" / "Bulk User Creation"
    - `pages.adminUsers.bulkForm.addRow`: "Ajouter une ligne" / "Add Row"
    - `pages.adminUsers.bulkForm.removeRow`: "Supprimer la ligne" / "Remove Row"
    - `pages.adminUsers.bulkForm.rowCount`: "{{current}} / {{max}} lignes" / "{{current}} / {{max}} rows"
    - `pages.adminUsers.bulkForm.submit`: "Creer tous" / "Create All"
    - `pages.adminUsers.bulkForm.cancel`: "Annuler" / "Cancel"
    - `pages.adminUsers.toast.bulkCreated`: "{{count}} utilisateurs crees" / "{{count}} users created"
    - `pages.adminUsers.toast.error.bulkValidation`: "Corrigez les erreurs avant de soumettre" / "Fix errors before submitting"
    - `pages.adminUsers.toast.error.duplicateInBatch`: "Emails en double dans le lot" / "Duplicate emails in batch"
  - [x] Add all new keys to `src/sdamanagement-web/src/test-utils.tsx` mock resources

- [x] **Task 13: MSW mock handlers for bulk** (AC: #3, #4, #5)
  - [x] Add to `src/sdamanagement-web/src/mocks/handlers/users.ts`:
    - `POST /api/users/bulk` default: returns 201 with created array and count
    - Variant: 400 with per-row validation errors
    - Variant: 409 conflict with duplicate email
    - Variant: 403 forbidden

- [x] **Task 14: Frontend tests** (AC: #1, #2, #3, #4, #5)
  - [x] Create `src/sdamanagement-web/src/pages/AdminUsersPage.bulk.test.tsx` (separate test file for bulk-specific tests)
  - [x] Per-file MSW server: `const server = setupServer(...authHandlers, ...userHandlers, ...departmentHandlers)`
  - [x] Tests:
    - Bulk create button visible for ADMIN/OWNER, hidden for VIEWER
    - Bulk dialog opens with 3 empty rows
    - Add row appends a new row (up to 30)
    - Remove row removes the row (minimum 1)
    - Successful bulk creation shows toast with count and closes dialog
    - Per-row validation errors display inline on correct fields
    - Duplicate email error displays on email field of conflicting row

## Dev Notes

### Architecture Patterns (Mandatory)

**Backend — Extend existing UsersController, reuse CreateUserRequest:**

- **New endpoint**: `[HttpPost("bulk")]` in existing `UsersController.cs`. Do NOT create a new controller.
- **Authorization**: Same three-level pattern as single Create — authenticate, role >= Admin, ADMIN restrictions. Apply ADMIN restrictions across ALL rows before any DB work.
- **Validator**: `BulkCreateUsersRequestValidator` uses `RuleForEach(x => x.Users).SetValidator(new CreateUserRequestValidator())` to reuse all existing per-user validation. Add collection-level rules (min 1, max 30, no duplicate emails within batch).
- **FluentValidation error keys**: When using `RuleForEach`, error keys automatically include the index: `Users[0].Email`, `Users[2].FirstName`. System.Text.Json camelCase serialization converts to `users[0].email` in the JSON response. Frontend maps these directly to `useFieldArray` field paths.
- **Service**: `BulkCreateAsync` creates all users + UserDepartments in a single `SaveChangesAsync()` call (single transaction). Reuse sanitization pattern from `CreateAsync`. Do NOT call `CreateAsync` in a loop — batch the inserts.
- **Conflict**: Catch `DbUpdateException` with `PostgresException { SqlState: "23505" }` for duplicate emails against existing DB records. Extract the conflicting email from `PostgresException.Detail` (format: `Key (email)=(foo@bar.com) already exists.`) using regex to enable row-level frontend error mapping. Return 409 with ProblemDetails including the conflicting email in a custom `conflictingEmail` extension property.
- **Atomicity**: All-or-nothing. If validation fails for ANY row, no users created. If DB constraint fails, entire transaction rolls back.

**Frontend — New dialog component, extend existing page:**

- **Form**: React Hook Form + zodResolver + `useFieldArray({ control, name: "users" })`. Key pattern: `fields.map((field, index) => <Row key={field.id} ... />)`. CRITICAL: use `field.id` as React key, NOT `index`.
- **Per-row errors**: Access via `errors.users?.[index]?.fieldName?.message`. Display inline under each field.
- **Server error mapping**: On 400 response, parse `errors` dictionary from ProblemDetails. Keys like `users[0].email` map directly to `setError("users.0.email", { message })`. On 409, extract email from detail and find matching row index to `setError`.
- **Department picker per row**: Each row needs its own department `<Controller>` with `<Popover>` + checkboxes. Reuse same filtering logic (ADMIN sees only managed departments). Consider extracting a `DepartmentMultiSelect` component shared between `UserFormDialog` and `BulkUserFormDialog` to avoid duplication.
- **Responsive**: Check `UserFormDialog.tsx` for the actual Dialog/Sheet responsive implementation. If it uses a `useMediaQuery` hook to switch between `Dialog` (desktop >=640px) and `Sheet` (mobile <640px), replicate that. If it only uses `Dialog`, use `Dialog` for bulk too for consistency. Mobile layout: stack row fields vertically. Desktop: horizontal row layout in a table-like grid.

### Cursor Pagination — No Changes

Bulk create does not affect pagination. The existing `GET /api/users` endpoint with cursor pagination handles the additional users automatically. Just invalidate the `["users"]` query key on success.

### Department-Scoped Authorization (Batch Extension)

Same three-level auth pattern as single Create. Key differences from single Create:

```csharp
// 1. ADMIN restrictions loop over ALL rows (not single request)
if (!auth.IsOwner())
{
    if (request.Users.Any(u => u.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase)))
        return Forbid();
    if (request.Users.Any(u => u.DepartmentIds.Any(dId => !currentUser.DepartmentIds.Contains(dId))))
        return Forbid();
}

// 2. Return 201 with BulkCreateUsersResponse (not CreatedAtAction)
var created = await userService.BulkCreateAsync(request.Users);
return StatusCode(201, new BulkCreateUsersResponse { Created = created, Count = created.Count });

// 3. 409 handler extracts conflicting email for row-level frontend mapping
catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: "23505" } pgEx)
{
    var conflictingEmail = ExtractConflictingEmail(pgEx.Detail);
    return Conflict(new ProblemDetails
    {
        Type = "urn:sdac:conflict",
        Title = "Resource Conflict",
        Status = 409,
        Detail = conflictingEmail is not null
            ? $"A user with email '{conflictingEmail}' already exists."
            : "One or more emails already exist.",
        Extensions = { ["conflictingEmail"] = conflictingEmail },
    });
}
```

**ExtractConflictingEmail helper** (add as private method in `UsersController` or a shared utility):

```csharp
private static string? ExtractConflictingEmail(string? detail)
{
    if (detail is null) return null;
    // PostgreSQL detail format: "Key (email)=(foo@bar.com) already exists."
    var match = System.Text.RegularExpressions.Regex.Match(detail, @"\(email\)=\((.+?)\)");
    return match.Success ? match.Groups[1].Value : null;
}
```

Note: This helper is also useful for the existing single-create endpoint. Consider extracting to `UsersController` base if needed, but for now keep it as a private method since only `UsersController` handles user conflicts.

### BulkCreateUsersRequestValidator Pattern

```csharp
public class BulkCreateUsersRequestValidator : AbstractValidator<BulkCreateUsersRequest>
{
    public BulkCreateUsersRequestValidator()
    {
        RuleFor(x => x.Users)
            .NotNull()
            .Must(u => u.Count > 0).WithMessage("At least one user is required.")
            .Must(u => u.Count <= 30).WithMessage("Maximum 30 users per batch.");

        RuleFor(x => x.Users)
            .Must(users => users.Select(u => u.Email.ToLowerInvariant()).Distinct().Count() == users.Count)
            .WithMessage("Duplicate emails found within the batch.")
            .When(x => x.Users is { Count: > 0 });

        RuleForEach(x => x.Users).SetValidator(new CreateUserRequestValidator());
    }
}
```

### Frontend useFieldArray Pattern

```tsx
const { control, register, handleSubmit, setError, formState: { errors } } = useForm<BulkCreateUsersFormData>({
    resolver: zodResolver(bulkCreateUsersSchema),
    defaultValues: {
        users: [emptyRow(), emptyRow(), emptyRow()],
    },
});

const { fields, append, remove } = useFieldArray({
    control,
    name: "users",
    rules: { minLength: 1, maxLength: 30 },
});

// Per-row rendering with field.id as key
{fields.map((field, index) => (
    <div key={field.id}>
        <Input {...register(`users.${index}.firstName`)} />
        {errors.users?.[index]?.firstName && (
            <span className="text-sm text-destructive">
                {errors.users[index].firstName.message}
            </span>
        )}
        {/* ... other fields */}
        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
            <X className="h-4 w-4" />
        </Button>
    </div>
))}
```

### Bulk Zod Schema with Duplicate Email Refinement

```ts
export const bulkCreateUsersSchema = z.object({
    users: z.array(createUserSchema).min(1).max(30),
}).refine(
    (data) => {
        const emails = data.users.map(u => u.email.toLowerCase());
        return new Set(emails).size === emails.length;
    },
    { message: "Duplicate emails in batch", path: ["users"] }
);
```

### Server Error Mapping to Form Fields

```ts
onError: (error) => {
    if (isAxiosError(error) && error.response?.status === 400) {
        const problemDetails = error.response.data;
        if (problemDetails.errors) {
            // Map server errors to form fields
            // Keys like "Users[0].Email" → setError("users.0.email", ...)
            Object.entries(problemDetails.errors).forEach(([key, messages]) => {
                const formPath = key
                    .replace(/\[(\d+)\]/g, ".$1")  // Users[0] → Users.0
                    .replace(/^./, c => c.toLowerCase()); // Users → users
                setError(formPath as any, {
                    message: (messages as string[])[0],
                });
            });
        }
    }
    if (isAxiosError(error) && error.response?.status === 409) {
        const conflictingEmail = error.response.data?.conflictingEmail;
        if (conflictingEmail) {
            // Find the row with the conflicting email and set error on that row
            const rowIndex = getValues("users").findIndex(
                (u) => u.email.toLowerCase() === conflictingEmail.toLowerCase()
            );
            if (rowIndex >= 0) {
                setError(`users.${rowIndex}.email`, {
                    message: t("pages.adminUsers.toast.error.duplicate"),
                });
                return;
            }
        }
        toast.error(t("pages.adminUsers.toast.error.duplicate"));
    }
    if (isAxiosError(error) && error.response?.status === 403) {
        toast.error(t("pages.adminUsers.toast.error.forbidden"));
    }
},
```

### Reuse Existing Code (Do NOT Reinvent)

- **CreateUserRequest DTO**: Reuse as-is for each row in the batch. Do NOT create a new per-row DTO.
- **CreateUserRequestValidator**: Reuse via `SetValidator()` in the bulk validator. Do NOT duplicate validation rules.
- **Department picker**: Extract `DepartmentMultiSelect` from `UserFormDialog.tsx` into `src/sdamanagement-web/src/components/user/DepartmentMultiSelect.tsx` — the Popover+Checkbox+Chips pattern is needed in both single and bulk forms. This avoids duplicating ~50 lines of department picker UI. Pass `departments` (filtered list), `value` (selected IDs), and `onChange` as props. Use React Hook Form `<Controller>` to wire it in both dialogs.
- **Auth context / role checks**: Same `useAuth()` patterns. Same `isAdminOrOwner` derivation.
- **UserFormDialog responsive pattern**: Verify the actual Dialog/Sheet implementation in `UserFormDialog.tsx` and replicate. If only `Dialog` is used, use `Dialog` consistently.
- **Toast / i18n**: Same patterns. Same `toast.success(t(...))` with interpolation for count.
- **departmentService.getAll()**: Same endpoint for department list in picker.
- **Sanitization**: Same `sanitizer.Sanitize()` applied per user in service.
- **UserResponse / UserDepartmentBadge**: Reuse existing response DTOs.

### Project Structure Notes

**New files to create:**

Backend:
- `src/SdaManagement.Api/Dtos/User/BulkCreateUsersRequest.cs`
- `src/SdaManagement.Api/Dtos/User/BulkCreateUsersResponse.cs`
- `src/SdaManagement.Api/Validators/BulkCreateUsersRequestValidator.cs`
- `tests/SdaManagement.Api.UnitTests/Validators/BulkCreateUsersRequestValidatorTests.cs`

Frontend:
- `src/sdamanagement-web/src/components/user/BulkUserFormDialog.tsx`
- `src/sdamanagement-web/src/pages/AdminUsersPage.bulk.test.tsx`

**Files to modify:**

Backend:
- `src/SdaManagement.Api/Services/IUserService.cs` — add `BulkCreateAsync` method
- `src/SdaManagement.Api/Services/UserService.cs` — implement `BulkCreateAsync`
- `src/SdaManagement.Api/Controllers/UsersController.cs` — add `[HttpPost("bulk")]` endpoint
- `tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs` — add bulk endpoint tests

Frontend:
- `src/sdamanagement-web/src/schemas/userSchema.ts` — add `bulkCreateUsersSchema`
- `src/sdamanagement-web/src/services/userService.ts` — add `bulkCreateUsers` method
- `src/sdamanagement-web/src/pages/AdminUsersPage.tsx` — add bulk create button + dialog
- `src/sdamanagement-web/src/mocks/handlers/users.ts` — add bulk endpoint handlers
- `src/sdamanagement-web/public/locales/fr/common.json` — add bulk i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — add bulk i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — add new i18n mock keys

**No database migrations needed.** Same `users` and `user_departments` tables from Epic 1.

### Design Tokens Reference

- Bulk create button: shadcn Button `variant="outline"` (secondary action)
- Row container: `border border-slate-200 rounded-lg p-3` with `space-y-3` between rows
- Row delete button: `variant="ghost" size="icon"` with `X` icon, `text-slate-400 hover:text-destructive`
- Row number: `text-sm text-slate-500 font-mono` (e.g., "#1", "#2")
- Add row button: `variant="dashed"` or `variant="outline"` with `Plus` icon, full-width
- Row count: `text-sm text-muted-foreground` aligned right
- Scrollable area: `max-h-[60vh] overflow-y-auto` for the rows container
- Per-row error: `text-sm text-destructive` under the field (same as single form)
- Mobile row: fields stacked vertically, full-width
- Desktop row: fields in a grid `grid-cols-[1fr_1fr_1fr_120px_1fr_40px]` (firstName, lastName, email, role, depts, delete)

### Previous Story Learnings (from Story 3.1)

- **Controller pattern**: primary constructor with `SdacAuth.IAuthorizationService auth`. Return-based auth. Three-level auth check: authenticate → role → ADMIN restrictions.
- **Service pattern**: primary constructor with `(AppDbContext db, ISanitizationService sanitizer)`. Single `SaveChangesAsync()` at end. No exception handling in services.
- **Validator reuse**: `CreateUserRequestValidator` already handles all per-user rules. Bulk validator only needs collection-level rules + `SetValidator()`.
- **PostgreSQL 23505**: catch for unique constraint (email). Works for bulk too — first duplicate triggers the exception, rolls back entire transaction.
- **Test helpers**: `CreateTestUser()`, `AssignDepartmentToUser()` already on `IntegrationTestBase`. Use them for seed data.
- **Frontend test pattern**: add ALL new i18n keys to `test-utils.tsx` BEFORE writing tests. Per-file `setupServer()`.
- **MSW handlers**: default + variant handlers. Each test file owns its server.
- **Form reset**: useEffect on dialog `open` to reset form state.
- **Error mapping**: 409 → `setError` on email field. 403 → toast error. This pattern extends to bulk with indexed field paths.
- **Debug fixes from 3.1**: `db.Set<UserDepartment>()` (no DbSet property), email max length 255 in Zod, `toBeGreaterThanOrEqual` (not `toBeGreaterThanOrEqualTo`).
- **Rate limiting**: `[EnableRateLimiting("auth")]` already on controller class — applies to bulk endpoint automatically.

### Git Intelligence

Commit convention: `feat(users): Story 3.2 — Bulk user creation`

Recent patterns from Story 3.1 (uncommitted):
- Backend files in `src/SdaManagement.Api/Controllers/`, `Services/`, `Dtos/User/`, `Validators/`
- Frontend files in `src/sdamanagement-web/src/components/user/`, `pages/`, `schemas/`, `services/`, `hooks/`
- Integration tests in `tests/SdaManagement.Api.IntegrationTests/Users/`
- Unit tests in `tests/SdaManagement.Api.UnitTests/Validators/`

### Technology Notes (from Context7)

**React Hook Form 7.x — useFieldArray:**
- `useFieldArray({ control, name: "users", rules: { minLength, maxLength } })` for dynamic rows
- Returns: `{ fields, append, prepend, remove, swap, move, insert, update, replace }`
- CRITICAL: use `field.id` as React `key`, never the array index — prevents stale state bugs
- Per-row errors: `errors.users?.[index]?.fieldName` — RHF tracks errors per array index
- Array-level root error: `errors.users?.root?.message` (for min/max length violations)
- `append({ firstName: "", lastName: "", email: "", role: "Viewer", departmentIds: [] })` adds empty row

**FluentValidation 12.x — Collection Validation:**
- `RuleForEach(x => x.Users).SetValidator(new CreateUserRequestValidator())` — delegates per-item validation to existing validator
- `{CollectionIndex}` placeholder available in error messages: `"User at position {CollectionIndex} has errors"`
- Error keys auto-indexed: `Users[0].Email`, `Users[2].FirstName` — maps to ProblemDetails errors dictionary
- `ChildRules()` available for inline rules but `SetValidator()` preferred for reuse
- Collection-level + element-level rules can coexist on same property

**@hookform/resolvers ^5.2 — Zod Bridge:**
- Project uses `@hookform/resolvers` v5.x which exports `zodResolver` for Zod 4.x compatibility
- Import: `import { zodResolver } from "@hookform/resolvers/zod"` (same as v4 resolvers)
- Works with both simple schemas and `.refine()`-based schemas

**Zod 4.x — Array Validation with Refinement:**
- `z.array(createUserSchema).min(1).max(30)` for array-level constraints
- `.refine()` still works in Zod 4.x for cross-field validation (duplicate email check) — the `.check()` API is an alternative but `.refine()` is the established pattern in this project (see `userSchema.ts`)
- Refinement errors can target specific `path` for inline display

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 3, Story 3.2 — AC and user story]
- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — FluentValidation RuleForEach, SetValidator, collection validation]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Response Format — ProblemDetails with per-row error keys]
- [Source: _bmad-output/planning-artifacts/architecture.md#Form Handling — React Hook Form useFieldArray for dynamic rows]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Boundaries — UsersController for user CRUD including bulk]
- [Source: _bmad-output/planning-artifacts/architecture.md#SignalR broadcast debouncing — coalesce for bulk operations]
- [Source: _bmad-output/planning-artifacts/prd.md#FR50 — ADMINs can create multiple user accounts efficiently]
- [Source: _bmad-output/planning-artifacts/prd.md#Journey 5 — bulk-friendly entry form for ~30 officers]
- [Source: _bmad-output/implementation-artifacts/3-1-single-user-account-creation.md — all patterns, learnings, debug fixes]
- [Source: src/SdaManagement.Api/Controllers/UsersController.cs — existing controller to extend]
- [Source: src/SdaManagement.Api/Services/UserService.cs — CreateAsync pattern to replicate for bulk]
- [Source: src/SdaManagement.Api/Services/IUserService.cs — interface to extend]
- [Source: src/SdaManagement.Api/Validators/CreateUserRequestValidator.cs — validator to reuse via SetValidator]
- [Source: src/SdaManagement.Api/Dtos/User/CreateUserRequest.cs — DTO reused as batch item]
- [Source: src/sdamanagement-web/src/components/user/UserFormDialog.tsx — form dialog pattern, department picker, responsive Dialog/Sheet]
- [Source: src/sdamanagement-web/src/schemas/userSchema.ts — createUserSchema to compose into bulk schema]
- [Source: src/sdamanagement-web/src/services/userService.ts — service to extend with bulkCreateUsers]
- [Source: src/sdamanagement-web/src/pages/AdminUsersPage.tsx — page to add bulk create button]
- [Source: src/sdamanagement-web/src/mocks/handlers/users.ts — MSW handlers to extend]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed server-side error mapping: PascalCase keys from FluentValidation (e.g., `Users[0].Email`) need each path segment camelCased, not just first character of the string. Applied `.split(".").map(...)` for proper conversion to `users.0.email`.
- `ExtractConflictingEmail` returns null for some PostgreSQL environments where `pgEx.Detail` format doesn't match the regex. Frontend handles both cases gracefully (with/without `conflictingEmail`).

### Completion Notes List

- All 14 tasks implemented and verified with passing tests
- Backend: BulkCreateUsersRequest/Response DTOs, BulkCreateUsersRequestValidator (reuses CreateUserRequestValidator via SetValidator), IUserService.BulkCreateAsync with single-transaction batch insert, UsersController.BulkCreate endpoint with three-level auth and 409 conflict handling
- Frontend: bulkCreateUsersSchema with duplicate email refinement, userService.bulkCreateUsers, BulkUserFormDialog with useFieldArray dynamic rows, AdminUsersPage bulk button, i18n strings (fr/en), MSW mock handlers, 9 frontend tests
- Test results: 165 backend unit tests pass, 167 backend integration tests pass, 166 frontend tests pass — zero regressions

### Change Log

- 2026-03-06: Story 3.2 — Bulk user creation (all tasks complete)
- 2026-03-06: Code review fixes — H1: BulkCreateUsersRequestValidator CascadeMode.Stop (prevent NullReferenceException on null Users); M3: extracted DepartmentMultiSelect shared component; M5: removed dead MSW bulk handler exports; removed L3 max-row test (impractical in JSDOM)

### File List

**New files:**
- src/SdaManagement.Api/Dtos/User/BulkCreateUsersRequest.cs
- src/SdaManagement.Api/Dtos/User/BulkCreateUsersResponse.cs
- src/SdaManagement.Api/Validators/BulkCreateUsersRequestValidator.cs
- tests/SdaManagement.Api.UnitTests/Validators/BulkCreateUsersRequestValidatorTests.cs
- src/sdamanagement-web/src/components/user/BulkUserFormDialog.tsx
- src/sdamanagement-web/src/pages/AdminUsersPage.bulk.test.tsx

**Modified files:**
- src/SdaManagement.Api/Services/IUserService.cs
- src/SdaManagement.Api/Services/UserService.cs
- src/SdaManagement.Api/Controllers/UsersController.cs
- tests/SdaManagement.Api.IntegrationTests/Users/UserEndpointTests.cs
- src/sdamanagement-web/src/schemas/userSchema.ts
- src/sdamanagement-web/src/services/userService.ts
- src/sdamanagement-web/src/components/user/index.ts
- src/sdamanagement-web/src/pages/AdminUsersPage.tsx
- src/sdamanagement-web/src/mocks/handlers/users.ts
- src/sdamanagement-web/public/locales/fr/common.json
- src/sdamanagement-web/public/locales/en/common.json
- src/sdamanagement-web/src/test-utils.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
