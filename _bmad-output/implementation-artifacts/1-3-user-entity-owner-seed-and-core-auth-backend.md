# Story 1.3: User Entity, OWNER Seed & Core Auth Backend

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **OWNER**,
I want the User entity, OWNER seed, JWT cookie authentication, and the core auth pipeline (IAuthorizationService, ICurrentUserContext),
so that the system recognizes my account and enforces role-based access from the first endpoint.

## Acceptance Criteria

1. **Given** the database
   **When** EF Core migrations run
   **Then** the `users` table exists with columns: `id`, `email`, `first_name`, `last_name`, `role` (enum stored as int), `is_guest`, `password_hash`, `created_at`, `updated_at`
   **And** the `user_departments` junction table exists with `user_id` (FK → users) and `department_id` (FK → departments)
   **And** the `refresh_tokens` table exists with `id`, `user_id` (FK → users), `token`, `expires_at`, `is_revoked`, `created_at`
   **And** a minimal `departments` table exists with `id`, `name`, `created_at` (Epic 2 will add more columns)
   **And** snake_case naming is enforced via `UseSnakeCaseNamingConvention()` — no `[Column]`/`[Table]` attributes needed

2. **Given** the `OWNER_EMAIL` environment variable is set
   **When** the application starts
   **Then** an OWNER user record is upserted with that email and `role = Owner` (idempotent — safe to restart)
   **And** `is_guest = false`, `password_hash = null` (set in Story 1.5)

3. **Given** an API request with a valid JWT in an `access_token` httpOnly cookie
   **When** the request reaches a protected endpoint
   **Then** `ICurrentUserContext` is populated: `UserId` (int, from DB lookup by email claim), `Role` (from DB), `DepartmentIds` (from `user_departments` DB query)
   **And** `IsAuthenticated = true`

4. **Given** `IAuthorizationService`
   **When** authorization methods are called (`CanView()`, `CanManage(departmentId)`, `IsOwner()`)
   **Then** they return `true`/`false` based on role and department intersection — **never throw**
   **And** `IsOwner()` returns true only for `Owner` role
   **And** `CanManage(departmentId)` returns true if `Admin` or `Owner` AND departmentId is in user's departments (Owner bypasses department check)

5. **Given** any API endpoint requiring authentication
   **When** JWT cookie is missing, expired, or invalid
   **Then** the response is `401 Unauthorized` with `ProblemDetails` body (type: `urn:sdac:unauthenticated`)

6. **Given** the auth endpoint `POST /api/auth/login` (stub — implementation in Stories 1.4/1.5)
   **When** more than 5 requests arrive from the same IP within one minute
   **Then** subsequent requests receive `429 Too Many Requests` with `Retry-After` header

## Prerequisites

### Local Dev Environment Requirements

