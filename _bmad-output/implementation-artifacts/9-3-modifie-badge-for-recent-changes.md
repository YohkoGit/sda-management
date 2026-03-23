# Story 9.3: "Modifié" Badge for Recent Changes

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **user (any role)**,
I want to see a "Modifié" badge on activities that were recently changed,
So that I can quickly identify what's been updated since I last looked.

## Prerequisites

### Local Dev Environment

- Node.js 20+ and npm
- .NET 10 SDK
- Docker Desktop running (PostgreSQL 17 via `docker compose -f docker-compose.dev.yml up -d`)
- All Epic 1-9.2 migrations applied (`dotnet ef database update`)
- Departments seeded (from Epic 2) — at least 3-4 departments
- Users seeded per role: VIEWER, ADMIN (scoped to departments), OWNER
- All Epics 1-9.2 stories committed and passing
- `zustand` ^5.0.11 already in `package.json` (no install needed)
- `@microsoft/signalr` ^10.0.0 already in `package.json`

### Codebase State (Story 9.2 Complete)

**Backend — No changes needed for Story 9.3.** This story is 100% frontend. The backend already:
- Broadcasts `ActivityUpdated` events via SignalR with `ActivityNotification` payload (includes `activityId`, `timestamp`, `updatedFields`)
- Broadcasts `ActivityCreated` and `ActivityDeleted` events (these do NOT trigger the badge)
- Group routing by visibility/department is complete

**Frontend — SignalR event handling (Story 9.2 complete):**
- `hooks/useActivityEvents.ts` — Listens for `ActivityCreated`, `ActivityUpdated`, `ActivityDeleted`. Currently discards the payload (`_payload`) and only calls `invalidateActivityQueries()`. This story modifies the `ActivityUpdated` handler to ALSO record the activityId in the badge store.
- `types/signalr-events.ts` — `ActivityNotification` interface with `activityId: number`, `timestamp: string`, `updatedFields: string | null`
- `lib/signalr.ts` — `getConnection()` export for SignalR connection access
- `lib/queryClient.ts` — `queryClient` export for TanStack Query invalidation
- `App.tsx:39-40` — `useSignalR()` then `useActivityEvents()` hook ordering

**Frontend — Activity display components (where badge must appear — 6 views):**
- `components/dashboard/DashboardActivityCard.tsx` — Row 2: title + specialType badge. Add "Modifié" badge here.
- `components/public/ActivityCard.tsx` — Badges row (line 56-70). Add "Modifié" badge here.
- `components/calendar/DayDetailDialog.tsx` — Activity list items (line 178-207). Add "Modifié" badge here.
- `pages/AdminActivitiesPage.tsx` — Table title cell (line 359). Add "Modifié" badge after title.
- `pages/DepartmentDetailPage.tsx` — Activity list items (line 363). Add "Modifié" badge after title.
- `pages/ActivityDetailPage.tsx` — Activity detail header (line 126-134). Show badge here AND dismiss on view.

**Frontend — Zustand store pattern:**
- `stores/uiStore.ts` — Existing store uses `create<T>()((set) => ({...}))` pattern with manual `localStorage` access. The badge store will use Zustand's `persist` middleware instead (proper pattern per architecture).

**Frontend — Badge component:**
- `components/ui/badge.tsx` — CVA-based Badge with variants: default, secondary, destructive, outline, ghost, link. The "Modifié" badge uses a custom `className` override for `amber-500` styling (not a new variant — keeps shadcn/ui clean).

## Acceptance Criteria

1. **Given** an activity is updated via SignalR broadcast
   **When** the "ActivityUpdated" event is received by the frontend
   **Then** the activity card/row displays a "Modifié" badge (`amber-500` background, white text, small pill shape)
   **And** the badge appears on all views where the activity is visible (dashboard, calendar, department pipeline, admin activities table, activity detail)

2. **Given** a "Modifié" badge is displayed
   **When** the user taps/clicks on the activity to view its details
   **Then** the badge is dismissed for that user (stored in Zustand local state, not persisted to server)

3. **Given** a "Modifié" badge is displayed
   **When** 24 hours pass without the user viewing the activity
   **Then** the badge auto-expires and is removed (client-side timer)

4. **Given** the user refreshes the page or reconnects
   **When** the app reloads
   **Then** badges are recalculated from Zustand persisted state (localStorage)
   **And** expired badges (>24h) are cleaned up on load

5. **Given** a new activity is created (not updated)
   **When** the "ActivityCreated" event is received
   **Then** no "Modifié" badge is shown — the badge is only for updates to existing activities

## Tasks / Subtasks

