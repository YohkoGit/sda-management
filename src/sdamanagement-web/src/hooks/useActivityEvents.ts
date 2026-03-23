import { useEffect } from "react";
import { getConnection } from "@/lib/signalr";
import { queryClient } from "@/lib/queryClient";
import { useModifiedBadgeStore } from "@/stores/modifiedBadgeStore";
import type {
  ActivityNotification,
  ActivityDeletedNotification,
} from "@/types/signalr-events";

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

    // Re-register on reconnect as a safety net (once per connection instance)
    const conn = getConnection();
    if (conn && !reconnectRegistered.has(conn)) {
      conn.onreconnected(() => registerHandlers());
      reconnectRegistered.add(conn);
    }

    return () => {
      clearInterval(intervalId);
      const c = getConnection();
      if (c) {
        c.off("ActivityCreated", handleActivityCreated);
        c.off("ActivityUpdated", handleActivityUpdated);
        c.off("ActivityDeleted", handleActivityDeleted);
      }
    };
  }, []);
}