| Tool | Minimum Version | Install | Verify |
|---|---|---|---|
| **Docker Desktop** | Latest stable | [docker.com](https://www.docker.com/products/docker-desktop/) | `docker --version` |
| **.NET 10 SDK** | 10.0.x LTS | [dot.net/download](https://dot.net/download) | `dotnet --version` |
| **dotnet-ef CLI** | Latest | `dotnet tool install -g dotnet-ef` | `dotnet ef --version` |
| **Git** | Any | Already installed | `git --version` |

### Ports That Must Be Free

| Port | Service |
|---|---|
| **5432** | PostgreSQL (dev Docker Compose) |
| **Random** | Testcontainers PostgreSQL (auto-assigned) |

### Environment Variables Required

| Variable | Purpose | Example |
|---|---|---|
| `OWNER_EMAIL` | OWNER user seed email | `elisha@example.com` |
| `Jwt__Secret` | JWT signing secret (min 32 chars) | `your-super-secret-dev-key-here-32chars` |
| `ConnectionStrings__DefaultConnection` | Already in appsettings.Development.json | — |

### NOT Needed for This Story

- No `Google__ClientId` / `Google__ClientSecret` (Story 1.4)
- No frontend changes
- No email/password login endpoint (Story 1.5)

## Tasks / Subtasks

- [x] **Task 1: Add `Microsoft.EntityFrameworkCore.Design` package** (AC: 1)
  - [x] Add `Microsoft.EntityFrameworkCore.Design` to `src/SdaManagement.Api/SdaManagement.Api.csproj`
  - [x] Verify: `dotnet build` compiles with zero errors
  - [x] Reason: Required for `dotnet ef migrations add` CLI command

- [x] **Task 2: Create entity classes** (AC: 1)
  - [x] Create `src/SdaManagement.Api/Data/Entities/UserRole.cs` — enum with values: `Anonymous = 0`, `Viewer = 1`, `Admin = 2`, `Owner = 3`
  - [x] Create `src/SdaManagement.Api/Data/Entities/User.cs` — see Dev Notes for exact properties
  - [x] Create `src/SdaManagement.Api/Data/Entities/RefreshToken.cs` — see Dev Notes for exact properties
  - [x] Create `src/SdaManagement.Api/Data/Entities/Department.cs` — minimal entity (id, name, created_at only; Epic 2 adds rest)
  - [x] Create `src/SdaManagement.Api/Data/Entities/UserDepartment.cs` — composite PK (UserId, DepartmentId), navigation props to User and Department

- [x] **Task 3: Update AppDbContext** (AC: 1)
  - [x] Add `DbSet<User> Users`, `DbSet<RefreshToken> RefreshTokens`, `DbSet<Department> Departments` to `AppDbContext`
  - [x] Override `OnModelCreating()` — see Dev Notes for complete fluent API configuration
  - [x] Configure `UserDepartment` as composite PK join table (not DbSet, configured via `User.HasMany<Department>()`)
  - [x] Add unique index on `users.email`
  - [x] Configure cascade deletes: User → RefreshTokens (delete user = delete tokens), User → UserDepartments (delete user = remove dept links)
  - [x] Store `UserRole` as int (not string) — `HasConversion<int>()`

- [x] **Task 4: Create first EF Core migration** (AC: 1)
  - [x] Run from solution root: `dotnet ef migrations add InitialUserSchema --project src/SdaManagement.Api --startup-project src/SdaManagement.Api`
  - [x] Verify generated migration: tables match AC columns, snake_case names in migration code, FK constraints present
  - [x] Run `dotnet ef database update` against dev PostgreSQL to verify migration applies clean
  - [x] **DO NOT manually edit** the auto-generated migration file (re-generate if needed)

- [x] **Task 5: Implement OWNER seed** (AC: 2)
  - [x] Create `src/SdaManagement.Api/Data/DatabaseSeeder.cs` — reads `OWNER_EMAIL` from `IConfiguration`, upserts OWNER user
  - [x] Register `DatabaseSeeder` as scoped in `ServiceCollectionExtensions.AddApplicationServices()`
  - [x] Call seeder in `Program.cs` BEFORE `app.Run()` — see Dev Notes for exact placement
  - [x] Seed is idempotent: `await dbContext.Users.AnyAsync(u => u.Email == ownerEmail)` — skip if exists
  - [x] If `OWNER_EMAIL` is null/empty: log warning and skip (don't throw — allows dev without it)

- [x] **Task 6: Implement JWT auth pipeline** (AC: 3, 4, 5)
  - [x] Create `src/SdaManagement.Api/Auth/ICurrentUserContext.cs` — interface (see Dev Notes for exact shape)
  - [x] Create `src/SdaManagement.Api/Auth/CurrentUserContext.cs` — mutable scoped implementation
  - [x] Create `src/SdaManagement.Api/Auth/CurrentUserContextMiddleware.cs` — reads JWT claims, DB-resolves user, populates `CurrentUserContext`
  - [x] Create `src/SdaManagement.Api/Auth/IAuthorizationService.cs` — interface with `CanView()`, `CanManage(int departmentId)`, `IsOwner()` methods
  - [x] Create `src/SdaManagement.Api/Auth/AuthorizationService.cs` — implementation that depends on `ICurrentUserContext`
  - [x] Update `ServiceCollectionExtensions.AddApplicationServices()`:
    - Replace placeholder `services.AddAuthentication()` with full JWT Bearer configuration
    - Register `ICurrentUserContext` / `CurrentUserContext` as scoped
    - Register `IAuthorizationService` / `AuthorizationService` as scoped
    - Add `IHttpContextAccessor` (needed by middleware/context)
  - [x] Update `Program.cs` — add `app.UseMiddleware<CurrentUserContextMiddleware>()` BETWEEN `app.UseAuthentication()` and `app.UseAuthorization()`

- [x] **Task 7: Create stub AuthController with rate limiting** (AC: 6)
  - [x] Create `src/SdaManagement.Api/Controllers/AuthController.cs` with `[Route("api/auth")]` and `[ApiController]`
  - [x] Add stub `POST /api/auth/login` method decorated with `[EnableRateLimiting("auth")]` — returns `501 Not Implemented` with message "Implemented in Story 1.4/1.5"
  - [x] Add stub `POST /api/auth/refresh` decorated with `[EnableRateLimiting("auth")]` — returns `501 Not Implemented`
  - [x] Add stub `POST /api/auth/logout` decorated with `[EnableRateLimiting("auth")]` — returns `501 Not Implemented`

- [x] **Task 8: Update test infrastructure and write integration tests** (AC: 1, 3, 5, 6)
  - [x] Update `SdaManagementWebApplicationFactory.cs`: replace `EnsureCreatedAsync()` with `MigrateAsync()` — **critical, blocked until migration exists**
  - [x] Update `IntegrationTestBase.cs`: implement `CreateTestUser(string email, UserRole role)` — inserts User record directly via `AppDbContext`
  - [x] Update `TestAuthHandler.cs`: `ClaimTypes.Email` already present from Story 1.2 — no change needed (email-based resolution works without integer UserId)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/Auth/AuthInfrastructureTests.cs` with:
    - `UserEntity_WhenMigrationsRun_TablesExistWithCorrectSchema` — queries `information_schema.columns` to verify all columns
    - `CurrentUserContext_WhenValidTestCredentialsSent_PopulatesContext` — create test user, make authenticated request to a probe endpoint, verify context populated
    - `CurrentUserContext_WhenJwtMissing_Returns401` — anonymous request to protected endpoint
    - `RateLimiting_WhenMoreThan5RequestsPerMinute_Returns429WithRetryAfter` — send 6 POST requests to `/api/auth/login`, assert 6th is 429 with `Retry-After` header

## Dev Notes

### Entity Definitions

```csharp
// UserRole.cs
public enum UserRole { Anonymous = 0, Viewer = 1, Admin = 2, Owner = 3 }

// User.cs
public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public bool IsGuest { get; set; }
    public string? PasswordHash { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public ICollection<UserDepartment> UserDepartments { get; } = [];
    public ICollection<RefreshToken> RefreshTokens { get; } = [];
}

// RefreshToken.cs
public class RefreshToken
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public string Token { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public bool IsRevoked { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Department.cs — minimal for FK; Epic 2 adds more columns
public class Department
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public ICollection<UserDepartment> UserDepartments { get; } = [];
}

// UserDepartment.cs — composite PK join entity
public class UserDepartment
{
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
}
```

### AppDbContext.OnModelCreating (complete)

```csharp
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // User
    modelBuilder.Entity<User>(e => {
        e.HasKey(u => u.Id);
        e.HasIndex(u => u.Email).IsUnique();
        e.Property(u => u.Role).HasConversion<int>();
        e.Property(u => u.CreatedAt).HasDefaultValueSql("now()");
        e.Property(u => u.UpdatedAt).HasDefaultValueSql("now()");
    });

    // RefreshToken — cascade delete when user deleted
    modelBuilder.Entity<RefreshToken>(e => {
        e.HasKey(r => r.Id);
        e.HasOne(r => r.User)
         .WithMany(u => u.RefreshTokens)
         .HasForeignKey(r => r.UserId)
         .OnDelete(DeleteBehavior.Cascade);
    });

    // Department
    modelBuilder.Entity<Department>(e => {
        e.HasKey(d => d.Id);
        e.Property(d => d.CreatedAt).HasDefaultValueSql("now()");
    });

    // UserDepartment — composite PK, cascade delete on user removal
    modelBuilder.Entity<UserDepartment>(e => {
        e.HasKey(ud => new { ud.UserId, ud.DepartmentId });
        e.HasOne(ud => ud.User)
         .WithMany(u => u.UserDepartments)
         .HasForeignKey(ud => ud.UserId)
         .OnDelete(DeleteBehavior.Cascade);
        e.HasOne(ud => ud.Department)
         .WithMany(d => d.UserDepartments)
         .HasForeignKey(ud => ud.DepartmentId)
         .OnDelete(DeleteBehavior.Cascade);
    });
}
```

### ICurrentUserContext Interface

```csharp
// src/SdaManagement.Api/Auth/ICurrentUserContext.cs
public interface ICurrentUserContext
{
    bool IsAuthenticated { get; }
    int UserId { get; }             // 0 if not authenticated
    UserRole Role { get; }          // Anonymous if not authenticated
    IReadOnlyList<int> DepartmentIds { get; } // empty list if not authenticated
}
```

### CurrentUserContext Implementation

```csharp
// src/SdaManagement.Api/Auth/CurrentUserContext.cs
// Mutable scoped service — populated by CurrentUserContextMiddleware
public class CurrentUserContext : ICurrentUserContext
{
    public bool IsAuthenticated { get; private set; }
    public int UserId { get; private set; }
    public UserRole Role { get; private set; } = UserRole.Anonymous;
    public IReadOnlyList<int> DepartmentIds { get; private set; } = [];

    // Called by CurrentUserContextMiddleware after DB lookup
    public void Initialize(int userId, UserRole role, List<int> departmentIds)
    {
        IsAuthenticated = true;
        UserId = userId;
        Role = role;
        DepartmentIds = departmentIds.AsReadOnly();
    }
}
```

### CurrentUserContextMiddleware

```csharp
// Runs AFTER UseAuthentication(), BEFORE UseAuthorization()
// Resolves user by email claim → DB → populates CurrentUserContext
public class CurrentUserContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext context, ICurrentUserContext currentUserContext, AppDbContext dbContext)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var emailClaim = context.User.FindFirst(ClaimTypes.Email)?.Value;
            if (!string.IsNullOrEmpty(emailClaim))
            {
                var user = await dbContext.Users
                    .Where(u => u.Email == emailClaim)
                    .Select(u => new {
                        u.Id, u.Role,
                        DepartmentIds = u.UserDepartments.Select(ud => ud.DepartmentId).ToList()
                    })
                    .FirstOrDefaultAsync();

                if (user != null)
                    ((CurrentUserContext)currentUserContext).Initialize(user.Id, user.Role, user.DepartmentIds);
                // If user not found in DB (e.g., deleted): remain Anonymous (safe default)
            }
        }
        await next(context);
    }
}
```

**IMPORTANT:** `CurrentUserContextMiddleware` resolves by **email** (not UserId) because email is the unique identifier per architecture. This means:
- JWTs must contain a `ClaimTypes.Email` claim (populated in Stories 1.4/1.5)
- TestAuthHandler already includes `ClaimTypes.Email` — no change needed there

### IAuthorizationService Interface

```csharp
// src/SdaManagement.Api/Auth/IAuthorizationService.cs
// WARNING: naming conflict with Microsoft.AspNetCore.Authorization.IAuthorizationService
// Use fully-qualified name: SdaManagement.Api.Auth.IAuthorizationService — or alias in using directives
namespace SdaManagement.Api.Auth;

