import { HubConnectionBuilder, HubConnectionState, LogLevel } from "@microsoft/signalr";
import type { HubConnection, IRetryPolicy, RetryContext } from "@microsoft/signalr";

let connection: HubConnection | null = null;

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
  if (!connection) {
    connection = createConnection();
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
  connection = conn;
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
