# Story 9.2: Real-Time Activity Update Broadcasting

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user (any role)**,
I want to see activity changes reflected in real-time across my dashboard, calendar, and department views without refreshing,
So that I always see the latest schedule without manual page reloads.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1–9.1 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments
- Users seeded per role: VIEWER, ADMIN (scoped to departments), OWNER (zero department assignments)
- All Epics 1–9.1 stories committed and passing
- `@microsoft/signalr` ^10.0.0 already in `package.json`

### Codebase State (Story 9.1 Complete)

**Backend — SignalR hub with group management:**
- `Hubs/NotificationHub.cs` — `OnConnectedAsync()` with group management: "public", "authenticated", "dept:{id}" groups. Uses primary constructor `AppDbContext` injection + `Context.User` (ClaimsPrincipal). OWNER gets ALL department groups via separate DB query.
- `Extensions/ServiceCollectionExtensions.cs:38` — `services.AddSignalR()` registered
- `Program.cs:74` — `app.MapHub<NotificationHub>("/hubs/notifications")` in pipeline (step 8 of 9)
- JWT auth reads from `access_token` httpOnly cookie via `OnMessageReceived` event (`ServiceCollectionExtensions.cs:117`). Browser sends cookies during WebSocket handshake automatically.

**Backend — Activity CRUD (no broadcasting yet):**
- `Services/ActivityService.cs` — `CreateAsync()` (line ~95), `UpdateAsync()` (line ~190), `DeleteAsync()` (line ~327). Returns `ActivityResponse` for create/update. All mutations are single `SaveChangesAsync()` transactions.
- `Controllers/ActivitiesController.cs` — REST API: POST `/api/activities`, PUT `/api/activities/{id}`, DELETE `/api/activities/{id}`
- `Dtos/Activity/ActivityResponse.cs` — Full activity DTO with roles/assignments, `ConcurrencyToken` (uint), `Visibility` (string: "Public"/"Authenticated"), `DepartmentId` (int?)
- `Dtos/Public/PublicActivityListItem.cs` — Public-safe DTO (no roles, no assignments, no ZoomLink, no internal data)

**Frontend — SignalR connection established:**
- `lib/signalr.ts` — `createConnection()`, `startConnection()`, `stopConnection()`, `getConnection()` exported. Module-scoped `connection` variable.
- `hooks/useSignalR.ts` — `useSignalR()` hook called in `App.tsx:38`. Mount → `startConnection()`, unmount → `stopConnection()`.
- `contexts/AuthContext.tsx:68` — calls `stopConnection()` on logout
- `lib/queryClient.ts` — `QueryClient` with 5-min staleTime, exported as `queryClient`

**Frontend — No `.on()` event handlers registered yet. No SignalR→QueryClient invalidation wiring yet.**

**JWT Claims in Token (from `TokenService.cs:113-119`):**
- `sub` (userId as string), `email`, `ClaimTypes.Email`, `ClaimTypes.Role` ("OWNER", "ADMIN", "VIEWER"), `jti`

## Acceptance Criteria

1. **Given** an ADMIN saves a new public activity via the REST API
   **When** the save completes successfully
   **Then** the server broadcasts an "ActivityCreated" event to the "public" group with: activityId, title, date, department
   **And** all connected clients in the "public" group receive the event
   **And** TanStack Query cache is invalidated for the relevant query keys (activities list, calendar, dashboard)

2. **Given** an ADMIN updates an authenticated-only activity
   **When** the save completes
   **Then** an "ActivityUpdated" event is broadcast to the "authenticated" group (not "public")
   **And** the event payload includes: activityId, updatedFields summary, concurrency token

3. **Given** an ADMIN updates role assignments for a MIFEM activity
   **When** the save completes
   **Then** an "ActivityUpdated" event is broadcast to "dept:mifem" group
   **And** users viewing that department's pipeline see the roster update in real-time

4. **Given** an activity is deleted
   **When** the delete completes
   **Then** an "ActivityDeleted" event is broadcast to the appropriate group(s)
   **And** the activity is removed from all connected clients' views without refresh

5. **Given** the frontend receives any SignalR event
   **When** the event handler fires
   **Then** the appropriate TanStack Query keys are invalidated (triggering background refetch)
   **And** no full page reload occurs — only affected components re-render

## Tasks / Subtasks

