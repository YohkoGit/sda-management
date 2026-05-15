import { useEffect } from "react";
import { getConnection, onConnectionReady } from "@/lib/signalr";
import { queryClient } from "@/lib/queryClient";
import { useModifiedBadgeStore } from "@/stores/modifiedBadgeStore";
import type {
  ActivityNotification,
  ActivityDeletedNotification,
} from "@/types/signalr-events";

// Mirrors the canonical key set from useActivityCacheInvalidation.
// Kept inline here to avoid a hook -> non-hook coupling: useActivityEvents is
// called from a component, but the invalidation runs inside SignalR callbacks
// outside the React render cycle, so we use the module-level queryClient.
function invalidateActivityQueries(): void {
  void queryClient.invalidateQueries({ queryKey: ["activities"] });
  void queryClient.invalidateQueries({ queryKey: ["activity"] });
  void queryClient.invalidateQueries({ queryKey: ["auth", "calendar"] });
  void queryClient.invalidateQueries({ queryKey: ["public", "calendar"] });
  void queryClient.invalidateQueries({ queryKey: ["public", "next-activity"] });
  void queryClient.invalidateQueries({
    queryKey: ["public", "upcoming-activities"],
  });
  void queryClient.invalidateQueries({
    queryKey: ["departments", "with-staffing"],
  });
}

function handleActivityCreated(
  _payload: ActivityNotification,
): void {
  invalidateActivityQueries();
}

function handleActivityUpdated(payload: ActivityNotification): void {
  invalidateActivityQueries();
  try {
    useModifiedBadgeStore.getState().markModified(payload.activityId);
  } catch (e) {
    console.warn("Failed to mark activity as modified:", e);
  }
}

function handleActivityDeleted(
  _payload: ActivityDeletedNotification,
): void {
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

// Track connections that already have onreconnected registered.
// WeakSet ensures no memory leak — entries are GC'd when the connection is disposed.
// Prevents duplicate callbacks in React Strict Mode (onreconnected has no removal API).
const reconnectRegistered = new WeakSet<object>();

export function useActivityEvents(): void {
  useEffect(() => {
    // Cleanup expired badges from localStorage on app load
    useModifiedBadgeStore.getState().cleanupExpired();

    // Subscribe via signalr.ts. The callback fires synchronously if a
    // connection already exists, and otherwise fires when startConnection()
    // installs one. SignalR allows .on() before .start() completes —
    // handlers are queued on the HubConnection and fire once connected.
    // This replaces the previous setInterval(getConnection, 100) poll.
    const unsubscribe = onConnectionReady((conn) => {
      registerHandlers();
      // Re-register on reconnect (HubConnection has no onreconnected removal API,
      // so guard with a WeakSet to avoid duplicate callbacks under Strict Mode).
      if (!reconnectRegistered.has(conn)) {
        conn.onreconnected(() => registerHandlers());
        reconnectRegistered.add(conn);
      }
    });

    return () => {
      unsubscribe();
      const c = getConnection();
      if (c) {
        c.off("ActivityCreated", handleActivityCreated);
        c.off("ActivityUpdated", handleActivityUpdated);
        c.off("ActivityDeleted", handleActivityDeleted);
      }
    };
  }, []);
}
