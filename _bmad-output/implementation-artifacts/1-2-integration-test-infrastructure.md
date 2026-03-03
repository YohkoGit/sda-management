# Story 1.2: Integration Test Infrastructure

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **developer**,
I want an IntegrationTestBase class with Testcontainers PostgreSQL and pre-configured HTTP clients per role,
So that all future stories can write integration tests against a real database with role-based test clients.

## Acceptance Criteria

1. **Given** the test project at `tests/SdaManagement.Api.IntegrationTests/`
   **When** `IntegrationTestBase` is instantiated
   **Then** a Testcontainers PostgreSQL instance is running with EF Core migrations applied

2. **Given** the `IntegrationTestBase`
   **When** a test class inherits from it
   **Then** pre-configured `HttpClient`s are available: `AnonymousClient`, `ViewerClient`, `AdminClient`, `OwnerClient`
   **And** each authenticated client sends requests with appropriate role claims via a test authentication handler

3. **Given** multiple tests running
   **When** each test completes
   **Then** the database is reset (tables truncated via Respawn) to ensure test isolation

4. **Given** the test project
   **When** `dotnet test` is run
   **Then** all tests pass with zero manual configuration beyond Docker running

5. **Given** a sample smoke test
   **When** the `AnonymousClient` sends `GET /health`
   **Then** the response is `200 OK` with `Healthy` status, proving the full pipeline works

## Prerequisites

### Local Dev Environment Requirements

