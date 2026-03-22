# Story 9.1: SignalR Hub & Connection Lifecycle

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user (any role)**,
I want a persistent real-time connection that automatically manages my group memberships based on my authentication status,
So that I receive live updates relevant to my role without any manual action.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–8.4 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments
- Users seeded per role: VIEWER, ADMIN (scoped to departments), OWNER (zero department assignments)
- All Epics 1–8 stories committed and passing
- `@microsoft/signalr` ^10.0.0 already in `package.json`

### Codebase State (Epic 8 Complete)

**Backend — SignalR infrastructure already scaffolded:**
- `ServiceCollectionExtensions.cs:38` — `services.AddSignalR()` already registered
- `Program.cs:74` — `app.MapHub<NotificationHub>("/hubs/notifications")` already in pipeline (step 8 of 9)
- `Hubs/NotificationHub.cs` — **empty stub** (just `public class NotificationHub : Hub {}`) — needs `OnConnectedAsync()` with group management
- JWT auth reads from `access_token` httpOnly cookie via `OnMessageReceived` event (`ServiceCollectionExtensions.cs:117`). Browser sends cookies during WebSocket handshake automatically. **No auth changes needed for SignalR.**
- `CurrentUserContextMiddleware` runs before hub endpoint in pipeline — but **do NOT rely on `ICurrentUserContext` in the hub** (see Critical Architecture Constraints). Use `Context.User` (ClaimsPrincipal) + `AppDbContext` instead

**Frontend — SignalR client partially scaffolded:**
- `lib/signalr.ts` — has `setConnection()` and `stopConnection()` helpers. **Missing:** `createConnection()`, `startConnection()`, reconnect policy
- `lib/signalr.test.ts` — 7 tests for stop/cleanup functions
- `AuthContext.tsx:68` — already calls `stopConnection()` on logout
- `@microsoft/signalr` ^10.0.0 installed in `package.json`
- `vite.config.ts:20-24` — `/hubs` proxy with `ws: true` already configured

**JWT Claims in Token (from `TokenService.cs:113-119`):**
- `sub` (userId as string)
- `email` (user email)
- `ClaimTypes.Email` (user email — duplicate for middleware compatibility)
- `ClaimTypes.Role` (role as uppercase string: "OWNER", "ADMIN", "VIEWER")
- `jti` (unique token ID)

**CurrentUserContextMiddleware flow (`Auth/CurrentUserContextMiddleware.cs`):**
1. Reads `ClaimTypes.Email` from `HttpContext.User`
2. Queries DB: `Users.Where(u => u.Email == emailClaim).Select(u => new { u.Id, u.Role, DepartmentIds })`
3. Calls `currentUserContext.Initialize(userId, role, departmentIds)`
4. For anonymous connections: middleware skips, `ICurrentUserContext` remains default (Anonymous, empty DepartmentIds)

## Acceptance Criteria

1. **Given** the backend
   **When** the SignalR hub is configured
   **Then** a single `/hubs/notifications` endpoint exists using `Microsoft.AspNetCore.SignalR`
   **And** the hub is push-only — no client-to-server methods are exposed (all mutations go through REST)
   **Note:** Epics file says `/hubs/activities` but architecture + existing code use `/hubs/notifications`. Code is authoritative.

2. **Given** an anonymous visitor connects
   **When** the connection is established
   **Then** the user is added to the "public" group only
   **And** they receive broadcasts for public-visibility activity changes

3. **Given** an authenticated user (VIEWER+) connects with a valid JWT cookie
   **When** the connection is established
   **Then** the user is added to "public" + "authenticated" groups
   **And** if the user has department assignments, they are also added to "dept:{departmentId}" groups for each assigned department

4. **Given** an OWNER connects
   **When** the connection is established
   **Then** the OWNER is added to "public" + "authenticated" + ALL "dept:{departmentId}" groups