public interface IAuthorizationService
{
    bool CanView();                     // Viewer+
    bool CanManage(int departmentId);   // Admin (own dept) or Owner (any dept)
    bool IsOwner();                     // Owner only
    bool IsAuthenticated();             // Any logged-in user
}
```

### AuthorizationService Implementation

```csharp
public class AuthorizationService(ICurrentUserContext ctx) : IAuthorizationService
{
    public bool CanView() => ctx.IsAuthenticated;
    public bool IsOwner() => ctx.Role == UserRole.Owner;
    public bool IsAuthenticated() => ctx.IsAuthenticated;

    public bool CanManage(int departmentId)
    {
        if (!ctx.IsAuthenticated) return false;
        if (ctx.Role == UserRole.Owner) return true; // Owner bypasses dept check
        if (ctx.Role == UserRole.Admin) return ctx.DepartmentIds.Contains(departmentId);
        return false;
    }
}
```

### JWT Configuration (ServiceCollectionExtensions)

Replace the placeholder `services.AddAuthentication()` / `services.AddAuthorization()` block:

```csharp
// JWT Bearer Authentication — reads from access_token cookie
var jwtSecret = configuration["Jwt:Secret"]
    ?? throw new InvalidOperationException("Jwt:Secret is required");
var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = jwtKey,
            ClockSkew = TimeSpan.Zero, // no tolerance — 401 immediately on expiry
        };
        // Read JWT from httpOnly cookie (not Authorization header)
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                ctx.Token = ctx.Request.Cookies["access_token"];
                return Task.CompletedTask;
            },
        };
    });