- [x] **Task 1: Backend — Create `IActivityNotificationService` and implementation** (AC: 1, 2, 3, 4)
  - [x] 1.1 Create `src/SdaManagement.Api/Services/IActivityNotificationService.cs`:
    - `Task NotifyActivityCreatedAsync(ActivityResponse activity)`
    - `Task NotifyActivityUpdatedAsync(ActivityResponse activity, string updatedFields)`
    - `Task NotifyActivityDeletedAsync(int activityId, int? departmentId, string visibility)`
  - [x] 1.2 Create `src/SdaManagement.Api/Services/ActivityNotificationService.cs`:
    - Inject `IHubContext<NotificationHub>` via primary constructor
    - **Group routing logic** (determines which group(s) to broadcast to):
      - If `activity.Visibility == "Public"` → broadcast to `"public"` group (all users see it)
      - If `activity.Visibility == "Authenticated"` AND `activity.DepartmentId.HasValue` → broadcast to `"dept:{departmentId}"` group (department-scoped)
      - If `activity.Visibility == "Authenticated"` AND `activity.DepartmentId == null` → broadcast to `"authenticated"` group (all logged-in users)
    - **Event names** (PascalCase per architecture): `"ActivityCreated"`, `"ActivityUpdated"`, `"ActivityDeleted"`
    - **Payload for Created/Updated:** lightweight notification DTO (NOT full `ActivityResponse`): `{ ActivityId, Title, Date, DepartmentId, Visibility, ConcurrencyToken, Timestamp, UpdatedFields? }`
    - `UpdatedFields` is null for Created events, populated for Updated events (e.g. `"title,visibility"` or `"roles"` — comma-separated changed field categories)
    - **Payload for Deleted:** `{ ActivityId, DepartmentId, Visibility, Timestamp }`
    - Use `hubContext.Clients.Group(groupName).SendAsync(eventName, payload)` pattern
  - [x] 1.3 Register `IActivityNotificationService` as scoped in `ServiceCollectionExtensions.cs`
  - [x] 1.4 Add a code comment in `ActivityNotificationService.cs` explaining the intentional deviation from architecture.md's "payload is full read DTO" guidance — lightweight signal DTOs prevent data leakage (the "public" group must never receive roles, assignments, or ZoomLinks via SignalR) and keep payloads small. See Dev Notes code pattern for exact comment text.

- [x] **Task 2: Backend — Create notification DTO** (AC: 1, 2)
  - [x] 2.1 Create `src/SdaManagement.Api/Dtos/Notifications/ActivityNotification.cs`:
    ```csharp
    public record ActivityNotification(
        int ActivityId,
        string Title,
        DateOnly Date,
        int? DepartmentId,
        string Visibility,
        uint ConcurrencyToken,
        DateTime Timestamp,
        string? UpdatedFields = null);
    ```
    - `UpdatedFields`: null for Created events. For Updated events, a comma-separated summary of changed field categories (e.g. `"title,visibility"`, `"roles"`, `"date,department"`). Satisfies AC2 "updatedFields summary" requirement. Story 9.3 will use this to show the "Modifie" badge only for updates.
  - [x] 2.2 Create `src/SdaManagement.Api/Dtos/Notifications/ActivityDeletedNotification.cs`:
    ```csharp
    public record ActivityDeletedNotification(
        int ActivityId,
        int? DepartmentId,
        string Visibility,
        DateTime Timestamp);
    ```

- [x] **Task 3: Backend — Integrate notifications into ActivityService** (AC: 1, 2, 3, 4)
  - [x] 3.1 Add `IActivityNotificationService` to `ActivityService` constructor injection
  - [x] 3.2 In `CreateAsync()`: after `await dbContext.SaveChangesAsync()` and after re-fetching the `ActivityResponse`, call `await notificationService.NotifyActivityCreatedAsync(activity)`
  - [x] 3.3 In `UpdateAsync()`: after `await dbContext.SaveChangesAsync()` and after re-fetching the `ActivityResponse`, call `await notificationService.NotifyActivityUpdatedAsync(activity, updatedFields)`. To compute `updatedFields`:
    - Before applying changes, snapshot the relevant fields from the loaded entity: `title`, `date`, `startTime`, `endTime`, `departmentId`, `visibility`, `description`
    - After applying changes (but before SaveChanges), compare snapshots to detect changed categories:
      - `"title"` if Title changed, `"date"` if Date/StartTime/EndTime changed, `"department"` if DepartmentId changed, `"visibility"` if Visibility changed, `"description"` if Description changed
    - Role/assignment changes: if `request.Roles` is provided (non-null), include `"roles"` (role reconciliation always runs when Roles array is present)
    - Join changed categories with commas: e.g. `"title,date"` or `"roles"`
    - Pass as string to `NotifyActivityUpdatedAsync(activity, updatedFields)`
  - [x] 3.4 In `DeleteAsync()`: `FindAsync(id)` already loads the full Activity entity. Before `dbContext.Activities.Remove()`, capture `activity.DepartmentId` and `activity.Visibility.ToString()`. The `ActivityVisibility` enum (`Public = 0`, `Authenticated = 1`) produces `"Public"` or `"Authenticated"` from `.ToString()` — matching the string format used in `ActivityResponse.Visibility` and the notification service's `ResolveGroup()` comparisons. After `await dbContext.SaveChangesAsync()`, call `await notificationService.NotifyActivityDeletedAsync(activityId, departmentId, visibility)`
  - [x] 3.5 **Error isolation:** Wrap notification calls in try-catch. A SignalR broadcast failure must NOT fail the REST API response. Log warning and continue. The HTTP mutation is the primary operation.

