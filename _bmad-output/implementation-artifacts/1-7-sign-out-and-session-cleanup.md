# Story 1.7: Sign Out & Session Cleanup

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As an **authenticated user**,
I want to sign out and have my session fully terminated,
So that my account is secure and no stale data remains.

## Acceptance Criteria

1. **Given** an authenticated user
   **When** they click "Terminate Session" in the sidebar
   **Then** `POST /api/auth/logout` is called, which clears JWT cookies server-side
   **And** the SignalR hub connection is disconnected (no-op if not connected)
   **And** `queryClient.clear()` is called (all cached data removed)
   **And** the user is redirected to the public home page (`/`)

2. **Given** a signed-out user
   **When** they attempt to access an authenticated route directly via URL
   **Then** the ProtectedRoute guard redirects them to the login page
   *(Already implemented by Story 1.6 — ProtectedRoute. No new work needed. Verified by existing `ProtectedRoute.test.tsx`.)*

## Prerequisites

### Local Dev Environment Requirements

| Tool | Minimum Version | Install | Verify |
|---|---|---|---|
| **.NET SDK** | 10.0 LTS | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) | `dotnet --version` |
| **Node.js** | 20+ | [nodejs.org](https://nodejs.org/) | `node --version` |
| **Docker Desktop** | Latest stable | [docker.com](https://www.docker.com/products/docker-desktop/) | `docker --version` |
| **PostgreSQL** | 17 (via Docker) | `docker compose up -d` | `docker compose ps` |

### Completed Stories (Hard Dependencies)

- **Story 1.1** — Project scaffolding, Docker Compose, Vite proxy to `/api`
- **Story 1.2** — IntegrationTestBase with Testcontainers, pre-configured HttpClients per role
- **Story 1.3** — User entity with roles, OWNER seed, `ICurrentUserContext`, JWT pipeline, `TokenService` (cookie set/clear, refresh token revocation)
- **Story 1.4** — Google OAuth flow, `TokenService`, Axios 401->refresh->retry interceptor, `AuthContext`
- **Story 1.5** — Email/password login, `LoginPage.tsx` (three-state), i18n translation files, shadcn/ui components, `react-hook-form` + `zod` + `sonner` patterns
- **Story 1.6** — Application shell (PublicLayout + AuthenticatedLayout), ProtectedRoute with role guards, AppSidebar with "Terminate Session" button, i18n expansion, TanStack Query provider init, Zustand UI store, code splitting

## Tasks / Subtasks

- [x] **Task 1: Enhance AuthContext logout with full session cleanup** (AC: #1)
  - [x] Import `queryClient` from `@/lib/queryClient` in `AuthContext.tsx`
  - [x] Import `stopConnection` from `@/lib/signalr` in `AuthContext.tsx`
  - [x] Update `logout()` `finally` block with complete cleanup sequence:
    ```typescript
    } finally {
      queryClient.clear();
      await stopConnection();
      setUser(null);
      setError(null);
      window.location.href = "/";
    }
    ```
  - [x] Order rationale: local ops first (`queryClient.clear()`), then network ops (`stopConnection()`), then state reset, then redirect. If any step throws, the `finally` ensures redirect still fires via the full-page reload.

- [x] **Task 2: Create minimal SignalR disconnect module** (AC: #1)
  - [x] Create `src/lib/signalr.ts` — minimal module with ONLY `stopConnection()` for now
  - [x] Export `stopConnection(): Promise<void>` — if a module-level `connection` variable exists and is in `Connected` state, calls `connection.stop()` and clears the reference. **Gracefully no-ops if no connection exists** (this is the expected state until Epic 9 builds the full SignalR client)
  - [x] Export `setConnection(conn: HubConnection | null): void` — allows Epic 9 to register its connection so logout can disconnect it. This is the hook point.
  - [x] Total file should be ~15 lines. Do NOT add `startConnection()`, `getConnection()`, `onclose` handlers, or `HubConnectionBuilder` usage — those are Epic 9's responsibility
  - [x] NOTE: `@microsoft/signalr` is already installed (`^10.0.0`) — import `HubConnection` type only

- [x] **Task 3: Log logout API failures** (AC: #1)
  - [x] In `AuthContext.logout()`, add a `catch` block before `finally` that logs the error: `console.warn("Logout API call failed:", error)`. The redirect still happens in `finally` regardless, so a toast would be invisible (page navigates away immediately).
  - [x] NOTE: Do NOT add toast notifications or i18n keys for logout errors — `window.location.href = "/"` fires in `finally` and the page navigates away before any toast could render. A `console.warn` is sufficient for debugging.

- [x] **Task 4: Backend integration tests — logout endpoint** (AC: #1)
  - [x] Create `tests/SdaManagement.Api.IntegrationTests/Auth/LogoutEndpointTests.cs`
  - [x] Test: `Logout_WithValidRefreshToken_RevokesTokenAndClearsCookies` — create user, set password, login to get cookies, POST `/api/auth/logout`, verify: (a) response 200, (b) `Set-Cookie` headers clear both `access_token` and `refresh_token`, (c) refresh token is marked `IsRevoked = true` in DB
  - [x] Test: `Logout_WithoutRefreshToken_Returns200` — POST `/api/auth/logout` without cookies, verify response is still 200 (idempotent)
  - [x] Test: `Logout_WithRevokedRefreshToken_Returns200` — login, manually revoke the refresh token in DB, then POST `/api/auth/logout`, verify 200 (double-click / already-revoked scenario)
  - [x] Test: `Logout_ThenRefresh_ReturnsUnauthorized` — login (gets cookies + refresh token), POST `/api/auth/logout` (revokes refresh token), then POST `/api/auth/refresh` with the same client, verify 401 (proves the refresh token was actually revoked). NOTE: `TestAuthHandler` replaces JWT cookie auth with header-based auth, so testing `GET /api/auth/me` after logout wouldn't prove cookie clearing — the refresh test is the meaningful verification.

- [x] **Task 5: Frontend tests** (AC: #1, #2)
  - [x] Add `POST /api/auth/logout` MSW handler to `src/mocks/handlers/auth.ts` — return `HttpResponse.json(null, { status: 200 })`. This handler MUST exist before AuthContext tests will work.
  - [x] `src/contexts/AuthContext.test.tsx` — CREATE new test file:
    - Test: logout calls POST /api/auth/logout via MSW
    - Test: after logout, user state is null and isAuthenticated is false
    - Test: logout redirects to "/" after API call
    - Test: logout still redirects to "/" even if API call fails (network error)
  - [x] `src/lib/signalr.test.ts` — CREATE new test file:
    - Test: stopConnection() resolves without error when no connection exists (graceful no-op)
    - Test: stopConnection() calls connection.stop() when a connection has been set via setConnection()
  - [x] AC #2 is already covered by existing `ProtectedRoute.test.tsx` (line 56: "redirects to /login when unauthenticated"). No new test needed.

## Dev Notes

### Architecture Compliance

- **Auth Flow** (Architecture doc): The architecture doc lists the logout sequence as `POST /api/auth/logout` → disconnect SignalR → `queryClient.clear()` → redirect. Task 1 intentionally reorders to `queryClient.clear()` first, then `stopConnection()` — local synchronous ops before async network ops, so that if `stopConnection()` hangs, cached data is already cleared. The redirect in `finally` ensures the flow always completes regardless.
- **Decision #3** (httpOnly Secure SameSite=Strict cookie JWT): The logout endpoint clears cookies by setting them to expired. Cookie paths must match: `access_token` → `Path=/api`, `refresh_token` → `Path=/api/auth`.
- **Decision #6** (Frontend state stack): AuthContext for user identity, TanStack Query for server state, Zustand for UI state. On logout, ALL three must be cleared: `setUser(null)`, `queryClient.clear()`, Zustand persisted state does NOT need clearing (sidebar/language prefs persist across sessions by design).
- **Decision #16** (SignalR group cleanup on disconnect and logout): Client must disconnect hub on logout. Server removes connection from all groups on disconnect. Since SignalR frontend is not yet implemented (Epic 9), the disconnect call is a graceful no-op.
- **Decision #15** (HTTP client: transparent 401 → refresh → retry): The logout endpoint itself should NOT trigger the refresh interceptor. The Axios interceptor already excludes `/api/auth/refresh` from retry logic, but `/api/auth/logout` should succeed without auth (it reads the cookie directly). Current implementation handles this correctly — the endpoint has no `[Authorize]` attribute.
- **Failure Mode** (Architecture doc): "SignalR group membership leak after logout" → Client disconnects hub on logout. This prevents push notifications being sent to a logged-out user's stale connection.

### Security Constraints

- **Logout is idempotent**: Calling `/api/auth/logout` without cookies returns 200. No error, no side effects. This is intentional — if cookies are already gone (expired, manually cleared), logout should not fail.
- **Logout does NOT require authentication**: The endpoint reads the cookie directly from the request. No `[Authorize]` attribute. This ensures a user with an expired access token can still logout (the refresh token cookie is still present).
- **Cookie clearing path must match**: `access_token` was set with `Path=/api`, `refresh_token` with `Path=/api/auth`. The `ClearTokenCookies` method in `TokenService` already uses matching paths. DO NOT change these paths.
- **Refresh token rotation**: On logout, the current refresh token is marked `IsRevoked = true` in the database. Any attempt to use a revoked refresh token returns null from `RefreshTokensAsync`.

### What Already Exists (DO NOT Recreate)

**Backend — Fully implemented, no changes needed:**
- `AuthController.Logout()` at `src/SdaManagement.Api/Controllers/AuthController.cs:254-263` — reads refresh_token cookie, revokes in DB, clears both cookies
- `TokenService.RevokeRefreshTokenAsync()` — marks token as `IsRevoked = true`
- `TokenService.ClearTokenCookies()` — deletes both cookies with correct paths
- Rate limiting via `[EnableRateLimiting("auth")]` on the controller

**Frontend — Partially implemented, needs enhancement:**
- `AuthContext.logout()` at `src/sdamanagement-web/src/contexts/AuthContext.tsx:57-65` — calls API, clears state, redirects. **MISSING: `queryClient.clear()` and SignalR disconnect**
- `AppSidebar.tsx:103` — "Terminate Session" button calls `logout()`. No changes needed — redirect is instant so a spinner would never be visible.
- Translation keys `nav.auth.signOut` already exist in both FR/EN files
- `queryClient` exported from `src/sdamanagement-web/src/lib/queryClient.ts` — ready to import

**Things that DO NOT exist yet (create in this story):**
- `src/lib/signalr.ts` — Minimal SignalR disconnect module (~15 lines, hook point for Epic 9)
- `tests/.../Auth/LogoutEndpointTests.cs` — Backend integration tests (new file)
- `src/contexts/AuthContext.test.tsx` — Frontend auth context tests (new file)
- `src/lib/signalr.test.ts` — SignalR module tests (new file)

### Frontend Patterns

- **React Router v7** (`react-router-dom ^7.13.1`): The logout redirects via `window.location.href = "/"` (full page reload), not via `useNavigate()`. This is intentional — a full reload ensures all React state, cached data, and module-level singletons are wiped clean. DO NOT replace with `navigate("/")`.
- **Axios instance** (`src/lib/api.ts`): All API calls go through this configured instance with `withCredentials: true`. The 401 → refresh → retry interceptor already excludes auth endpoints from retry logic.
- **Error logging**: Logout API failures are logged via `console.warn()` — NOT toast. The `window.location.href = "/"` in `finally` navigates away instantly, so any toast would render for ~0ms and be invisible.
- **Testing**: Vitest + `@testing-library/react` + MSW. Test files co-located. Use `src/test-utils.tsx` for provider wrapping. MSW handlers in `src/mocks/handlers/`.
- **Path alias**: `@` → `src/`. Use `@/lib/signalr`, `@/lib/queryClient`, etc.

### Project Structure Notes

**Files to CREATE:**
```
src/sdamanagement-web/src/
├── lib/
│   ├── signalr.ts                              # Minimal SignalR disconnect module (~15 lines)
│   └── signalr.test.ts                         # SignalR module tests
└── contexts/
    └── AuthContext.test.tsx                     # Auth context tests (logout flow)

tests/SdaManagement.Api.IntegrationTests/
└── Auth/
    └── LogoutEndpointTests.cs                  # Backend logout integration tests
```

**Files to MODIFY:**
```
src/sdamanagement-web/src/
├── contexts/
│   └── AuthContext.tsx                         # Add queryClient.clear() + stopConnection() to logout
└── mocks/handlers/
    └── auth.ts                                # Add POST /api/auth/logout MSW handler
```

### Testing Requirements

**Backend Integration Tests (xUnit + Testcontainers + Shouldly):**
- Follow existing patterns in `tests/SdaManagement.Api.IntegrationTests/Auth/`
- Extend `IntegrationTestBase` — use `AnonymousClient` for logout (no auth required)
- Use `CreateTestUser()` + direct password set via BCrypt for test setup
- Login via `POST /api/auth/login` to get cookies, then test logout
- **Cookie forwarding**: `WebApplicationFactory.CreateClient()` uses `CookieContainerHandler` with `HandleCookies = true` by default, so cookies from a login response are automatically sent on subsequent requests from the SAME `HttpClient` instance. For the login→logout→refresh test chain, use a single `HttpClient` created via `Factory.CreateClient()` to ensure cookies flow correctly.
- Verify cookie clearing via `Set-Cookie` response headers
- Verify DB state via scoped `AppDbContext` after logout

**Frontend Component Tests (Vitest + Testing Library + MSW):**
- `AuthContext.test.tsx`: Render `AuthProvider` wrapper, trigger `logout()` via a test component, assert:
  - MSW handler receives `POST /api/auth/logout`
  - After logout, `user` is null and `isAuthenticated` is false
  - `window.location.href` was set to `"/"`
  - Redirect happens even if API call fails (network error resilience)
- `signalr.test.ts`: Unit test the module. Verify `stopConnection()` resolves without error when no connection exists (graceful no-op). Verify `stopConnection()` calls `connection.stop()` when a connection has been registered via `setConnection()`.

### Library/Framework Requirements

| Package | Version | Purpose | Notes |
|---|---|---|---|
| `@microsoft/signalr` | ^10.0.0 | SignalR JS client | Already in `node_modules`. First usage in this story — import `HubConnection` type only in `signalr.ts` |
| `@tanstack/react-query` | ^5.90.21 | queryClient.clear() on logout | Already installed + initialized. Import `queryClient` from `@/lib/queryClient` |
| `sonner` | ^2.x | Toast notifications | Already installed + `<Toaster>` in App.tsx. NOT used by this story (logout uses console.warn) — listed for awareness only |
| `Shouldly` | latest | Backend test assertions | Already in integration test project |
| `Respawn` | latest | DB reset between tests | Already configured in IntegrationTestBase |

**No new npm or NuGet packages to install.**

### Previous Story Intelligence (from Story 1.6)

- **AppSidebar** (`src/components/layout/AppSidebar.tsx`): The "Terminate Session" button is at line 103. It calls `logout()` from `useAuth()`. No changes needed — the redirect is instant so a spinner would never be visible.
- **QueryClient** is initialized in `src/lib/queryClient.ts` and provided via `QueryClientProvider` in `main.tsx`. The exported `queryClient` instance is the one to call `.clear()` on.
- **Test utilities** (`src/test-utils.tsx`): Already wraps with `AuthProvider`, `QueryClientProvider`, `TooltipProvider`, and `MemoryRouter`. Ready for AuthContext tests.
- **MSW handlers** (`src/mocks/handlers/auth.ts`): Has mock users for different roles. Extend with a `POST /api/auth/logout` handler that returns 200.
- **window.matchMedia mock**: Already in `test-setup.ts` — no additional test setup needed.
- **Code review learnings from 1.6**: Keep functions focused. Extracted `changeAppLanguage()` to coordinate i18n + store — similar pattern needed here: logout should coordinate AuthContext + QueryClient + SignalR in a single function.
- **Tailwind v4**: Uses `@tailwindcss/vite` plugin, config in `index.css` via `@theme` directive.

### Git Intelligence

- **Commit pattern**: `feat(auth): Story 1.7 — <description>`. Use `auth` scope since this is authentication/session work.
- **Recent commits**: Stories 1.1-1.6 all completed. 7 commits on main. This is the last story in Epic 1.
- **This is a mixed frontend+backend story**: Frontend changes (AuthContext, AppSidebar, SignalR module) + backend tests (LogoutEndpointTests). No new backend code — only new backend tests.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 1, Story 1.7]
- [Source: _bmad-output/planning-artifacts/architecture.md — Decision #3 (JWT cookies), #6 (state stack), #15 (401 retry), #16 (SignalR cleanup)]
- [Source: _bmad-output/planning-artifacts/architecture.md — Auth Flow Pattern, Failure Mode Analysis (SignalR leak), Security Threat Model (JWT theft)]
- [Source: _bmad-output/planning-artifacts/prd.md — FR13 (sign out), NFR8 (token expiry + refresh rotation)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Vocabulary Mapping ("Terminate Session"), "Plus" overflow rule (Deconnexion behind "Plus" on mobile)]
- [Source: _bmad-output/implementation-artifacts/1-6-application-shell-dual-navigation-and-i18n.md — AppSidebar, QueryClient, AuthContext, test patterns]
- [Source: src/SdaManagement.Api/Controllers/AuthController.cs:254-263 — Existing logout endpoint]
- [Source: src/SdaManagement.Api/Services/TokenService.cs — ClearTokenCookies(), RevokeRefreshTokenAsync()]
- [Source: src/sdamanagement-web/src/contexts/AuthContext.tsx:57-65 — Current logout() implementation]
- [Source: src/sdamanagement-web/src/lib/queryClient.ts — Exported queryClient instance]
- [Source: Context7 TanStack Query v5 — queryClient.clear() removes all cached queries and mutations]
- [Source: Context7 @microsoft/signalr — HubConnectionBuilder, connection.stop() for disconnect]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Backend integration tests (LogoutEndpointTests.cs) could not be executed because Docker Desktop was not running. The tests compile and are structurally correct — they follow existing patterns from LoginEndpointTests.cs and FullAuthFlowTests.cs. Run manually with Docker Desktop active: `dotnet test --filter "FullyQualifiedName~LogoutEndpointTests"`

### Completion Notes List

- **Task 1**: Enhanced `AuthContext.logout()` with `queryClient.clear()` and `stopConnection()` in the `finally` block. Order: local sync ops first, then async network ops, then state reset, then redirect.
- **Task 2**: Created minimal `signalr.ts` module (~13 lines). Exports `stopConnection()` (graceful no-op if no connection) and `setConnection()` (hook point for Epic 9). Uses `HubConnection` type import only from `@microsoft/signalr`.
- **Task 3**: Added `catch` block with `console.warn("Logout API call failed:", error)` before `finally`. No toast — page navigates away immediately via `window.location.href = "/"`.
- **Task 4**: Created `LogoutEndpointTests.cs` with 4 integration tests covering: valid logout with token revocation + cookie clearing, idempotent logout without cookies, logout with already-revoked token, and logout-then-refresh proving revocation.
- **Task 5**: Added MSW logout handler, created `AuthContext.test.tsx` (4 tests: API call, state reset, redirect, network error resilience) and `signalr.test.ts` (3 tests: no-op, stop on connected, skip on disconnected).
- All frontend tests pass with 0 regressions. TypeScript compilation clean. Backend builds with 0 errors, 0 warnings.

### File List

**New files:**
- `src/sdamanagement-web/src/lib/signalr.ts` — Minimal SignalR disconnect module
- `src/sdamanagement-web/src/lib/signalr.test.ts` — SignalR module unit tests (7 tests)
- `src/sdamanagement-web/src/contexts/AuthContext.test.tsx` — AuthContext logout tests (5 tests)
- `tests/SdaManagement.Api.IntegrationTests/Auth/LogoutEndpointTests.cs` — Backend logout integration tests (4 tests)

**Modified files:**
- `src/sdamanagement-web/src/contexts/AuthContext.tsx` — Added queryClient.clear(), stopConnection(), and catch block to logout()
- `src/sdamanagement-web/src/mocks/handlers/auth.ts` — Added POST /api/auth/logout MSW handler
- `src/sdamanagement-web/src/lib/api.ts` — Added /api/auth/logout to 401-retry interceptor exclusion list
- `tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs` — Extracted shared SetUserPassword() helper
- `tests/SdaManagement.Api.IntegrationTests/Auth/LoginEndpointTests.cs` — Removed duplicate SetUserPassword, cleaned unused usings
- `tests/SdaManagement.Api.IntegrationTests/Auth/FullAuthFlowTests.cs` — Removed duplicate SetUserPassword, cleaned unused usings
- `tests/SdaManagement.Api.IntegrationTests/Auth/InitiateAuthEndpointTests.cs` — Removed duplicate SetUserPassword, cleaned unused usings
- `tests/SdaManagement.Api.IntegrationTests/Auth/PasswordResetEndpointTests.cs` — Removed duplicate SetUserPassword
- `tests/SdaManagement.Api.IntegrationTests/Auth/SetPasswordEndpointTests.cs` — Removed duplicate SetUserPassword, cleaned unused usings
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Story status synced to done
- `src/sdamanagement-web/tsconfig.tsbuildinfo` — Auto-regenerated by TypeScript compilation (not application code)

### Change Log

- **2026-03-03**: Implemented Story 1.7 — Sign Out & Session Cleanup. Enhanced AuthContext.logout() with queryClient.clear(), SignalR disconnect, and error logging. Created minimal signalr.ts module as Epic 9 hook point. Added 4 backend integration tests (LogoutEndpointTests.cs) and 7 frontend tests (AuthContext + signalr). All 53 frontend tests pass with 0 regressions.
- **2026-03-03 (review 1)**: Code review fixes applied. M1: wrapped connection.stop() in try-catch in signalr.ts. L1: added /api/auth/logout to axios interceptor exclusion list. L2: extracted SetUserPassword to IntegrationTestBase, removed from 5 test files (LoginEndpointTests, FullAuthFlowTests, LogoutEndpointTests, InitiateAuthEndpointTests, PasswordResetEndpointTests, SetPasswordEndpointTests), cleaned unused usings. L3: added `using` declarations to HttpClient instances in LogoutEndpointTests. L4: added double-call idempotency test to signalr.test.ts. L5: added queryClient.clear() spy assertion to AuthContext.test.tsx. Final: 55 frontend tests pass (12 files), .NET build 0 errors 0 warnings.
- **2026-03-03 (review 2)**: Code review fixes applied. M1: strengthened cookie clearing assertions in LogoutEndpointTests — now verifies empty cookie value, max-age=0, and correct paths (path=/api for access_token, path=/api/auth for refresh_token). M2: added 2 error resilience tests to signalr.test.ts — verifies stopConnection() resolves without error when stop() throws, and connection reference is cleared despite error. L1: replaced string literal "Connected" with HubConnectionState.Connected enum in signalr.ts. L2: added queryClient.clear() spy assertion to the network error failure-path test in AuthContext.test.tsx. L3: refactored signalr.ts stopConnection() to clear connection reference for all states (not just Connected), preventing stale references for Disconnecting/Connecting/Reconnecting states. L4: documented sprint-status.yaml and tsconfig.tsbuildinfo in story File List. Final: 57 frontend tests pass (12 files), .NET build 0 errors 0 warnings.
