import { useEffect } from "react";
import { getConnection } from "@/lib/signalr";
import { queryClient } from "@/lib/queryClient";
import type {
  ActivityNotification,
  ActivityDeletedNotification,
} from "@/types/signalr-events";

const ACTIVITY_EVENTS = [
  "ActivityCreated",
  "ActivityUpdated",
  "ActivityDeleted",
] as const;

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

function handleActivityEvent(
  _payload: ActivityNotification | ActivityDeletedNotification,
): void {
  invalidateActivityQueries();
}

function registerHandlers(): void {
  const conn = getConnection();
  if (!conn) return;
  for (const event of ACTIVITY_EVENTS) {
    conn.off(event); // Remove any existing handlers to prevent duplicates
    conn.on(event, handleActivityEvent);
  }
}

// Track connections that already have onreconnected registered.
// WeakSet ensures no memory leak — entries are GC'd when the connection is disposed.
// Prevents duplicate callbacks in React Strict Mode (onreconnected has no removal API).
const reconnectRegistered = new WeakSet<object>();

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
        for (const event of ACTIVITY_EVENTS) {
          c.off(event, handleActivityEvent);
        }
      }
    };
  }, []);
}
