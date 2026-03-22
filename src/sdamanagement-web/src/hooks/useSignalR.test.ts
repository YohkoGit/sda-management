import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSignalR } from "./useSignalR";

vi.mock("@/lib/signalr", () => ({
  startConnection: vi.fn(),
  stopConnection: vi.fn(),
}));

import { startConnection, stopConnection } from "@/lib/signalr";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSignalR", () => {
  it("starts connection on mount", () => {
    renderHook(() => useSignalR());
    expect(startConnection).toHaveBeenCalledOnce();
  });

  it("stops connection on unmount", () => {
    const { unmount } = renderHook(() => useSignalR());
    unmount();
    expect(stopConnection).toHaveBeenCalledOnce();
  });

  it("does not restart connection on re-render", () => {
    const { rerender } = renderHook(() => useSignalR());
    rerender();
    expect(startConnection).toHaveBeenCalledOnce();
  });
});