5. **Given** a connected client loses connection
   **When** the SignalR transport detects disconnection
   **Then** automatic reconnection attempts using exponential backoff (1s, 2s, 4s, 8s, max 30s)
   **And** on successful reconnect, group memberships are re-established based on current auth state

6. **Given** the hub configuration
   **When** reviewing transport settings
   **Then** WebSocket is preferred, with SSE and long-polling as fallbacks
   **And** connection timeout is set appropriately for the expected client base

## Tasks / Subtasks

- [x] **Task 1: Backend — Implement `NotificationHub.OnConnectedAsync()` with group management** (AC: 1, 2, 3, 4)
  - [x] 1.1 Update `src/SdaManagement.Api/Hubs/NotificationHub.cs`:
    - Inject ONLY `AppDbContext` via constructor (primary constructor pattern). Do NOT inject `ICurrentUserContext` — SignalR hubs are transient and create a new DI scope per invocation, so the middleware-populated `ICurrentUserContext` is NOT available (the hub gets a fresh, unpopulated instance).
    - Override `OnConnectedAsync()`
    - Always add `Context.ConnectionId` to `"public"` group
    - Check `Context.User?.Identity?.IsAuthenticated == true` for auth state (ClaimsPrincipal is stored on the connection from the HTTP upgrade request — always reliable)
    - If authenticated: add to `"authenticated"` group, then read email from `Context.User.FindFirst(ClaimTypes.Email)?.Value` and query DB:
      ```csharp
      var userInfo = await dbContext.Users
          .Where(u => u.Email == email)
          .Select(u => new { u.Role, DeptIds = u.UserDepartments.Select(ud => ud.DepartmentId).ToList() })
          .FirstOrDefaultAsync();
      ```
    - If `userInfo.Role == UserRole.Owner`: query `dbContext.Departments.Select(d => d.Id).ToListAsync()` and add to ALL `"dept:{id}"` groups
    - Else if `userInfo.DeptIds.Count > 0`: add to `"dept:{id}"` for each assigned department
    - Call `await base.OnConnectedAsync()` last
    - Do NOT add `[Authorize]` attribute to the hub class — anonymous users must connect (AC 2)
    - Do NOT override `OnDisconnectedAsync()` — SignalR auto-removes connections from groups on disconnect
    - Do NOT add any client-callable methods — hub is push-only
  - [x] 1.2 Verify the hub remains at `/hubs/notifications` endpoint (already mapped in `Program.cs:74`)
  - [x] 1.3 Verify `services.AddSignalR()` is already registered (`ServiceCollectionExtensions.cs:38`)

- [x] **Task 2: Backend — Verify JWT cookie auth works for SignalR WebSocket handshake** (AC: 1, 3)
  - [x] 2.1 Confirm `OnMessageReceived` in `ServiceCollectionExtensions.cs:115-119` reads `access_token` cookie — this fires during the WebSocket upgrade HTTP request, so cookies are available. **No code changes expected.**
  - [x] 2.2 Confirm `CurrentUserContextMiddleware` in `Program.cs:65` runs before `MapHub` at line 74 — middleware populates `ICurrentUserContext` during the upgrade request. **No code changes expected.**
  - [x] 2.3 If any issue found during integration testing, the fix is in the JWT `OnMessageReceived` event (may need to check `context.HttpContext.Request.Path.StartsWithSegments("/hubs")` for query-string token fallback — but cookie-based auth should work without this).

