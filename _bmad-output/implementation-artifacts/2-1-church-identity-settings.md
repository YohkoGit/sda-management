# Story 2.1: Church Identity Settings

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **OWNER**,
I want to configure the church's identity (name, address, YouTube URL, phone, welcome message, default locale),
So that the public page displays the church's identity and the system has its foundational configuration.

## Acceptance Criteria

1. **Given** an OWNER navigating to Admin > Settings
   **When** the page loads for the first time (empty database — no ChurchConfig record)
   **Then** a smart empty state guides: "Configurez l'identite de votre eglise" with a setup form pre-displayed
   **And** the form contains fields: church name, address, YouTube channel URL, phone number, welcome message, default locale

2. **Given** the church settings form
   **When** the OWNER fills in all fields and submits
   **Then** FluentValidation validates all fields (required: name, address, defaultLocale; optional: youtubeUrl, phone, welcomeMessage)
   **And** HtmlSanitizer cleans all text inputs before persistence (strip ALL HTML — empty allowlist)
   **And** validation errors display inline via i18n-mapped error messages

3. **Given** valid church settings submitted
   **When** the OWNER saves
   **Then** a ChurchConfig record is created (singleton — only one row allowed)
   **And** a "Sauvegarde reussie" toast confirms the action
   **And** subsequent saves update the existing record (upsert pattern)
   **And** the public GET endpoint (`GET /api/config`) returns church name, address, welcome message, and YouTube URL for anonymous consumption

4. **Given** a non-OWNER user (ADMIN, VIEWER)
   **When** they attempt to access `PUT /api/config` or `GET /api/config/admin`
   **Then** the response is 403 Forbidden
   **And** the frontend Settings page conditionally renders church identity settings only for OWNER role

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
- **Story 1.3** — User entity with 4-tier roles (ANONYMOUS/VIEWER/ADMIN/OWNER), OWNER seed, `ICurrentUserContext`, JWT pipeline, `IAuthorizationService` with `IsOwner()` check
- **Story 1.4** — Google OAuth flow, `TokenService`, Axios 401->refresh->retry interceptor, `AuthContext`
- **Story 1.5** — Email/password login, LoginPage (three-state form), shadcn/ui components, `react-hook-form` + `zod` + `sonner` patterns, FluentValidation + `MustNotContainControlCharacters()` extension
- **Story 1.6** — Application shell (PublicLayout + AuthenticatedLayout), ProtectedRoute with role guards, AppSidebar with navigation, i18n (FR/EN), TanStack Query provider, Zustand UI store, code splitting with lazy routes

## Tasks / Subtasks

