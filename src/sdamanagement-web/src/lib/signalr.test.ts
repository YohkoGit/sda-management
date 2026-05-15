import { describe, it, expect, vi, beforeEach } from "vitest";
import { HubConnectionState, LogLevel } from "@microsoft/signalr";

// Hoist mock builder so it's available inside vi.mock factory
const mockBuilder = vi.hoisted(() => ({
  withUrl: vi.fn().mockReturnThis(),
  withAutomaticReconnect: vi.fn().mockReturnThis(),
  withServerTimeout: vi.fn().mockReturnThis(),
  withKeepAliveInterval: vi.fn().mockReturnThis(),
  configureLogging: vi.fn().mockReturnThis(),
  build: vi.fn().mockReturnValue({}),
}));

vi.mock("@microsoft/signalr", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@microsoft/signalr")>();
  return {
    ...actual,
    // Regular function (not arrow) so it works as a constructor with `new`
    HubConnectionBuilder: function () {
      return mockBuilder;
    },
  };
});

import {
  stopConnection,
  setConnection,
  startConnection,
  getConnection,
  createConnection,
  onConnectionReady,
} from "./signalr";

beforeEach(() => {
  setConnection(null);
  // Clear call history without resetting implementations
  Object.values(mockBuilder).forEach((fn) => fn.mockClear());
});