- [x] **Task 3: Frontend — Expand `signalr.ts` with connection builder and reconnect policy** (AC: 5, 6)
  - [x] 3.1 Update `src/sdamanagement-web/src/lib/signalr.ts`:
    - Add `createConnection()`: builds `HubConnection` via `HubConnectionBuilder`
      - `.withUrl("/hubs/notifications")` — no token config needed (httpOnly cookies sent automatically)
      - `.withAutomaticReconnect(retryPolicy)` — custom `IRetryPolicy` implementing exponential backoff: `Math.min(1000 * 2^retryCount, 30000)` ms
      - `.configureLogging(LogLevel.Warning)` — suppress verbose transport logs
      - `.build()`
    - Add `startConnection()`: creates connection if null, starts if `Disconnected`
    - Fix `stopConnection()`: call `stop()` for any non-Disconnected state (not just Connected) to prevent connection leaks during Reconnecting/Connecting states. Capture reference before nulling to prevent race conditions.
    - Export `getConnection()` for event subscription in Story 9.2
    - Keep `setConnection()` export — existing `signalr.test.ts` (7 tests) imports it for mock injection
  - [x] 3.2 Transport preference: SignalR client defaults to WebSocket → SSE → long-polling negotiation. No explicit transport config needed. This satisfies AC 6.

- [x] **Task 4: Frontend — Create `useSignalR` hook for connection lifecycle** (AC: 5, 6)
  - [x] 4.1 Create `src/sdamanagement-web/src/hooks/useSignalR.ts`:
    - Import `startConnection`, `stopConnection` from `@/lib/signalr`
    - On mount: call `startConnection()`
    - On unmount: call `stopConnection()`
    - No dependency on auth state for start/stop — login causes page reload (Google OAuth redirect), logout calls `stopConnection()` in AuthContext then redirects. Connection naturally restarts on page load with current auth cookies.
  - [x] 4.2 Integrate hook in `App()` function body (`src/sdamanagement-web/src/App.tsx`) — call `useSignalR()` as the first line inside the `App` function, before the JSX return. The hook does NOT depend on `useAuth()` — it just manages the module-scoped connection. The server determines auth from the httpOnly cookie, not from React state. Placement:
    ```tsx
    function App() {
      useSignalR(); // Start SignalR connection on app mount
      return (
        <BrowserRouter>
          <AuthProvider>
            ...
    ```
  - [x] 4.3 Verify `AuthContext.tsx:68` still calls `stopConnection()` on logout — already confirmed.

- [x] **Task 5: Backend — Integration tests for hub connection lifecycle** (AC: 1, 2, 3, 4)
  - [x] 5.1 Add `Microsoft.AspNetCore.SignalR.Client` NuGet package to `tests/SdaManagement.Api.IntegrationTests/SdaManagement.Api.IntegrationTests.csproj`
  - [x] 5.2 Create `tests/SdaManagement.Api.IntegrationTests/SignalR/HubConnectionTests.cs`:
    - Use `IntegrationTestBase` (extends with `SdaManagementWebApplicationFactory`)
    - Helper method `CreateHubConnection(string? role = null)`:
      ```
      new HubConnectionBuilder()
        .WithUrl("http://localhost/hubs/notifications", options =>
        {
            options.HttpMessageHandlerFactory = _ => Factory.Server.CreateHandler();
            options.Transports = HttpTransportType.LongPolling; // TestServer doesn't support real WebSocket upgrade
            if (role != null) options.Headers.Add("X-Test-Role", role);
        })
        .Build();
      ```
    - `AnonymousConnect_Succeeds` — connect without role header → `connection.State.ShouldBe(HubConnectionState.Connected)` → stop → dispose
    - `ViewerConnect_Succeeds` — connect with role "Viewer" → connected → stop → dispose
    - `AdminConnect_Succeeds` — connect with role "Admin" → connected → stop → dispose
    - `OwnerConnect_Succeeds` — connect with role "Owner" → connected → stop → dispose
    - `Connect_ThenStop_Succeeds` — connect → stop → `connection.State.ShouldBe(HubConnectionState.Disconnected)` → dispose
    - **Important:** `HubConnection` implements `IAsyncDisposable`. Always call `await connection.DisposeAsync()` after stopping (or use `await using var connection = CreateHubConnection(...)`).
  - [x] 5.3 **Group membership verification** — Group membership is internal to SignalR and cannot be directly asserted in integration tests. Group correctness will be proven in Story 9.2 when broadcasts are sent to specific groups and clients verify receipt. For Story 9.1, connection lifecycle tests are sufficient.
  - [x] 5.4 Seed test data in `SeedTestData()` override — **CRITICAL: without these, all authenticated connections silently behave as anonymous** because the hub's DB query won't find users:
    ```csharp
    protected override async Task SeedTestData()
    {
        var owner = await CreateTestUser("test-owner@test.local", UserRole.Owner);
        var admin = await CreateTestUser("test-admin@test.local", UserRole.Admin);
        await CreateTestUser("test-viewer@test.local", UserRole.Viewer);
        // Create departments for OWNER all-dept-groups and ADMIN dept-scoping
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Departments.AddRange(
            new Department { Name = "JA", Abbreviation = "JA", Color = "#3B82F6", ... },
            new Department { Name = "MIFEM", Abbreviation = "MIFEM", Color = "#8B5CF6", ... });
        await db.SaveChangesAsync();
        // Assign admin to first department only
        await AssignDepartmentToUser(admin.Id, /* dept1Id */);
    }
    ```
    Email addresses MUST match `TestAuthHandler` pattern: `test-{role}@test.local`. The hub reads `ClaimTypes.Email` from `Context.User` and queries `Users.Where(u => u.Email == email)`.

