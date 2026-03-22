import { useEffect } from "react";
import { startConnection, stopConnection } from "@/lib/signalr";

export function useSignalR(): void {
  useEffect(() => {
    void startConnection();
    return () => {
      void stopConnection();
    };
  }, []);
}