- [x] **Task 1: Create `modifiedBadgeStore` with Zustand persist middleware** (AC: 1, 3, 4)
  - [x] 1.1 Create `src/sdamanagement-web/src/stores/modifiedBadgeStore.ts`:
    ```typescript
    import { create } from "zustand";
    import { persist } from "zustand/middleware";

    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    interface ModifiedBadgeState {
      /** Map of activityId → ISO timestamp when the update event was received */
      modifiedActivities: Record<number, string>;
      /** Record an activity as recently modified */
      markModified: (activityId: number) => void;
      /** Dismiss badge for a specific activity (user viewed it) */
      dismiss: (activityId: number) => void;
      /** Remove all expired entries (older than 24h) */
      cleanupExpired: () => void;
      /** Check if an activity has an active (non-expired) badge */
      isModified: (activityId: number) => boolean;
    }

    export const useModifiedBadgeStore = create<ModifiedBadgeState>()(
      persist(
        (set, get) => ({
          modifiedActivities: {},

          markModified: (activityId: number) =>
            set((state) => ({
              modifiedActivities: {
                ...state.modifiedActivities,
                [activityId]: new Date().toISOString(),
              },
            })),

          dismiss: (activityId: number) =>
            set((state) => {
              const { [activityId]: _, ...rest } = state.modifiedActivities;
              return { modifiedActivities: rest };
            }),

          cleanupExpired: () =>
            set((state) => {
              const now = Date.now();
              const cleaned: Record<number, string> = {};
              for (const [id, timestamp] of Object.entries(state.modifiedActivities)) {
                if (now - new Date(timestamp).getTime() < TWENTY_FOUR_HOURS_MS) {
                  cleaned[Number(id)] = timestamp;
                }
              }
              return { modifiedActivities: cleaned };
            }),

          isModified: (activityId: number) => {
            const timestamp = get().modifiedActivities[activityId];
            if (!timestamp) return false;
            return Date.now() - new Date(timestamp).getTime() < TWENTY_FOUR_HOURS_MS;
          },
        }),
        {
          name: "sdac-modified-badges",
          partialize: (state) => ({
            modifiedActivities: state.modifiedActivities,
          }),
        },
      ),
    );
    ```
    **Key decisions:**
    - `Record<number, string>` (activityId → ISO timestamp) — O(1) lookup, JSON-serializable
    - `persist` middleware with `partialize` — only persists `modifiedActivities`, not functions
    - `name: "sdac-modified-badges"` — prefixed to avoid localStorage collisions
    - `isModified()` checks expiry inline — no stale reads from store
    - `cleanupExpired()` runs on app load (Task 3) and removes entries > 24h old
    - Uses `new Date().toISOString()` for the mark timestamp (client time) — NOT the server's `notification.timestamp`, because the 24h expiry is relative to when the USER received the notification, not when the server processed it

  - [x] 1.2 **Do NOT add `persist` to `uiStore.ts`** — existing store uses manual localStorage. Changing it would be out-of-scope refactoring.

- [x] **Task 2: Create `ModifiedBadge` component** (AC: 1)
  - [x] 2.1 Create `src/sdamanagement-web/src/components/ui/ModifiedBadge.tsx`:
    ```typescript
    import { useTranslation } from "react-i18next";
    import { Badge } from "@/components/ui/badge";
    import { useModifiedBadgeStore } from "@/stores/modifiedBadgeStore";

    interface ModifiedBadgeProps {
      activityId: number;
    }

    export function ModifiedBadge({ activityId }: ModifiedBadgeProps) {
      const { t } = useTranslation();
      const isModified = useModifiedBadgeStore((s) => s.isModified(activityId));

      if (!isModified) return null;

      return (
        <Badge
          className="bg-amber-500 text-white border-transparent text-xs font-medium hover:bg-amber-500"
          aria-live="polite"
        >
          {t("common.modifiedBadge")}
        </Badge>
      );
    }
    ```
    **Key decisions:**
    - Uses existing `Badge` component with `className` override — not a new CVA variant (keeps shadcn/ui components clean)
    - `bg-amber-500 text-white border-transparent` — per UX spec semantic status colors: "Modified | amber-500 badge | Small pill"
    - `hover:bg-amber-500` — prevents hover color change (the badge is informational, not interactive)
    - `aria-live="polite"` — per UX spec accessibility requirements for dynamic change announcements
    - `text-xs font-medium` — per UX caption typography: "badge content" uses caption style
    - Reads `isModified()` from store — re-renders when store changes
    - Returns `null` when not modified — zero DOM footprint when inactive