describe("signalr", () => {
  describe("createConnection", () => {
    it("builds connection with correct URL, reconnect policy, timeout, and logging", () => {
      createConnection();

      expect(mockBuilder.withUrl).toHaveBeenCalledWith("/hubs/notifications");
      expect(mockBuilder.withAutomaticReconnect).toHaveBeenCalledOnce();
      expect(mockBuilder.withServerTimeout).toHaveBeenCalledWith(60_000);
      expect(mockBuilder.withKeepAliveInterval).toHaveBeenCalledWith(30_000);
      expect(mockBuilder.configureLogging).toHaveBeenCalledWith(LogLevel.Warning);
      expect(mockBuilder.build).toHaveBeenCalledOnce();
    });

    it("retry policy implements exponential backoff capped at 30s", () => {
      createConnection();
      const retryPolicy = mockBuilder.withAutomaticReconnect.mock.calls[0][0];

      expect(
        retryPolicy.nextRetryDelayInMilliseconds({
          previousRetryCount: 0,
          elapsedMilliseconds: 0,
        })
      ).toBe(1000);
      expect(
        retryPolicy.nextRetryDelayInMilliseconds({
          previousRetryCount: 1,
          elapsedMilliseconds: 1000,
        })
      ).toBe(2000);
      expect(
        retryPolicy.nextRetryDelayInMilliseconds({
          previousRetryCount: 2,
          elapsedMilliseconds: 3000,
        })
      ).toBe(4000);
      expect(
        retryPolicy.nextRetryDelayInMilliseconds({
          previousRetryCount: 3,
          elapsedMilliseconds: 7000,
        })
      ).toBe(8000);
      expect(
        retryPolicy.nextRetryDelayInMilliseconds({
          previousRetryCount: 5,
          elapsedMilliseconds: 31000,
        })
      ).toBe(30000);
      // Cap at 30s for high retry counts
      expect(
        retryPolicy.nextRetryDelayInMilliseconds({
          previousRetryCount: 10,
          elapsedMilliseconds: 100000,
        })
      ).toBe(30000);
    });
  });

  describe("stopConnection", () => {
    it("resolves without error when no connection exists", async () => {
      await expect(stopConnection()).resolves.toBeUndefined();
    });

    it("calls connection.stop() when a connection is set and Connected", async () => {
      const mockConnection = {
        state: "Connected",
        stop: vi.fn().mockResolvedValue(undefined),
      };

      setConnection(mockConnection as any);
      await stopConnection();

      expect(mockConnection.stop).toHaveBeenCalledOnce();
    });

    it("does not call stop when connection is Disconnected", async () => {
      const mockConnection = {
        state: "Disconnected",
        stop: vi.fn(),
      };

      setConnection(mockConnection as any);
      await stopConnection();

      expect(mockConnection.stop).not.toHaveBeenCalled();
    });

    it("calls stop for Reconnecting state to prevent resource leak", async () => {
      const mockConnection = {
        state: "Reconnecting",
        stop: vi.fn().mockResolvedValue(undefined),
      };

      setConnection(mockConnection as any);
      await stopConnection();

      expect(mockConnection.stop).toHaveBeenCalledOnce();
    });

    it("calls stop for Connecting state to prevent orphaned connection", async () => {
      const mockConnection = {
        state: "Connecting",
        stop: vi.fn().mockResolvedValue(undefined),
      };

      setConnection(mockConnection as any);
      await stopConnection();

      expect(mockConnection.stop).toHaveBeenCalledOnce();
    });

    it("calls stop for Disconnecting state", async () => {
      const mockConnection = {
        state: "Disconnecting",
        stop: vi.fn().mockResolvedValue(undefined),
      };

      setConnection(mockConnection as any);
      await stopConnection();

      expect(mockConnection.stop).toHaveBeenCalledOnce();

      // Reference cleared — second call is a no-op
      await stopConnection();
      expect(mockConnection.stop).toHaveBeenCalledOnce();
    });

    it("resolves without error when stop() throws", async () => {
      const mockConnection = {
        state: "Connected",
        stop: vi
          .fn()
          .mockRejectedValue(new Error("WebSocket closed unexpectedly")),
      };

      setConnection(mockConnection as any);
      await expect(stopConnection()).resolves.toBeUndefined();
      expect(mockConnection.stop).toHaveBeenCalledOnce();
    });

    it("clears connection reference even when stop() throws", async () => {
      const mockConnection = {
        state: "Connected",
        stop: vi.fn().mockRejectedValue(new Error("Network error")),
      };

      setConnection(mockConnection as any);
      await stopConnection();

      // Second call should be a no-op (connection was cleared despite the error)
      await stopConnection();
      expect(mockConnection.stop).toHaveBeenCalledOnce();
    });

    it("called twice does not call stop the second time", async () => {
      const mockConnection = {
        state: "Connected",
        stop: vi.fn().mockResolvedValue(undefined),
      };

      setConnection(mockConnection as any);
      await stopConnection();
      await stopConnection();

      expect(mockConnection.stop).toHaveBeenCalledOnce();
    });
  });

  describe("startConnection", () => {
    it("starts a disconnected connection", async () => {
      const mockConnection = {
        state: HubConnectionState.Disconnected,
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };

      setConnection(mockConnection as any);
      await startConnection();

      expect(mockConnection.start).toHaveBeenCalledOnce();
    });

    it("does not restart already-connected connection", async () => {
      const mockConnection = {
        state: HubConnectionState.Connected,
        start: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
      };

      setConnection(mockConnection as any);
      await startConnection();

      expect(mockConnection.start).not.toHaveBeenCalled();
    });

    it("swallows start errors", async () => {
      const mockConnection = {
        state: HubConnectionState.Disconnected,
        start: vi.fn().mockRejectedValue(new Error("Connection refused")),
        stop: vi.fn().mockResolvedValue(undefined),
      };

      setConnection(mockConnection as any);
      await expect(startConnection()).resolves.toBeUndefined();
    });
  });

  describe("getConnection", () => {
    it("returns null when no connection is set", () => {
      expect(getConnection()).toBeNull();
    });

    it("returns the current connection when set", () => {
      const mockConnection = { state: "Connected" };
      setConnection(mockConnection as any);
      expect(getConnection()).toBe(mockConnection);
    });
  });

  describe("onConnectionReady", () => {
    // Each test tracks unsubscribers so module-level subscriber state doesn't leak.
    let unsubs: Array<() => void> = [];
    const subscribe = (cb: (c: any) => void) => {
      const u = onConnectionReady(cb);
      unsubs.push(u);
      return u;
    };

    beforeEach(() => {
      // Drain any leftover subscribers from earlier tests just in case
      unsubs.forEach((u) => u());
      unsubs = [];
    });

    it("fires the callback synchronously when a connection already exists", () => {
      const mockConnection = { state: "Connected" };
      setConnection(mockConnection as any);

      const cb = vi.fn();
      subscribe(cb);

      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith(mockConnection);
    });

    it("fires the callback when a connection is installed later via setConnection", () => {
      const cb = vi.fn();
      subscribe(cb);
      expect(cb).not.toHaveBeenCalled();

      const mockConnection = { state: "Disconnected" };
      setConnection(mockConnection as any);

      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith(mockConnection);
    });

    it("does not fire again when setConnection is called with the same connection still present", () => {
      const cb = vi.fn();
      const mockConnection = { state: "Disconnected" };
      setConnection(mockConnection as any);
      subscribe(cb);
      cb.mockClear();

      // setConnection from non-null to a non-null connection should NOT re-notify
      setConnection({ state: "Connected" } as any);
      expect(cb).not.toHaveBeenCalled();
    });

    it("fires again after a clear/reinstall cycle", () => {
      const cb = vi.fn();
      subscribe(cb);

      const conn1 = { state: "Disconnected" };
      setConnection(conn1 as any);
      expect(cb).toHaveBeenCalledTimes(1);

      setConnection(null);
      const conn2 = { state: "Disconnected" };
      setConnection(conn2 as any);

      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenLastCalledWith(conn2);
    });

    it("returns an unsubscribe function that prevents future notifications", () => {
      const cb = vi.fn();
      const unsub = subscribe(cb);

      unsub();

      setConnection({ state: "Disconnected" } as any);
      expect(cb).not.toHaveBeenCalled();
    });

    it("isolates throwing subscribers (other subscribers still fire)", () => {
      const goodCb = vi.fn();
      const badCb = vi.fn(() => {
        throw new Error("boom");
      });
      subscribe(badCb);
      subscribe(goodCb);

      expect(() =>
        setConnection({ state: "Disconnected" } as any),
      ).not.toThrow();
      expect(badCb).toHaveBeenCalledOnce();
      expect(goodCb).toHaveBeenCalledOnce();
    });

    it("startConnection notifies subscribers when it creates the first connection", async () => {
      const cb = vi.fn();
      subscribe(cb);

      await startConnection();

      expect(cb).toHaveBeenCalledOnce();
    });
  });
});
