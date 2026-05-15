import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useActivityCacheInvalidation } from "./useActivityCacheInvalidation";

function makeWrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
}

let client: QueryClient;
let invalidateSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  client = new QueryClient();
  invalidateSpy = vi
    .spyOn(client, "invalidateQueries")
    .mockResolvedValue(undefined);
});

function getInvalidatedKeys(): unknown[][] {
  return invalidateSpy.mock.calls.map(
    (c: unknown[]) => (c[0] as { queryKey: unknown[] }).queryKey,
  );
}

describe("useActivityCacheInvalidation", () => {
  it("returns a stable object across renders", () => {
    const { result, rerender } = renderHook(
      () => useActivityCacheInvalidation(),
      { wrapper: makeWrapper(client) },
    );
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    expect(result.current.invalidateAll).toBe(first.invalidateAll);
    expect(result.current.invalidateActivity).toBe(first.invalidateActivity);
    expect(result.current.invalidateDepartment).toBe(first.invalidateDepartment);
  });

  describe("invalidateAll", () => {
    it("invalidates every canonical activity-related key", async () => {
      const { result } = renderHook(() => useActivityCacheInvalidation(), {
        wrapper: makeWrapper(client),
      });

      await result.current.invalidateAll();

      const keys = getInvalidatedKeys();
      expect(keys).toEqual(
        expect.arrayContaining([
          ["activities"],
          ["activity"],
          ["auth", "calendar"],
          ["public", "calendar"],
          ["public", "next-activity"],
          ["public", "upcoming-activities"],
          ["departments", "with-staffing"],
        ]),
      );
      expect(keys).toHaveLength(7);
    });

    it("includes departments/with-staffing (closes AdminActivitiesPage bug)", async () => {
      const { result } = renderHook(() => useActivityCacheInvalidation(), {
        wrapper: makeWrapper(client),
      });

      await result.current.invalidateAll();

      const keys = getInvalidatedKeys();
      expect(keys).toContainEqual(["departments", "with-staffing"]);
    });

    it("returns a promise that resolves after all invalidations settle", async () => {
      const { result } = renderHook(() => useActivityCacheInvalidation(), {
        wrapper: makeWrapper(client),
      });

      const promise = result.current.invalidateAll();
      expect(promise).toBeInstanceOf(Promise);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe("invalidateActivity", () => {
    it("invalidates the specific activity plus refresh-affected lists", async () => {
      const { result } = renderHook(() => useActivityCacheInvalidation(), {
        wrapper: makeWrapper(client),
      });

      await result.current.invalidateActivity(42);

      const keys = getInvalidatedKeys();
      expect(keys).toContainEqual(["activity", 42]);
      expect(keys).toContainEqual(["activities"]);
      expect(keys).toContainEqual(["auth", "calendar"]);
      expect(keys).toContainEqual(["public", "calendar"]);
      expect(keys).toContainEqual(["departments", "with-staffing"]);
    });
  });

  describe("invalidateDepartment", () => {
    it("invalidates the department-scoped list, the broad list, and rollups", async () => {
      const { result } = renderHook(() => useActivityCacheInvalidation(), {
        wrapper: makeWrapper(client),
      });

      await result.current.invalidateDepartment(7);

      const keys = getInvalidatedKeys();
      expect(keys).toContainEqual(["activities", { departmentId: 7 }]);
      expect(keys).toContainEqual(["activities"]);
      expect(keys).toContainEqual(["activity"]);
      expect(keys).toContainEqual(["auth", "calendar"]);
      expect(keys).toContainEqual(["public", "calendar"]);
      expect(keys).toContainEqual(["departments", "with-staffing"]);
    });
  });
});