- [x] **Task 4: Frontend — Create SignalR event types** (AC: 5)
  - [x] 4.1 Create `src/sdamanagement-web/src/types/signalr-events.ts`:
    ```typescript
    export interface ActivityNotification {
      activityId: number;
      title: string;
      date: string;
      departmentId: number | null;
      visibility: string;
      concurrencyToken: number;
      timestamp: string;
      updatedFields: string | null;  // null for Created, comma-separated for Updated (e.g. "title,roles")
    }

    export interface ActivityDeletedNotification {
      activityId: number;
      departmentId: number | null;
      visibility: string;
      timestamp: string;
    }
    ```

- [x] **Task 5: Frontend — Create `useActivityEvents` hook for SignalR event handling** (AC: 5)
  - [x] 5.1 Create `src/sdamanagement-web/src/hooks/useActivityEvents.ts` — complete reference implementation:
    ```typescript
    import { useEffect } from "react";
    import { getConnection } from "@/lib/signalr";
    import { queryClient } from "@/lib/queryClient";
    import type { ActivityNotification, ActivityDeletedNotification } from "@/types/signalr-events";

    const ACTIVITY_EVENTS = ["ActivityCreated", "ActivityUpdated", "ActivityDeleted"] as const;

    function invalidateActivityQueries(): void {
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
      void queryClient.invalidateQueries({ queryKey: ["auth", "calendar"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "calendar"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "next-activity"] });
      void queryClient.invalidateQueries({ queryKey: ["public", "upcoming-activities"] });
      void queryClient.invalidateQueries({ queryKey: ["departments", "with-staffing"] });
    }

    function handleActivityEvent(_payload: ActivityNotification | ActivityDeletedNotification): void {
      invalidateActivityQueries();
    }

    function registerHandlers(): void {
      const conn = getConnection();
      if (!conn) return;
      for (const event of ACTIVITY_EVENTS) {
        conn.off(event);  // Remove any existing handlers to prevent duplicates
        conn.on(event, handleActivityEvent);
      }
    }

    export function useActivityEvents(): void {
      useEffect(() => {
        // Attempt immediate registration (connection may already be connected)
        registerHandlers();

        // KEY: SignalR .on() can be called BEFORE .start() completes —
        // handlers are queued on the HubConnection object and fire once connected.
        // But if getConnection() returns null (connection not yet created by startConnection()),
        // we need a fallback. Poll briefly for the connection to become available.
        const intervalId = setInterval(() => {
          if (getConnection()) {
            registerHandlers();
            clearInterval(intervalId);
          }
        }, 100);

        // Also re-register on reconnect as a safety net
        const conn = getConnection();
        const onReconnected = () => registerHandlers();
        conn?.onreconnected(onReconnected);

        return () => {
          clearInterval(intervalId);
          const c = getConnection();
          if (c) {
            for (const event of ACTIVITY_EVENTS) {
              c.off(event, handleActivityEvent);
            }
          }
        };
      }, []);
    }
    ```
    **Timing explanation:** `useSignalR()` calls `void startConnection()` which calls `createConnection()` (sync — creates the HubConnection object) then `.start()` (async — initiates WebSocket handshake). By the time `useActivityEvents()` mounts in the same render cycle, `getConnection()` typically returns the already-created (but possibly not yet connected) HubConnection. `.on()` handlers registered before `.start()` completes are valid — they queue on the connection object. The `setInterval` fallback handles the rare case where `createConnection()` hasn't been called yet (e.g., StrictMode double-mount cleanup race).

- [x] **Task 6: Frontend — Integrate `useActivityEvents` into App** (AC: 5)
  - [x] 6.1 In `src/sdamanagement-web/src/App.tsx`:
    - Import and call `useActivityEvents()` after `useSignalR()` — connection must be established before event handlers register
    - Placement: second line in `App()` function body, after `useSignalR()`