- [x] **Task 3: Wire SignalR `ActivityUpdated` events to badge store** (AC: 1, 5)
  - [x] 3.1 Modify `src/sdamanagement-web/src/hooks/useActivityEvents.ts`:
    - Import `useModifiedBadgeStore` at top
    - In `handleActivityEvent`: check if the event is `"ActivityUpdated"` — if so, call `useModifiedBadgeStore.getState().markModified(payload.activityId)`
    - `ActivityCreated` and `ActivityDeleted` events do NOT trigger the badge (AC: 5)
    - Continue calling `invalidateActivityQueries()` for ALL events (existing behavior preserved)
    - **Implementation approach:** Change handler registration to distinguish event types:
    ```typescript
    function handleActivityCreated(_payload: ActivityNotification): void {
      invalidateActivityQueries();
    }

    function handleActivityUpdated(payload: ActivityNotification): void {
      // CRITICAL: Invalidate first (essential), then badge (nice-to-have).
      // Badge marking must NOT block cache invalidation if it throws.
      invalidateActivityQueries();
      try {
        useModifiedBadgeStore.getState().markModified(payload.activityId);
      } catch (e) {
        // Badge failure is non-critical — log and continue
        console.warn("Failed to mark activity as modified:", e);
      }
    }

    function handleActivityDeleted(_payload: ActivityDeletedNotification): void {
      invalidateActivityQueries();
    }

    function registerHandlers(): void {
      const conn = getConnection();
      if (!conn) return;
      conn.off("ActivityCreated");
      conn.on("ActivityCreated", handleActivityCreated);
      conn.off("ActivityUpdated");
      conn.on("ActivityUpdated", handleActivityUpdated);
      conn.off("ActivityDeleted");
      conn.on("ActivityDeleted", handleActivityDeleted);
    }
    ```
    - **Why separate handlers?** The `ACTIVITY_EVENTS` loop pattern from 9.2 used a single handler because all events had the same action (invalidate). Now `ActivityUpdated` has an additional action (badge store). Separate named handlers are clearer and correctly typed.
    - Update cleanup in the `useEffect` return to use the three named handlers for `.off()` calls

  - [x] 3.2 Add badge store cleanup on app mount in `useActivityEvents`:
    - Call `useModifiedBadgeStore.getState().cleanupExpired()` at the top of the `useEffect` (runs once on mount)
    - This ensures expired badges are purged from localStorage on every app load (AC: 4)

  - [x] 3.3 **Do NOT also remove the badge for deleted activities** — deleting an activity removes it from all queries via `invalidateQueries()`, so the card won't render at all. No need to explicitly dismiss.

- [x] **Task 4: Add `ModifiedBadge` to `DashboardActivityCard`** (AC: 1)
  - [x] 4.1 Modify `src/sdamanagement-web/src/components/dashboard/DashboardActivityCard.tsx`:
    - Import `ModifiedBadge` from `@/components/ui/ModifiedBadge`
    - In Row 2 (line 65, the title row), add `<ModifiedBadge activityId={activity.id} />` between the title and the specialType badge:
    ```tsx
    {/* Row 2: Activity title + badges */}
    <div className="mt-1.5 flex items-start justify-between gap-2">
      <h3 className="truncate text-base font-bold text-foreground" title={activity.title}>
        {activity.title}
      </h3>
      <div className="flex items-center gap-1 shrink-0">
        <ModifiedBadge activityId={activity.id} />
        {activity.specialType && (
          <Badge variant="outline" className="shrink-0 text-[11px]">
            {activity.specialType}
          </Badge>
        )}
      </div>
    </div>
    ```
    - Wrap badges in a flex container to keep them aligned when both are present

- [x] **Task 5: Add `ModifiedBadge` to public `ActivityCard`** (AC: 1)
  - [x] 5.1 Modify `src/sdamanagement-web/src/components/public/ActivityCard.tsx`:
    - Import `ModifiedBadge` from `@/components/ui/ModifiedBadge`
    - In the badges row (line 56), add `<ModifiedBadge activityId={activity.id} />` alongside department and specialType badges:
    ```tsx
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <ModifiedBadge activityId={activity.id} />
      {activity.departmentAbbreviation && (
        <Badge variant="secondary" title={activity.departmentName ?? undefined}>
          {activity.departmentAbbreviation}
        </Badge>
      )}
      {activity.specialType && (
        <Badge variant="outline">
          {t(`pages.home.specialType.${activity.specialType}`)}
        </Badge>
      )}
    </div>
    ```

- [x] **Task 6: Add `ModifiedBadge` to `DayDetailDialog`** (AC: 1)
  - [x] 6.1 Modify `src/sdamanagement-web/src/components/calendar/DayDetailDialog.tsx`:
    - Import `ModifiedBadge` from `@/components/ui/ModifiedBadge`
    - In the activity list item (line 190, within the `min-w-0 flex-1` div), add badge after the title:
    ```tsx
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <p className="truncate text-sm font-medium">{activity.title}</p>
        <ModifiedBadge activityId={activity.id} />
      </div>
      <p className="text-xs text-muted-foreground">
        {formatTime(activity.startTime)}–{formatTime(activity.endTime)}
        {/* existing department + specialType badges */}
      </p>
    </div>
    ```

- [x] **Task 7: Add `ModifiedBadge` to `AdminActivitiesPage` table** (AC: 1)
  - [x] 7.1 Modify `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx`:
    - Import `ModifiedBadge` from `@/components/ui/ModifiedBadge`
    - In the table row's title cell (line 359, `<TableCell className="font-medium">`), add badge after the title text and before the specialType badge:
    ```tsx
    <TableCell className="font-medium">
      {activity.title}
      <ModifiedBadge activityId={activity.id} />
      {activity.specialType && (
        <Badge variant="secondary" className="ml-2 max-w-[10rem] truncate text-xs" data-testid="special-type-badge">
          {t(`pages.adminActivities.specialType.${activity.specialType}`)}
        </Badge>
      )}
    </TableCell>
    ```
    - The badge renders inline with the title text in the table cell. The Badge component's `inline-flex` base style keeps it aligned.

