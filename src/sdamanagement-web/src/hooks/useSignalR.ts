import { useEffect } from "react";
import { startConnection, stopConnection } from "@/lib/signalr";

export function useSignalR(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;
    void startConnection();
    return () => {
      void stopConnection();
    };
  }, [enabled]);
}
