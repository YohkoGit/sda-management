import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import type { HubConnection, IRetryPolicy, RetryContext } from "@microsoft/signalr";

let connection: HubConnection | null = null;

// Subscribers are notified the next time setConnection() / startConnection()
// installs a non-null connection. Used by useActivityEvents to register
// handlers without polling — see useActivityEvents.ts.
const readySubscribers = new Set<(conn: HubConnection) => void>();

function notifyReady(conn: HubConnection): void {
  for (const cb of readySubscribers) {
    try {
      cb(conn);
    } catch (e) {
      // A bad subscriber must not break others or the start flow
      console.warn("signalr ready subscriber threw:", e);
    }
  }
}

const retryPolicy: IRetryPolicy = {
  nextRetryDelayInMilliseconds(retryContext: RetryContext): number | null {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s, 30s, ...
    return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
  },
};

export function createConnection(): HubConnection {
  return new HubConnectionBuilder()
    .withUrl("/hubs/notifications")
    .withAutomaticReconnect(retryPolicy)
    .withServerTimeout(60_000)
    .withKeepAliveInterval(30_000)
    .configureLogging(LogLevel.Warning)
    .build();
}

export async function startConnection(): Promise<void> {
  const wasNull = connection === null;
  if (!connection) {
    connection = createConnection();
  }

  // Notify subscribers as soon as the connection object exists — SignalR
  // allows .on() before .start() (handlers queue on the HubConnection),
  // so subscribers can register handlers immediately.
  if (wasNull) {
    notifyReady(connection);
  }

  if (connection.state === HubConnectionState.Disconnected) {
    try {
      await connection.start();
    } catch {
      // Swallow — reconnect policy will handle retries
    }
  }
}

export function setConnection(conn: HubConnection | null): void {
  const wasNull = connection === null;
  connection = conn;
  if (wasNull && conn !== null) {
    notifyReady(conn);
  }
}

/**
 * Register a callback that fires when a connection becomes available.
 * - If a connection already exists, the callback fires synchronously.
 * - Otherwise it fires when startConnection() / setConnection() installs one.
 *
 * Returns an unsubscribe function. Use this instead of polling getConnection().
 */
export function onConnectionReady(
  callback: (conn: HubConnection) => void,
): () => void {
  if (connection) {
    try {
      callback(connection);
    } catch (e) {
      console.warn("signalr ready callback threw:", e);
    }
  }
  readySubscribers.add(callback);
  return () => {
    readySubscribers.delete(callback);
  };
}

export function getConnection(): HubConnection | null {
  return connection;
}

export async function stopConnection(): Promise<void> {
  if (!connection) return;

  const conn = connection;
  connection = null;

  if (conn.state !== HubConnectionState.Disconnected) {
    try {
      await conn.stop();
    } catch {
      // Swallow — logout must complete regardless
    }
  }
}