- [x] **Task 8: Add `ModifiedBadge` to `DepartmentDetailPage` activity list** (AC: 1)
  - [x] 8.1 Modify `src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx`:
    - Import `ModifiedBadge` from `@/components/ui/ModifiedBadge`
    - In the activity list item (line 363, the title span), add badge after the title:
    ```tsx
    <span className="flex-1 text-sm font-medium text-slate-800 truncate">
      {activity.title}
    </span>
    <ModifiedBadge activityId={activity.id} />
    ```
    - The badge renders inline in the flex row between the title and the staffing/meeting indicators.

- [x] **Task 9: Dismiss badge on `ActivityDetailPage` view** (AC: 2)
  - [x] 9.1 Modify `src/sdamanagement-web/src/pages/ActivityDetailPage.tsx`:
    - Import `useModifiedBadgeStore` from `@/stores/modifiedBadgeStore`
    - Import `ModifiedBadge` from `@/components/ui/ModifiedBadge`
    - Add `useEffect` to dismiss badge when activity is viewed:
    ```typescript
    const dismiss = useModifiedBadgeStore((s) => s.dismiss);
    useEffect(() => {
      if (activityId) dismiss(activityId);
    }, [activityId, dismiss]);
    ```
    - Place this after the existing `useActivity()` hook call (line 22)
    - **Also show the badge in the header** (line 127, title row) — the badge will flash briefly then disappear as `dismiss()` fires. This gives visual confirmation that the badge was present:
    ```tsx
    <div className="flex items-start justify-between gap-2 mt-2">
      <h1 className="text-2xl font-black text-foreground">{activity.title}</h1>
      <div className="flex items-center gap-1 shrink-0">
        <ModifiedBadge activityId={activity.id} />
        {activity.specialType && (
          <Badge variant="outline" className="shrink-0 text-[11px]">
            {activity.specialType}
          </Badge>
        )}
      </div>
    </div>
    ```
    - **Note on dismiss timing:** The `useEffect` runs after render, so the badge renders once in the detail view header, then `dismiss()` fires and removes it. This is the correct UX — the user sees the badge transition from present to absent, confirming they've "acknowledged" the change. If this flash is undesirable, dismiss BEFORE render using `useMemo` instead, but the brief flash is intentional per UX "proactive honesty" principle.

- [x] **Task 10: Add i18n translation keys** (AC: 1)
  - [x] 10.1 Add `"modifiedBadge": "Modifié"` to the **existing** `"common"` object in `src/sdamanagement-web/public/locales/fr/common.json`:
    ```json
    "common": {
      "cancel": "Annuler",
      "delete": "Supprimer",
      "back": "Retour",
      "modifiedBadge": "Modifié"
    }
    ```
    **Key path:** `common.modifiedBadge` — used via `t("common.modifiedBadge")`
    **CRITICAL:** The `"common"` object already exists with keys like `cancel`, `delete`, `back`. Add `"modifiedBadge"` as a new property INSIDE the existing object. Do NOT create a duplicate `"common"` key — that would overwrite all existing entries.

  - [x] 10.2 Add English equivalent inside the **existing** `"common"` object in `src/sdamanagement-web/public/locales/en/common.json`:
    ```json
    "common": {
      "cancel": "Cancel",
      "delete": "Delete",
      "back": "Back",
      "modifiedBadge": "Modified"
    }
    ```

  - [x] 10.3 Add both keys to the `testI18n` inline translations in `src/sdamanagement-web/src/test-utils.tsx` — search for the `"common"` section in the `resources` object and add `"modifiedBadge": "Modifié"` (FR) and `"modifiedBadge": "Modified"` (EN).

- [x] **Task 11: Unit tests for `modifiedBadgeStore`** (AC: 1, 2, 3, 4)
  - [x] 11.1 Create `src/sdamanagement-web/src/stores/modifiedBadgeStore.test.ts`:
    - **Test: markModified adds activity to store** — call `markModified(42)`, verify `modifiedActivities[42]` exists with recent timestamp
    - **Test: isModified returns true for recently marked activity** — `markModified(42)`, assert `isModified(42)` is true
    - **Test: isModified returns false for unknown activity** — assert `isModified(999)` is false
    - **Test: dismiss removes activity from store** — `markModified(42)`, `dismiss(42)`, assert `isModified(42)` is false and `modifiedActivities[42]` is undefined
    - **Test: cleanupExpired removes entries older than 24h** — manually set a timestamp 25h ago via store's `set`, call `cleanupExpired()`, verify entry removed
    - **Test: cleanupExpired keeps entries younger than 24h** — mark activity, call `cleanupExpired()`, verify entry still present
    - **Test: isModified returns false for expired entry** — manually set timestamp 25h ago, assert `isModified()` returns false
    - **Test: markModified updates timestamp for already-marked activity** — mark twice, verify latest timestamp
    - **Setup/teardown:** Clear store AND localStorage between tests. This is the first store test file in the codebase — it establishes the pattern for testing Zustand stores with `persist` middleware:
    ```typescript
    afterEach(() => {
      useModifiedBadgeStore.setState({ modifiedActivities: {} });
      localStorage.clear();
    });
    ```
    The vitest jsdom environment provides `localStorage` natively — no mocking needed.