- [x] **Task 7: Backend — Integration tests for broadcasting** (AC: 1, 2, 3, 4)
  - [x] 7.1 Create `tests/SdaManagement.Api.IntegrationTests/SignalR/ActivityBroadcastTests.cs`:
    - Extend `IntegrationTestBase`
    - Seed test data: users (Owner, Admin with dept, Viewer), departments (2+), at least 1 activity
    - Helper: `CreateHubConnection(string? role = null)` — same pattern as `HubConnectionTests.cs`
    - **Test: PublicActivityCreated_BroadcastsToPublicGroup** — Connect anonymous client, create public activity via REST, verify client receives `"ActivityCreated"` event with correct payload
    - **Test: AuthenticatedActivityCreated_BroadcastsToAuthenticatedGroup** — Connect Viewer client, create authenticated activity, verify Viewer receives event. Connect anonymous client, verify anonymous does NOT receive event.
    - **Test: DepartmentActivityUpdated_BroadcastsToDeptGroup** — Connect Admin (dept1), connect Viewer (no dept), update activity in dept1, verify Admin receives `"ActivityUpdated"`, Viewer does NOT (unless Viewer is in dept1 group — depends on group assignment)
    - **Test: ActivityDeleted_BroadcastsToCorrectGroup** — Delete public activity, verify public group receives `"ActivityDeleted"`
    - **Test: BroadcastFailure_DoesNotFailRestResponse** — Mock/simulate hub error, verify REST API still returns 200/201
    - **Important:** Use `connection.On<ActivityNotification>("ActivityCreated", handler)` to register listeners BEFORE triggering mutations. Use `TaskCompletionSource` with timeout for async assertion.
  - [x] 7.2 Seed test data in `SeedTestData()`:
    - Create users matching `TestAuthHandler` pattern (`test-owner@test.local`, `test-admin@test.local`, `test-viewer@test.local`)
    - Create departments (2) and assign admin to dept1
    - Create at least 1 activity (public, in dept1) for update/delete tests

- [x] **Task 8: Frontend — Unit tests for `useActivityEvents` hook** (AC: 5)
  - [x] 8.1 Create `src/sdamanagement-web/src/hooks/useActivityEvents.test.ts`:
    - Mock `@/lib/signalr` module (getConnection)
    - Mock `@/lib/queryClient` module (queryClient.invalidateQueries)
    - **Test: registers event handlers on mount** — verify `.on()` called for `"ActivityCreated"`, `"ActivityUpdated"`, `"ActivityDeleted"`
    - **Test: unregisters event handlers on unmount** — verify `.off()` called for all three events
    - **Test: ActivityCreated handler invalidates correct queries** — trigger handler callback, verify `invalidateQueries` called with correct keys
    - **Test: ActivityUpdated handler invalidates correct queries** — same verification
    - **Test: ActivityDeleted handler invalidates correct queries** — same verification
    - **Test: handles null connection gracefully** — mock `getConnection()` returning null, verify no error thrown

- [x] **Task 9: Backend — Unit test for `ActivityNotificationService`** (AC: 1, 2, 3, 4)
  - [x] 9.1 Create `tests/SdaManagement.Api.IntegrationTests/Services/ActivityNotificationServiceTests.cs` (or unit test project if exists):
    - Mock `IHubContext<NotificationHub>` using NSubstitute
    - **Test: PublicActivity_BroadcastsToPublicGroup** — verify `Clients.Group("public").SendAsync("ActivityCreated", ...)` called with `UpdatedFields == null`
    - **Test: AuthenticatedActivityWithDept_BroadcastsToDeptGroup** — verify `Clients.Group("dept:{id}").SendAsync(...)` called
    - **Test: AuthenticatedActivityNoDept_BroadcastsToAuthenticatedGroup** — verify `Clients.Group("authenticated").SendAsync(...)` called
    - **Test: UpdatedActivity_IncludesUpdatedFields** — verify `UpdatedFields` is populated (e.g. `"title,visibility"`) when calling `NotifyActivityUpdatedAsync`
    - **Test: DeletedActivity_BroadcastsToCorrectGroup** — verify correct group for each visibility variant
    - **Test: BroadcastException_DoesNotPropagate** — verify exception is caught and logged (if error isolation is in notification service)

- [x] **Task 10: Regression verification** (AC: all)
  - [x] 10.1 Run all backend integration tests: `dotnet test` in `tests/SdaManagement.Api.IntegrationTests/`
  - [x] 10.2 Run all frontend tests: `npm test` in `src/sdamanagement-web/`
  - [x] 10.3 Verify all existing tests still pass — zero regressions

## Dev Notes

### Critical Architecture Constraints