- [x] **Task 6: Frontend — Expand `signalr.ts` tests and add `useSignalR` hook tests** (AC: 5, 6)
  - [x] 6.1 Update `src/sdamanagement-web/src/lib/signalr.test.ts`:
    - Mock `@microsoft/signalr` module (`HubConnectionBuilder`, `HubConnection`)
    - `createConnection returns a HubConnection with reconnect policy` — verify `withUrl`, `withAutomaticReconnect`, `configureLogging`, `build` called
    - `startConnection creates and starts connection when none exists` — verify `start()` called
    - `startConnection does not restart already-connected connection` — set state to Connected, verify `start()` not called
    - `startConnection swallows start errors` — mock `start()` rejection, verify no throw
    - Keep existing `stopConnection` tests (7 tests)
  - [x] 6.2 Create `src/sdamanagement-web/src/hooks/useSignalR.test.ts`:
    - Mock `@/lib/signalr` module
    - `starts connection on mount` — render hook, verify `startConnection()` called
    - `stops connection on unmount` — render + unmount, verify `stopConnection()` called
    - `does not restart connection on re-render` — render twice, verify `startConnection()` called once

- [x] **Task 7: Regression verification** (AC: all)
  - [x] 7.1 Run all backend integration tests: `dotnet test` in `tests/SdaManagement.Api.IntegrationTests/` — 432 passed
  - [x] 7.2 Run all frontend tests: `npm test` in `src/sdamanagement-web/` — 547 passed
  - [x] 7.3 Verify all existing tests still pass — zero regressions (also fixed pre-existing DayDetailDialog date-sensitive test failures)

## Dev Notes

### Critical Architecture Constraints

