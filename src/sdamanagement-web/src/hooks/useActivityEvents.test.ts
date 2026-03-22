import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActivityEvents } from "./useActivityEvents";

let mockOn: ReturnType<typeof vi.fn>;
let mockOff: ReturnType<typeof vi.fn>;
let mockOnreconnected: ReturnType<typeof vi.fn>;
let mockConnection: { on: typeof mockOn; off: typeof mockOff; onreconnected: typeof mockOnreconnected };

vi.mock("@/lib/signalr", () => ({
  getConnection: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn(() => Promise.resolve()),
  },
}));

import { getConnection } from "@/lib/signalr";
import { queryClient } from "@/lib/queryClient";

const mockedGetConnection = vi.mocked(getConnection);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Fresh mock connection per test — ensures WeakSet guard doesn't persist across tests
  mockOn = vi.fn();
  mockOff = vi.fn();
  mockOnreconnected = vi.fn();
  mockConnection = { on: mockOn, off: mockOff, onreconnected: mockOnreconnected };
  mockedGetConnection.mockReturnValue(mockConnection as never);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useActivityEvents", () => {
  it("registers event handlers on mount", () => {
    renderHook(() => useActivityEvents());

    expect(mockOn).toHaveBeenCalledWith("ActivityCreated", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("ActivityUpdated", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("ActivityDeleted", expect.any(Function));
  });

  it("removes existing handlers before registering to prevent duplicates", () => {
    renderHook(() => useActivityEvents());

    // off is called before on for each event
    expect(mockOff).toHaveBeenCalledWith("ActivityCreated");
    expect(mockOff).toHaveBeenCalledWith("ActivityUpdated");
    expect(mockOff).toHaveBeenCalledWith("ActivityDeleted");
  });

  it("unregisters event handlers on unmount", () => {
    const { unmount } = renderHook(() => useActivityEvents());

    vi.clearAllMocks();
    unmount();

    expect(mockOff).toHaveBeenCalledWith("ActivityCreated", expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith("ActivityUpdated", expect.any(Function));
    expect(mockOff).toHaveBeenCalledWith("ActivityDeleted", expect.any(Function));
  });

  it("ActivityCreated handler invalidates correct queries", () => {
    renderHook(() => useActivityEvents());

    // Extract the handler registered for ActivityCreated
    const handler = mockOn.mock.calls.find(
      (call) => call[0] === "ActivityCreated",
    )?.[1];
    expect(handler).toBeDefined();

    // Simulate receiving an event
    handler!({ activityId: 1, title: "Test", timestamp: new Date().toISOString() });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["activities"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["activity"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["auth", "calendar"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["public", "calendar"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["public", "next-activity"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["public", "upcoming-activities"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["departments", "with-staffing"] });
  });

  it("ActivityUpdated handler invalidates correct queries", () => {
    renderHook(() => useActivityEvents());

    const handler = mockOn.mock.calls.find(
      (call) => call[0] === "ActivityUpdated",
    )?.[1];
    expect(handler).toBeDefined();

    handler!({ activityId: 1, updatedFields: "title,roles", timestamp: new Date().toISOString() });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["activities"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["activity"] });
  });

  it("ActivityDeleted handler invalidates correct queries", () => {
    renderHook(() => useActivityEvents());

    const handler = mockOn.mock.calls.find(
      (call) => call[0] === "ActivityDeleted",
    )?.[1];
    expect(handler).toBeDefined();

    handler!({ activityId: 1, timestamp: new Date().toISOString() });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["activities"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["activity"] });
  });

  it("handles null connection gracefully", () => {
    mockedGetConnection.mockReturnValue(null);

    expect(() => renderHook(() => useActivityEvents())).not.toThrow();
  });

  it("registers handlers via interval when connection becomes available later", () => {
    // Start with null connection
    mockedGetConnection.mockReturnValue(null);
    renderHook(() => useActivityEvents());

    // No handlers registered yet
    expect(mockOn).not.toHaveBeenCalled();

    // Connection becomes available
    mockedGetConnection.mockReturnValue(mockConnection as never);
    vi.advanceTimersByTime(100);

    // Now handlers should be registered
    expect(mockOn).toHaveBeenCalledWith("ActivityCreated", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("ActivityUpdated", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("ActivityDeleted", expect.any(Function));
  });

  it("registers onreconnected callback", () => {
    renderHook(() => useActivityEvents());

    expect(mockOnreconnected).toHaveBeenCalledWith(expect.any(Function));
  });
});