services.AddAuthorization();
services.AddHttpContextAccessor();
services.AddScoped<ICurrentUserContext, CurrentUserContext>();
services.AddScoped<Auth.IAuthorizationService, Auth.AuthorizationService>();
```

**Required `using` additions to `ServiceCollectionExtensions.cs`:**
```csharp
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using SdaManagement.Api.Auth;
```

### OWNER Seed (DatabaseSeeder)

```csharp
// src/SdaManagement.Api/Data/DatabaseSeeder.cs
public class DatabaseSeeder(AppDbContext dbContext, IConfiguration configuration, ILogger<DatabaseSeeder> logger)
{
    public async Task SeedAsync()
    {
        var ownerEmail = configuration["OwnerEmail"]; // env var: OWNER_EMAIL
        if (string.IsNullOrWhiteSpace(ownerEmail))
        {
            logger.LogWarning("OWNER_EMAIL not set — skipping OWNER seed");
            return;
        }

        var exists = await dbContext.Users.AnyAsync(u => u.Email == ownerEmail);
        if (!exists)
        {
            dbContext.Users.Add(new User
            {
                Email = ownerEmail,
                FirstName = "Owner",
                LastName = "Account",
                Role = UserRole.Owner,
                IsGuest = false,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
            });
            await dbContext.SaveChangesAsync();
            logger.LogInformation("OWNER user seeded: {Email}", ownerEmail);
        }
    }
}
```

**Program.cs — seeder call (AFTER `var app = builder.Build()` and BEFORE `app.Run()`):**

```csharp
// Seed database on startup (OWNER account)
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<DatabaseSeeder>();
    await seeder.SeedAsync();
}
```

**Also add middleware to Program.cs (between UseAuthentication and UseAuthorization):**
```csharp
// 5. Authentication
app.UseAuthentication();

// Populate ICurrentUserContext from JWT claims + DB lookup
app.UseMiddleware<CurrentUserContextMiddleware>();