- **Push-only hub.** `NotificationHub` has ZERO client-callable methods. All mutations go through REST API. Services will inject `IHubContext<NotificationHub>` to broadcast (Story 9.2). The hub class itself only manages connection lifecycle via `OnConnectedAsync()`.
- **Group naming convention.** Three group levels per architecture (architecture.md, ADR #13):
  - `"public"` — all connections (anonymous + authenticated)
  - `"authenticated"` — VIEWER, ADMIN, OWNER only
  - `"dept:{departmentId}"` — department-scoped (e.g., `"dept:1"`, `"dept:3"`)
- **OWNER gets ALL department groups.** Query `dbContext.Departments.Select(d => d.Id)` in `OnConnectedAsync()`. Do NOT rely on user's `DepartmentIds` for OWNER — OWNER may have zero department assignments (proven in Story 8.4).
- **Do NOT inject `ICurrentUserContext` into the hub.** SignalR hubs are transient — each invocation (including `OnConnectedAsync`) creates a new hub instance in a **new DI scope**. The `CurrentUserContextMiddleware` populates `ICurrentUserContext` in the HTTP request scope, but the hub gets a fresh, unpopulated instance (default: `IsAuthenticated=false`, `Role=Anonymous`). Instead, use `Context.User` (the `ClaimsPrincipal` stored on the SignalR connection from the HTTP upgrade request — always reliable) and query `AppDbContext` for role/department data. The DB query mirrors what `CurrentUserContextMiddleware` does (`Users.Where(u => u.Email == emailClaim).Select(...)`).
- **httpOnly cookie auth works for SignalR.** The browser sends cookies during the WebSocket upgrade handshake (same-origin request). The `OnMessageReceived` event reads `access_token` cookie. No query-string token fallback needed for this app's auth model.
- **SignalR auto-removes from groups on disconnect.** Per ASP.NET Core docs: `RemoveFromGroupAsync` does not need to be called in `OnDisconnectedAsync()`, it's automatically handled. Do NOT override `OnDisconnectedAsync()` unless adding logging.
- **Reconnection re-establishes groups.** Each reconnect triggers a new WebSocket handshake → full middleware pipeline → new `OnConnectedAsync()` → fresh group membership. This is the correct behavior per AC 5.
- **SignalR broadcast debouncing** (architecture.md, ADR #18): coalesce within 500ms window. This is a Story 9.2 concern, not 9.1.

### Reuse Existing Components — Do NOT Reinvent

- **`NotificationHub.cs`** (`src/SdaManagement.Api/Hubs/NotificationHub.cs`): Existing empty stub. Expand in-place.
- **`signalr.ts`** (`src/sdamanagement-web/src/lib/signalr.ts`): Existing module with `setConnection()`/`stopConnection()`. Expand in-place. Do NOT create a new file. Keep `setConnection()` export — existing `signalr.test.ts` (7 tests) imports it for mock injection.
- **`signalr.test.ts`** (`src/sdamanagement-web/src/lib/signalr.test.ts`): Existing 7 tests. Add new tests to same file.
- **`AuthContext.tsx`** (`src/sdamanagement-web/src/contexts/AuthContext.tsx`): Already imports `stopConnection` and calls it on logout. Do NOT modify — the logout flow is correct.
- **`IntegrationTestBase`** (`tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs`): Use `Factory.Server.CreateHandler()` for SignalR test client. `TestAuthHandler` uses `X-Test-Role` header — pass this header in `HubConnectionBuilder.WithUrl()` options.
- **`AppDbContext`** (`src/SdaManagement.Api/Data/AppDbContext.cs`): Inject into hub for user lookup + OWNER's all-departments query. Use same query pattern as `CurrentUserContextMiddleware`: `Users.Where(u => u.Email == email).Select(u => new { u.Role, DeptIds = u.UserDepartments.Select(ud => ud.DepartmentId).ToList() })`.
- **`Context.User`** (hub's `ClaimsPrincipal`): Read `ClaimTypes.Email` to get user email for DB lookup. Read `ClaimTypes.Role` if needed. Do NOT use `ClaimTypes.NameIdentifier` — it contains `"test-owner-1"` in tests, not the DB userId.

### SignalR Client API Reference (@microsoft/signalr ^10.0.0)

```typescript
import { HubConnectionBuilder, LogLevel } from "@microsoft/signalr";
import type { HubConnection, IRetryPolicy, RetryContext } from "@microsoft/signalr";

const retryPolicy: IRetryPolicy = {
  nextRetryDelayInMilliseconds(retryContext: RetryContext): number | null {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
    return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
  },
};

const connection: HubConnection = new HubConnectionBuilder()
  .withUrl("/hubs/notifications")
  .withAutomaticReconnect(retryPolicy)
  .configureLogging(LogLevel.Warning)
  .build();

// Lifecycle callbacks (for logging/debugging, not required for AC):
connection.onreconnecting((error) => console.warn("SignalR reconnecting...", error));
connection.onreconnected((connectionId) => console.log("SignalR reconnected:", connectionId));
connection.onclose((error) => console.warn("SignalR closed:", error));

await connection.start();
```

### Test Design: SignalR Integration Tests

The `HubConnectionTests` class uses `Factory.Server.CreateHandler()` to get the in-memory HTTP handler from `WebApplicationFactory`. This handler processes the SignalR negotiate and long-polling requests without real network I/O.

**Important:** Use `HttpTransportType.LongPolling` in tests — the `TestServer` HTTP handler doesn't support real WebSocket upgrade. Long-polling works entirely over HTTP, which the handler supports.

**Test auth:** The `TestAuthHandler` authenticates via `X-Test-Role` header. Pass this header in `HubConnectionBuilder.WithUrl()` options: `options.Headers.Add("X-Test-Role", "Owner")`. Omit the header for anonymous connections.

**Requires `Microsoft.AspNetCore.SignalR.Client` NuGet package** — add to test project `.csproj`.

### Previous Story Intelligence (8.4)

Key learnings from Story 8.4:
- OWNER has zero department assignments in test setup. Guard assertion in `OwnerFullDepartmentAccessTests` verifies this.
- `CanManage(departmentId)` returns `true` for OWNER immediately — same bypass pattern applies to hub group assignment (OWNER gets all department groups regardless of assignment).
- All 427 backend integration tests + 539 frontend tests pass as of Story 8.4.
- `aria-label` attributes added to buttons for test specificity — follow this pattern if adding any test-facing markup.

### Git Intelligence

Recent commit pattern: `feat(scope): Story X.Y — description`
Last commit: `2c7a90a feat(departments): Stories 8.2–8.3 — Meeting management and sub-ministry lead assignment`
Expected commit for this story: `feat(realtime): Story 9.1 — SignalR hub and connection lifecycle`

### Project Structure Notes

**New files:**
- `src/sdamanagement-web/src/hooks/useSignalR.ts` — connection lifecycle hook
- `src/sdamanagement-web/src/hooks/useSignalR.test.ts` — hook tests
- `tests/SdaManagement.Api.IntegrationTests/SignalR/HubConnectionTests.cs` — hub connection integration tests

**Modified files:**
- `src/SdaManagement.Api/Hubs/NotificationHub.cs` — add `OnConnectedAsync()` with group management
- `src/sdamanagement-web/src/lib/signalr.ts` — add `createConnection()`, `startConnection()`, `getConnection()`
- `src/sdamanagement-web/src/lib/signalr.test.ts` — add connection builder tests
- `src/sdamanagement-web/src/App.tsx` — add `useSignalR()` call in `App()` function body
- `tests/SdaManagement.Api.IntegrationTests/SdaManagement.Api.IntegrationTests.csproj` — add `Microsoft.AspNetCore.SignalR.Client` package

**No migrations** — no data model changes.
**No i18n changes** — no new UI strings.

### Anti-Patterns to Avoid

- Do NOT add `[Authorize]` attribute to `NotificationHub` — anonymous users must connect (AC 2). Most SignalR tutorials add it; this hub deliberately omits it.
- Do NOT inject `ICurrentUserContext` into the hub — it will be a fresh, unpopulated instance due to SignalR's per-invocation DI scope. Use `Context.User` + `AppDbContext` query instead.
- Do NOT add client-callable methods to `NotificationHub` — it is push-only. Services broadcast via `IHubContext<NotificationHub>`.
- Do NOT pass JWT as query string parameter — our app uses httpOnly cookies which are sent automatically during WebSocket handshake. The query-string pattern is for apps using bearer tokens in headers.
- Do NOT use `setConnection()` for new connections — use the new `createConnection()` which includes reconnect policy. `setConnection()` exists for legacy/test compatibility.
- Do NOT override `OnDisconnectedAsync()` to remove groups — SignalR does this automatically.
- Do NOT filter departments in the frontend for group management — group assignment is entirely server-side in `OnConnectedAsync()`.
- Do NOT create a separate auth flow for SignalR — the existing JWT cookie middleware already works for WebSocket upgrade requests.
- Do NOT add event subscriptions or TanStack Query invalidation — that is Story 9.2.
- Do NOT create Zustand stores for connection state — keep it in the `signalr.ts` module scope. Story 9.3 will use Zustand for badge state only.
- Do NOT use `WebSocket` transport explicitly — let SignalR negotiate the best transport (WebSocket → SSE → long-polling).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9, Story 9.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR26 — real-time updates]
- [Source: _bmad-output/planning-artifacts/prd.md#NFR4 — real-time latency < 1s]
- [Source: _bmad-output/planning-artifacts/architecture.md#SignalR Hub Convention]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns — SignalR Event Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 7 — Mutations via HTTP, notifications via SignalR]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 13 — SignalR scoped groups]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 16 — SignalR group cleanup on disconnect/logout]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 18 — SignalR broadcast debouncing (Story 9.2)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Middleware Pipeline Order — step 8]
- [Source: src/SdaManagement.Api/Hubs/NotificationHub.cs — current empty stub]
- [Source: src/SdaManagement.Api/Auth/CurrentUserContextMiddleware.cs — populates ICurrentUserContext]
- [Source: src/SdaManagement.Api/Auth/AuthorizationService.cs — CanManage() OWNER bypass pattern]
- [Source: src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs:38 — AddSignalR()]
- [Source: src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs:115-119 — JWT OnMessageReceived cookie]
- [Source: src/SdaManagement.Api/Program.cs:74 — MapHub]
- [Source: src/sdamanagement-web/src/lib/signalr.ts — existing stop/set helpers]
- [Source: src/sdamanagement-web/src/contexts/AuthContext.tsx:68 — stopConnection on logout]
- [Source: src/sdamanagement-web/vite.config.ts:20-24 — /hubs proxy with ws:true]
- [Source: src/sdamanagement-web/package.json:15 — @microsoft/signalr ^10.0.0]
- [Source: _bmad-output/implementation-artifacts/8-4-owner-full-department-access.md — OWNER zero-assignment pattern]
- [Context7: ASP.NET Core SignalR — OnConnectedAsync/OnDisconnectedAsync group lifecycle]
- [Context7: @microsoft/signalr — HubConnectionBuilder, withAutomaticReconnect]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- DayDetailDialog.test.tsx had 4 pre-existing failures due to date-sensitive test data (date 2026-03-21 became past on 2026-03-22). Fixed by shifting test dates to 2027-03-20/21. Also added missing `authHandlers` to MSW server setup.

### Completion Notes List

- Task 1: Implemented `NotificationHub.OnConnectedAsync()` with group management. Uses primary constructor injection of `AppDbContext`. Adds all connections to "public" group, authenticated connections to "authenticated" group, and role-based department groups ("dept:{id}"). OWNER gets ALL department groups via separate DB query. Uses `Context.User` (ClaimsPrincipal) for auth state — does NOT inject `ICurrentUserContext`.
- Task 2: Verified JWT cookie auth pipeline — `OnMessageReceived` reads `access_token` cookie, `CurrentUserContextMiddleware` runs before `MapHub`. No code changes needed.
- Task 3: Expanded `signalr.ts` with `createConnection()` (HubConnectionBuilder + exponential backoff retry policy capped at 30s + `.withServerTimeout(60_000)` + `.withKeepAliveInterval(30_000)`), `startConnection()`, and `getConnection()`. Fixed `stopConnection()` to stop connections in any non-Disconnected state (was only stopping Connected — leaked Reconnecting/Connecting connections). Transport negotiation uses SignalR defaults (WebSocket → SSE → long-polling).
- Task 4: Created `useSignalR` hook (mount → `void startConnection()`, unmount → `void stopConnection()`) and integrated as first line in `App()`. No auth dependency — server determines auth from httpOnly cookie. `void` operator prevents floating-promise lint warnings.
- Task 5: Created 5 integration tests (Anonymous/Viewer/Admin/Owner connect + connect-then-stop lifecycle). Uses `Factory.Server.CreateHandler()` with LongPolling transport and `TestAuthHandler` role headers. Test data seeds 3 users + 2 departments with admin scoped to 1 department.
- Task 6: Added 5 new signalr.ts tests (startConnection create/start, no-restart connected, swallow errors, getConnection null/set) + 3 useSignalR hook tests (mount start, unmount stop, no re-render restart). Total: 12 signalr + 3 hook = 15 new frontend tests.
- Task 7: Full regression pass — 432 backend + 547 frontend = 979 total tests passing. Also fixed 4 pre-existing DayDetailDialog test failures (date-sensitive data + missing auth MSW handlers).

**Code Review Fixes (2026-03-22):**
- [H1] Added `createConnection` test with mocked `HubConnectionBuilder` — verifies `.withUrl`, `.withAutomaticReconnect`, `.withServerTimeout`, `.withKeepAliveInterval`, `.configureLogging`, `.build` chain. Added retry policy exponential backoff verification test.
- [M1] Fixed `stopConnection()` — now calls `stop()` for any non-Disconnected state (Connecting, Connected, Reconnecting, Disconnecting). Captures reference before nulling to prevent race conditions. Previously only stopped Connected connections, leaking Reconnecting/Connecting connections.
- [M2] Fixed by M1 — StrictMode double-mount no longer orphans Connecting connections.
- [L1] Added `.withServerTimeout(60_000)` and `.withKeepAliveInterval(30_000)` to `createConnection()` for AC 6 timeout compliance.
- [L2] Removed unused `_dept2Id` field from `HubConnectionTests.cs`.
- [L3] Added `void` operator to floating async calls in `useSignalR` hook.
- Updated `stopConnection` tests: replaced old "does not call stop for Disconnecting" test with new tests covering Reconnecting, Connecting, and Disconnecting states (all now correctly call stop).
- Renamed misleading test "creates and starts connection when none exists" → "starts a disconnected connection".
- Post-review regression: 551 frontend tests pass (4 new tests net), backend builds clean (Docker not available for integration test run).

### File List

**New files:**
- src/sdamanagement-web/src/hooks/useSignalR.ts
- src/sdamanagement-web/src/hooks/useSignalR.test.ts
- tests/SdaManagement.Api.IntegrationTests/SignalR/HubConnectionTests.cs

**Modified files:**
- src/SdaManagement.Api/Hubs/NotificationHub.cs — added OnConnectedAsync() with group management
- src/sdamanagement-web/src/lib/signalr.ts — added createConnection(), startConnection(), getConnection()
- src/sdamanagement-web/src/lib/signalr.test.ts — added 5 tests for new functions
- src/sdamanagement-web/src/App.tsx — added useSignalR() hook call
- tests/SdaManagement.Api.IntegrationTests/SdaManagement.Api.IntegrationTests.csproj — added Microsoft.AspNetCore.SignalR.Client package
- src/sdamanagement-web/src/components/calendar/DayDetailDialog.test.tsx — fixed date-sensitive tests + added missing authHandlers
- _bmad-output/implementation-artifacts/sprint-status.yaml — story status updates

### Change Log

- 2026-03-22: Story 9.1 implementation complete — SignalR NotificationHub with group-based connection lifecycle (backend), connection builder with exponential backoff reconnect (frontend), useSignalR hook integrated in App, 5 backend integration tests + 15 frontend tests added. Fixed 4 pre-existing DayDetailDialog test failures.
- 2026-03-22: Code review fixes — Fixed stopConnection() connection leak (M1/M2), added createConnection builder chain test + retry policy test (H1), added server timeout 60s + keep-alive 30s (L1), removed dead _dept2Id field (L2), added void annotations for floating promises (L3). 551 frontend tests pass.
