import { describe, it, expect, vi, beforeEach } from "vitest";
import { stopConnection, setConnection } from "./signalr";

beforeEach(() => {
  // Reset module state between tests by clearing any connection
  setConnection(null);
});

describe("signalr", () => {
  it("stopConnection resolves without error when no connection exists", async () => {
    await expect(stopConnection()).resolves.toBeUndefined();
  });

  it("stopConnection calls connection.stop() when a connection is set and Connected", async () => {
    const mockConnection = {
      state: "Connected",
      stop: vi.fn().mockResolvedValue(undefined),
    };

    setConnection(mockConnection as any);
    await stopConnection();

    expect(mockConnection.stop).toHaveBeenCalledOnce();
  });

  it("stopConnection does not call stop when connection is not in Connected state", async () => {
    const mockConnection = {
      state: "Disconnected",
      stop: vi.fn(),
    };

    setConnection(mockConnection as any);
    await stopConnection();

    expect(mockConnection.stop).not.toHaveBeenCalled();
  });

  it("stopConnection clears stale reference for non-Connected state (Disconnecting)", async () => {
    const mockConnection = {
      state: "Disconnecting",
      stop: vi.fn(),
    };

    setConnection(mockConnection as any);
    await stopConnection();

    // stop() should NOT be called for non-Connected states
    expect(mockConnection.stop).not.toHaveBeenCalled();

    // But the reference should be cleared — second call is a no-op
    await stopConnection();
    expect(mockConnection.stop).not.toHaveBeenCalled();
  });

  it("stopConnection resolves without error when stop() throws", async () => {
    const mockConnection = {
      state: "Connected",
      stop: vi.fn().mockRejectedValue(new Error("WebSocket closed unexpectedly")),
    };

    setConnection(mockConnection as any);
    await expect(stopConnection()).resolves.toBeUndefined();
    expect(mockConnection.stop).toHaveBeenCalledOnce();
  });

  it("stopConnection clears connection reference even when stop() throws", async () => {
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

  it("stopConnection called twice does not call stop the second time", async () => {
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