| Tool | Minimum Version | Install | Verify |
|---|---|---|---|
| **Docker Desktop** | Latest stable | [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) | `docker --version` |
| **.NET 10 SDK** | 10.0.x LTS | [dot.net/download](https://dot.net/download) | `dotnet --version` |
| **Git** | Any | Already installed | `git --version` |

### Ports That Must Be Free

| Port | Service |
|---|---|
| **Random** | Testcontainers PostgreSQL (auto-assigned by Docker) |

### NOT Needed for This Story

- No frontend changes
- No `OWNER_EMAIL` env var (Story 1.3)
- No Google OAuth credentials (Story 1.4)
- No JWT secret configuration (Story 1.3)
- No User entity or migrations (Story 1.3)

## Tasks / Subtasks

- [x] **Task 1: Install Respawn NuGet package** (AC: 3)
  - [x] Add `Respawn` package to `tests/SdaManagement.Api.IntegrationTests/SdaManagement.Api.IntegrationTests.csproj`
  - [x] Verify: `dotnet build` compiles with zero errors

- [x] **Task 2: Create `TestAuthHandler`** (AC: 2)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/Auth/TestAuthHandler.cs`
  - [x] Implement `AuthenticationHandler<AuthenticationSchemeOptions>` that reads a custom header (`X-Test-Role`) and creates a `ClaimsPrincipal` with role claim
  - [x] Anonymous client sends no header → request treated as unauthenticated
  - [x] Viewer/Admin/Owner clients send `X-Test-Role: Viewer|Admin|Owner` → handler creates authenticated principal with `ClaimTypes.Role` set accordingly
  - [x] Include `ClaimTypes.NameIdentifier` (test user ID) so `ICurrentUserContext` can be populated in Story 1.3+

- [x] **Task 3: Create `SdaManagementWebApplicationFactory`** (AC: 1, 2)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/SdaManagementWebApplicationFactory.cs`
  - [x] Inherit from `WebApplicationFactory<Program>` (relies on `public partial class Program {}` added in Story 1.1)
  - [x] Implement `IAsyncLifetime` for Testcontainers lifecycle
  - [x] In `InitializeAsync()`: start `PostgreSqlContainer` via `PostgreSqlBuilder`
  - [x] Override `ConfigureWebHost()`:
    - Remove **both** the existing `DbContextOptions<AppDbContext>` and the `AppDbContext` scoped service registration (missing one = EF Core resolves wrong provider)
    - Re-register `AppDbContext` with the Testcontainers PostgreSQL connection string **and** `.UseSnakeCaseNamingConvention()` (must match production configuration)
    - Replace the default authentication scheme with `TestAuthHandler`
    - Call `context.Database.EnsureCreated()` to apply schema (switch to `Migrate()` in Story 1.3 when first migration exists)
  - [x] In `DisposeAsync()`: stop and dispose the PostgreSQL container

- [x] **Task 4: Create `IntegrationTestBase`** (AC: 1, 2, 3)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs`
  - [x] Use xUnit `ICollectionFixture<SdaManagementWebApplicationFactory>` to share one PostgreSQL container across all test classes
  - [x] Define `[CollectionDefinition("Integration")]` collection class
  - [x] Expose pre-configured clients as properties:
    - `AnonymousClient` — no auth header
    - `ViewerClient` — sends `X-Test-Role: Viewer`
    - `AdminClient` — sends `X-Test-Role: Admin`
    - `OwnerClient` — sends `X-Test-Role: Owner`
  - [x] Implement `IAsyncLifetime`:
    - In `InitializeAsync()`: initialize Respawn `Checkpoint` with the Testcontainers connection string, configured for PostgreSQL (`SchemasToInclude = ["public"]`, `DbAdapter = DbAdapter.Postgres`)
    - In `DisposeAsync()`: run `Respawner.ResetAsync()` to truncate all tables after each **test method** (not per class — prevents inter-test coupling)
  - [x] Create helper method stubs (to be implemented in Story 1.3+):
    - `CreateTestUser(string email, string role)` — placeholder, returns Task
    - `CreateTestActivity(...)` — placeholder, returns Task
    - `AuthenticateAs(string role)` — returns an HttpClient with the specified role header

- [x] **Task 5: Create smoke test** (AC: 4, 5)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/HealthCheckTests.cs`
  - [x] Inherit from `IntegrationTestBase` with `[Collection("Integration")]`
  - [x] Test: `HealthCheck_WhenDatabaseIsRunning_ReturnsHealthy` — `AnonymousClient.GetAsync("/health")` returns 200
  - [x] Verify: `dotnet test --filter "FullyQualifiedName~IntegrationTests"` passes

- [x] **Task 6: Verify full test suite** (AC: 4)
  - [x] Run `dotnet test` from solution root — all projects compile, all tests pass
  - [x] Confirm Testcontainers starts/stops PostgreSQL automatically
  - [x] Confirm no manual configuration needed beyond Docker Desktop running

## Dev Notes

### Critical Implementation Warnings

1. **Container sharing is mandatory.** Use `ICollectionFixture<SdaManagementWebApplicationFactory>` so ONE PostgreSQL container is shared across ALL integration test classes. Starting a new container per test class adds ~5-10 seconds per class. The collection fixture starts the container once, runs all `[Collection("Integration")]` test classes against it, then disposes.

2. **Respawn, not EnsureDeleted/EnsureCreated.** Database reset between tests must use Respawn (which truncates tables via SQL) — NOT `EnsureDeleted()` + `EnsureCreated()` which drops and recreates the entire database schema. Respawn is ~100ms, schema recreation is ~2-5 seconds. At scale with hundreds of tests, this difference is fatal. **Reset per test method** (via `IAsyncLifetime.DisposeAsync()` on the base class), not per test class — class-level reset allows inter-test coupling where Test B implicitly depends on records created by Test A.

3. **Test auth handler pattern — not real JWT yet.** Story 1.3 implements real JWT cookie authentication. For now, `TestAuthHandler` bypasses real auth with a custom scheme that reads `X-Test-Role` from request headers. When Story 1.3 lands, the factory will be updated to generate actual JWT test tokens. The client interface (`AnonymousClient`, `ViewerClient`, etc.) stays the same — only the auth mechanism changes internally.

4. **`EnsureCreated()` not `Migrate()` for now.** Since no migrations exist yet (first entity is Story 1.3), use `context.Database.EnsureCreated()`. **Story 1.3 MUST flip this to `context.Database.Migrate()`.** `EnsureCreated()` doesn't run migration code — if the first migration has data seeds (like the OWNER user), `EnsureCreated()` silently skips them. This is a known trap.

5. **Respawn `InitializeAsync` must run AFTER database is created.** Respawn's `RespawnerOptions` needs to connect to an existing database to introspect tables. Initialize the Respawner in the test class `InitializeAsync()`, not in the factory constructor — the database schema must exist first.

6. **Do NOT modify `Program.cs` or any `src/` file.** This story is entirely within `tests/SdaManagement.Api.IntegrationTests/`. The `public partial class Program {}` declaration already exists from Story 1.1.

7. **Helper method stubs must compile but throw `NotImplementedException`.** `CreateTestUser()` and `CreateTestActivity()` are placeholders. They need the User entity (Story 1.3) and Activity entity (Epic 4) respectively. Stub them with `throw new NotImplementedException("Requires Story 1.3")` so they exist for IDE discoverability but don't silently pass.

### Project Structure Notes

All files go into `tests/SdaManagement.Api.IntegrationTests/`:

```
tests/
└── SdaManagement.Api.IntegrationTests/
    ├── SdaManagement.Api.IntegrationTests.csproj  # (existing — add Respawn package)
    ├── SdaManagementWebApplicationFactory.cs       # WebApplicationFactory + Testcontainers
    ├── IntegrationTestBase.cs                      # Base class with role clients + Respawn
    ├── IntegrationTestCollection.cs                # [CollectionDefinition("Integration")]
    ├── Auth/
    │   └── TestAuthHandler.cs                      # Custom auth handler for tests
    └── HealthCheckTests.cs                         # Smoke test proving pipeline works
```

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Integration Test Base Class (Sprint 0 Infrastructure)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Test Organization]
- [Source: _bmad-output/planning-artifacts/architecture.md#Test Naming Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#First Implementation Priority]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- [Source: _bmad-output/implementation-artifacts/1-1-project-scaffolding-and-development-infrastructure.md#Dev Agent Record]

## Technical Requirements

### Backend (.NET 10 LTS)

- **Test framework**: xUnit 2.9.x with `IAsyncLifetime` for async setup/teardown
- **Container management**: Testcontainers.PostgreSql 4.10.x — real PostgreSQL 17 in Docker, auto-started/stopped
- **Database reset**: Respawn — SQL-level table truncation between tests (~100ms per reset)
- **HTTP testing**: `Microsoft.AspNetCore.Mvc.Testing` — `WebApplicationFactory<Program>` hosts the full ASP.NET Core pipeline
- **Test auth**: Custom `AuthenticationHandler<AuthenticationSchemeOptions>` — reads `X-Test-Role` header, creates claims principal
- **Assertions**: Shouldly (MIT license — NOT FluentAssertions)
- **Test naming**: `{MethodName}_{Scenario}_{ExpectedResult}` convention

### Container Configuration

- **Image**: `postgres:17` (matches dev `docker-compose.dev.yml`)
- **Database**: `testdb`
- **Username**: `testuser`
- **Password**: `testpass`
- **Port**: Auto-assigned by Testcontainers (NOT 5432 — avoids conflict with dev container)

### Test Authentication Scheme

- **Scheme name**: `"TestScheme"`
- **Header**: `X-Test-Role` with values: `Viewer`, `Admin`, `Owner`
- **No header** = unauthenticated (anonymous)
- **Claims generated**:
  - `ClaimTypes.NameIdentifier` = test user ID (e.g., `"test-viewer-1"`, `"test-admin-1"`, `"test-owner-1"`)
  - `ClaimTypes.Role` = role value from header
- **Purpose**: Allows role-based testing before real JWT auth exists (Story 1.3)

## Architecture Compliance

### Mandatory Patterns for This Story

| Pattern | Requirement | Reference |
|---|---|---|
| **Collection fixture** | One PostgreSQL container shared across all integration test classes | [Architecture: Integration Test Base Class] |
| **Pre-configured role clients** | AnonymousClient, ViewerClient, AdminClient, OwnerClient | [Architecture: Integration Test Base Class] |
| **Database reset per test** | Truncate all tables via Respawn after every test method (not class) | [Architecture: Integration Test Base Class] |
| **Test naming** | `{MethodName}_{Scenario}_{ExpectedResult}` | [Architecture: Test Naming Conventions] |
| **Test organization** | Integration tests in `tests/SdaManagement.Api.IntegrationTests/` organized by controller/feature | [Architecture: Test Organization] |
| **WebApplicationFactory** | Uses `public partial class Program {}` from Story 1.1 | [Architecture: WebApplicationFactory] |

### Anti-Patterns to Avoid

- Do NOT start a new PostgreSQL container per test class — use collection fixture
- Do NOT use `EnsureDeleted()` + `EnsureCreated()` for database reset — use Respawn
- Do NOT use real JWT tokens (Story 1.3 will implement JWT) — use `TestAuthHandler`
- Do NOT modify any file in `src/` — this story is entirely within `tests/`
- Do NOT use `FluentAssertions` (commercial license since v8) — use `Shouldly` (MIT)
- Do NOT create test data that depends on entities that don't exist yet (User entity is Story 1.3)
- Do NOT use `[Fact]` with constructor-based setup — use `IAsyncLifetime` for async setup/teardown
- Do NOT put `[CollectionDefinition]` on the `IntegrationTestBase` class — use a separate `IntegrationTestCollection.cs` marker class (xUnit convention, avoids confusing inheritance)

## Library/Framework Requirements

### NuGet Packages to Add

| Package | Project | Purpose |
|---|---|---|
| `Respawn` | IntegrationTests | SQL-level table truncation for test isolation |

### Already Installed (from Story 1.1)

| Package | Version | Purpose |
|---|---|---|
| `xunit` | 2.9.3 | Test framework |
| `xunit.runner.visualstudio` | 3.1.4 | Test runner |
| `Microsoft.AspNetCore.Mvc.Testing` | 10.0.3 | WebApplicationFactory |
| `NSubstitute` | 5.3.0 | Mocking |
| `Shouldly` | 4.3.0 | Assertion syntax |
| `Testcontainers.PostgreSql` | 4.10.0 | Real PostgreSQL in tests |
| `Microsoft.NET.Test.Sdk` | 17.14.1 | Test SDK |
| `coverlet.collector` | 6.0.4 | Code coverage |

## File Structure Requirements

### Files That MUST Be Created in This Story

| File | Purpose |
|---|---|
| `tests/SdaManagement.Api.IntegrationTests/SdaManagementWebApplicationFactory.cs` | WebApplicationFactory with Testcontainers PostgreSQL |
| `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` | Base class with role-based clients and Respawn reset |
| `tests/SdaManagement.Api.IntegrationTests/IntegrationTestCollection.cs` | `[CollectionDefinition("Integration")]` for container sharing |
| `tests/SdaManagement.Api.IntegrationTests/Auth/TestAuthHandler.cs` | Custom auth handler reading `X-Test-Role` header |
| `tests/SdaManagement.Api.IntegrationTests/HealthCheckTests.cs` | Smoke test: `GET /health` returns 200 Healthy |

### Files That MUST Be Modified in This Story

| File | Change |
|---|---|
| `tests/SdaManagement.Api.IntegrationTests/SdaManagement.Api.IntegrationTests.csproj` | Add `Respawn` NuGet package |

### Files That MUST NOT Be Modified

| File | Why |
|---|---|
| `src/SdaManagement.Api/Program.cs` | `public partial class Program {}` already exists |
| `src/SdaManagement.Api/**/*` | No production code changes in this story |
| `tests/SdaManagement.Api.UnitTests/**/*` | Not relevant to integration test infrastructure |
| `src/sdamanagement-web/**/*` | No frontend changes |

## Testing Requirements

### What to Test in This Story

| Verification | Method | Expected Result |
|---|---|---|
| Testcontainers starts PostgreSQL | Run any integration test | Container starts, connection succeeds |
| EF Core schema applied | IntegrationTestBase setup | `EnsureCreated()` completes without error |
| Anonymous client works | `HealthCheck_WhenDatabaseIsRunning_ReturnsHealthy` | `GET /health` returns 200 |
| Database reset works | Run multiple tests | Each test starts with empty tables |
| Role clients have correct headers | Inspect HTTP requests in test | ViewerClient sends `X-Test-Role: Viewer`, etc. |
| Container cleanup | Test run completes | Docker container is removed |
| Full suite compiles | `dotnet test` from solution root | All projects compile, all tests pass |

### What NOT to Test in This Story

- No auth endpoint tests (no auth endpoints exist yet — Story 1.3)
- No entity CRUD tests (no entities exist yet — Story 1.3)
- No frontend tests (no frontend changes)
- No role-based access tests (no authorization logic yet — Story 1.3)

## Previous Story Intelligence

### From Story 1.1 — Key Learnings

1. **`public partial class Program {}` already exists** in `Program.cs` — this was specifically added for `WebApplicationFactory<Program>` in integration tests. Do NOT add it again.

2. **Solution file is `.slnx` format** (not `.sln`) — .NET 10 default. Both test projects are already in the solution.

3. **`UseSnakeCaseNamingConvention()` is configured at DI level** in `ServiceCollectionExtensions.AddApplicationServices()` — not in `AppDbContext.OnConfiguring()`. The WebApplicationFactory override **MUST** include `.UseSnakeCaseNamingConvention()` when re-registering `AppDbContext` with the test connection string. Missing this causes test database schema to use PascalCase while production uses snake_case — resulting in "table not found" errors in future stories.

4. **`AspNetCore.HealthChecks.NpgSql` version is 9.0.0** (not 10.0.0 as noted in Story 1.1 code review — check current `.csproj` to confirm).

5. **Auth is placeholder only** — `services.AddAuthentication()` and `services.AddAuthorization()` are called with no configuration. The `TestAuthHandler` will override this default scheme.

6. **`AppDbContext` is empty** — no `DbSet<>` properties, no `OnModelCreating()`. `EnsureCreated()` will create an empty database schema, and Respawn will have no tables to truncate initially. This is correct — first entity arrives in Story 1.3.

### Git Intelligence

- **Last commit**: `e43f01a feat(infra): Story 1.1 — project scaffolding and development infrastructure`
- **Code review fixes applied**: 8 issues fixed including critical `package.json` restoration, auth service registration moved to `AddApplicationServices()`, `public partial class Program {}` added
- **Project compiles clean**: `dotnet build` zero errors, `dotnet test` returns 0 tests/0 failures

## Latest Tech Information (March 2026)

### Testcontainers .NET 4.10.x

- **Latest stable**: 4.10.0 (already installed in Story 1.1)
- **xUnit integration**: Use `IAsyncLifetime` on fixture classes for async container lifecycle
- **Collection fixtures**: `ICollectionFixture<T>` shares one container across multiple test classes — the recommended pattern for PostgreSQL
- **PostgreSQL builder**: `new PostgreSqlBuilder().WithDatabase("testdb").WithUsername("testuser").WithPassword("testpass").Build()`
- **Connection string**: `container.GetConnectionString()` returns full Npgsql connection string

### Respawn

- **Purpose**: Intelligent database reset — truncates tables respecting foreign key relationships
- **PostgreSQL support**: `DbAdapter.Postgres` adapter
- **Performance**: ~100ms per reset vs ~2-5 seconds for schema recreation
- **Initialization**: Must connect after database schema exists — initialize in `IAsyncLifetime.InitializeAsync()` after `EnsureCreated()`
- **Usage**: `await respawner.ResetAsync(connectionString)`

### WebApplicationFactory .NET 10

- **Entry point**: `WebApplicationFactory<Program>` requires `public partial class Program {}` (already added in Story 1.1)
- **Service override**: Use `ConfigureTestServices` or `ConfigureWebHost` to replace services
- **DbContext replacement**: Remove existing registration with `services.RemoveAll<DbContextOptions<AppDbContext>>()`, then re-add with test connection string
- **Auth override**: `services.AddAuthentication("TestScheme").AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("TestScheme", null)`

## Story DoD Checklist

- [x] `Respawn` NuGet package added to IntegrationTests project
- [x] `TestAuthHandler` creates authenticated principals from `X-Test-Role` header
- [x] `SdaManagementWebApplicationFactory` starts Testcontainers PostgreSQL and overrides `AppDbContext` connection
- [x] `IntegrationTestBase` exposes `AnonymousClient`, `ViewerClient`, `AdminClient`, `OwnerClient`
- [x] Database reset via Respawn runs after each test method
- [x] `HealthCheckTests` passes: `GET /health` returns 200 Healthy
- [x] `dotnet test` from solution root: all projects compile, all tests pass
- [x] No `src/` files modified
- [x] Collection fixture ensures one PostgreSQL container for all test classes
- [x] Helper method stubs exist (`CreateTestUser`, `CreateTestActivity`, `AuthenticateAs`)

## Change Log

- **2026-03-02**: Story 1.2 implemented — Integration test infrastructure with Testcontainers PostgreSQL, Respawn database reset, TestAuthHandler, and health check smoke test
- **2026-03-02**: Code review by Claude Sonnet 4.6 — 12 issues found (1 HIGH, 4 MEDIUM, 7 LOW), all fixed; dotnet test 1 passed, 0 failed

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

1. **Respawn no-tables error**: `Respawner.CreateAsync()` throws `InvalidOperationException` when AppDbContext has no entities (empty schema). Fixed by wrapping in try-catch — Respawn is gracefully skipped when no tables exist. Will auto-activate when Story 1.3 adds first entity.

2. **Health check 503 ServiceUnavailable**: The NpgSql health check registered in `AddApplicationServices()` captures the `DefaultConnection` string at registration time. In tests, this is null because configuration isn't overridden before the app's service registration runs. Fixed by removing all `IConfigureOptions<HealthCheckServiceOptions>` registrations in the factory and re-adding `AddNpgSql` with the Testcontainers connection string.

3. **PostgreSqlBuilder obsolete warning**: `new PostgreSqlBuilder()` parameterless constructor is obsolete in Testcontainers 4.10.x. Fixed by using `new PostgreSqlBuilder("postgres:17")` constructor with image parameter.

### Senior Developer Review (AI)

**Reviewer**: Claude Sonnet 4.6 | **Date**: 2026-03-02 | **Outcome**: Approved (after fixes)

**12 issues found and fixed:**

| ID | Severity | File | Issue | Fix Applied |
|---|---|---|---|---|
| H1 | HIGH | SdaManagementWebApplicationFactory.cs:62 | `BuildServiceProvider()` creates undisposed second IServiceProvider (resource leak + ASP.NET anti-pattern) | Moved `EnsureCreatedAsync()` to `InitializeAsync()` using `Services.CreateScope()` |
| M1 | MEDIUM | SdaManagementWebApplicationFactory.cs:69 | `public new Task DisposeAsync()` hides base `ValueTask DisposeAsync()` — container cleanup skipped via `IAsyncDisposable` path | Changed to explicit `async Task IAsyncLifetime.DisposeAsync()` |
| M2 | MEDIUM | IntegrationTestBase.cs:52 | `DisposeAsync()` opens DB connection even when `_respawner` is null — wasteful on every teardown before Story 1.3 | Added `if (_respawner is null) return` guard |
| M3 | MEDIUM | IntegrationTestBase.cs | HttpClients never disposed in `DisposeAsync()` | Added `AnonymousClient.Dispose()` etc. to `DisposeAsync()` |
| M4 | MEDIUM | Story File List | `.claude/settings.local.json` modified in git but absent from File List | Added to File List |
| L1 | LOW | IntegrationTestBase.cs:43 | `catch (InvalidOperationException)` may swallow real connection errors | Replaced with explicit `information_schema.tables` count check |
| L2 | LOW | SdaManagementWebApplicationFactory.cs:70 | `StopAsync()` before `DisposeAsync()` on Testcontainers is redundant | Removed `StopAsync()` call |
| L3 | LOW | HealthCheckTests.cs:22 | `content.ShouldBe("Healthy")` brittle without `Trim()` | Changed to `content.Trim().ShouldBe("Healthy")` |
| L4 | LOW | TestAuthHandler.cs | Missing `ClaimTypes.Email` claim — Story 1.3 ICurrentUserContext will need it | Added `ClaimTypes.Email = test-{role}@test.local` |
| L5 | LOW | — | Inherited `[Collection]` (correct xUnit pattern — not changed) | No action — inherited attribute is idiomatic |
| L6 | LOW | SdaManagementWebApplicationFactory.cs:65 | Sync `EnsureCreated()` in async context | Fixed as part of H1 (now `EnsureCreatedAsync()`) |
| L7 | LOW | IntegrationTestBase.cs | No reseeding infrastructure (architecture requires "reseed test data") | Added `protected virtual Task SeedTestData()` hook |

**All ACs verified implemented. All tasks verified complete. `dotnet test` 1 passed, 0 failed.**

### Completion Notes List

- All 6 tasks completed successfully with all subtasks checked
- Respawn 7.0.0 installed (latest stable)
- TestAuthHandler reads `X-Test-Role` header, creates ClaimsPrincipal with NameIdentifier + Role claims
- SdaManagementWebApplicationFactory: Testcontainers PostgreSQL 17, DbContext override with snake_case naming, health check override, TestAuthHandler auth scheme, EnsureCreated for schema
- IntegrationTestBase: 4 pre-configured role clients, Respawn-based database reset per test method (with graceful handling when no tables exist), helper method stubs throwing NotImplementedException
- IntegrationTestCollection: separate [CollectionDefinition("Integration")] marker class per xUnit convention
- HealthCheckTests: smoke test `GET /health` returns 200 Healthy — proves full pipeline works
- `dotnet test` from solution root: 1 passed, 0 failed, 0 warnings, 0 errors
- No `src/` files were modified

### File List

**Created:**
- `tests/SdaManagement.Api.IntegrationTests/Auth/TestAuthHandler.cs`
- `tests/SdaManagement.Api.IntegrationTests/SdaManagementWebApplicationFactory.cs`
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs`
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestCollection.cs`
- `tests/SdaManagement.Api.IntegrationTests/HealthCheckTests.cs`

**Modified:**
- `tests/SdaManagement.Api.IntegrationTests/SdaManagement.Api.IntegrationTests.csproj` (added Respawn 7.0.0)
- `_bmad-output/implementation-artifacts/1-2-integration-test-infrastructure.md` (story file updates)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (status: ready-for-dev → in-progress → review → done)
- `.claude/settings.local.json` (IDE configuration updated during development)