// 6. Authorization
app.UseAuthorization();
```

### WebApplicationFactory Update (CRITICAL)

In `SdaManagementWebApplicationFactory.InitializeAsync()`, replace:
```csharp
await dbContext.Database.EnsureCreatedAsync();  // Story 1.2
```
With:
```csharp
await dbContext.Database.MigrateAsync();  // Story 1.3 — runs all migrations including seed
```
**Why:** `EnsureCreatedAsync()` creates schema but does NOT run migration code. The OWNER seed runs via `Program.cs` in production but NOT in tests (tests don't call `app.Run()`). So after `MigrateAsync()`, manually call the seeder in factory `InitializeAsync()` using test values.

### Integration Test CreateTestUser Implementation

```csharp
// In IntegrationTestBase.cs — replace the NotImplementedException stub
protected async Task<User> CreateTestUser(string email, UserRole role)
{
    using var scope = _factory.Services.CreateScope();
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var user = new User
    {
        Email = email,
        FirstName = "Test",
        LastName = role.ToString(),
        Role = role,
        IsGuest = false,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow,
    };
    dbContext.Users.Add(user);
    await dbContext.SaveChangesAsync();
    return user;
}
```

### Project Structure Notes

```
src/SdaManagement.Api/
├── Auth/
│   ├── ICurrentUserContext.cs              # NEW
│   ├── CurrentUserContext.cs               # NEW (mutable scoped)
│   ├── CurrentUserContextMiddleware.cs     # NEW
│   ├── IAuthorizationService.cs            # NEW
│   └── AuthorizationService.cs             # NEW
├── Controllers/
│   └── AuthController.cs                   # NEW (stubs with rate limiting)
├── Data/
│   ├── AppDbContext.cs                      # MODIFY (add DbSets, OnModelCreating)
│   ├── DatabaseSeeder.cs                   # NEW
│   ├── Entities/
│   │   ├── UserRole.cs                     # NEW
│   │   ├── User.cs                         # NEW
│   │   ├── RefreshToken.cs                 # NEW
│   │   ├── Department.cs                   # NEW (minimal)
│   │   └── UserDepartment.cs               # NEW
│   └── Migrations/                         # AUTO-GENERATED by dotnet ef
│       ├── {timestamp}_InitialUserSchema.cs
│       └── AppDbContextModelSnapshot.cs
├── Extensions/
│   └── ServiceCollectionExtensions.cs      # MODIFY (JWT, scoped services)
└── Program.cs                              # MODIFY (seeder call + middleware)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/architecture.md#ICurrentUserContext Interface]
- [Source: _bmad-output/planning-artifacts/architecture.md#OWNER Seed Account]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns — Database Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#DI Registration Convention]
- [Source: _bmad-output/implementation-artifacts/1-2-integration-test-infrastructure.md#Dev Notes]

## Technical Requirements

### Backend (.NET 10 LTS)

- **ORM**: EF Core 10 with `Npgsql.EntityFrameworkCore.PostgreSQL` 10.x — already installed
- **Migration tooling**: `Microsoft.EntityFrameworkCore.Design` — **must add to csproj** (enables `dotnet ef migrations add`)
- **JWT auth**: `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.3 — already installed
- **Password hashing**: `BCrypt.Net-Next` 4.1.0 — already installed (use cost factor 12 in Stories 1.4/1.5)
- **snake_case**: `EFCore.NamingConventions` 10.0.1 via `UseSnakeCaseNamingConvention()` — already installed
- **Rate limiting**: Built-in ASP.NET Core — already configured in ServiceCollectionExtensions ("auth" policy)
- **`Microsoft.AspNetCore.Identity.EntityFrameworkCore` is NOT needed** — using BCrypt.Net-Next for password hashing directly

### Key Environment Variables

| Variable | Config Key | Required |
|---|---|---|
| `OWNER_EMAIL` | `OwnerEmail` | Optional (seed skipped if missing) |
| `Jwt__Secret` | `Jwt:Secret` | Required at runtime (exception if missing) |
| `ConnectionStrings__DefaultConnection` | Already in appsettings.Development.json | Required |

### NuGet Packages to Add

| Package | Project | Purpose |
|---|---|---|
| `Microsoft.EntityFrameworkCore.Design` | `SdaManagement.Api` | `dotnet ef migrations add` CLI support |

## Architecture Compliance

### Mandatory Patterns for This Story

| Pattern | Requirement | Reference |
|---|---|---|
| **snake_case DB naming** | `UseSnakeCaseNamingConvention()` — no `[Column]`/`[Table]` attributes | [Architecture: Database Naming] |
| **No entities in API responses** | Ensure no entity type is ever returned from controllers | [Architecture: Key Principles #2] |
| **Role as int** | `UserRole` stored as int in DB — not string | [Architecture: Data Model] |
| **Email as unique identifier** | `CurrentUserContext` resolves user by email claim | [Architecture: Auth Flow Pattern] |
| **ICurrentUserContext as scoped** | One instance per HTTP request | [Architecture: ICurrentUserContext] |
| **AuthorizationService returns false** | Never throws on access denied — controllers check and return 403 | [Architecture: IAuthorizationService] |
| **All registrations in AddApplicationServices()** | Do NOT register services directly in Program.cs | [Architecture: DI Registration] |
| **Auth in `src/SdaManagement.Api/Auth/`** | ICurrentUserContext, IAuthorizationService, etc. | [Architecture: File Structure] |
| **Entities in `src/SdaManagement.Api/Data/Entities/`** | One file per entity | [Architecture: File Structure] |
| **JWT in httpOnly cookie** | Cookie name: `access_token` | [Architecture: JWT Cookies] |

### Anti-Patterns to Avoid

- **DO NOT** return `User` entity from any API endpoint — use response DTOs
- **DO NOT** add `[Authorize]` attributes to controllers in this story — authorization is via `IAuthorizationService` injection
- **DO NOT** store `UserRole` as a string enum in the DB — store as int
- **DO NOT** use `ASP.NET Core Identity` (`UserManager`, `IdentityUser`) — this project uses BCrypt.Net-Next directly
- **DO NOT** call `EnsureCreatedAsync()` in the factory after this story — always use `MigrateAsync()`
- **DO NOT** hardcode `OWNER_EMAIL` — always read from `IConfiguration`
- **DO NOT** skip the `ICurrentUserContext` middleware — controllers must not parse `HttpContext.User` directly
- **DO NOT** name the auth service `IAuthorizationService` without being aware of the namespace collision — always use `SdaManagement.Api.Auth.IAuthorizationService` in using directives where both namespaces are needed

### IAuthorizationService Naming Warning

There are TWO `IAuthorizationService` interfaces in this codebase:
1. `SdaManagement.Api.Auth.IAuthorizationService` — our custom SDAC auth service (domain methods)
2. `Microsoft.AspNetCore.Authorization.IAuthorizationService` — ASP.NET Core's built-in (policy-based)

In files that use both namespaces, alias them:
```csharp
using SdacAuth = SdaManagement.Api.Auth;
// Then use: SdacAuth.IAuthorizationService
```

## File Structure Requirements

### Files That MUST Be Created

| File | Purpose |
|---|---|
| `src/SdaManagement.Api/Data/Entities/UserRole.cs` | UserRole enum |
| `src/SdaManagement.Api/Data/Entities/User.cs` | User entity |
| `src/SdaManagement.Api/Data/Entities/RefreshToken.cs` | RefreshToken entity |
| `src/SdaManagement.Api/Data/Entities/Department.cs` | Minimal Department entity (FK target) |
| `src/SdaManagement.Api/Data/Entities/UserDepartment.cs` | Junction entity |
| `src/SdaManagement.Api/Data/DatabaseSeeder.cs` | OWNER seed service |
| `src/SdaManagement.Api/Data/Migrations/{timestamp}_InitialUserSchema.cs` | Auto-generated migration |
| `src/SdaManagement.Api/Auth/ICurrentUserContext.cs` | Interface |
| `src/SdaManagement.Api/Auth/CurrentUserContext.cs` | Mutable scoped implementation |
| `src/SdaManagement.Api/Auth/CurrentUserContextMiddleware.cs` | Populates context from JWT+DB |
| `src/SdaManagement.Api/Auth/IAuthorizationService.cs` | Custom domain auth interface |
| `src/SdaManagement.Api/Auth/AuthorizationService.cs` | Implementation |
| `src/SdaManagement.Api/Controllers/AuthController.cs` | Stub endpoints with rate limiting |
| `tests/SdaManagement.Api.IntegrationTests/Auth/AuthInfrastructureTests.cs` | Integration tests |

### Files That MUST Be Modified

| File | Change |
|---|---|
| `src/SdaManagement.Api/Data/AppDbContext.cs` | Add DbSets, OnModelCreating |
| `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` | JWT Bearer, ICurrentUserContext, IAuthorizationService |
| `src/SdaManagement.Api/SdaManagement.Api.csproj` | Add `Microsoft.EntityFrameworkCore.Design` |
| `src/SdaManagement.Api/Program.cs` | Seeder call + CurrentUserContextMiddleware |
| `tests/SdaManagement.Api.IntegrationTests/SdaManagementWebApplicationFactory.cs` | EnsureCreated → MigrateAsync |
| `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` | Implement `CreateTestUser()` |
| `tests/SdaManagement.Api.IntegrationTests/Auth/TestAuthHandler.cs` | Integer UserId claims (if needed for DB lookup) |

### Files That MUST NOT Be Modified

| File | Why |
|---|---|
| `src/sdamanagement-web/**/*` | No frontend changes in this story |
| `tests/SdaManagement.Api.UnitTests/**/*` | Unit test project not touched |
| `tests/SdaManagement.Api.IntegrationTests/HealthCheckTests.cs` | Existing passing test — don't break it |
| `tests/SdaManagement.Api.IntegrationTests/IntegrationTestCollection.cs` | No change needed |

## Testing Requirements

### Integration Tests (in `AuthInfrastructureTests.cs`)

| Test | Method | Expected |
|---|---|---|
| Schema: users table columns | Query `information_schema.columns` | All required columns exist with correct types |
| Schema: user_departments table | Query `information_schema.tables` | Table exists with composite PK |
| Schema: refresh_tokens table | Query `information_schema.tables` | Table exists with correct FK |
| Schema: snake_case | Verify column names | `created_at`, `first_name`, `password_hash` — NOT camelCase |
| JWT: valid cookie → populated context | Create test user, call probe endpoint | `ICurrentUserContext.IsAuthenticated = true` |
| JWT: missing cookie → 401 | Anonymous request to protected endpoint | 401 with ProblemDetails |
| Rate limiting: 429 after 5 requests | POST `/api/auth/login` 6× | 6th response is 429 with `Retry-After` header |

### Unit Tests (in UnitTests project)

| Test | Class | Coverage |
|---|---|---|
| `CanView_WhenAnonymous_ReturnsFalse` | `AuthorizationServiceTests` | Anonymous → false |
| `CanView_WhenViewer_ReturnsTrue` | `AuthorizationServiceTests` | Viewer → true |
| `CanManage_WhenAdmin_WithOwnDept_ReturnsTrue` | `AuthorizationServiceTests` | Admin + matching dept → true |
| `CanManage_WhenAdmin_WithOtherDept_ReturnsFalse` | `AuthorizationServiceTests` | Admin + wrong dept → false |
| `CanManage_WhenOwner_AnyDept_ReturnsTrue` | `AuthorizationServiceTests` | Owner bypasses dept check |
| `IsOwner_WhenOwner_ReturnsTrue` | `AuthorizationServiceTests` | Owner only |
| `IsOwner_WhenAdmin_ReturnsFalse` | `AuthorizationServiceTests` | Not owner → false |

### Probe Endpoint Strategy

For testing JWT auth (AC 3, 5), we need a protected endpoint. Create a temporary `/api/auth/probe` endpoint in `AuthController`:
```csharp
[HttpGet("probe")]
[Authorize]  // Only exception to no-[Authorize] rule: this probe exists purely for test infrastructure
public IActionResult Probe([FromServices] ICurrentUserContext ctx) =>
    Ok(new { ctx.IsAuthenticated, ctx.UserId, ctx.Role });
```

This probe endpoint is test infrastructure. Remove it or convert to proper endpoint in Story 1.4.

### What NOT to Test in This Story

- No Google OAuth flow tests (Story 1.4)
- No email/password login tests (Story 1.5)
- No actual token issuance tests (Stories 1.4/1.5 — no token generation yet)
- No department-scoped authorization tests (no departments exist yet — Epic 2)

## Previous Story Intelligence

### From Story 1.2 — Key Learnings

1. **CRITICAL: Switch `EnsureCreatedAsync()` to `MigrateAsync()`** — Story 1.2 deliberately uses `EnsureCreatedAsync()` as a placeholder noting "Story 1.3 MUST flip this." The Story 1.2 dev notes say: "EnsureCreated() doesn't run migration code — if the first migration has data seeds (like the OWNER user), EnsureCreated() silently skips them." **Update `SdaManagementWebApplicationFactory.InitializeAsync()` immediately.**

2. **Respawn now has tables to work with** — Story 1.2's Respawn was gracefully skipped (no tables). Story 1.3 adds 4 tables (`users`, `departments`, `user_departments`, `refresh_tokens`). After migration, Respawn will activate and reset these between tests. No code change needed — it auto-activates.

3. **Helper method stubs throw `NotImplementedException`** — `CreateTestUser()` currently throws. Story 1.3 MUST implement it to insert actual User records. See implementation in Dev Notes above.

4. **`SeedTestData()` hook exists** — Override `SeedTestData()` in test classes that need pre-populated users. Default is no-op. Don't add default seeding to base class — not all tests need pre-populated users.

5. **`PostgreSqlBuilder("postgres:17")`** — must use the constructor with image parameter (parameterless is obsolete). Already correct in the factory.

6. **TestAuthHandler email claims** — Story 1.2 added `ClaimTypes.Email = test-{role}@test.local` precisely so Story 1.3's `CurrentUserContext` can resolve users by email. These test emails match what `CreateTestUser()` should use when creating users for auth tests.

7. **`ServiceCollectionExtensions.AddApplicationServices()` is the ONLY place for DI registrations** — Don't put JWT config in `Program.cs`. Don't put auth services anywhere else.

8. **`public partial class Program {}`** — Already in `Program.cs`. Don't add again.

9. **`UseSnakeCaseNamingConvention()` must appear in BOTH** `ServiceCollectionExtensions.cs` (already there) AND `SdaManagementWebApplicationFactory.ConfigureWebHost()` (already there). Do NOT remove either — they must match or tests get "table not found" errors.

### From Story 1.1 — Patterns to Follow

- **Controllers go in `src/SdaManagement.Api/Controllers/`** — this directory doesn't exist yet; create it
- **Auth-related files go in `src/SdaManagement.Api/Auth/`** — create this directory
- **One class per file** throughout `src/`
- **`AddApplicationServices()` registers everything** — `Program.cs` stays clean

## Git Intelligence

**Recent commits:**
- `1738474 feat(test): Story 1.2 — integration test infrastructure` (last commit)
- `e43f01a feat(infra): Story 1.1 — project scaffolding and development infrastructure`

**Patterns from recent work:**
- Commit message format: `feat({area}): Story X.Y — description`
- Story 1.2 created 5 new files, modified 2 — medium-sized story. Story 1.3 is larger (12+ new files)
- All migrations will be auto-generated by `dotnet ef` — do not hand-write them
- Test authentication is via custom X-Test-Role header (TestAuthHandler) — will be updated but same external interface (AnonymousClient, ViewerClient, etc. remain)

## Latest Tech Information (March 2026)

### EF Core 10 Migrations

- **Command**: `dotnet ef migrations add InitialUserSchema --project src/SdaManagement.Api --startup-project src/SdaManagement.Api`
- **Design package required**: `Microsoft.EntityFrameworkCore.Design` must be in `.csproj` (not just global tool)
- **snake_case**: With `UseSnakeCaseNamingConvention()`, C# `FirstName` → DB `first_name` automatically — verify in generated migration
- **Enum storage**: `HasConversion<int>()` stores as integer — `Anonymous=0, Viewer=1, Admin=2, Owner=3`
- **Default values**: Use `.HasDefaultValueSql("now()")` for `created_at`/`updated_at` (PostgreSQL-specific)
- **Verify migration**: After generating, read the migration file and confirm snake_case column names

### JWT Bearer in .NET 10

- **Package**: `Microsoft.AspNetCore.Authentication.JwtBearer` 10.0.3 — already installed
- **Cookie extraction**: Use `OnMessageReceived` event to read from `Request.Cookies["access_token"]`
- **Clock skew**: Set `ClockSkew = TimeSpan.Zero` for strict expiry (no extra 5-min tolerance)
- **Token generation** (for Stories 1.4/1.5): Use `JwtSecurityTokenHandler` or `JsonWebTokenHandler` (preferred in .NET 8+)
- **Access token TTL**: 15 minutes (architecture constraint)

### ASP.NET Core Rate Limiting (.NET 10)

- **Already configured** in `ServiceCollectionExtensions.cs` as "auth" fixed window policy (5 req/min per IP)
- **Apply to endpoint**: `[EnableRateLimiting("auth")]` attribute on controller action
- **429 test**: Rate limiter tracks per IP — in tests, all requests come from `127.0.0.1`; 6 requests in quick succession will trigger it
- **Retry-After header**: Already configured in `OnRejected` callback (Story 1.1) — just verify the header appears in the 429 response

## Story DoD Checklist

- [ ] `Microsoft.EntityFrameworkCore.Design` added to `SdaManagement.Api.csproj`
- [ ] All 5 entity files created (`UserRole`, `User`, `RefreshToken`, `Department`, `UserDepartment`)
- [ ] `AppDbContext.OnModelCreating()` configured (FK constraints, cascade deletes, unique email index, Role as int)
- [ ] EF Core migration generated and verified (correct snake_case column names)
- [ ] Migration applies clean: `dotnet ef database update` runs without error
- [ ] OWNER seed: `DatabaseSeeder` registered and called in `Program.cs`; skips gracefully if `OWNER_EMAIL` missing
- [ ] JWT Bearer configured to read from `access_token` cookie
- [ ] `ICurrentUserContext` / `CurrentUserContext` scoped and resolves by email claim
- [ ] `CurrentUserContextMiddleware` inserted between `UseAuthentication()` and `UseAuthorization()`
- [ ] `IAuthorizationService` / `AuthorizationService` registered and implemented
- [ ] `AuthController` stub created with `[EnableRateLimiting("auth")]` on all three endpoints
- [ ] `SdaManagementWebApplicationFactory`: `EnsureCreatedAsync()` replaced with `MigrateAsync()`
- [ ] `IntegrationTestBase.CreateTestUser()` implemented (no longer throws `NotImplementedException`)
- [ ] Integration tests: schema verification passes
- [ ] Integration test: missing JWT → 401
- [ ] Integration test: rate limiting → 429 with `Retry-After`
- [ ] Unit tests: all 7 `AuthorizationService` unit tests pass
- [ ] `dotnet test` from solution root: all tests pass (including Story 1.2 `HealthCheckTests`)
- [ ] No `.slnx` structure changes — just adding files

## Change Log

- **2026-03-02**: Story 1.3 created by Claude Sonnet 4.6 — comprehensive auth backend implementation guide
- **2026-03-02**: Story 1.3 implemented by claude-sonnet-4-6 — 17 new files, 8 modified; all 12 tests passing; status → review
- **2026-03-02**: Code review by claude-opus-4-6 — 1 HIGH, 3 MEDIUM, 3 LOW issues found; all 7 fixed; status → done

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- Story 1.2's `EnsureCreatedAsync()` had to be replaced with `MigrateAsync()` in factory — confirmed the note in the story was accurate.
- `dotnet-ef` global tool was not installed — installed `dotnet-ef` 10.0.3 before generating the migration.
- Junction table was initially named `user_department` by EF Core convention; explicitly set `e.ToTable("user_departments")` to match AC naming.
- `Jwt:Secret` not available during `WebApplicationFactory` startup — fixed by adding dev placeholder to `appsettings.Development.json` (standard pattern for dev environments).
- Probe endpoint returns `Role` as integer by default; fixed to `ctx.Role.ToString()` so the integration test can assert the role name as a string.

### Completion Notes List

All 8 tasks complete. 12 tests passing (7 unit + 5 integration including regression HealthCheckTests).

Key decisions made:
- `user_departments` table: explicit `.ToTable("user_departments")` via fluent API (not attribute) to match AC specification.
- `appsettings.Development.json` received `Jwt:Secret` dev placeholder — required because `AddApplicationServices` throws at startup if secret is missing, and `WebApplicationFactory.ConfigureWebHost` runs too late to inject it via `AddInMemoryCollection`.
- `TestAuthHandler.cs` unchanged — Story 1.2 already added `ClaimTypes.Email` claims; `CurrentUserContextMiddleware` resolves users by email, so no integer UserId in claims is needed.
- `AuthController` probe endpoint returns `Role = ctx.Role.ToString()` (string) for test assertion clarity.
- Unit tests use NSubstitute to mock `ICurrentUserContext`; 7 tests cover all `AuthorizationService` branches.

### File List

**New files created:**
- `src/SdaManagement.Api/Data/Entities/UserRole.cs`
- `src/SdaManagement.Api/Data/Entities/User.cs`
- `src/SdaManagement.Api/Data/Entities/RefreshToken.cs`
- `src/SdaManagement.Api/Data/Entities/Department.cs`
- `src/SdaManagement.Api/Data/Entities/UserDepartment.cs`
- `src/SdaManagement.Api/Data/DatabaseSeeder.cs`
- `src/SdaManagement.Api/Migrations/20260303003500_InitialUserSchema.cs`
- `src/SdaManagement.Api/Migrations/20260303003500_InitialUserSchema.Designer.cs`
- `src/SdaManagement.Api/Migrations/AppDbContextModelSnapshot.cs`
- `src/SdaManagement.Api/Auth/ICurrentUserContext.cs`
- `src/SdaManagement.Api/Auth/CurrentUserContext.cs`
- `src/SdaManagement.Api/Auth/CurrentUserContextMiddleware.cs`
- `src/SdaManagement.Api/Auth/IAuthorizationService.cs`
- `src/SdaManagement.Api/Auth/AuthorizationService.cs`
- `src/SdaManagement.Api/Controllers/AuthController.cs`
- `tests/SdaManagement.Api.IntegrationTests/Auth/AuthInfrastructureTests.cs`
- `tests/SdaManagement.Api.UnitTests/Auth/AuthorizationServiceTests.cs`

**Modified files:**
- `src/SdaManagement.Api/SdaManagement.Api.csproj` (added `Microsoft.EntityFrameworkCore.Design` + `Microsoft.EntityFrameworkCore.Relational` version pin)
- `src/SdaManagement.Api/Data/AppDbContext.cs` (DbSets + OnModelCreating)
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` (JWT Bearer + OnChallenge ProblemDetails, ICurrentUserContext, IAuthorizationService, DatabaseSeeder)
- `src/SdaManagement.Api/Program.cs` (seeder call + CurrentUserContextMiddleware)
- `src/SdaManagement.Api/appsettings.Development.json` (Jwt:Secret dev placeholder)
- `tests/SdaManagement.Api.IntegrationTests/SdaManagementWebApplicationFactory.cs` (EnsureCreated → MigrateAsync, seeder call, Jwt:Secret config override, DatabaseSeeder using)
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` (implemented CreateTestUser, exposed ConnectionString, Respawn __EFMigrationsHistory exclusion)
- `tests/SdaManagement.Api.IntegrationTests/Auth/TestAuthHandler.cs` (HandleChallengeAsync with ProblemDetails)
- `tests/SdaManagement.Api.IntegrationTests/Auth/AuthInfrastructureTests.cs` (401 test verifies ProblemDetails body, rate limit test verifies first 5 requests succeed)
- `src/SdaManagement.Api/Controllers/AuthController.cs` (stubs return ProblemDetails instead of plain strings)
- `src/SdaManagement.Api/Data/AppDbContext.cs` (added RefreshToken.CreatedAt default)
- `src/SdaManagement.Api/Migrations/20260303013914_AddRefreshTokenCreatedAtDefault.cs` (new migration)
- `src/SdaManagement.Api/Migrations/20260303013914_AddRefreshTokenCreatedAtDefault.Designer.cs` (new migration designer)

**Deleted files:**
- `src/SdaManagement.Api/Data/Migrations/.gitkeep` (stale — migrations live at `src/SdaManagement.Api/Migrations/`)
