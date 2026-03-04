import { HubConnectionState } from "@microsoft/signalr";
import type { HubConnection } from "@microsoft/signalr";

let connection: HubConnection | null = null;

export function setConnection(conn: HubConnection | null): void {
  connection = conn;
}

export async function stopConnection(): Promise<void> {
  if (!connection) return;

  if (connection.state === HubConnectionState.Connected) {
    try {
      await connection.stop();
    } catch {
      // Swallow — logout must complete regardless
    }
  }
  connection = null;
}
