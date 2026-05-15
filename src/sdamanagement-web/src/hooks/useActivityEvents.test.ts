import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useActivityEvents } from "./useActivityEvents";

let mockOn: ReturnType<typeof vi.fn>;
let mockOff: ReturnType<typeof vi.fn>;
let mockOnreconnected: ReturnType<typeof vi.fn>;
let mockConnection: { on: typeof mockOn; off: typeof mockOff; onreconnected: typeof mockOnreconnected };
// Captures the latest subscriber passed to onConnectionReady so tests can
// simulate deferred connection arrival.
let pendingReadyCallback: ((conn: unknown) => void) | null = null;
let unsubscribeSpy: ReturnType<typeof vi.fn>;

vi.mock("@/lib/signalr", () => ({
  getConnection: vi.fn(),
  onConnectionReady: vi.fn(),
}));

vi.mock("@/lib/queryClient", () => ({
  queryClient: {
    invalidateQueries: vi.fn(() => Promise.resolve()),
  },
}));

const mockMarkModified = vi.fn();
const mockCleanupExpired = vi.fn();
vi.mock("@/stores/modifiedBadgeStore", () => ({
  useModifiedBadgeStore: {
    getState: () => ({
      markModified: mockMarkModified,
      cleanupExpired: mockCleanupExpired,
    }),
  },
}));

import { getConnection, onConnectionReady } from "@/lib/signalr";
import { queryClient } from "@/lib/queryClient";

const mockedGetConnection = vi.mocked(getConnection);
const mockedOnConnectionReady = vi.mocked(onConnectionReady);

beforeEach(() => {
  vi.clearAllMocks();
  // Fresh mock connection per test — ensures WeakSet guard doesn't persist across tests
  mockOn = vi.fn();
  mockOff = vi.fn();
  mockOnreconnected = vi.fn();
  mockConnection = { on: mockOn, off: mockOff, onreconnected: mockOnreconnected };
  mockedGetConnection.mockReturnValue(mockConnection as never);
  pendingReadyCallback = null;
  unsubscribeSpy = vi.fn();
  // Default: invoke callback synchronously with the mock connection (mimicking
  // signalr.ts behavior when a connection already exists at subscribe time).
  mockedOnConnectionReady.mockImplementation(((cb: (conn: unknown) => void) => {
    pendingReadyCallback = cb;
    cb(mockConnection);
    return unsubscribeSpy as unknown as () => void;
  }) as never);
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
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["auth", "calendar"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["public", "calendar"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["public", "next-activity"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["public", "upcoming-activities"] });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["departments", "with-staffing"] });
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
    // Subscribe defers: never fires the callback. Hook must still mount cleanly.
    mockedOnConnectionReady.mockImplementation(((cb: (conn: unknown) => void) => {
      pendingReadyCallback = cb;
      return unsubscribeSpy as unknown as () => void;
    }) as never);

    expect(() => renderHook(() => useActivityEvents())).not.toThrow();
  });

  it("registers handlers via onConnectionReady subscription when connection arrives later", () => {
    // Start with no connection yet — subscribe but don't fire callback
    mockedGetConnection.mockReturnValue(null);
    mockedOnConnectionReady.mockImplementation(((cb: (conn: unknown) => void) => {
      pendingReadyCallback = cb;
      return unsubscribeSpy as unknown as () => void;
    }) as never);

    renderHook(() => useActivityEvents());

    // No handlers registered yet
    expect(mockOn).not.toHaveBeenCalled();
    expect(pendingReadyCallback).not.toBeNull();

    // Connection becomes available — signalr.ts would now fire the callback
    mockedGetConnection.mockReturnValue(mockConnection as never);
    pendingReadyCallback!(mockConnection as never);

    expect(mockOn).toHaveBeenCalledWith("ActivityCreated", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("ActivityUpdated", expect.any(Function));
    expect(mockOn).toHaveBeenCalledWith("ActivityDeleted", expect.any(Function));
  });

  it("unsubscribes from onConnectionReady on unmount", () => {
    const { unmount } = renderHook(() => useActivityEvents());
    unmount();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it("registers onreconnected callback", () => {
    renderHook(() => useActivityEvents());

    expect(mockOnreconnected).toHaveBeenCalledWith(expect.any(Function));
  });

  it("ActivityUpdated handler calls markModified with activityId", () => {
    renderHook(() => useActivityEvents());

    const handler = mockOn.mock.calls.find(
      (call) => call[0] === "ActivityUpdated",
    )?.[1];
    expect(handler).toBeDefined();

    handler!({ activityId: 42, updatedFields: "title", timestamp: new Date().toISOString() });

    expect(mockMarkModified).toHaveBeenCalledWith(42);
  });

  it("ActivityCreated handler does NOT call markModified", () => {
    renderHook(() => useActivityEvents());

    const handler = mockOn.mock.calls.find(
      (call) => call[0] === "ActivityCreated",
    )?.[1];
    expect(handler).toBeDefined();

    handler!({ activityId: 1, title: "Test", timestamp: new Date().toISOString() });

    expect(mockMarkModified).not.toHaveBeenCalled();
  });

  it("ActivityDeleted handler does NOT call markModified", () => {
    renderHook(() => useActivityEvents());

    const handler = mockOn.mock.calls.find(
      (call) => call[0] === "ActivityDeleted",
    )?.[1];
    expect(handler).toBeDefined();

    handler!({ activityId: 1, timestamp: new Date().toISOString() });

    expect(mockMarkModified).not.toHaveBeenCalled();
  });

  it("cleanupExpired called on mount", () => {
    renderHook(() => useActivityEvents());

    expect(mockCleanupExpired).toHaveBeenCalled();
  });
});