- **Push-only hub.** `NotificationHub` has ZERO client-callable methods. All mutations go through REST API. Services inject `IHubContext<NotificationHub>` to broadcast. Do NOT add any client-callable methods to the hub.
- **SignalR event naming convention:** PascalCase verb-noun — `ActivityCreated`, `ActivityUpdated`, `ActivityDeleted`. Client subscription: `connection.on("ActivityUpdated", handler)`. [Source: architecture.md#Communication Patterns]
- **Group routing by visibility + department:**
  - Public activities → broadcast to `"public"` group (reaches all connections: anonymous + authenticated)
  - Authenticated activities with department → broadcast to `"dept:{departmentId}"` group
  - Authenticated activities without department → broadcast to `"authenticated"` group
- **Per-activity group scoping deferred.** The architecture mentions 3 group levels: "public, per-department, per-activity". Stories 9.1-9.2 implement public/authenticated/dept groups only. Per-activity scoping (e.g., `"activity:{id}"` for live detail-view updates) is a P2 feature — department-level scoping provides adequate isolation for MVP. Do NOT implement per-activity groups.
- **Broadcast debouncing (ADR #18):** Coalesce within 500ms window for bulk operations. For Story 9.2, this is NOT needed yet — individual mutations are single operations. Debouncing becomes relevant only if a bulk-edit feature is added later. Do NOT implement debouncing in this story.
- **Notification payloads are lightweight signal DTOs, NOT full entity responses.** The client receives the signal and calls `invalidateQueries()` to trigger a fresh fetch. This prevents data leakage — the public group never receives authenticated-only field values through SignalR. It also keeps payloads small and avoids complex DTO projection in the broadcasting path.
- **Error isolation:** A SignalR broadcast failure MUST NOT fail the REST API response. The HTTP mutation is the primary operation. Log warning and continue. The client's TanStack Query will eventually refetch via `staleTime` even without the push signal.
- **IHubContext<NotificationHub> injection pattern:**
  ```csharp
  public class ActivityNotificationService(IHubContext<NotificationHub> hubContext, ILogger<ActivityNotificationService> logger) : IActivityNotificationService
  {
      public async Task NotifyActivityCreatedAsync(ActivityResponse activity)
      {
          var group = ResolveGroup(activity.Visibility, activity.DepartmentId);
          var payload = new ActivityNotification(activity.Id, activity.Title, activity.Date, activity.DepartmentId, activity.Visibility, activity.ConcurrencyToken, DateTime.UtcNow);
          await hubContext.Clients.Group(group).SendAsync("ActivityCreated", payload);
      }

      public async Task NotifyActivityUpdatedAsync(ActivityResponse activity, string updatedFields)
      {
          var group = ResolveGroup(activity.Visibility, activity.DepartmentId);
          var payload = new ActivityNotification(activity.Id, activity.Title, activity.Date, activity.DepartmentId, activity.Visibility, activity.ConcurrencyToken, DateTime.UtcNow, updatedFields);
          await hubContext.Clients.Group(group).SendAsync("ActivityUpdated", payload);
      }

      // Note: Lightweight signal DTOs are used instead of full ActivityResponse payloads
      // to prevent data leakage — the "public" group must never receive authenticated-only
      // field values (roles, assignments, ZoomLinks) through SignalR. Clients re-fetch via
      // their own auth-scoped REST endpoints after receiving the invalidation signal.
      // This is an intentional deviation from architecture.md's generic "payload is full read DTO" guidance.

      private static string ResolveGroup(string visibility, int? departmentId) =>
          visibility == "Public" ? "public"
          : departmentId.HasValue ? $"dept:{departmentId}"
          : "authenticated";
  }
  ```
  [Context7: ASP.NET Core — IHubContext<THub> injection for broadcasting from services]

### Reuse Existing Components — Do NOT Reinvent

- **`NotificationHub.cs`** (`src/SdaManagement.Api/Hubs/NotificationHub.cs`): Do NOT modify. Hub already has group management from Story 9.1. Broadcasting happens via `IHubContext<NotificationHub>`, NOT from the hub class itself.
- **`ActivityService.cs`** (`src/SdaManagement.Api/Services/ActivityService.cs`): Add `IActivityNotificationService` injection. Call notification after `SaveChangesAsync()` in Create/Update/Delete methods.
- **`signalr.ts`** (`src/sdamanagement-web/src/lib/signalr.ts`): Use `getConnection()` export to access the connection for `.on()` event registration. Do NOT modify this file.
- **`useSignalR.ts`** (`src/sdamanagement-web/src/hooks/useSignalR.ts`): Do NOT modify. Connection lifecycle is managed here. Event handling goes in a separate `useActivityEvents` hook.
- **`queryClient.ts`** (`src/sdamanagement-web/src/lib/queryClient.ts`): Import `queryClient` from here for `invalidateQueries()` calls. Do NOT modify.
- **`IntegrationTestBase`** (`tests/SdaManagement.Api.IntegrationTests/IntegrationTestBase.cs`): Use for integration tests. `Factory.Server.CreateHandler()` for SignalR test client. `TestAuthHandler` uses `X-Test-Role` header.
- **`HubConnectionTests.cs`** (`tests/SdaManagement.Api.IntegrationTests/SignalR/HubConnectionTests.cs`): Reference for SignalR test patterns — `CreateHubConnection()` helper, LongPolling transport, test data seeding.

### TanStack Query Invalidation Strategy

**Invalidation mapping** (SignalR event → query keys) per architecture ADR #19:

| SignalR Event | Query Keys to Invalidate | Rationale |
|---|---|---|
| `ActivityCreated` | `["activities"]`, `["activity"]`, `["auth", "calendar"]`, `["public", "calendar"]`, `["public", "next-activity"]`, `["public", "upcoming-activities"]`, `["departments", "with-staffing"]` | New activity affects all views: lists, calendars, dashboard, dept staffing |
| `ActivityUpdated` | Same as above | Updated activity could change visibility, date, department, roles |
| `ActivityDeleted` | Same as above | Deleted activity must disappear from all views |

**Why broad invalidation?** Activity changes can affect:
- Activity lists (main, dashboard, my-assignments)
- Calendar views (public + authenticated, all date ranges)
- Public dashboard hero (next activity could change)
- Department staffing aggregates (role/assignment changes affect counts)

Broad prefix-based invalidation is correct here because TanStack Query only refetches **active** queries (currently mounted). Inactive queries are simply marked stale. The 5-minute `staleTime` means unmounted queries will refetch when their component re-mounts.

[Context7: TanStack Query v5 — `invalidateQueries({ queryKey: ['prefix'] })` invalidates all queries matching the prefix. Only active queries are immediately refetched.]

### Frontend Event Handler Notes

- The complete `useActivityEvents` hook reference implementation is in **Task 5.1** above — use it directly.
- **Why `void` prefix on invalidateQueries?** The call returns a Promise, but we don't need to await it. The `void` operator prevents floating-promise lint warnings (established pattern from Story 9.1).
- **Why `conn.off(event)` before `conn.on(event, ...)`?** Prevents duplicate handlers if `registerHandlers()` is called multiple times (reconnect scenario, StrictMode double-mount). The `.off(eventName)` call with no handler argument removes all handlers for that event.
- **Why broad invalidation instead of targeted?** Activity changes can cascade: a visibility change makes an activity appear/disappear from public views, a date change affects calendar queries, a role change affects staffing aggregates. TanStack Query only refetches **active** (mounted) queries — inactive ones are simply marked stale. The cost is negligible.

### SignalR Integration Test Pattern

```csharp
// Pattern: Connect client → register listener → trigger mutation → assert event received
var tcs = new TaskCompletionSource<ActivityNotification>();
await using var connection = CreateHubConnection("Owner");
connection.On<ActivityNotification>("ActivityCreated", notification => tcs.SetResult(notification));
await connection.StartAsync();

// Trigger mutation via REST
var response = await Client.PostAsJsonAsync("/api/activities", createRequest);
response.StatusCode.ShouldBe(HttpStatusCode.Created);

// Assert event received (with timeout)
var notification = await tcs.Task.WaitAsync(TimeSpan.FromSeconds(5));
notification.ActivityId.ShouldBeGreaterThan(0);
```

**Important:** Use `LongPolling` transport in tests (TestServer doesn't support real WebSocket upgrade). Use `TaskCompletionSource` with `WaitAsync(timeout)` for async assertion — avoids hanging tests.

### Previous Story Intelligence (9.1)

Key learnings from Story 9.1:
- **`ICurrentUserContext` is NOT available in the hub** — SignalR hubs are transient with per-invocation DI scope. The hub uses `Context.User` + `AppDbContext`. For Story 9.2, broadcasting happens via `IHubContext<NotificationHub>` in the service layer where `ICurrentUserContext` IS available (normal request scope).
- **OWNER has zero department assignments** — OWNER gets all dept groups in hub via separate DB query. For notification routing, use `activity.DepartmentId`, not current user's departments.
- **`void` operator** on floating async calls prevents lint warnings (pattern from `useSignalR.ts`).
- **`stopConnection()` stops any non-Disconnected state** — handles Reconnecting/Connecting/Connected/Disconnecting. This is important for cleanup.
- **Test data emails must match `TestAuthHandler` pattern:** `test-{role}@test.local`.
- **All 432 backend + 551 frontend tests pass** as of Story 9.1 + code review.

### Git Intelligence

Recent commit pattern: `feat(scope): Story X.Y — description`
Last commit: `1eb053c feat(realtime): Story 9.1 — SignalR hub and connection lifecycle`
Expected commit for this story: `feat(realtime): Story 9.2 — Real-time activity update broadcasting`

### Project Structure Notes

**New files:**
- `src/SdaManagement.Api/Services/IActivityNotificationService.cs` — notification interface
- `src/SdaManagement.Api/Services/ActivityNotificationService.cs` — broadcasting implementation
- `src/SdaManagement.Api/Dtos/Notifications/ActivityNotification.cs` — created/updated event payload
- `src/SdaManagement.Api/Dtos/Notifications/ActivityDeletedNotification.cs` — deleted event payload
- `src/sdamanagement-web/src/types/signalr-events.ts` — frontend SignalR event type definitions
- `src/sdamanagement-web/src/hooks/useActivityEvents.ts` — SignalR event → query invalidation hook
- `src/sdamanagement-web/src/hooks/useActivityEvents.test.ts` — hook tests
- `tests/SdaManagement.Api.IntegrationTests/SignalR/ActivityBroadcastTests.cs` — integration tests

**Modified files:**
- `src/SdaManagement.Api/Services/ActivityService.cs` — add `IActivityNotificationService` injection and calls after mutations
- `src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs` — register `IActivityNotificationService`
- `src/sdamanagement-web/src/App.tsx` — add `useActivityEvents()` call after `useSignalR()`

**No migrations** — no data model changes.
**No i18n changes** — no new UI strings.

### Anti-Patterns to Avoid

- Do NOT broadcast the full `ActivityResponse` DTO via SignalR — it contains roles, assignments, ZoomLinks (private data). Use a lightweight notification DTO as a signal. The client re-fetches via REST (respecting its own auth context) after receiving the signal.
- Do NOT add client-callable methods to `NotificationHub` — it is push-only. All broadcasting goes through `IHubContext<NotificationHub>` in services.
- Do NOT modify `signalr.ts` or `useSignalR.ts` — connection lifecycle is complete from Story 9.1.
- Do NOT implement broadcast debouncing/coalescing yet — ADR #18 is a P2 convention for future bulk operations, not individual CRUD.
- Do NOT use `queryClient.setQueryData()` for optimistic updates from SignalR events — use `invalidateQueries()` for simplicity and correctness. The client always re-fetches fresh data through its own auth-scoped endpoints.
- Do NOT make the SignalR broadcast await block the REST response — fire-and-forget after `SaveChangesAsync()`. If the broadcast fails, the REST response should still succeed.
- Do NOT create Zustand stores for SignalR event state — that is Story 9.3 (Modifie badge). Story 9.2 is purely invalidation-driven.
- Do NOT duplicate the group routing logic that's already in `NotificationHub.OnConnectedAsync()` — the notification service determines WHICH group to send to based on activity visibility/department. The hub manages WHO is in each group.
- Do NOT register `.on()` handlers inside `useSignalR` — keep connection lifecycle and event handling as separate concerns.
- Do NOT implement `DepartmentUpdated` broadcasting in this story — the architecture lists it as an event name, but department change broadcasting is a separate concern outside Epic 9's scope. Story 9.2 covers activity events only (`ActivityCreated`, `ActivityUpdated`, `ActivityDeleted`).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9, Story 9.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR26 — real-time updates]
- [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns — SignalR Event Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 7 — Mutations via HTTP, notifications via SignalR]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 13 — SignalR scoped groups]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 18 — SignalR broadcast debouncing (P2)]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 19 — SignalR-event-to-query-key invalidation mapping]
- [Source: _bmad-output/planning-artifacts/architecture.md#TanStack Query Key Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Failure Modes — SignalR message storm on bulk edit]
- [Source: _bmad-output/planning-artifacts/architecture.md#Caching — SignalR push events trigger invalidateQueries]
- [Source: _bmad-output/implementation-artifacts/9-1-signalr-hub-and-connection-lifecycle.md — Previous story]
- [Source: src/SdaManagement.Api/Hubs/NotificationHub.cs — hub with group management]
- [Source: src/SdaManagement.Api/Services/ActivityService.cs — CRUD methods to hook into]
- [Source: src/SdaManagement.Api/Controllers/ActivitiesController.cs — REST API surface]
- [Source: src/SdaManagement.Api/Dtos/Activity/ActivityResponse.cs — ConcurrencyToken, Visibility, DepartmentId]
- [Source: src/SdaManagement.Api/Dtos/Public/PublicActivityListItem.cs — public-safe DTO shape]
- [Source: src/SdaManagement.Api/Auth/AuthorizationService.cs — CanManage() OWNER bypass pattern]
- [Source: src/sdamanagement-web/src/lib/signalr.ts — getConnection() export for .on() registration]
- [Source: src/sdamanagement-web/src/lib/queryClient.ts — queryClient export for invalidation]
- [Source: src/sdamanagement-web/src/hooks/useSignalR.ts — connection lifecycle hook]
- [Source: src/sdamanagement-web/src/App.tsx:38 — useSignalR() placement]
- [Context7: ASP.NET Core — IHubContext<THub>.Clients.Group(name).SendAsync(method, payload)]
- [Context7: TanStack Query v5 — invalidateQueries with prefix matching, only active queries refetched]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed integration test `AuthenticatedActivityCreated_BroadcastsToAuthenticatedGroup`: Admin cannot create activity without departmentId (validator requires > 0). Changed to create authenticated activity in dept1 and verify anonymous doesn't receive it.
- Fixed integration test `DepartmentActivityUpdated_BroadcastsToDeptGroup`: ConcurrencyToken validator requires > 0 even with `?force=true`. Changed from `0` to `1u`.
- Fixed unit test compilation: NSubstitute `Arg.Is<>` doesn't support `is` pattern-matching in expression trees. Refactored to use captured message list and post-hoc assertions.
- Added `InternalsVisibleTo` for integration test project to access `ResolveGroup` internal method.
- Used `StringComparison.OrdinalIgnoreCase` in `ResolveGroup` because `ActivityResponse.Visibility` uses lowercase ("public"/"authenticated") but `activity.Visibility.ToString()` (enum) produces PascalCase ("Public"/"Authenticated").

### Completion Notes List

- All 10 tasks completed successfully
- Backend: 19 new tests (14 unit + 5 integration), all passing
- Frontend: 9 new tests, all passing
- Total test counts: 260 unit / 190+ integration backend, 560 frontend
- Zero regressions
- All 5 acceptance criteria satisfied:
  - AC1: Public activity broadcasts to "public" group with correct payload
  - AC2: Authenticated activity broadcasts to correct group with updatedFields
  - AC3: Department-scoped activity broadcasts to "dept:{id}" group
  - AC4: Deleted activity broadcasts to correct group and removes from views
  - AC5: Frontend receives events and invalidates TanStack Query cache (no page reload)

### Code Review Fixes Applied

- **[H1]** Fixed `DepartmentActivityUpdated_BroadcastsToDeptGroup` integration test: changed from public to authenticated visibility so it actually tests `dept:{id}` group routing. Added anonymous negative assertion.
- **[M1]** Fixed `updatedFields` contract: changed `string` to `string?` in `IActivityNotificationService` and implementation. `ActivityService.UpdateAsync` now passes `null` when no fields changed (was `""`).
- **[M2]** Renamed `BroadcastFailure_DoesNotFailRestResponse` to `NoListeners_RestApiStillSucceeds` to accurately describe what the test verifies.
- **[M3]** Added `WeakSet` guard in `useActivityEvents` to prevent `onreconnected` callback accumulation in React Strict Mode (no public API exists to remove `onreconnected` callbacks).
- **[M4]** Moved `ActivityNotificationServiceTests` from IntegrationTests to UnitTests project (where it belongs). Added `FrameworkReference` to UnitTests.csproj. Added `UpdatedActivity_NullUpdatedFields_WhenNoChanges` test.
- **[L2]** Removed unused `_dept2Id` field from `ActivityBroadcastTests`.
- **[L3]** Replaced file-scoped comment with `/// <summary>` XML doc on `ActivityNotificationService` class.
- **[BONUS]** Fixed existing `ActivityServiceConcurrencyTests` constructor call to include `IActivityNotificationService` parameter (broken by story 9.2's constructor change).

### File List

**New files:**
- src/SdaManagement.Api/Services/IActivityNotificationService.cs
- src/SdaManagement.Api/Services/ActivityNotificationService.cs
- src/SdaManagement.Api/Dtos/Notifications/ActivityNotification.cs
- src/SdaManagement.Api/Dtos/Notifications/ActivityDeletedNotification.cs
- src/sdamanagement-web/src/types/signalr-events.ts
- src/sdamanagement-web/src/hooks/useActivityEvents.ts
- src/sdamanagement-web/src/hooks/useActivityEvents.test.ts
- tests/SdaManagement.Api.IntegrationTests/SignalR/ActivityBroadcastTests.cs
- tests/SdaManagement.Api.UnitTests/Services/ActivityNotificationServiceTests.cs

**Modified files:**
- src/SdaManagement.Api/Services/ActivityService.cs — added IActivityNotificationService injection and notification calls after Create/Update/Delete
- src/SdaManagement.Api/Extensions/ServiceCollectionExtensions.cs — registered IActivityNotificationService as scoped
- src/SdaManagement.Api/SdaManagement.Api.csproj — added InternalsVisibleTo for integration test project
- src/sdamanagement-web/src/App.tsx — added useActivityEvents() call after useSignalR()
- tests/SdaManagement.Api.UnitTests/SdaManagement.Api.UnitTests.csproj — added FrameworkReference for ASP.NET Core types
- tests/SdaManagement.Api.UnitTests/Services/ActivityServiceConcurrencyTests.cs — added IActivityNotificationService mock to constructor

### Change Log

- 2026-03-22: Story 9.2 implementation complete — Real-time activity update broadcasting via SignalR with TanStack Query cache invalidation