- [x] **Task 12: Unit tests for `ModifiedBadge` component** (AC: 1)
  - [x] 12.1 Create `src/sdamanagement-web/src/components/ui/ModifiedBadge.test.tsx`:
    - **Import `render` and `screen` from `@/test-utils`** (NOT from `@testing-library/react`). The custom `render` wraps components with i18n, QueryClient, Router, and TooltipProvider automatically — no manual wrapper needed.
    - Set store state directly via `useModifiedBadgeStore.setState()`
    - **Test: renders badge when activity is modified** — set `modifiedActivities[42]` to recent timestamp, render `<ModifiedBadge activityId={42} />`, assert badge text "Modifié" is visible
    - **Test: renders nothing when activity is not modified** — render `<ModifiedBadge activityId={42} />` with empty store, assert nothing rendered
    - **Test: badge has aria-live="polite"** — render with modified activity, assert `aria-live` attribute
    - **Test: badge has amber styling** — verify badge element has `bg-amber-500` class
    - **Cleanup:** `afterEach(() => { useModifiedBadgeStore.setState({ modifiedActivities: {} }); localStorage.clear(); })`

- [x] **Task 13: Update `useActivityEvents` tests** (AC: 1, 5)
  - [x] 13.1 Modify `src/sdamanagement-web/src/hooks/useActivityEvents.test.ts`:
    - Mock `@/stores/modifiedBadgeStore` (mock `getState().markModified`)
    - **Test: ActivityUpdated handler calls markModified with activityId** — trigger ActivityUpdated handler with payload `{ activityId: 42, ... }`, verify `markModified(42)` called
    - **Test: ActivityCreated handler does NOT call markModified** — trigger ActivityCreated handler, verify `markModified` NOT called
    - **Test: ActivityDeleted handler does NOT call markModified** — trigger ActivityDeleted handler, verify `markModified` NOT called
    - **Test: cleanupExpired called on mount** — verify `cleanupExpired()` called during hook initialization
    - Keep all existing tests passing (invalidateQueries still called for all events)

- [x] **Task 14: Regression verification** (AC: all)
  - [x] 14.1 Run all frontend tests: `npm test` in `src/sdamanagement-web/`
  - [x] 14.2 Run all backend tests: `dotnet test` in `tests/` (no backend changes, but verify zero regressions)
  - [x] 14.3 Verify all existing tests still pass — zero regressions

## Dev Notes

### Critical Architecture Constraints

