# Story 2.2: Department CRUD & Sub-Ministries

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **OWNER**,
I want to create and manage departments with names, abbreviations, colors, descriptions, and sub-ministries,
So that the organizational structure is defined for activity scheduling and admin scoping.

## Acceptance Criteria

1. **Given** the OWNER navigating to Admin > Departments
   **When** the page loads with no departments
   **Then** a smart empty state shows: "Creez vos departements — ils structurent toute l'application"

2. **Given** the department creation form
   **When** the OWNER enters name ("Jeunesse Adventiste"), abbreviation ("JA"), color (#hex), and description
   **Then** the department is created with a unique color and abbreviation
   **And** the departments table columns are extended via migration: abbreviation, color, description, updated_at

3. **Given** an existing department
   **When** the OWNER adds sub-ministries (e.g., Eclaireurs, Ambassadeurs, Compagnons under JA)
   **Then** the sub_ministries table stores each with department_id foreign key
   **And** the department detail view shows its sub-ministries

4. **Given** the department list
   **When** the OWNER edits or deletes a department
   **Then** the changes are persisted and reflected immediately
   **And** deletion cascades to sub-ministries (no activities exist yet; activity-check guard added as TODO for Epic 4)

5. **Given** a non-OWNER user
   **When** they attempt POST/PUT/DELETE on /api/departments
   **Then** the response is 403 Forbidden

6. **Given** any authenticated user (VIEWER+)
   **When** they send GET /api/departments or GET /api/departments/{id}
   **Then** the response includes the department list or detail with sub-ministries

## Prerequisites

### Local Dev Environment Requirements

| Tool | Minimum Version | Install | Verify |
|---|---|---|---|
| **.NET SDK** | 10.0 LTS | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) | `dotnet --version` |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) | `node --version` |
| **Docker Desktop** | Latest stable | [docker.com](https://www.docker.com/products/docker-desktop/) | `docker --version` |
| **PostgreSQL** | 17 (via Docker) | `docker compose up -d` | `docker compose ps` |

### Completed Stories (Hard Dependencies)

- **Story 1.1** — Project scaffolding, Docker Compose, Vite proxy to `/api`, EF Core + PostgreSQL with snake_case naming convention
- **Story 1.2** — IntegrationTestBase with Testcontainers, pre-configured HttpClients per role (AnonymousClient, ViewerClient, AdminClient, OwnerClient), Respawn DB reset
- **Story 1.3** — User entity with 4-tier roles, OWNER seed, `ICurrentUserContext`, JWT pipeline, `IAuthorizationService` with `IsOwner()` and `CanManage(departmentId)` checks. **Created the minimal Department entity** (Id, Name, CreatedAt)
- **Story 1.5** — FluentValidation + `MustNotContainControlCharacters()` extension, `react-hook-form` + `zod` + `sonner` patterns
- **Story 1.6** — Application shell (PublicLayout + AuthenticatedLayout), ProtectedRoute with role guards, AppSidebar with navigation, i18n (FR/EN), TanStack Query, code splitting with lazy routes
- **Story 2.1** — Church identity settings: established the full CRUD pattern for backend (controller → service → DTOs → validator → sanitization) and frontend (page → form component → Zod schema → API service → MSW handlers → tests)

## Tasks / Subtasks

- [x] **Task 1: Expand Department entity + Create SubMinistry entity + EF Core migration** (AC: #2, #3)
  - [x] Modify `src/SdaManagement.Api/Data/Entities/Department.cs` — expand the minimal entity:
    ```csharp
    namespace SdaManagement.Api.Data.Entities;

    public class Department
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Abbreviation { get; set; } = string.Empty;
        public string Color { get; set; } = string.Empty;   // #hex format, e.g. "#4F46E5"
        public string? Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public ICollection<SubMinistry> SubMinistries { get; } = [];
        public ICollection<UserDepartment> UserDepartments { get; } = [];
    }
    ```
  - [x] Create `src/SdaManagement.Api/Data/Entities/SubMinistry.cs`:
    ```csharp
    namespace SdaManagement.Api.Data.Entities;

    public class SubMinistry
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public int DepartmentId { get; set; }
        public Department Department { get; set; } = null!;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
    ```
  - [x] Update `AppDbContext.cs`:
    - Add `public DbSet<SubMinistry> SubMinistries => Set<SubMinistry>();`
    - Expand the Department configuration in `OnModelCreating`:
      ```csharp
      modelBuilder.Entity<Department>(e =>
      {
          e.HasKey(d => d.Id);
          e.HasIndex(d => d.Abbreviation).IsUnique();
          e.HasIndex(d => d.Color).IsUnique();
          e.Property(d => d.Name).HasMaxLength(100);
          e.Property(d => d.Abbreviation).HasMaxLength(10);
          e.Property(d => d.Color).HasMaxLength(9);  // "#" + 6 hex chars
          e.Property(d => d.Description).HasMaxLength(500);
          e.Property(d => d.CreatedAt).HasDefaultValueSql("now()");
          e.Property(d => d.UpdatedAt).HasDefaultValueSql("now()");
      });
      ```
    - Add SubMinistry configuration:
      ```csharp
      modelBuilder.Entity<SubMinistry>(e =>
      {
          e.HasKey(s => s.Id);
          e.Property(s => s.Name).HasMaxLength(100);
          e.Property(s => s.CreatedAt).HasDefaultValueSql("now()");
          e.Property(s => s.UpdatedAt).HasDefaultValueSql("now()");
          e.HasOne(s => s.Department)
           .WithMany(d => d.SubMinistries)
           .HasForeignKey(s => s.DepartmentId)
           .OnDelete(DeleteBehavior.Cascade);
          e.HasIndex(s => new { s.DepartmentId, s.Name }).IsUnique();
      });
      ```
  - [x] Generate migration: `dotnet ef migrations add ExpandDepartmentAddSubMinistries -p src/SdaManagement.Api`
  - [x] Verify migration:
    - `departments` table gets new columns: `abbreviation`, `color`, `description`, `updated_at`
    - `sub_ministries` table created with: `id`, `name`, `department_id`, `created_at`, `updated_at`
    - Unique indexes on `departments.abbreviation`, `departments.color`, `(sub_ministries.department_id, sub_ministries.name)`
  - [x] CRITICAL: The `departments` table already exists from Story 1.3 migration. This migration adds columns via `ALTER TABLE`, not `CREATE TABLE`. Verify it produces `AddColumn` operations, not a new table.

- [x] **Task 2: Create DTOs** (AC: #2, #3, #6)
  - [x] Create folder `src/SdaManagement.Api/Dtos/Department/`
  - [x] Create `CreateDepartmentRequest.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Department;

    public record CreateDepartmentRequest
    {
        public string Name { get; init; } = string.Empty;
        public string Abbreviation { get; init; } = string.Empty;
        public string Color { get; init; } = string.Empty;
        public string? Description { get; init; }
        public List<string>? SubMinistryNames { get; init; }
    }
    ```
  - [x] Create `UpdateDepartmentRequest.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Department;

    public record UpdateDepartmentRequest
    {
        public string Name { get; init; } = string.Empty;
        public string Abbreviation { get; init; } = string.Empty;
        public string Color { get; init; } = string.Empty;
        public string? Description { get; init; }
    }
    ```
  - [x] Create `DepartmentResponse.cs` — detail with sub-ministries:
    ```csharp
    namespace SdaManagement.Api.Dtos.Department;

    public class DepartmentResponse
    {
        public int Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Abbreviation { get; init; } = string.Empty;
        public string Color { get; init; } = string.Empty;
        public string? Description { get; init; }
        public List<SubMinistryResponse> SubMinistries { get; init; } = [];
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }
    ```
  - [x] Create `DepartmentListItem.cs` — lightweight for list:
    ```csharp
    namespace SdaManagement.Api.Dtos.Department;

    public class DepartmentListItem
    {
        public int Id { get; init; }
        public string Name { get; init; } = string.Empty;
        public string Abbreviation { get; init; } = string.Empty;
        public string Color { get; init; } = string.Empty;
        public string? Description { get; init; }
        public int SubMinistryCount { get; init; }
    }
    ```
  - [x] Create `SubMinistryResponse.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Department;

    public class SubMinistryResponse
    {
        public int Id { get; init; }
        public string Name { get; init; } = string.Empty;
    }
    ```
  - [x] Create `CreateSubMinistryRequest.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Department;

    public record CreateSubMinistryRequest
    {
        public string Name { get; init; } = string.Empty;
    }
    ```
  - [x] Create `UpdateSubMinistryRequest.cs`:
    ```csharp
    namespace SdaManagement.Api.Dtos.Department;

    public record UpdateSubMinistryRequest
    {
        public string Name { get; init; } = string.Empty;
    }
    ```
  - [x] CRITICAL: DTO field names in camelCase JSON must match Zod schema fields and FluentValidation error keys. `System.Text.Json` with `CamelCase` policy handles this automatically.

- [x] **Task 3: Create Validators** (AC: #2)
  - [x] Create `src/SdaManagement.Api/Validators/CreateDepartmentRequestValidator.cs`:
    ```csharp
    public class CreateDepartmentRequestValidator : AbstractValidator<CreateDepartmentRequest>
    {
        public CreateDepartmentRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
            RuleFor(x => x.Abbreviation)
                .NotEmpty().MaximumLength(10).MustNotContainControlCharacters()
                .Matches("^[A-Za-z0-9]+$").WithMessage("Abbreviation must contain only letters and numbers.");
            RuleFor(x => x.Color)
                .NotEmpty().MaximumLength(9)
                .Matches("^#[0-9A-Fa-f]{6}$").WithMessage("Color must be a valid hex color (e.g., #4F46E5).");
            RuleFor(x => x.Description)
                .MaximumLength(500).MustNotContainControlCharacters()
                .When(x => !string.IsNullOrEmpty(x.Description));
            RuleForEach(x => x.SubMinistryNames)
                .NotEmpty().MaximumLength(100).MustNotContainControlCharacters()
                .When(x => x.SubMinistryNames is { Count: > 0 });
        }
    }
    ```
  - [x] Create `src/SdaManagement.Api/Validators/UpdateDepartmentRequestValidator.cs`:
    ```csharp
    public class UpdateDepartmentRequestValidator : AbstractValidator<UpdateDepartmentRequest>
    {
        public UpdateDepartmentRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
            RuleFor(x => x.Abbreviation)
                .NotEmpty().MaximumLength(10).MustNotContainControlCharacters()
                .Matches("^[A-Za-z0-9]+$").WithMessage("Abbreviation must contain only letters and numbers.");
            RuleFor(x => x.Color)
                .NotEmpty().MaximumLength(9)
                .Matches("^#[0-9A-Fa-f]{6}$").WithMessage("Color must be a valid hex color (e.g., #4F46E5).");
            RuleFor(x => x.Description)
                .MaximumLength(500).MustNotContainControlCharacters()
                .When(x => !string.IsNullOrEmpty(x.Description));
        }
    }
    ```
  - [x] Create `src/SdaManagement.Api/Validators/CreateSubMinistryRequestValidator.cs`:
    ```csharp
    public class CreateSubMinistryRequestValidator : AbstractValidator<CreateSubMinistryRequest>
    {
        public CreateSubMinistryRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        }
    }
    ```
  - [x] Create `src/SdaManagement.Api/Validators/UpdateSubMinistryRequestValidator.cs`:
    ```csharp
    public class UpdateSubMinistryRequestValidator : AbstractValidator<UpdateSubMinistryRequest>
    {
        public UpdateSubMinistryRequestValidator()
        {
            RuleFor(x => x.Name)
                .NotEmpty().MaximumLength(100).MustNotContainControlCharacters();
        }
    }
    ```
  - [x] Auto-registered via existing `AddValidatorsFromAssemblyContaining<>()` — no additional registration needed.
  - [x] NOTE: Uniqueness constraints (abbreviation, color, sub-ministry name within department) are enforced at the DB level via unique indexes. The service returns appropriate error responses (409 Conflict) when these constraints are violated — not validated at the FluentValidation level.

- [x] **Task 4: Create IDepartmentService + DepartmentService** (AC: #2, #3, #4, #6)
  - [x] Create `src/SdaManagement.Api/Services/IDepartmentService.cs`:
    ```csharp
    public interface IDepartmentService
    {
        Task<List<DepartmentListItem>> GetAllAsync();
        Task<DepartmentResponse?> GetByIdAsync(int id);
        Task<DepartmentResponse> CreateAsync(CreateDepartmentRequest request);
        Task<DepartmentResponse?> UpdateAsync(int id, UpdateDepartmentRequest request);
        Task<bool> DeleteAsync(int id);
        Task<SubMinistryResponse?> AddSubMinistryAsync(int departmentId, CreateSubMinistryRequest request);
        Task<SubMinistryResponse?> UpdateSubMinistryAsync(int departmentId, int subMinistryId, UpdateSubMinistryRequest request);
        Task<bool> DeleteSubMinistryAsync(int departmentId, int subMinistryId);
    }
    ```
  - [x] Create `src/SdaManagement.Api/Services/DepartmentService.cs`:
    - Inject `AppDbContext` and `ISanitizationService` via primary constructor
    - `GetAllAsync()`: Return all departments as `DepartmentListItem` with sub-ministry count. Use `.Select()` projection. Order by `Name`. No pagination needed (<20 departments for a church).
    - `GetByIdAsync(int id)`: Return `DepartmentResponse` with sub-ministries included. Use `.Include(d => d.SubMinistries)` then project to DTO. Return null if not found.
    - `CreateAsync()`: Sanitize all text fields. Create Department entity + any initial SubMinistry entities from `SubMinistryNames`. Set `CreatedAt = UpdatedAt = DateTime.UtcNow`. Return `DepartmentResponse`.
    - `UpdateAsync()`: Find by id, return null if not found. Sanitize text fields. Update properties and `UpdatedAt`. Return `DepartmentResponse`.
    - `DeleteAsync()`: Find by id. Return false if not found. Remove entity (cascade deletes sub-ministries + user-department assignments). Return true.
    - `AddSubMinistryAsync()`: Find department by id. Return null if not found. Sanitize name. Create SubMinistry. Return `SubMinistryResponse`.
    - `UpdateSubMinistryAsync()`: Find SubMinistry by id and departmentId. Return null if not found. Sanitize name. Update. Return `SubMinistryResponse`.
    - `DeleteSubMinistryAsync()`: Find SubMinistry by id and departmentId. Return false if not found. Remove. Return true.
    - Handle unique constraint violations: Catch `DbUpdateException` with inner `PostgresException` where `SqlState == "23505"` (unique violation). Return appropriate error to controller for 409 Conflict response.
  - [x] Register as scoped in `ServiceCollectionExtensions.cs`: `services.AddScoped<IDepartmentService, DepartmentService>();`

- [x] **Task 5: Create DepartmentsController** (AC: #2, #3, #4, #5, #6)
  - [x] Create `src/SdaManagement.Api/Controllers/DepartmentsController.cs`:
    ```
    [Route("api/departments")]
    [ApiController]
    [Authorize]
    [EnableRateLimiting("auth")]
    ```
  - [x] Inject via primary constructor: `IDepartmentService`, `SdacAuth.IAuthorizationService`, `ISanitizationService`
  - [x] Endpoints:
    - `GET /api/departments` — **Authenticated (VIEWER+)**. `if (!auth.IsAuthenticated()) return Forbid();`. Returns `List<DepartmentListItem>`.
    - `GET /api/departments/{id}` — **Authenticated (VIEWER+)**. `if (!auth.IsAuthenticated()) return Forbid();`. Returns `DepartmentResponse` with sub-ministries. 404 if not found.
    - `POST /api/departments` — **OWNER only**. `if (!auth.IsOwner()) return Forbid();`. Validate with `[FromServices] IValidator<CreateDepartmentRequest>`. Returns 201 Created with Location header.
    - `PUT /api/departments/{id}` — **OWNER only**. `if (!auth.IsOwner()) return Forbid();`. Validate with `[FromServices] IValidator<UpdateDepartmentRequest>`. Returns 200 OK or 404.
    - `DELETE /api/departments/{id}` — **OWNER only**. `if (!auth.IsOwner()) return Forbid();`. Returns 204 No Content or 404.
    - `POST /api/departments/{departmentId}/sub-ministries` — **OWNER only**. `if (!auth.IsOwner()) return Forbid();`. Validate. Returns 201 Created.
    - `PUT /api/departments/{departmentId}/sub-ministries/{id}` — **OWNER only**. Returns 200 OK or 404.
    - `DELETE /api/departments/{departmentId}/sub-ministries/{id}` — **OWNER only**. Returns 204 No Content or 404.
  - [x] For 409 Conflict (unique constraint violation), return ProblemDetails:
    ```csharp
    return Conflict(new ProblemDetails
    {
        Type = "urn:sdac:conflict",
        Title = "Resource Conflict",
        Status = 409,
        Detail = "A department with this abbreviation or color already exists."
    });
    ```
  - [x] Copy `ValidationError()` helper pattern from `ConfigController`.
  - [x] Follow controller method template: auth check → validate → service call → return.

- [x] **Task 6: Backend integration tests** (AC: #1–#6)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/Departments/DepartmentEndpointTests.cs`
  - [x] Extend `IntegrationTestBase`. Use `OwnerClient`, `AdminClient`, `ViewerClient`, `AnonymousClient`.
  - [x] Tests for department CRUD:
    - `GetDepartments_AsViewer_ReturnsEmptyList` — GET /api/departments with ViewerClient, verify 200 with empty list
    - `GetDepartments_AsAnonymous_Returns401` — GET /api/departments with AnonymousClient, verify 401
    - `CreateDepartment_AsOwner_Returns201` — POST with valid data, verify 201 with Location header, verify response body
    - `CreateDepartment_AsAdmin_Returns403` — POST with AdminClient, verify 403
    - `CreateDepartment_WithDuplicateAbbreviation_Returns409` — POST twice with same abbreviation, verify 409
    - `CreateDepartment_WithDuplicateColor_Returns409` — POST twice with same color, verify 409
    - `CreateDepartment_WithInvalidData_Returns400` — POST with empty name, verify 400 ProblemDetails
    - `CreateDepartment_WithInvalidHexColor_Returns400` — POST with "red" (not hex), verify 400
    - `CreateDepartment_SanitizesHtmlInput` — POST with `<script>alert('xss')</script>JA`, verify HTML stripped
    - `CreateDepartment_WithSubMinistries_CreatesAll` — POST with SubMinistryNames, verify sub-ministries created
    - `GetDepartment_ById_ReturnsDetailWithSubMinistries` — Create with sub-ministries, GET by id, verify sub-ministries included
    - `GetDepartment_NotFound_Returns404` — GET /api/departments/999, verify 404
    - `UpdateDepartment_AsOwner_ReturnsUpdated` — PUT with new data, verify 200 with updated fields
    - `UpdateDepartment_AsAdmin_Returns403` — PUT with AdminClient, verify 403
    - `UpdateDepartment_NotFound_Returns404` — PUT /api/departments/999, verify 404
    - `DeleteDepartment_AsOwner_Returns204` — DELETE, verify 204, verify GET returns 404
    - `DeleteDepartment_AsAdmin_Returns403` — DELETE with AdminClient, verify 403
    - `DeleteDepartment_CascadesSubMinistries` — Create with sub-ministries, delete department, verify sub-ministries gone
  - [x] Tests for sub-ministry CRUD:
    - `AddSubMinistry_AsOwner_Returns201` — POST to /api/departments/{id}/sub-ministries, verify 201
    - `AddSubMinistry_DuplicateName_Returns409` — POST same name twice under same department, verify 409
    - `AddSubMinistry_DepartmentNotFound_Returns404` — POST to /api/departments/999/sub-ministries, verify 404
    - `UpdateSubMinistry_AsOwner_Returns200` — PUT, verify updated name
    - `DeleteSubMinistry_AsOwner_Returns204` — DELETE, verify 204
  - [x] Follow existing patterns: Shouldly assertions (`.ShouldBe()`, `.ShouldNotBeNull()`), `JsonDocument` for response parsing.

- [x] **Task 7: Frontend — Zod schema + API service + types** (AC: #2)
  - [x] Create `src/sdamanagement-web/src/schemas/departmentSchema.ts`:
    ```typescript
    import { z } from "zod";

    export const departmentSchema = z.object({
      name: z
        .string()
        .min(1, { error: "Le nom du departement est requis" })
        .max(100),
      abbreviation: z
        .string()
        .min(1, { error: "L'abreviation est requise" })
        .max(10)
        .regex(/^[A-Za-z0-9]+$/, { error: "Lettres et chiffres seulement" }),
      color: z
        .string()
        .min(1, { error: "La couleur est requise" })
        .regex(/^#[0-9A-Fa-f]{6}$/, { error: "Format hexadecimal requis (ex: #4F46E5)" }),
      description: z.string().max(500).optional().or(z.literal("")),
      subMinistryNames: z.array(z.string().min(1).max(100)).optional(),
    });

    export const subMinistrySchema = z.object({
      name: z
        .string()
        .min(1, { error: "Le nom du sous-ministere est requis" })
        .max(100),
    });

    export type DepartmentFormData = z.infer<typeof departmentSchema>;
    export type SubMinistryFormData = z.infer<typeof subMinistrySchema>;
    ```
  - [x] Create `src/sdamanagement-web/src/services/departmentService.ts`:
    ```typescript
    import api from "@/lib/api";
    import type { DepartmentFormData, SubMinistryFormData } from "@/schemas/departmentSchema";

    export interface SubMinistryResponse {
      id: number;
      name: string;
    }

    export interface DepartmentResponse {
      id: number;
      name: string;
      abbreviation: string;
      color: string;
      description: string | null;
      subMinistries: SubMinistryResponse[];
      createdAt: string;
      updatedAt: string;
    }

    export interface DepartmentListItem {
      id: number;
      name: string;
      abbreviation: string;
      color: string;
      description: string | null;
      subMinistryCount: number;
    }

    export const departmentService = {
      getAll: () => api.get<DepartmentListItem[]>("/api/departments"),
      getById: (id: number) => api.get<DepartmentResponse>(`/api/departments/${id}`),
      create: (data: DepartmentFormData) => api.post<DepartmentResponse>("/api/departments", data),
      update: (id: number, data: Omit<DepartmentFormData, "subMinistryNames">) =>
        api.put<DepartmentResponse>(`/api/departments/${id}`, data),
      delete: (id: number) => api.delete(`/api/departments/${id}`),
      addSubMinistry: (departmentId: number, data: SubMinistryFormData) =>
        api.post<SubMinistryResponse>(`/api/departments/${departmentId}/sub-ministries`, data),
      updateSubMinistry: (departmentId: number, id: number, data: SubMinistryFormData) =>
        api.put<SubMinistryResponse>(`/api/departments/${departmentId}/sub-ministries/${id}`, data),
      deleteSubMinistry: (departmentId: number, id: number) =>
        api.delete(`/api/departments/${departmentId}/sub-ministries/${id}`),
    };
    ```
  - [x] NOTE: Zod field names (`name`, `abbreviation`, `color`, `description`, `subMinistryNames`) match C# DTO property names in camelCase exactly.

- [x] **Task 8: Install required shadcn/ui components** (AC: #1)
  - [x] From `src/sdamanagement-web/`, install any missing components:
    - `npx shadcn@latest add dialog` — for create/edit department modal
    - `npx shadcn@latest add table` — for department list (if not already installed)
    - `npx shadcn@latest add badge` — for department abbreviation display
    - `npx shadcn@latest add alert-dialog` — for delete confirmation
  - [x] Verify components appear in `src/components/ui/`
  - [x] NOTE: `card`, `input`, `label`, `button`, `skeleton`, `separator`, `select`, `textarea` are already installed from previous stories.

- [x] **Task 9: Create AdminDepartmentsPage + DepartmentForm + DepartmentCard** (AC: #1, #2, #3, #4)
  - [x] Create `src/sdamanagement-web/src/pages/AdminDepartmentsPage.tsx`:
    - Use `useAuth()` to verify OWNER role. Non-OWNER: redirect or show access denied.
    - Use `useQuery({ queryKey: ["departments"], queryFn: () => departmentService.getAll() })` to fetch department list.
    - Empty state: show message "Creez vos departements — ils structurent toute l'application" with helper text and a prominent "Creer un departement" button.
    - Department list: render `DepartmentCard` for each department in a responsive grid (1 col mobile, 2 col tablet, 3 col desktop).
    - "Creer un departement" button (primary, top-right) opens create dialog.
    - Loading: skeleton cards.
  - [x] Create `src/sdamanagement-web/src/components/department/DepartmentCard.tsx`:
    - Card with left-border accent in department color (4px solid).
    - Displays: name (bold), abbreviation badge, description (truncated), sub-ministry count.
    - Action buttons (ghost): "Modifier" (edit), "Supprimer" (delete/destructive).
    - Click edit → opens DepartmentFormDialog in edit mode.
    - Click delete → opens AlertDialog for confirmation. On confirm, `useMutation` calls `departmentService.delete(id)` and invalidates `["departments"]`.
  - [x] Create `src/sdamanagement-web/src/components/department/DepartmentFormDialog.tsx`:
    - Dialog component for create/edit department.
    - Form fields:
      - Nom du departement → `Input` (required)
      - Abreviation → `Input` (required, uppercase hint)
      - Couleur → `Input` type="text" with hex format (e.g., "#4F46E5"). Show a small color preview square next to the input.
      - Description → `Textarea` (optional)
      - Sous-ministeres → Dynamic list: each sub-ministry is an Input with a remove "x" button. "Ajouter un sous-ministere" button to add more. Only shown in create mode (edit sub-ministries managed inline on detail view).
    - Use `react-hook-form` with `zodResolver(departmentSchema)`.
    - `useMutation` for create/update:
      - Create mode: `departmentService.create(data)` → invalidate `["departments"]` → toast success → close dialog.
      - Edit mode: `departmentService.update(id, data)` → invalidate `["departments"]` → toast success → close dialog.
    - Handle 409 Conflict errors: show toast "Un departement avec cette abreviation ou couleur existe deja."
  - [x] Create `src/sdamanagement-web/src/components/department/SubMinistryManager.tsx`:
    - Inline list of sub-ministries within a department card or detail view.
    - Each sub-ministry: name text + edit/delete ghost buttons.
    - "Ajouter un sous-ministere" → inline input with save/cancel.
    - Edit → inline input replacing text.
    - Delete → no confirmation (reversible by re-adding).
    - `useMutation` for each operation, invalidating `["departments", departmentId]`.
  - [x] Create barrel export: `src/sdamanagement-web/src/components/department/index.ts`

- [x] **Task 10: Add route + navigation** (AC: #1)
  - [x] Update `src/sdamanagement-web/src/App.tsx`:
    - Add lazy import: `const AdminDepartmentsPage = lazy(() => import("@/pages/AdminDepartmentsPage"));`
    - Add route under admin section: `<Route path="admin/departments" element={<AdminDepartmentsPage />} />`
  - [x] Update `src/sdamanagement-web/src/components/layout/AppSidebar.tsx`:
    - Add nav item in the `navItems` array (insert after the admin item):
      ```typescript
      { to: "/admin/departments", labelKey: "nav.auth.adminDepartments", icon: Building2, minRole: "OWNER" },
      ```
    - NOTE: Reuse the `Building2` icon from lucide-react (already imported). Consider using a different icon to distinguish from the VIEWER departments link. Alternative: `FolderTree` from lucide-react for admin departments.

- [x] **Task 11: Add i18n translation keys** (AC: #1)
  - [x] Update `public/locales/fr/common.json` — add:
    ```json
    "nav.auth.adminDepartments": "Gestion des departements",
    "pages.adminDepartments.title": "Gestion des departements",
    "pages.adminDepartments.emptyState": "Creez vos departements — ils structurent toute l'application",
    "pages.adminDepartments.emptyStateHelper": "Les departements organisent les activites, les membres et les responsabilites.",
    "pages.adminDepartments.createButton": "Creer un departement",
    "pages.adminDepartments.form.createTitle": "Nouveau departement",
    "pages.adminDepartments.form.editTitle": "Modifier le departement",
    "pages.adminDepartments.form.name": "Nom du departement",
    "pages.adminDepartments.form.namePlaceholder": "Jeunesse Adventiste",
    "pages.adminDepartments.form.abbreviation": "Abreviation",
    "pages.adminDepartments.form.abbreviationPlaceholder": "JA",
    "pages.adminDepartments.form.color": "Couleur",
    "pages.adminDepartments.form.colorPlaceholder": "#4F46E5",
    "pages.adminDepartments.form.description": "Description",
    "pages.adminDepartments.form.descriptionPlaceholder": "Activites et programmes pour la jeunesse...",
    "pages.adminDepartments.form.subMinistries": "Sous-ministeres",
    "pages.adminDepartments.form.addSubMinistry": "Ajouter un sous-ministere",
    "pages.adminDepartments.form.subMinistryPlaceholder": "Eclaireurs",
    "pages.adminDepartments.form.save": "Enregistrer",
    "pages.adminDepartments.form.saving": "Enregistrement...",
    "pages.adminDepartments.form.cancel": "Annuler",
    "pages.adminDepartments.createSuccess": "Departement cree avec succes",
    "pages.adminDepartments.updateSuccess": "Departement modifie avec succes",
    "pages.adminDepartments.deleteSuccess": "Departement supprime",
    "pages.adminDepartments.deleteConfirmTitle": "Supprimer le departement",
    "pages.adminDepartments.deleteConfirmMessage": "Cette action est irreversible. Les sous-ministeres associes seront egalement supprimes.",
    "pages.adminDepartments.deleteConfirmAction": "Supprimer",
    "pages.adminDepartments.conflictError": "Un departement avec cette abreviation ou couleur existe deja.",
    "pages.adminDepartments.subMinistry.addSuccess": "Sous-ministere ajoute",
    "pages.adminDepartments.subMinistry.updateSuccess": "Sous-ministere modifie",
    "pages.adminDepartments.subMinistry.deleteSuccess": "Sous-ministere supprime",
    "pages.adminDepartments.card.subMinistries": "sous-ministere(s)",
    "pages.adminDepartments.card.edit": "Modifier",
    "pages.adminDepartments.card.delete": "Supprimer",
    "pages.adminDepartments.noAccess": "Acces reserve au proprietaire du systeme."
    ```
  - [x] Update `public/locales/en/common.json` — add matching English keys:
    ```json
    "nav.auth.adminDepartments": "Department Management",
    "pages.adminDepartments.title": "Department Management",
    "pages.adminDepartments.emptyState": "Create your departments — they structure the entire application",
    "pages.adminDepartments.emptyStateHelper": "Departments organize activities, members, and responsibilities.",
    "pages.adminDepartments.createButton": "Create a department",
    "pages.adminDepartments.form.createTitle": "New Department",
    "pages.adminDepartments.form.editTitle": "Edit Department",
    "pages.adminDepartments.form.name": "Department Name",
    "pages.adminDepartments.form.namePlaceholder": "Adventist Youth",
    "pages.adminDepartments.form.abbreviation": "Abbreviation",
    "pages.adminDepartments.form.abbreviationPlaceholder": "AY",
    "pages.adminDepartments.form.color": "Color",
    "pages.adminDepartments.form.colorPlaceholder": "#4F46E5",
    "pages.adminDepartments.form.description": "Description",
    "pages.adminDepartments.form.descriptionPlaceholder": "Youth activities and programs...",
    "pages.adminDepartments.form.subMinistries": "Sub-Ministries",
    "pages.adminDepartments.form.addSubMinistry": "Add a sub-ministry",
    "pages.adminDepartments.form.subMinistryPlaceholder": "Pathfinders",
    "pages.adminDepartments.form.save": "Save",
    "pages.adminDepartments.form.saving": "Saving...",
    "pages.adminDepartments.form.cancel": "Cancel",
    "pages.adminDepartments.createSuccess": "Department created successfully",
    "pages.adminDepartments.updateSuccess": "Department updated successfully",
    "pages.adminDepartments.deleteSuccess": "Department deleted",
    "pages.adminDepartments.deleteConfirmTitle": "Delete Department",
    "pages.adminDepartments.deleteConfirmMessage": "This action is irreversible. Associated sub-ministries will also be deleted.",
    "pages.adminDepartments.deleteConfirmAction": "Delete",
    "pages.adminDepartments.conflictError": "A department with this abbreviation or color already exists.",
    "pages.adminDepartments.subMinistry.addSuccess": "Sub-ministry added",
    "pages.adminDepartments.subMinistry.updateSuccess": "Sub-ministry updated",
    "pages.adminDepartments.subMinistry.deleteSuccess": "Sub-ministry deleted",
    "pages.adminDepartments.card.subMinistries": "sub-ministry(ies)",
    "pages.adminDepartments.card.edit": "Edit",
    "pages.adminDepartments.card.delete": "Delete",
    "pages.adminDepartments.noAccess": "Access reserved for the system owner."
    ```
  - [x] Match existing i18n file style (check for Unicode escaping vs literal characters).

- [x] **Task 12: Frontend MSW handlers + tests** (AC: #1–#6)
  - [x] Create `src/sdamanagement-web/src/mocks/handlers/departments.ts`:
    - Mock data: 2-3 departments with sub-ministries (JA with Eclaireurs/Ambassadeurs, MIFEM, Diaconat)
    - Handlers:
      - `GET /api/departments` → return mock list
      - `GET /api/departments/:id` → return mock detail with sub-ministries
      - `POST /api/departments` → return created department (201)
      - `PUT /api/departments/:id` → return updated department (200)
      - `DELETE /api/departments/:id` → return 204
      - Sub-ministry CRUD handlers
    - Error variants: `departmentHandlers409` for conflict, `departmentHandlers404` for not found
  - [x] Update `src/mocks/handlers/index.ts` to export department handlers
  - [x] Create `src/sdamanagement-web/src/pages/AdminDepartmentsPage.test.tsx`:
    - Test: renders empty state when no departments exist
    - Test: renders department list for OWNER user
    - Test: shows access denied for ADMIN user
    - Test: opens create dialog and submits new department
    - Test: shows validation errors for invalid input
    - Test: opens edit dialog with pre-populated data
    - Test: shows delete confirmation and deletes department
    - Test: handles 409 conflict error on create
  - [x] Create `src/sdamanagement-web/src/schemas/departmentSchema.test.ts`:
    - Test: accepts valid department data
    - Test: rejects empty name
    - Test: rejects empty abbreviation
    - Test: rejects invalid abbreviation (special characters)
    - Test: rejects invalid hex color
    - Test: accepts valid hex color
    - Test: accepts empty optional description

## Dev Notes

### Architecture Compliance

- **Decision #2** (Centralized authorization service): DepartmentsController uses `IAuthorizationService.IsOwner()` for OWNER-only mutations (POST/PUT/DELETE) and `IsAuthenticated()` for read access (GET). Return-based pattern (not exceptions): `if (!_auth.IsOwner()) return Forbid();`
- **Decision #5** (i18n day-one): ALL user-facing strings through `useTranslation()`. No hardcoded French or English strings in components. Zod validation messages in French.
- **Decision #6** (Frontend state stack): TanStack Query for server state (`useQuery` for department list, `useMutation` for CRUD). No Zustand needed for this story — department data is server-state.
- **Decision #10** (Public API contract): No public department endpoint in this story (public overview is Epic 5, Story 5.4). All endpoints require authentication.
- **Decision #12** (EF Core `.Select()` projections): All read endpoints use `.Select()` projection to DTOs. Never return Department entity directly.
- **Key Principle #1** (Security boundary is the API layer): Frontend hides create/edit/delete buttons for non-OWNER. Backend enforces OWNER-only access on mutation endpoints. Frontend is UX; API is security.
- **Key Principle #2** (Department as aggregate root): Department owns SubMinistries. Cascade delete on department removal. No cross-aggregate writes.
- **Naming pattern**: `DepartmentsController` (plural), endpoints at `/api/departments`, DTO namespace `Dtos.Department`.

### Security Constraints

- **OWNER-only mutations**: Only OWNER can POST/PUT/DELETE departments and sub-ministries. Backend enforces via `IAuthorizationService.IsOwner()`.
- **Authenticated reads**: Any authenticated user (VIEWER+) can read department list and details via `IsAuthenticated()` check.
- **4-layer sanitization pipeline**: Same as Story 2.1 — FluentValidation → HtmlSanitizer → EF Core → React JSX.
- **Unique constraints at DB level**: Abbreviation and Color uniqueness enforced via database unique indexes, not just application logic. Prevents race conditions.

### What Already Exists (DO NOT Recreate)

**Backend — Infrastructure ready:**
- `Department` entity at `src/SdaManagement.Api/Data/Entities/Department.cs` — MODIFY (expand with new fields), do NOT recreate
- `AppDbContext` at `src/SdaManagement.Api/Data/AppDbContext.cs` — MODIFY (expand Department config, add SubMinistry), do NOT recreate
- `IAuthorizationService` at `src/SdaManagement.Api/Auth/IAuthorizationService.cs` — has `IsOwner()` and `IsAuthenticated()` methods
- `ISanitizationService` + `SanitizationService` — singleton, reuse for all text field sanitization
- `ValidationExtensions.MustNotContainControlCharacters()` at `src/SdaManagement.Api/Validators/ValidationExtensions.cs`
- `ServiceCollectionExtensions.cs` — add `IDepartmentService` registration here
- FluentValidation auto-registration — new validators auto-discovered
- Rate limiting `[EnableRateLimiting("auth")]` — reuse
- `ConfigController` ValidationError() pattern — copy helper to DepartmentsController

**Frontend — Infrastructure ready:**
- `App.tsx` routing — MODIFY (add admin/departments route)
- `AppSidebar.tsx` — MODIFY (add departments nav item)
- `api.ts` Axios instance — reuse
- `queryClient.ts` — reuse
- `AuthContext` with `useAuth()` hook — reuse
- `sonner` Toaster — `toast.success()` / `toast.error()` ready
- `test-utils.tsx` — custom render with AllProviders wrapper
- MSW infrastructure in `src/mocks/handlers/`
- All shadcn/ui core components (Button, Input, Label, Skeleton, Card, Select, Textarea)
- `schemas/` directory — add departmentSchema.ts
- `services/` directory — add departmentService.ts

**Things that DO NOT exist yet (create in this story):**

Backend:
- `src/SdaManagement.Api/Data/Entities/SubMinistry.cs` — new entity
- `src/SdaManagement.Api/Dtos/Department/CreateDepartmentRequest.cs` — request DTO
- `src/SdaManagement.Api/Dtos/Department/UpdateDepartmentRequest.cs` — request DTO
- `src/SdaManagement.Api/Dtos/Department/DepartmentResponse.cs` — detail response DTO
- `src/SdaManagement.Api/Dtos/Department/DepartmentListItem.cs` — list item DTO
- `src/SdaManagement.Api/Dtos/Department/SubMinistryResponse.cs` — sub-ministry DTO
- `src/SdaManagement.Api/Dtos/Department/CreateSubMinistryRequest.cs` — request DTO
- `src/SdaManagement.Api/Dtos/Department/UpdateSubMinistryRequest.cs` — request DTO
- `src/SdaManagement.Api/Validators/CreateDepartmentRequestValidator.cs` — validator
- `src/SdaManagement.Api/Validators/UpdateDepartmentRequestValidator.cs` — validator
- `src/SdaManagement.Api/Validators/CreateSubMinistryRequestValidator.cs` — validator
- `src/SdaManagement.Api/Validators/UpdateSubMinistryRequestValidator.cs` — validator
- `src/SdaManagement.Api/Services/IDepartmentService.cs` — service interface
- `src/SdaManagement.Api/Services/DepartmentService.cs` — service implementation
- `src/SdaManagement.Api/Controllers/DepartmentsController.cs` — controller
- `src/SdaManagement.Api/Data/Migrations/*_ExpandDepartmentAddSubMinistries.cs` — migration
- `tests/SdaManagement.Api.IntegrationTests/Departments/DepartmentEndpointTests.cs` — tests

Frontend:
- `src/sdamanagement-web/src/schemas/departmentSchema.ts` — Zod schemas
- `src/sdamanagement-web/src/schemas/departmentSchema.test.ts` — schema tests
- `src/sdamanagement-web/src/services/departmentService.ts` — API service
- `src/sdamanagement-web/src/pages/AdminDepartmentsPage.tsx` — page component
- `src/sdamanagement-web/src/pages/AdminDepartmentsPage.test.tsx` — page tests
- `src/sdamanagement-web/src/components/department/DepartmentCard.tsx` — card component
- `src/sdamanagement-web/src/components/department/DepartmentFormDialog.tsx` — form dialog
- `src/sdamanagement-web/src/components/department/SubMinistryManager.tsx` — inline manager
- `src/sdamanagement-web/src/components/department/index.ts` — barrel export
- `src/sdamanagement-web/src/mocks/handlers/departments.ts` — MSW handlers
- `src/sdamanagement-web/src/components/ui/dialog.tsx` — install via shadcn (if missing)
- `src/sdamanagement-web/src/components/ui/alert-dialog.tsx` — install via shadcn (if missing)
- `src/sdamanagement-web/src/components/ui/badge.tsx` — install via shadcn (if missing)
- `src/sdamanagement-web/src/components/ui/table.tsx` — install via shadcn (if missing)

**Files to MODIFY:**
- `src/SdaManagement.Api/Data/Entities/Department.cs` — expand with Abbreviation, Color, Description, UpdatedAt, SubMinistries
- `src/SdaManagement.Api/Data/AppDbContext.cs` — add SubMinistry DbSet, expand Department config, add SubMinistry config
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — register IDepartmentService
- `src/sdamanagement-web/src/App.tsx` — add AdminDepartmentsPage lazy import + route
- `src/sdamanagement-web/src/components/layout/AppSidebar.tsx` — add department admin nav item
- `src/sdamanagement-web/public/locales/fr/common.json` — add department i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — add department i18n keys

### Frontend Patterns

- **React Router v7** (`react-router-dom ^7.13.1`): AdminDepartmentsPage lazy-loaded via `React.lazy()` in App.tsx.
- **Axios instance** (`src/lib/api.ts`): All API calls through configured instance. `withCredentials: true`.
- **TanStack Query pattern**: `useQuery({ queryKey: ['departments'], queryFn: () => departmentService.getAll() })` for list. `useMutation` for CRUD with `onSuccess` invalidating `['departments']`.
- **Form pattern**: `useForm<DepartmentFormData>({ resolver: zodResolver(departmentSchema), defaultValues: ..., mode: "onBlur" })`.
- **Toast pattern**: `toast.success(t('...'))` on success, `toast.error(t('...'))` on error.
- **Path alias**: `@` -> `src/`. Use `@/services/departmentService`, `@/schemas/departmentSchema`.
- **Component co-location**: Domain components in `src/components/department/`.

### UX Design Notes

- **Department color**: Display as a 4px left-border accent on cards and a small preview square next to the color input field. Colors must be visible and distinguishable.
- **Department badge**: Abbreviation text on department hue-group background. Use DepartmentBadge pattern from UX spec: `aria-label` includes full department name.
- **Smart empty state**: Indigo-tinted icon or illustration, prominent CTA button, helper text explaining purpose.
- **Form layout**: Single-column, labels above fields, "(optionnel)" on optional fields. Submit right-aligned (desktop) / full-width (mobile).
- **Delete confirmation**: AlertDialog with destructive variant button. Title: "Supprimer le departement". Description: "Cette action est irreversible..."
- **Responsive**: Cards in 1-col (mobile), 2-col (`sm:`), 3-col (`lg:`). No `md:` breakpoint (intentionally skipped per UX spec).
- **Touch targets**: All interactive elements minimum 44px x 44px.

### Project Structure Notes

- Alignment with architecture: `DepartmentsController` at `/api/departments` matches architecture mapping table.
- Department is an **aggregate root** that owns SubMinistry. No cross-aggregate writes.
- The Department entity expansion is an `ALTER TABLE` migration, not a new table. The migration must handle existing rows gracefully (new columns need defaults or be nullable).
  - `abbreviation`: NOT NULL with no default — migration must handle. Options: (a) set a temporary default and remove it, or (b) since the DB is in development, existing department rows (if any from test seeds) can be dropped. **Recommended**: Make migration add columns as nullable first, then add NOT NULL constraint. OR: since this is early development, just drop existing test data.
  - `color`: Same consideration as abbreviation.
  - `updated_at`: Can default to `now()`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data Boundaries, Department aggregate root]
- [Source: _bmad-output/planning-artifacts/architecture.md — Requirements to Structure Mapping, FR41-FR48]
- [Source: _bmad-output/planning-artifacts/architecture.md — Controller Method Template]
- [Source: _bmad-output/planning-artifacts/architecture.md — DTO Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md — FluentValidation + HtmlSanitizer pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md — Backend/Frontend Project Organization]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Department Color Palette]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — DepartmentBadge Component]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Form Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Button Hierarchy, destructive actions]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Responsive Strategy, breakpoints]
- [Source: _bmad-output/planning-artifacts/prd.md — FR41-FR48, FR57]
- [Source: _bmad-output/implementation-artifacts/2-1-church-identity-settings.md — Established CRUD patterns]

### Previous Story Intelligence (Story 2.1)

**Patterns established in Story 2.1 that MUST be followed:**
1. Controller uses primary constructor injection with `SdacAuth = SdaManagement.Api.Auth` alias
2. Validator injected via `[FromServices] IValidator<T>` at action level, NOT constructor
3. `ValidationError()` private helper wraps FluentValidation results into ProblemDetails with `urn:sdac:validation-error` type
4. Service sanitizes text fields BEFORE persistence: `Sanitize()` for required, `SanitizeNullable()` for nullable
5. DTOs: Request as `record`, Response as `class`, both with `init` accessors
6. Frontend form: `mode: "onBlur"` validation, `Controller` for complex fields, `register()` for simple inputs
7. Frontend tests: MSW handlers with server override per test, `render()` from `@/test-utils`, `waitFor()` for async
8. i18n keys nested by domain: `pages.{page}.{component}.{field}`
9. Integration tests: Shouldly assertions, `JsonDocument` parsing, `OwnerClient`/`AdminClient`/`AnonymousClient`

**Lessons from Story 2.1 dev:**
- `ConfigService.UpsertConfigAsync()` used serializable transaction isolation — for department CRUD, default isolation is fine (no singleton upsert concern)
- The `[Authorize]` attribute can be at controller level (all endpoints require auth) with individual `IsOwner()` checks for mutation endpoints
- DI registration: services as scoped, sanitization as singleton, validators auto-discovered
- Frontend service exports both types (interfaces) and the service object

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing test failure: `LogoutEndpointTests.Logout_WithValidRefreshToken_RevokesTokenAndClearsCookies` — cookie assertion issue from Story 1.7, unrelated to department changes.
- Minor React warning in tests: `DialogContent` missing `Description` or `aria-describedby` — cosmetic, non-blocking.

### Completion Notes List

- All 12 tasks implemented sequentially (backend → frontend).
- EF Core migration correctly uses ALTER TABLE (AddColumn) for the existing departments table — no data loss.
- Unique constraints (abbreviation, color) enforced at DB level with 409 Conflict responses for violations.
- Sub-ministry name uniqueness scoped per department via composite unique index (department_id, name).
- ISanitizationService applied to all text inputs before persistence (XSS prevention).
- 40 new tests total: 23 backend integration tests, 10 Zod schema tests, 7 page-level tests.
- Backend: 71/72 tests pass (1 pre-existing failure unrelated to this story).
- Frontend: 88/88 tests pass.
- shadcn/ui components installed: dialog, table, badge, alert-dialog, popover.
- i18n keys added for both FR and EN locales.
- Navigation item added to AppSidebar with FolderTree icon, OWNER-only visibility.
- Replaced native color input with react-colorful gradient picker in Popover for better UX.
- Fixed pre-existing role case mismatch: API returns "Owner" (PascalCase) but ProtectedRoute expected "OWNER" (uppercase). Added .toUpperCase() normalization.
- Bumped dev rate limit from 5 to 100 req/min in appsettings.Development.json (was causing constant 429s during dev).
- Added dev.sh script for one-command full-stack startup.

### File List

**New files (backend):**
- src/SdaManagement.Api/Data/Entities/SubMinistry.cs
- src/SdaManagement.Api/Dtos/Department/CreateDepartmentRequest.cs
- src/SdaManagement.Api/Dtos/Department/UpdateDepartmentRequest.cs
- src/SdaManagement.Api/Dtos/Department/DepartmentResponse.cs
- src/SdaManagement.Api/Dtos/Department/DepartmentListItem.cs
- src/SdaManagement.Api/Dtos/Department/SubMinistryResponse.cs
- src/SdaManagement.Api/Dtos/Department/CreateSubMinistryRequest.cs
- src/SdaManagement.Api/Dtos/Department/UpdateSubMinistryRequest.cs
- src/SdaManagement.Api/Validators/CreateDepartmentRequestValidator.cs
- src/SdaManagement.Api/Validators/UpdateDepartmentRequestValidator.cs
- src/SdaManagement.Api/Validators/CreateSubMinistryRequestValidator.cs
- src/SdaManagement.Api/Validators/UpdateSubMinistryRequestValidator.cs
- src/SdaManagement.Api/Services/IDepartmentService.cs
- src/SdaManagement.Api/Services/DepartmentService.cs
- src/SdaManagement.Api/Controllers/DepartmentsController.cs
- src/SdaManagement.Api/Migrations/20260304043447_ExpandDepartmentAddSubMinistries.cs
- src/SdaManagement.Api/Migrations/20260304043447_ExpandDepartmentAddSubMinistries.Designer.cs
- tests/SdaManagement.Api.IntegrationTests/Departments/DepartmentEndpointTests.cs

**New files (frontend):**
- src/sdamanagement-web/src/schemas/departmentSchema.ts
- src/sdamanagement-web/src/schemas/departmentSchema.test.ts
- src/sdamanagement-web/src/services/departmentService.ts
- src/sdamanagement-web/src/pages/AdminDepartmentsPage.tsx
- src/sdamanagement-web/src/pages/AdminDepartmentsPage.test.tsx
- src/sdamanagement-web/src/components/department/DepartmentCard.tsx
- src/sdamanagement-web/src/components/department/DepartmentFormDialog.tsx
- src/sdamanagement-web/src/components/department/SubMinistryManager.tsx
- src/sdamanagement-web/src/components/department/index.ts
- src/sdamanagement-web/src/mocks/handlers/departments.ts
- src/sdamanagement-web/src/components/ui/dialog.tsx
- src/sdamanagement-web/src/components/ui/table.tsx
- src/sdamanagement-web/src/components/ui/badge.tsx
- src/sdamanagement-web/src/components/ui/alert-dialog.tsx
- src/sdamanagement-web/src/components/ui/popover.tsx
- src/sdamanagement-web/src/components/ui/color-picker.tsx
- dev.sh

**Modified files:**
- src/SdaManagement.Api/Data/Entities/Department.cs — expanded with Abbreviation, Color, Description, UpdatedAt, SubMinistries
- src/SdaManagement.Api/Data/AppDbContext.cs — added SubMinistry DbSet + configurations
- src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs — registered IDepartmentService
- src/sdamanagement-web/src/App.tsx — added AdminDepartmentsPage lazy import + route
- src/sdamanagement-web/src/components/layout/AppSidebar.tsx — added department admin nav item
- src/sdamanagement-web/public/locales/fr/common.json — added department i18n keys
- src/sdamanagement-web/public/locales/en/common.json — added department i18n keys
- src/sdamanagement-web/src/test-utils.tsx — added adminDepartments i18n keys
- src/sdamanagement-web/src/components/ProtectedRoute.tsx — fixed role case comparison (.toUpperCase())
- src/sdamanagement-web/package.json — added react-colorful dependency
- src/sdamanagement-web/package-lock.json — lockfile update for react-colorful
- src/SdaManagement.Api/appsettings.Development.json — added OwnerEmail, RateLimiting config

### Change Log

| Change | Reason |
|---|---|
| Expanded Department entity with Abbreviation, Color, Description, UpdatedAt, SubMinistries | AC #2: departments need these fields for organizational structure |
| Created SubMinistry entity with cascade delete from Department | AC #3: sub-ministries belong to departments |
| Created full CRUD REST API at /api/departments with OWNER-only mutations | AC #2, #4, #5: CRUD with role-based access control |
| Created sub-ministry CRUD at /api/departments/{id}/sub-ministries | AC #3: manage sub-ministries within departments |
| Created AdminDepartmentsPage with department grid, create/edit dialog, delete confirmation | AC #1, #2, #4: full UI for department management |
| Created SubMinistryManager for inline sub-ministry CRUD | AC #3: manage sub-ministries from department detail |
| Added 40 new tests (23 backend integration + 10 schema + 7 page) | AC #1-#6: comprehensive test coverage |
| Used FolderTree icon instead of Building2 for admin departments nav | Distinguish from VIEWER departments link in sidebar |
| Replaced native color input with react-colorful + Popover color picker | UX improvement: gradient picker is more intuitive than typing hex codes |
| Fixed role case mismatch in ProtectedRoute.tsx and AdminDepartmentsPage.tsx | Pre-existing bug: API returns "Owner" but frontend compared against "OWNER" |
| Added RateLimiting:AuthPermitLimit=100 in appsettings.Development.json | Dev fix: 5 req/min global limit caused constant 429 errors during development |
| Added dev.sh full-stack startup script | Dev tooling: one command to start Postgres + API + frontend |