- [x] **Task 1: Create ChurchConfig entity + EF Core migration** (AC: #3)
  - [x] Create `src/SdaManagement.Api/Data/Entities/ChurchConfig.cs` — singleton entity:
    ```csharp
    public class ChurchConfig
    {
        public int Id { get; set; }
        public string ChurchName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? YouTubeChannelUrl { get; set; }
        public string? PhoneNumber { get; set; }
        public string? WelcomeMessage { get; set; }
        public string DefaultLocale { get; set; } = "fr";
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
    ```
  - [x] Add `DbSet<ChurchConfig>` to `AppDbContext.cs` — follow existing pattern: `public DbSet<ChurchConfig> ChurchConfigs => Set<ChurchConfig>();`
  - [x] Configure in `OnModelCreating`:
    ```csharp
    modelBuilder.Entity<ChurchConfig>(e =>
    {
        e.HasKey(c => c.Id);
        e.Property(c => c.ChurchName).HasMaxLength(150);
        e.Property(c => c.Address).HasMaxLength(300);
        e.Property(c => c.YouTubeChannelUrl).HasMaxLength(500);
        e.Property(c => c.PhoneNumber).HasMaxLength(30);
        e.Property(c => c.WelcomeMessage).HasMaxLength(1000);
        e.Property(c => c.DefaultLocale).HasMaxLength(5);
        e.Property(c => c.CreatedAt).HasDefaultValueSql("now()");
        e.Property(c => c.UpdatedAt).HasDefaultValueSql("now()");
    });
    ```
  - [x] Generate migration: `dotnet ef migrations add AddChurchConfig -p src/SdaManagement.Api`
  - [x] Verify migration creates `church_configs` table with snake_case columns (EFCore.NamingConventions handles this automatically)

- [x] **Task 2: Create ISanitizationService + SanitizationService** (AC: #2)
  - [x] Create `src/SdaManagement.Api/Services/ISanitizationService.cs`:
    ```csharp
    public interface ISanitizationService
    {
        string Sanitize(string? input);
        string? SanitizeNullable(string? input);
    }
    ```
  - [x] Create `src/SdaManagement.Api/Services/SanitizationService.cs`:
    ```csharp
    using Ganss.Xss;

    public class SanitizationService : ISanitizationService
    {
        private readonly HtmlSanitizer _sanitizer;

        public SanitizationService()
        {
            _sanitizer = new HtmlSanitizer();
            _sanitizer.AllowedTags.Clear();       // Strip ALL HTML tags
            _sanitizer.AllowedAttributes.Clear();  // Strip ALL attributes
            _sanitizer.AllowedSchemes.Clear();     // Strip ALL URI schemes
        }

        public string Sanitize(string? input)
        {
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;
            return _sanitizer.Sanitize(input).Trim();
        }

        public string? SanitizeNullable(string? input)
        {
            if (input is null)
                return null;
            if (string.IsNullOrWhiteSpace(input))
                return string.Empty;
            return _sanitizer.Sanitize(input).Trim();
        }
    }
    ```
  - [x] Register as **singleton** in `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs`: `services.AddSingleton<ISanitizationService, SanitizationService>();`
  - [x] This service is reusable by ALL future stories (departments, activities, user profiles, etc.)
  - [x] NOTE: `HtmlSanitizer` NuGet package (v9.0.892) is already installed — `using Ganss.Xss;`

- [x] **Task 3: Create DTOs** (AC: #3, #4)
  - [x] Create folder `src/SdaManagement.Api/Dtos/Config/`
  - [x] Create `PublicChurchConfigResponse.cs` — fields visible to anonymous users:
    ```csharp
    public class PublicChurchConfigResponse
    {
        public string ChurchName { get; init; } = string.Empty;
        public string Address { get; init; } = string.Empty;
        public string? WelcomeMessage { get; init; }
        public string? YouTubeChannelUrl { get; init; }
    }
    ```
  - [x] Create `ChurchConfigResponse.cs` — all fields for OWNER:
    ```csharp
    public class ChurchConfigResponse
    {
        public int Id { get; init; }
        public string ChurchName { get; init; } = string.Empty;
        public string Address { get; init; } = string.Empty;
        public string? YouTubeChannelUrl { get; init; }
        public string? PhoneNumber { get; init; }
        public string? WelcomeMessage { get; init; }
        public string DefaultLocale { get; init; } = string.Empty;
        public DateTime CreatedAt { get; init; }
        public DateTime UpdatedAt { get; init; }
    }
    ```
  - [x] Create `UpdateChurchConfigRequest.cs` — mutable fields:
    ```csharp
    public class UpdateChurchConfigRequest
    {
        public string ChurchName { get; init; } = string.Empty;
        public string Address { get; init; } = string.Empty;
        public string? YouTubeChannelUrl { get; init; }
        public string? PhoneNumber { get; init; }
        public string? WelcomeMessage { get; init; }
        public string DefaultLocale { get; init; } = "fr";
    }
    ```
  - [x] CRITICAL: `PublicChurchConfigResponse` is in a **separate concern** from `ChurchConfigResponse`. PhoneNumber and DefaultLocale are NOT exposed publicly. Never use `[JsonIgnore]` as a security mechanism.

- [x] **Task 4: Create UpdateChurchConfigRequestValidator** (AC: #2)
  - [x] Create `src/SdaManagement.Api/Validators/UpdateChurchConfigRequestValidator.cs`:
    ```csharp
    public class UpdateChurchConfigRequestValidator : AbstractValidator<UpdateChurchConfigRequest>
    {
        public UpdateChurchConfigRequestValidator()
        {
            RuleFor(x => x.ChurchName)
                .NotEmpty()
                .MaximumLength(150)
                .MustNotContainControlCharacters();

            RuleFor(x => x.Address)
                .NotEmpty()
                .MaximumLength(300)
                .MustNotContainControlCharacters();

            RuleFor(x => x.YouTubeChannelUrl)
                .MaximumLength(500)
                .Must(url => string.IsNullOrEmpty(url) || Uri.TryCreate(url, UriKind.Absolute, out _))
                .WithMessage("YouTube URL must be a valid absolute URL.")
                .When(x => !string.IsNullOrEmpty(x.YouTubeChannelUrl));

            RuleFor(x => x.PhoneNumber)
                .MaximumLength(30)
                .MustNotContainControlCharacters()
                .When(x => !string.IsNullOrEmpty(x.PhoneNumber));

            RuleFor(x => x.WelcomeMessage)
                .MaximumLength(1000)
                .MustNotContainControlCharacters()
                .When(x => !string.IsNullOrEmpty(x.WelcomeMessage));

            RuleFor(x => x.DefaultLocale)
                .NotEmpty()
                .Must(locale => locale is "fr" or "en")
                .WithMessage("Default locale must be 'fr' or 'en'.");
        }
    }
    ```
  - [x] Auto-registered via existing `AddValidatorsFromAssemblyContaining<>()` call — no additional registration needed.
  - [x] Structural rules (required, maxLength, format) MUST match the frontend Zod schema (Task 8).

- [x] **Task 5: Create IConfigService + ConfigService** (AC: #2, #3)
  - [x] Create `src/SdaManagement.Api/Services/IConfigService.cs`:
    ```csharp
    public interface IConfigService
    {
        Task<PublicChurchConfigResponse?> GetPublicConfigAsync();
        Task<ChurchConfigResponse?> GetConfigAsync();
        Task<ChurchConfigResponse> UpsertConfigAsync(UpdateChurchConfigRequest request);
    }
    ```
  - [x] Create `src/SdaManagement.Api/Services/ConfigService.cs`:
    - Inject `AppDbContext` and `ISanitizationService` via primary constructor
    - `GetPublicConfigAsync()`: Use `.Select()` projection to `PublicChurchConfigResponse` (Decision #12 — avoid loading full entity for public reads). Return null if no config exists.
    - `GetConfigAsync()`: Use `.Select()` projection to `ChurchConfigResponse`. Return null if no config exists.
    - `UpsertConfigAsync()`: Check if config exists. If yes, update. If no, create. **Sanitize ALL text fields** before persistence: use `Sanitize()` for required fields (ChurchName, Address) and `SanitizeNullable()` for nullable fields (YouTubeChannelUrl, PhoneNumber, WelcomeMessage) to preserve null vs empty distinction. Set `UpdatedAt = DateTime.UtcNow` on update.
  - [x] Register as scoped: `services.AddScoped<IConfigService, ConfigService>();`

- [x] **Task 6: Create ConfigController** (AC: #1, #3, #4)
  - [x] Create `src/SdaManagement.Api/Controllers/ConfigController.cs`:
    ```
    [Route("api/config")]
    [ApiController]
    [EnableRateLimiting("auth")]
    ```
  - [x] NOTE: Reusing the "auth" rate limiting policy is intentional — with <200 users, a dedicated "config" policy adds complexity without benefit. Revisit only if usage patterns diverge significantly from auth endpoints.
  - [x] Endpoints:
    - `GET /api/config` — **Anonymous access** (no `[Authorize]`). Returns `PublicChurchConfigResponse`. Returns 404 if no config exists (public page handles gracefully).
    - `GET /api/config/admin` — **OWNER only** (`[Authorize]` + `IsOwner()` check). Returns full `ChurchConfigResponse`. Returns 403 if not OWNER, 404 if no config.
    - `PUT /api/config` — **OWNER only** (`[Authorize]` + `IsOwner()` check). Accepts `UpdateChurchConfigRequest`. FluentValidation via `[FromServices] IValidator<>` pattern. Returns `ChurchConfigResponse`. Returns 403 if not OWNER, 400 if validation fails.
  - [x] Follow existing AuthController patterns:
    - Inject via primary constructor: `IConfigService`, `IAuthorizationService` (use alias `SdacAuth = SdaManagement.Api.Auth` to avoid naming conflict with Microsoft's `IAuthorizationService`)
    - Use `ValidationError(validation)` helper for validation failures (copy pattern from AuthController:296-302)
    - Authorization: `if (!_auth.IsOwner()) return Forbid();` (return-based, not exception-based)

- [x] **Task 7: Backend integration tests** (AC: #1, #2, #3, #4)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/Config/ConfigEndpointTests.cs`
  - [x] Tests:
    - `GetPublicConfig_WhenNoConfig_Returns404` — GET /api/config with AnonymousClient, verify 404
    - `GetPublicConfig_WhenConfigExists_ReturnsPublicFields` — Seed config via OwnerClient PUT, then GET /api/config with AnonymousClient, verify only public fields returned (no phone, no locale, no timestamps)
    - `GetAdminConfig_AsOwner_ReturnsAllFields` — PUT config, then GET /api/config/admin with OwnerClient, verify all fields
    - `GetAdminConfig_AsAdmin_Returns403` — GET /api/config/admin with AdminClient, verify 403
    - `GetAdminConfig_AsAnonymous_Returns401` — GET /api/config/admin with AnonymousClient, verify 401
    - `UpdateConfig_AsOwner_CreatesConfig` — PUT /api/config with OwnerClient, verify 200, verify response contains all fields, verify GET /api/config returns public fields
    - `UpdateConfig_AsOwner_UpdatesExistingConfig` — PUT twice with different data, verify second PUT updates (not duplicates)
    - `UpdateConfig_AsAdmin_Returns403` — PUT /api/config with AdminClient, verify 403
    - `UpdateConfig_WithInvalidData_Returns400` — PUT with empty churchName, verify 400 with ProblemDetails validation errors
    - `UpdateConfig_WithInvalidYouTubeUrl_Returns400` — PUT with malformed URL, verify validation error
    - `UpdateConfig_SanitizesHtmlInput` — PUT with `<script>alert('xss')</script>Church Name`, verify stored value has HTML stripped
    - `UpdateConfig_WithInvalidLocale_Returns400` — PUT with locale "de" (not fr/en), verify 400
  - [x] Follow existing patterns from `Auth/LoginEndpointTests.cs`:
    - Extend `IntegrationTestBase`
    - Use `OwnerClient`, `AdminClient`, `AnonymousClient`
    - Assertions with Shouldly (`.ShouldBe()`, `.ShouldNotBeNull()`)
    - Parse JSON responses with `JsonDocument`
    - Verify response status codes and body content

- [x] **Task 8: Frontend Zod schema + API service** (AC: #2)
  - [x] Create `src/sdamanagement-web/src/schemas/configSchema.ts`:
    ```typescript
    import { z } from "zod";

    export const churchConfigSchema = z.object({
      churchName: z.string()
        .min(1, { error: "Le nom de l'eglise est requis" })
        .max(150),
      address: z.string()
        .min(1, { error: "L'adresse est requise" })
        .max(300),
      youtubeChannelUrl: z.url({ error: "L'URL YouTube doit etre valide" })
        .optional()
        .or(z.literal("")),
      phoneNumber: z.string()
        .max(30)
        .optional()
        .or(z.literal("")),
      welcomeMessage: z.string()
        .max(1000)
        .optional()
        .or(z.literal("")),
      defaultLocale: z.enum(["fr", "en"]),
    });

    export type ChurchConfigFormData = z.infer<typeof churchConfigSchema>;
    ```
  - [x] Create `src/sdamanagement-web/src/services/configService.ts`:
    ```typescript
    import api from "@/lib/api";
    import type { ChurchConfigFormData } from "@/schemas/configSchema";

    export interface ChurchConfigResponse {
      id: number;
      churchName: string;
      address: string;
      youtubeChannelUrl: string | null;
      phoneNumber: string | null;
      welcomeMessage: string | null;
      defaultLocale: string;
      createdAt: string;
      updatedAt: string;
    }

    export interface PublicChurchConfigResponse {
      churchName: string;
      address: string;
      welcomeMessage: string | null;
      youtubeChannelUrl: string | null;
    }

    export const configService = {
      getPublic: () =>
        api.get<PublicChurchConfigResponse>("/api/config"),
      getAdmin: () =>
        api.get<ChurchConfigResponse>("/api/config/admin"),
      update: (data: ChurchConfigFormData) =>
        api.put<ChurchConfigResponse>("/api/config", data),
    };
    ```
  - [x] NOTE: Zod field names (`churchName`, `address`, etc.) MUST match C# DTO property names in camelCase. System.Text.Json serializes C# PascalCase to camelCase by default.
  - [x] NOTE: `src/services/` is a **new frontend directory** introduced in this story. This establishes the convention for API service modules — future stories should co-locate their API services here (e.g., `departmentService.ts`, `userService.ts`).

- [x] **Task 9: Install required shadcn/ui components** (AC: #1)
  - [x] Install `textarea` component: `npx shadcn@latest add textarea` (for welcome message field)
  - [x] Install `select` component: `npx shadcn@latest add select` (for locale dropdown) — OR use a simple HTML `<select>` if shadcn select is too heavy for 2 options
  - [x] Install `card` component: `npx shadcn@latest add card` (for settings sections layout)
  - [x] Run from `src/sdamanagement-web/` directory
  - [x] Verify components appear in `src/components/ui/`

- [x] **Task 10: Implement SettingsPage with ChurchIdentityForm** (AC: #1, #2, #3, #4)
  - [x] Update `src/sdamanagement-web/src/pages/SettingsPage.tsx`:
    - Import `useAuth()` to check user role
    - If `user.role !== "OWNER"` → show a message "Aucun parametre disponible pour votre role" (no settings available for your role) using i18n key
    - If OWNER → render `ChurchIdentityForm` component
    - Use TanStack Query `useQuery` to fetch existing config from `GET /api/config/admin`
    - Handle loading state with `Skeleton` component
    - Handle 404 (no config yet) → show empty state with form
  - [x] Create `src/sdamanagement-web/src/components/settings/ChurchIdentityForm.tsx`:
    - Use `react-hook-form` with `zodResolver(churchConfigSchema)`
    - `defaultValues` populated from existing config (or empty for first-time)
    - Fields:
      - Church Name → `Input` (required)
      - Address → `Input` (required)
      - YouTube Channel URL → `Input` type="url" (optional)
      - Phone Number → `Input` type="tel" (optional)
      - Welcome Message → `Textarea` (optional, multiline)
      - Default Locale → `Select` with options `fr` / `en`
    - Submit button with loading state (`isPending` from `useMutation`)
    - Use TanStack Query `useMutation` for save:
      - `onSuccess`: invalidate `['config']` query, show success toast via `sonner`
      - `onError`: parse ProblemDetails error, show error toast via `sonner`
    - All labels and placeholders via `useTranslation()` — no hardcoded strings
    - Smart empty state: when no config exists, show a header message "Configurez l'identite de votre eglise" with encouraging copy
  - [x] Form layout: use `Card` component with sections, vertical stack of fields, responsive padding
  - [x] NOTE: The Settings nav link in AppSidebar is visible to all authenticated users (ADMIN+). Non-OWNER admins will see "No settings available for your role" — this is intentional. Future stories (e.g., department-scoped admin settings) will add content for ADMIN users on this page.

- [x] **Task 11: Add i18n translation keys** (AC: #1)
  - [x] Update `public/locales/fr/common.json` — add under `pages.settings`:
    ```json
    "churchIdentity": {
      "title": "Identite de l'eglise",
      "emptyState": "Configurez l'identite de votre eglise",
      "emptyStateHelper": "Ces informations apparaitront sur la page publique de votre eglise.",
      "churchName": "Nom de l'eglise",
      "churchNamePlaceholder": "Eglise Adventiste du 7e Jour de Saint-Hubert",
      "address": "Adresse",
      "addressPlaceholder": "1234 Rue de l'Eglise, Saint-Hubert, QC",
      "youtubeChannelUrl": "URL de la chaine YouTube",
      "youtubeChannelUrlPlaceholder": "https://www.youtube.com/@votre-chaine",
      "phoneNumber": "Numero de telephone",
      "phoneNumberPlaceholder": "+1 (450) 555-0100",
      "welcomeMessage": "Message de bienvenue",
      "welcomeMessagePlaceholder": "Bienvenue a l'Eglise Adventiste de Saint-Hubert...",
      "defaultLocale": "Langue par defaut",
      "localeFr": "Francais",
      "localeEn": "English",
      "save": "Sauvegarder",
      "saving": "Sauvegarde en cours...",
      "saveSuccess": "Parametres de l'eglise sauvegardes avec succes",
      "saveError": "Erreur lors de la sauvegarde des parametres"
    },
    "noSettingsForRole": "Aucun parametre disponible pour votre role."
    ```
  - [x] Update `public/locales/en/common.json` — add matching English keys:
    ```json
    "churchIdentity": {
      "title": "Church Identity",
      "emptyState": "Configure your church's identity",
      "emptyStateHelper": "This information will appear on your church's public page.",
      "churchName": "Church Name",
      "churchNamePlaceholder": "Seventh-day Adventist Church of Saint-Hubert",
      "address": "Address",
      "addressPlaceholder": "1234 Church Street, Saint-Hubert, QC",
      "youtubeChannelUrl": "YouTube Channel URL",
      "youtubeChannelUrlPlaceholder": "https://www.youtube.com/@your-channel",
      "phoneNumber": "Phone Number",
      "phoneNumberPlaceholder": "+1 (450) 555-0100",
      "welcomeMessage": "Welcome Message",
      "welcomeMessagePlaceholder": "Welcome to the Adventist Church of Saint-Hubert...",
      "defaultLocale": "Default Language",
      "localeFr": "French",
      "localeEn": "English",
      "save": "Save",
      "saving": "Saving...",
      "saveSuccess": "Church settings saved successfully",
      "saveError": "Error saving church settings"
    },
    "noSettingsForRole": "No settings available for your role."
    ```
  - [x] NOTE: Accented characters must use proper Unicode (e.g., `\u00e9` for e or literal `e` — json files already use escaped Unicode, maintain consistency with existing file style)

- [x] **Task 12: Frontend MSW handlers + tests** (AC: #1, #2, #3, #4)
  - [x] Create `src/sdamanagement-web/src/mocks/handlers/config.ts`:
    - `GET /api/config` → return mock `PublicChurchConfigResponse` (or 404 for empty state test)
    - `GET /api/config/admin` → return mock `ChurchConfigResponse`
    - `PUT /api/config` → validate body, return mock `ChurchConfigResponse`
  - [x] Add config handlers to `src/mocks/handlers/index.ts` (or wherever handlers are aggregated)
  - [x] Create `src/sdamanagement-web/src/pages/SettingsPage.test.tsx`:
    - Test: renders church identity form for OWNER user
    - Test: shows "no settings" message for ADMIN user
    - Test: shows empty state when no config exists (404 from API)
    - Test: populates form with existing config data
    - Test: submits form and shows success toast
    - Test: shows validation errors for invalid input
    - Test: shows error toast when API call fails
  - [x] Create `src/sdamanagement-web/src/schemas/configSchema.test.ts`:
    - Test: accepts valid church config data
    - Test: rejects empty church name
    - Test: rejects empty address
    - Test: rejects invalid YouTube URL
    - Test: accepts empty optional fields
    - Test: rejects invalid locale value

## Dev Notes

### Architecture Compliance

- **Decision #2** (Centralized authorization service): ConfigController uses `IAuthorizationService.IsOwner()` for OWNER-only checks. Return-based pattern (not exceptions): `if (!_auth.IsOwner()) return Forbid();`
- **Decision #3** (httpOnly Secure SameSite=Strict cookie JWT): Auth cookies automatically sent with API requests via `withCredentials: true` on Axios. No changes needed.
- **Decision #5** (i18n day-one): ALL user-facing strings through `useTranslation()`. No hardcoded French or English strings in components. Validation error messages in Zod use French as primary (matching app default locale).
- **Decision #6** (Frontend state stack): TanStack Query for server state (`useQuery`/`useMutation` for config data). AuthContext for user identity (`useAuth()` to check role). No Zustand needed for this story.
- **Decision #8** (Backend stateless): No in-memory caching of ChurchConfig. Every request hits the database. The singleton is a DB-level concept, not an application-level cache.
- **Decision #10** (Public API contract): `PublicChurchConfigResponse` is a **dedicated public DTO** in a separate concern from `ChurchConfigResponse`. Phone number, default locale, and timestamps are NOT in the public DTO. Never use `[JsonIgnore]` — use separate DTO classes.
- **Decision #12** (EF Core `.Select()` projections): All read endpoints use `.Select()` projection to DTOs. Never return the `ChurchConfig` entity directly. This prevents over-fetching and ensures the API contract is explicit.
- **Key Principle #1** (Security boundary is the API layer): Frontend hides UI affordances for OWNER (role check in SettingsPage), but the API enforces OWNER-only access on ConfigController. Both layers enforce, but API is the security boundary.
- **Key Principle #2** (Public endpoints return dedicated public DTOs): The `GET /api/config` endpoint returns `PublicChurchConfigResponse` — never the entity.

### Security Constraints

- **OWNER-only mutations**: Only OWNER can PUT config or GET admin config. Backend enforces via `IAuthorizationService.IsOwner()`.
- **4-layer sanitization pipeline**: (1) FluentValidation — structural validation + Unicode control char rejection, (2) HtmlSanitizer — strip ALL HTML before DB write, (3) EF Core — parameterized queries, (4) React JSX — auto-escaping on render.
- **HtmlSanitizer configuration**: Empty allowlist — strip ALL HTML tags, attributes, and URI schemes. This is a plain text field, not rich text. Any `<script>`, `<img onerror>`, etc. is completely stripped.
- **YouTube URL validation**: `Uri.TryCreate(url, UriKind.Absolute, out _)` ensures the URL is well-formed. We do NOT restrict to youtube.com domain — the OWNER may use other streaming services in the future.
- **Singleton enforcement**: The upsert pattern in ConfigService ensures only one ChurchConfig record exists. No database-level unique constraint needed beyond the primary key — the service layer guarantees singleton behavior by always updating the first (and only) record.

### What Already Exists (DO NOT Recreate)

**Backend — Infrastructure ready:**
- `AppDbContext` at `src/SdaManagement.Api/Data/AppDbContext.cs` — add DbSet and OnModelCreating config
- `IAuthorizationService` at `src/SdaManagement.Api/Auth/IAuthorizationService.cs` — has `IsOwner()` method
- `AuthorizationService` implementation — already registered in DI
- `ICurrentUserContext` — provides current user's identity and role
- `ValidationExtensions.MustNotContainControlCharacters()` at `src/SdaManagement.Api/Validators/ValidationExtensions.cs`
- `ServiceCollectionExtensions.cs` — add new service registrations here
- `FluentValidation` auto-registration via `AddValidatorsFromAssemblyContaining<>()` — new validators auto-discovered
- `HtmlSanitizer` NuGet package v9.0.892 — installed but never used yet. `using Ganss.Xss;`
- Rate limiting `[EnableRateLimiting("auth")]` — reuse existing "auth" policy
- `ValidationError()` helper pattern in AuthController:296-302 — copy this helper or extract to a base controller

**Frontend — Infrastructure ready:**
- `SettingsPage.tsx` at `src/sdamanagement-web/src/pages/SettingsPage.tsx` — exists as placeholder with just title
- `AdminPage.tsx` — exists as placeholder
- `App.tsx` routing: `/admin/settings` already routes to `SettingsPage` under `ProtectedRoute requiredRole="ADMIN"`
- `api.ts` Axios instance at `src/sdamanagement-web/src/lib/api.ts` — with `withCredentials: true` and 401 retry interceptor
- `queryClient.ts` at `src/sdamanagement-web/src/lib/queryClient.ts` — TanStack Query client ready
- `AuthContext` with `useAuth()` hook — provides `user` object with `role` field
- `sonner` Toaster in App.tsx — `toast.success()` / `toast.error()` ready to use
- `test-utils.tsx` — custom render with AllProviders wrapper
- MSW infrastructure in `src/mocks/handlers/`
- shadcn/ui components: `Button`, `Input`, `Label`, `Skeleton`, `Separator`
- Schemas directory: `src/sdamanagement-web/src/schemas/` — add configSchema.ts here

**Things that DO NOT exist yet (create in this story):**

Backend:
- `src/SdaManagement.Api/Data/Entities/ChurchConfig.cs` — new entity
- `src/SdaManagement.Api/Dtos/Config/PublicChurchConfigResponse.cs` — public DTO
- `src/SdaManagement.Api/Dtos/Config/ChurchConfigResponse.cs` — admin DTO
- `src/SdaManagement.Api/Dtos/Config/UpdateChurchConfigRequest.cs` — request DTO
- `src/SdaManagement.Api/Validators/UpdateChurchConfigRequestValidator.cs` — validator
- `src/SdaManagement.Api/Services/ISanitizationService.cs` — sanitization interface
- `src/SdaManagement.Api/Services/SanitizationService.cs` — HtmlSanitizer wrapper
- `src/SdaManagement.Api/Services/IConfigService.cs` — config service interface
- `src/SdaManagement.Api/Services/ConfigService.cs` — config service implementation
- `src/SdaManagement.Api/Controllers/ConfigController.cs` — config API endpoints
- `src/SdaManagement.Api/Migrations/*_AddChurchConfig.cs` — EF migration
- `tests/SdaManagement.Api.IntegrationTests/Config/ConfigEndpointTests.cs` — integration tests

Frontend:
- `src/sdamanagement-web/src/schemas/configSchema.ts` — Zod schema
- `src/sdamanagement-web/src/services/configService.ts` — API service
- `src/sdamanagement-web/src/components/settings/ChurchIdentityForm.tsx` — form component
- `src/sdamanagement-web/src/components/ui/textarea.tsx` — shadcn/ui textarea (install)
- `src/sdamanagement-web/src/components/ui/select.tsx` — shadcn/ui select (install)
- `src/sdamanagement-web/src/components/ui/card.tsx` — shadcn/ui card (install)
- `src/sdamanagement-web/src/mocks/handlers/config.ts` — MSW handlers
- `src/sdamanagement-web/src/pages/SettingsPage.test.tsx` — page tests
- `src/sdamanagement-web/src/schemas/configSchema.test.ts` — schema tests

### Frontend Patterns

- **React Router v7** (`react-router-dom ^7.13.1`): SettingsPage is lazy-loaded via `React.lazy()` in App.tsx. Already configured.
- **Axios instance** (`src/lib/api.ts`): All API calls go through this configured instance. `withCredentials: true` sends JWT cookies automatically. 401 retry interceptor handles token refresh.
- **TanStack Query pattern**: Use `useQuery({ queryKey: ['config'], queryFn: () => configService.getAdmin() })` for data fetching. Use `useMutation` for updates with `onSuccess` invalidating `['config']` query key.
- **Form pattern** (from LoginPage): `useForm<ChurchConfigFormData>({ resolver: zodResolver(churchConfigSchema), defaultValues: existingConfig || defaults, mode: "onBlur" })`. Inline validation errors via `formState.errors`.
- **Toast pattern**: `toast.success(t('pages.settings.churchIdentity.saveSuccess'))` on mutation success. `toast.error(t('pages.settings.churchIdentity.saveError'))` on mutation error.
- **Path alias**: `@` -> `src/`. Use `@/services/configService`, `@/schemas/configSchema`, etc.
- **Component co-location**: Form component at `src/components/settings/ChurchIdentityForm.tsx`. Tests co-located as `SettingsPage.test.tsx`.

### Project Structure Notes

**Files to CREATE:**
```
src/SdaManagement.Api/
├── Data/Entities/
│   └── ChurchConfig.cs
├── Dtos/Config/
│   ├── PublicChurchConfigResponse.cs
│   ├── ChurchConfigResponse.cs
│   └── UpdateChurchConfigRequest.cs
├── Validators/
│   └── UpdateChurchConfigRequestValidator.cs
├── Services/
│   ├── ISanitizationService.cs
│   ├── SanitizationService.cs
│   ├── IConfigService.cs
│   └── ConfigService.cs
├── Controllers/
│   └── ConfigController.cs
└── Migrations/
    └── *_AddChurchConfig.cs (auto-generated)

tests/SdaManagement.Api.IntegrationTests/
└── Config/
    └── ConfigEndpointTests.cs

src/sdamanagement-web/src/
├── schemas/
│   ├── configSchema.ts
│   └── configSchema.test.ts
├── services/
│   └── configService.ts
├── components/
│   ├── settings/
│   │   └── ChurchIdentityForm.tsx
│   └── ui/
│       ├── textarea.tsx (install via shadcn)
│       ├── select.tsx (install via shadcn)
│       └── card.tsx (install via shadcn)
├── mocks/handlers/
│   └── config.ts
└── pages/
    ├── SettingsPage.tsx (MODIFY)
    └── SettingsPage.test.tsx (CREATE)
```

**Files to MODIFY:**
```
src/SdaManagement.Api/
├── Data/AppDbContext.cs — Add DbSet<ChurchConfig> and OnModelCreating config
└── Extensions/ServiceCollectionExtensions.cs — Register ISanitizationService, IConfigService

src/sdamanagement-web/
├── public/locales/fr/common.json — Add churchIdentity translation keys
├── public/locales/en/common.json — Add churchIdentity translation keys
└── src/pages/SettingsPage.tsx — Replace placeholder with church identity settings
```

### Testing Requirements

**Backend Integration Tests (xUnit + Testcontainers + Shouldly):**
- Follow existing patterns in `tests/SdaManagement.Api.IntegrationTests/Auth/`
- Extend `IntegrationTestBase`
- Use `OwnerClient` for OWNER actions, `AdminClient` for 403 tests, `AnonymousClient` for public endpoint and 401 tests
- Parse JSON responses with `JsonDocument` — verify specific fields are present/absent in public vs admin DTOs
- Verify HtmlSanitizer works: PUT with HTML in church name, verify stored value has HTML stripped
- Verify singleton behavior: PUT twice, verify only one record exists
- Cookie-based auth works automatically — `OwnerClient` has OWNER role via `TestAuthHandler` bypass

**Frontend Tests (Vitest + Testing Library + MSW):**
- `SettingsPage.test.tsx`: Render SettingsPage, verify form renders for OWNER, verify ADMIN sees restricted message, verify empty state, verify save flow
- `configSchema.test.ts`: Unit test Zod schema validation rules
- Use `src/test-utils.tsx` custom render — wraps with AuthProvider, QueryClientProvider, TooltipProvider, MemoryRouter
- To test OWNER vs ADMIN role, configure the AuthProvider mock to return different user roles
- MSW handlers intercept API calls — configure success/error/404 responses per test
- `userEvent.setup()` for form interactions (typing, clicking submit)
- `waitFor()` for async state updates (query loading, mutation completion)

### Library/Framework Requirements

| Package | Version | Purpose | Notes |
|---|---|---|---|
| `HtmlSanitizer` (Ganss.Xss) | 9.0.892 | Server-side HTML sanitization | Already installed. First usage in this story. Import: `using Ganss.Xss;` |
| `FluentValidation` | 12.1.1 | Server-side request validation | Already installed. Auto-registered. |
| `EFCore.NamingConventions` | 10.0.1 | snake_case DB naming | Already installed. Configured in DbContext. |
| `react-hook-form` | ^7.71 | Form state management | Already installed. Used in LoginPage. |
| `zod` | ^4.3 | Frontend schema validation | Already installed. Used in authSchema. |
| `@hookform/resolvers` | ^5.2 | Zod-to-RHF bridge | Already installed. Used in LoginPage. |
| `@tanstack/react-query` | ^5.90 | Server state management | Already installed. QueryClientProvider in App. |
| `sonner` | ^2.x | Toast notifications | Already installed. Toaster in App.tsx. |
| `shadcn/ui` (textarea, select, card) | Latest | UI components | **MUST INSTALL** via `npx shadcn@latest add textarea select card` |

**No new npm or NuGet packages to install** (except shadcn/ui component additions which are code-gen, not package installs).

### Previous Story Intelligence (from Story 1.7 — Last Story in Epic 1)

- **IntegrationTestBase** has helper methods: `CreateTestUser()`, `SetUserPassword()`. Pre-configured clients: `AnonymousClient`, `ViewerClient`, `AdminClient`, `OwnerClient`.
- **Test auth bypass**: `TestAuthHandler` in the test project replaces JWT auth with header-based role injection. The pre-configured clients already have correct role headers set.
- **Frontend test patterns**: MSW server setup with `setupServer(...handlers)`, `beforeAll/afterEach/afterAll` lifecycle, `render()` from `@/test-utils`.
- **Code review learnings from Epic 1**: Keep functions focused. Use dedicated services (not fat controllers). Extract shared patterns (like `ValidationError()` helper). Co-locate tests with source.
- **Tailwind v4**: Uses `@tailwindcss/vite` plugin, config in `index.css` via `@theme` directive. NOT `tailwind.config.ts`.

### Git Intelligence

- **Commit pattern**: `feat(config): Story 2.1 — <description>`. Use `config` scope since this is the first church configuration story.
- **Recent commits**: Epic 1 completed (7 commits). This is the first story in Epic 2.
- **This is a mixed backend+frontend story**: New entity, new controller, new service (backend) + new form page with settings UI (frontend).
- **This is the first CRUD story**: All previous stories were auth/infrastructure. This establishes the CRUD patterns for all subsequent stories.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 2, Story 2.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — Decision #2 (authorization), #5 (i18n), #6 (state stack), #8 (stateless), #10 (public DTOs), #12 (Select projections)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Requirements Mapping: ConfigController + ConfigService + ChurchConfig + pages/admin/Settings.tsx]
- [Source: _bmad-output/planning-artifacts/architecture.md — 4-layer sanitization pipeline: FluentValidation → HtmlSanitizer → EF Core → React JSX]
- [Source: _bmad-output/planning-artifacts/architecture.md — Architectural Boundaries: ConfigController is OWNER only]
- [Source: _bmad-output/planning-artifacts/prd.md — FR7 (church identity on public page), FR56 (OWNER configures church settings)]
- [Source: _bmad-output/planning-artifacts/prd.md — J5 First Time Setup journey: church settings → departments → templates → users → first activity]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — SetupChecklist component, smart empty state pattern, identity-first loading]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Vocabulary: "Parametres" for settings, warm public language vs operational auth language]
- [Source: _bmad-output/implementation-artifacts/1-7-sign-out-and-session-cleanup.md — Previous story patterns, test infrastructure, frontend test setup]
- [Source: src/SdaManagement.Api/Data/AppDbContext.cs — Entity configuration patterns, HasDefaultValueSql, HasKey, HasIndex]
- [Source: src/SdaManagement.Api/Controllers/AuthController.cs:296-302 — ValidationError() helper pattern]
- [Source: src/SdaManagement.Api/Auth/IAuthorizationService.cs — IsOwner() method available]
- [Source: src/SdaManagement.Api/Validators/ValidationExtensions.cs — MustNotContainControlCharacters() extension]
- [Source: src/sdamanagement-web/src/App.tsx — Route structure, lazy loading, ProtectedRoute usage]
- [Source: src/sdamanagement-web/src/pages/SettingsPage.tsx — Current placeholder to be replaced]
- [Source: src/sdamanagement-web/src/schemas/authSchema.ts — Zod schema patterns with French error messages]
- [Source: src/sdamanagement-web/src/lib/api.ts — Axios instance configuration]
- [Source: src/sdamanagement-web/public/locales/fr/common.json — i18n translation file structure]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Backend integration tests: Initial Docker connectivity issue (transient), resolved on retry
- Test user seeding: OwnerClient returned 403 because CurrentUserContextMiddleware resolves users from DB by email claim — fixed by adding `SeedTestData()` override
- JSON casing: C# `YouTubeChannelUrl` serializes to `youTubeChannelUrl` (capital T) — story spec used lowercase, all code uses correct casing
- Pre-existing test failure: `Logout_WithValidRefreshToken_RevokesTokenAndClearsCookies` (Story 1.7 WIP) — not caused by this story
- Frontend toast tests: Required adding `<Toaster />` to test-utils.tsx wrapper

### Completion Notes List

- All 14 backend integration tests pass (including 2 new VIEWER role tests added during code review)
- All 71 frontend tests pass (14 test files, 0 regressions)
- TypeScript compiles with 0 errors
- Vite production build succeeds
- Story spec deviation: `youtubeChannelUrl` → `youTubeChannelUrl` to match C# System.Text.Json CamelCase serialization
- SanitizationService registered as singleton (reusable by future stories)
- Radix Select used for locale dropdown with react-hook-form Controller pattern

### Code Review Fixes Applied

- **M1**: Rate limiting moved from class-level to authenticated endpoints only — public `GET /api/config` no longer rate-limited
- **M2**: UpsertConfigAsync wrapped in serializable transaction to prevent TOCTOU race on singleton creation
- **M3**: `SanitizeNullable` now returns `null` for whitespace-only or post-sanitization-empty inputs (preserves null semantics for optional fields)
- **M5**: Added `GetAdminConfig_AsViewer_Returns403` and `UpdateConfig_AsViewer_Returns403` integration tests with VIEWER user seeding
- **M6**: Added missing migration Designer.cs and ModelSnapshot.cs to Dev Agent Record file list
- **L1**: Removed redundant `string.IsNullOrEmpty` guard inside `Must()` for YouTube URL validator (already guarded by `.When()`)
- **L3**: Added auth loading guard in SettingsPage to prevent "no settings" flash for OWNER during auth check

### Code Review Pass 2 Fixes Applied

- **M1**: Moved sanitization from ConfigService to controller — pipeline is now sanitize → validate → save, preventing HTML-only inputs from bypassing `NotEmpty()` validation
- **L1**: Form now resets with server-sanitized values after successful save via `reset()` from react-hook-form
- **L2**: Removed unused i18n key `saving` from both EN and FR locale files
- **Refactor**: Changed `UpdateChurchConfigRequest` from `class` to `record` to support `with` expression for sanitization
- **Refactor**: ConfigService no longer depends on ISanitizationService (sanitization is controller's responsibility)

### File List

**Created:**
- `src/SdaManagement.Api/Data/Entities/ChurchConfig.cs`
- `src/SdaManagement.Api/Dtos/Config/PublicChurchConfigResponse.cs`
- `src/SdaManagement.Api/Dtos/Config/ChurchConfigResponse.cs`
- `src/SdaManagement.Api/Dtos/Config/UpdateChurchConfigRequest.cs`
- `src/SdaManagement.Api/Validators/UpdateChurchConfigRequestValidator.cs`
- `src/SdaManagement.Api/Services/ISanitizationService.cs`
- `src/SdaManagement.Api/Services/SanitizationService.cs`
- `src/SdaManagement.Api/Services/IConfigService.cs`
- `src/SdaManagement.Api/Services/ConfigService.cs`
- `src/SdaManagement.Api/Controllers/ConfigController.cs`
- `src/SdaManagement.Api/Migrations/20260304020801_AddChurchConfig.cs` (auto-generated)
- `src/SdaManagement.Api/Migrations/20260304020801_AddChurchConfig.Designer.cs` (auto-generated)
- `src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs` (auto-updated)
- `tests/SdaManagement.Api.IntegrationTests/Config/ConfigEndpointTests.cs`
- `src/sdamanagement-web/src/schemas/configSchema.ts`
- `src/sdamanagement-web/src/schemas/configSchema.test.ts`
- `src/sdamanagement-web/src/services/configService.ts`
- `src/sdamanagement-web/src/components/settings/ChurchIdentityForm.tsx`
- `src/sdamanagement-web/src/components/ui/textarea.tsx` (shadcn)
- `src/sdamanagement-web/src/components/ui/select.tsx` (shadcn)
- `src/sdamanagement-web/src/components/ui/card.tsx` (shadcn)
- `src/sdamanagement-web/src/mocks/handlers/config.ts`
- `src/sdamanagement-web/src/pages/SettingsPage.test.tsx`

**Modified:**
- `src/SdaManagement.Api/Data/AppDbContext.cs` — DbSet + OnModelCreating
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — DI registrations
- `src/sdamanagement-web/src/pages/SettingsPage.tsx` — replaced placeholder with full implementation
- `src/sdamanagement-web/public/locales/fr/common.json` — churchIdentity i18n keys
- `src/sdamanagement-web/public/locales/en/common.json` — churchIdentity i18n keys
- `src/sdamanagement-web/src/test-utils.tsx` — churchIdentity i18n keys + Toaster