- **This is a 100% frontend story.** No backend changes. No migrations. No new API endpoints. The SignalR broadcasting from Story 9.2 provides all the data needed.
- **Zustand for UI state ONLY (ADR #6).** The badge store tracks "which activities have been recently modified" — this is ephemeral UI state, NOT server data. TanStack Query remains the single source of truth for activity data. [Source: architecture.md#ADR 6 — Frontend state stack]
- **Zustand `persist` middleware for localStorage.** The badge store uses `persist({ name: "sdac-modified-badges" })` to survive page refreshes (AC: 4). This is the correct Zustand pattern — do NOT use manual `localStorage.getItem/setItem` like `uiStore.ts` does. [Context7: Zustand v5 — persist middleware with partialize for selective persistence]
- **Badge color is `amber-500`, NOT `indigo-600`.** The epics file says "indigo-600" but the UX design specification's semantic status color table explicitly defines "Modified | amber-500 badge". The UX spec is the design authority. amber-500 is semantically correct (= attention/change), while indigo-600 is the primary accent (= interactive elements). [Source: ux-design-specification.md#Semantic Status Colors]
- **`aria-live="polite"` is mandatory.** The UX spec requires it for the "Modifié" badge for accessibility — screen readers announce badge appearance. [Source: ux-design-specification.md#Accessibility]
- **24-hour expiry is client-side only.** No server involvement. The store's `isModified()` checks timestamp age inline. `cleanupExpired()` purges stale entries from localStorage on app load.
- **Badge dismissal is per-user, client-side only.** Not persisted to server. Different users see/dismiss badges independently.
- **`prefers-reduced-motion`:** The badge appears/disappears instantly — no transition animation needed. The Badge component already uses `transition-[color,box-shadow]` for focus states, which is fine. Do NOT add entry/exit animations.
- **Error isolation in SignalR handler (mirrors 9.2 backend pattern).** `invalidateActivityQueries()` is critical (keeps data fresh). `markModified()` is nice-to-have (visual indicator). If `markModified` throws, cache invalidation MUST still run. Call invalidation first, wrap badge marking in try-catch. [Source: Story 9.2 Dev Notes — "A SignalR broadcast failure MUST NOT fail the REST API response"]

### UX Design Specifications

**Badge styling (from UX spec):**
- Background: `amber-500` (#F59E0B)
- Text: white, `text-xs` (12px), `font-medium` (500 weight)
- Shape: pill (`rounded-full`) — inherited from Badge component base styles
- Padding: `px-2 py-0.5` — inherited from Badge component base styles
- Content: "Modifié" (French) / "Modified" (English) via i18n

**Badge placement (from UX spec):**
- "appears on activity cards when recently edited" — all views where the activity is visible
- Dashboard cards, calendar day detail, department pipeline, activity detail header

**Trust transfer mechanism (from UX spec):**
- The "Modifié" badge is NOT optional polish — it's a **trust transfer mechanism** that replaces social proof. It prevents the scenario where a user tells someone wrong information based on stale data. Treat this as a core feature, not a nice-to-have.

### Known Limitations & Intentional Behaviors

- **Self-edit badge is intentional.** When an admin edits an activity, they will see the "Modifié" badge on that activity because the SignalR broadcast includes all group members (including the editor). This is consistent with the UX "proactive honesty" principle — the badge confirms the change was broadcast to everyone. The user can dismiss it with a single tap. If this becomes a UX complaint, a lightweight fix is to track "recently mutated activity IDs" in a short-lived `Set` and skip `markModified` for those IDs — but do NOT implement this now.
- **Cross-tab sync is not supported.** Zustand `persist` writes to localStorage but does NOT listen for `storage` events from other tabs. If a user has the app open in two tabs and dismisses a badge in Tab A, Tab B will still show it until the page is refreshed. This is acceptable for ephemeral UI state — badges are not critical data.
- **Long-running SPA sessions and time-based expiry.** If the app stays open >24h without refresh, old badges expire visually because `isModified()` checks timestamp age inline on every render. However, the 24h expiry does NOT trigger a re-render on its own — `Date.now()` inside the selector is evaluated per-render, not on a timer. The badge disappears only when the component re-renders for another reason (route navigation, query refetch from SignalR, user interaction). This is acceptable because query invalidation from SignalR events causes frequent re-renders, and `cleanupExpired()` purges stale entries from localStorage on next app load. Entries are ~50 bytes each — no cleanup timer needed.
- **Forward reference: `updatedFields` for future "what changed" feature.** The `ActivityNotification.updatedFields` field (e.g., `"title,roles"`, `"date,department"`) is available in the SignalR payload but intentionally unused in 9.3. A future story could use this to power a "what changed" tooltip or detail callout on the activity card (e.g., "Predicateur changed"). The data is already flowing — only the UI display is deferred.

### Reuse Existing Components — Do NOT Reinvent

- **`Badge` component** (`components/ui/badge.tsx`): Use with `className` override for amber-500 styling. Do NOT add a new CVA variant — keep shadcn/ui components pristine.
- **`useActivityEvents` hook** (`hooks/useActivityEvents.ts`): Modify to add badge store updates. Do NOT create a separate hook for badge events.
- **`signalr-events.ts` types** (`types/signalr-events.ts`): `ActivityNotification` already has `activityId` and `timestamp`. Do NOT modify.
- **`signalr.ts`** (`lib/signalr.ts`): Do NOT modify. Connection lifecycle is complete.
- **`useSignalR.ts`** (`hooks/useSignalR.ts`): Do NOT modify. Connection lifecycle hook is separate from event handling.
- **`queryClient.ts`** (`lib/queryClient.ts`): Do NOT modify. Query invalidation logic stays in `useActivityEvents`.
- **`test-utils.tsx`** (`src/test-utils.tsx`): Custom `render` function wrapping components with i18n, QueryClient, Router, TooltipProvider. Use `import { render, screen } from "@/test-utils"` in all component tests — do NOT import directly from `@testing-library/react`.

### Zustand Persist Middleware Pattern

[Context7: Zustand v5.0.12 — `persist` middleware with `partialize`]

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useMyStore = create<MyState>()(
  persist(
    (set, get) => ({
      // state + actions
    }),
    {
      name: "storage-key",           // localStorage key
      partialize: (state) => ({      // only persist data, not functions
        myData: state.myData,
      }),
    },
  ),
);
```

**Accessing store outside React components** (for SignalR handler):
```typescript
useModifiedBadgeStore.getState().markModified(activityId);
```
This is the standard Zustand pattern for calling actions from non-React code (event handlers, middleware). It works because Zustand stores are plain JavaScript objects — no React context required.

### SignalR Event Handler Refactoring

The current `useActivityEvents.ts` uses a single `handleActivityEvent` handler for all three events via a loop. Story 9.3 requires different behavior for `ActivityUpdated` (badge + invalidate) vs others (invalidate only). Refactor to separate named handlers:

- `handleActivityCreated` → invalidate only
- `handleActivityUpdated` → mark badge + invalidate
- `handleActivityDeleted` → invalidate only

The `ACTIVITY_EVENTS` const and loop can be removed. Register each handler explicitly. This is clearer and avoids needing to check the event name inside a shared handler.

### Test Patterns

**Store tests:** Use `useModifiedBadgeStore.setState()` for setup and `useModifiedBadgeStore.getState()` for assertions. Reset between tests with `useModifiedBadgeStore.setState({ modifiedActivities: {} })`.

**Component tests:** Follow co-located test pattern (`ModifiedBadge.test.tsx` next to `ModifiedBadge.tsx`). Import `render` and `screen` from `@/test-utils` (NOT from `@testing-library/react`) — the custom `render` wraps components with i18n (French-first), QueryClient, Router, and TooltipProvider automatically. Set store state before render via `useModifiedBadgeStore.setState()`. Clear `localStorage` in `afterEach`.

**Hook tests:** Existing `useActivityEvents.test.ts` mocks `@/lib/signalr` and `@/lib/queryClient`. Add mock for `@/stores/modifiedBadgeStore`. Verify `markModified` called only for `ActivityUpdated` events.

### Previous Story Intelligence (9.2)

Key learnings from Story 9.2:
- **WeakSet guard** for `onreconnected` — prevents callback accumulation in React Strict Mode. Already implemented; do not break.
- **`void` operator** on floating async calls (e.g., `void queryClient.invalidateQueries(...)`) — prevents lint warnings. Continue this pattern.
- **`conn.off(event)` before `conn.on(event)`** — prevents duplicate handlers on reconnect. Continue this pattern in refactored handlers.
- **Poll interval for connection availability** (100ms `setInterval`) — handles the case where `getConnection()` returns null on first mount. Keep this pattern.
- **`_payload` was unused** in 9.2's handler — now `payload.activityId` is needed in the `ActivityUpdated` handler. Rename from `_payload` to `payload`.
- **Test counts as of 9.2:** 260 backend unit / 190+ backend integration / 560 frontend tests — all passing.

### Git Intelligence

Recent commit pattern: `feat(scope): Story X.Y — description`
Last commit: `43e5824 feat(realtime): Story 9.2 — Real-time activity update broadcasting`
Expected commit for this story: `feat(realtime): Story 9.3 — "Modifié" badge for recent changes`

### Project Structure Notes

**New files:**
- `src/sdamanagement-web/src/stores/modifiedBadgeStore.ts` — Zustand store with persist middleware
- `src/sdamanagement-web/src/stores/modifiedBadgeStore.test.ts` — Store unit tests
- `src/sdamanagement-web/src/components/ui/ModifiedBadge.tsx` — Badge display component
- `src/sdamanagement-web/src/components/ui/ModifiedBadge.test.tsx` — Component tests

**Modified files:**
- `src/sdamanagement-web/src/hooks/useActivityEvents.ts` — Separate handlers, badge store integration
- `src/sdamanagement-web/src/hooks/useActivityEvents.test.ts` — Updated tests for new handler behavior
- `src/sdamanagement-web/src/components/dashboard/DashboardActivityCard.tsx` — Add ModifiedBadge
- `src/sdamanagement-web/src/components/public/ActivityCard.tsx` — Add ModifiedBadge
- `src/sdamanagement-web/src/components/calendar/DayDetailDialog.tsx` — Add ModifiedBadge
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx` — Add ModifiedBadge to table title cell
- `src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx` — Add ModifiedBadge to activity list items
- `src/sdamanagement-web/src/pages/ActivityDetailPage.tsx` — Add ModifiedBadge + dismiss on view
- `src/sdamanagement-web/public/locales/fr/common.json` — Add `common.modifiedBadge` key to existing `"common"` object
- `src/sdamanagement-web/public/locales/en/common.json` — Add `common.modifiedBadge` key to existing `"common"` object
- `src/sdamanagement-web/src/test-utils.tsx` — Add `modifiedBadge` to inline test i18n translations

**No backend changes.** No migrations. No new API endpoints. No new npm packages (Zustand already installed).

### Anti-Patterns to Avoid

- Do NOT store activity data in Zustand — the store only tracks `activityId → timestamp` pairs. Activity data comes from TanStack Query. [Source: architecture.md#Anti-Patterns — "Storing server data in Zustand"]
- Do NOT use `queryClient.setQueryData()` to inject badge state into query results — the badge is UI state, not server state.
- Do NOT create a timer (`setInterval`) for continuous expiry checking — `isModified()` checks age inline on every render. `cleanupExpired()` only needs to run on app load to purge localStorage.
- Do NOT broadcast badge state via SignalR — badges are per-user, client-side only. Each user's badges are independent.
- Do NOT add entry/exit CSS animations to the badge — respect `prefers-reduced-motion` by keeping appearance/disappearance instant.
- Do NOT modify backend code — this is a 100% frontend story.
- Do NOT add a new variant to `components/ui/badge.tsx` — use `className` override to keep shadcn/ui pristine.
- Do NOT modify `signalr.ts`, `useSignalR.ts`, or `queryClient.ts` — they are complete from previous stories.
- Do NOT create a custom hook like `useIsModified(activityId)` wrapping `useModifiedBadgeStore` — the store's `isModified()` method via the selector `(s) => s.isModified(activityId)` inside the component is sufficient. A separate hook adds unnecessary indirection.
- Do NOT use `notification.timestamp` from the server payload for the stored timestamp — use client's `new Date().toISOString()` because the 24h expiry is relative to when the user received the notification, not when the server processed the mutation.
- Do NOT import `useModifiedBadgeStore` in `App.tsx` — the cleanup runs inside `useActivityEvents` on mount. No new hooks in App.
- Do NOT let `markModified()` failure block `invalidateActivityQueries()` — cache invalidation is critical, badge marking is nice-to-have. Always call invalidation first, wrap badge marking in try-catch.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 9, Story 9.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR26 — real-time updates]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 6 — Frontend state stack]
- [Source: _bmad-output/planning-artifacts/architecture.md#ADR 7 — Mutations via HTTP, notifications via SignalR]
- [Source: _bmad-output/planning-artifacts/architecture.md#Zustand Store Conventions]
- [Source: _bmad-output/planning-artifacts/architecture.md#Anti-Patterns — Storing server data in Zustand]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Semantic Status Colors — Modified: amber-500]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility — aria-live="polite" for Modifié badge]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Trust Transfer — Modifié badge as trust mechanism]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Custom Components — Modifié change badge]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Typography — Caption: text-xs font-medium for badge content]
- [Source: _bmad-output/implementation-artifacts/9-2-real-time-activity-update-broadcasting.md — Previous story]
- [Source: src/sdamanagement-web/src/hooks/useActivityEvents.ts — SignalR event handler to modify]
- [Source: src/sdamanagement-web/src/types/signalr-events.ts — ActivityNotification type]
- [Source: src/sdamanagement-web/src/stores/uiStore.ts — Existing Zustand pattern reference]
- [Source: src/sdamanagement-web/src/components/ui/badge.tsx — Badge component with CVA variants]
- [Source: src/sdamanagement-web/src/components/dashboard/DashboardActivityCard.tsx — Dashboard card to add badge]
- [Source: src/sdamanagement-web/src/components/public/ActivityCard.tsx — Public card to add badge]
- [Source: src/sdamanagement-web/src/components/calendar/DayDetailDialog.tsx — Calendar day detail to add badge]
- [Source: src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx — Admin table to add badge in title cell]
- [Source: src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx — Department activity list to add badge]
- [Source: src/sdamanagement-web/src/pages/ActivityDetailPage.tsx — Detail page for badge dismiss]
- [Source: src/sdamanagement-web/src/test-utils.tsx — Custom render with i18n/QueryClient/Router providers]
- [Source: src/sdamanagement-web/src/App.tsx:39-40 — Hook ordering: useSignalR then useActivityEvents]
- [Context7: Zustand v5.0.12 — persist middleware with partialize for selective localStorage persistence]
- [Context7: Zustand v5.0.12 — getState() for accessing store outside React components]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Fixed store test: removed `vi.advanceTimersByTime` call (fake timers not initialized in store test scope)
- Fixed component test: `container.firstChild` was non-null due to Sonner `<section>` in custom `render` wrapper — switched to `screen.queryByText` assertion

### Completion Notes List

- Created `modifiedBadgeStore` with Zustand `persist` middleware — stores `activityId → ISO timestamp` pairs in localStorage under key `sdac-modified-badges`
- Created `ModifiedBadge` component — amber-500 pill badge using existing CVA Badge with className override, `aria-live="polite"` for accessibility
- Refactored `useActivityEvents` from single shared handler + event loop to three separate named handlers (`handleActivityCreated`, `handleActivityUpdated`, `handleActivityDeleted`) — `ActivityUpdated` now calls `markModified()` on the badge store with error isolation (try-catch)
- Added `cleanupExpired()` call on mount in `useActivityEvents` to purge stale badges from localStorage on app load
- Added `ModifiedBadge` to all 6 activity views: DashboardActivityCard, public ActivityCard, DayDetailDialog, AdminActivitiesPage, DepartmentDetailPage, ActivityDetailPage
- ActivityDetailPage dismisses badge on view via `useEffect` calling `dismiss(activityId)`
- Added i18n keys: `common.modifiedBadge` = "Modifié" (FR) / "Modified" (EN) in both locale files and test-utils
- 8 store unit tests, 4 component tests, 4 hook tests added (16 new tests total)
- All 576 frontend tests pass, all 697 backend tests pass — zero regressions

### Change Log

- 2026-03-22: Story 9.3 implemented — "Modifié" badge for recent activity changes (100% frontend)

### File List

**New files:**
- `src/sdamanagement-web/src/stores/modifiedBadgeStore.ts`
- `src/sdamanagement-web/src/stores/modifiedBadgeStore.test.ts`
- `src/sdamanagement-web/src/components/ui/ModifiedBadge.tsx`
- `src/sdamanagement-web/src/components/ui/ModifiedBadge.test.tsx`

**Modified files:**
- `src/sdamanagement-web/src/hooks/useActivityEvents.ts`
- `src/sdamanagement-web/src/hooks/useActivityEvents.test.ts`
- `src/sdamanagement-web/src/components/dashboard/DashboardActivityCard.tsx`
- `src/sdamanagement-web/src/components/public/ActivityCard.tsx`
- `src/sdamanagement-web/src/components/calendar/DayDetailDialog.tsx`
- `src/sdamanagement-web/src/pages/AdminActivitiesPage.tsx`
- `src/sdamanagement-web/src/pages/DepartmentDetailPage.tsx`
- `src/sdamanagement-web/src/pages/ActivityDetailPage.tsx`
- `src/sdamanagement-web/public/locales/fr/common.json`
- `src/sdamanagement-web/public/locales/en/common.json`
- `src/sdamanagement-web/src/test-utils.tsx`
