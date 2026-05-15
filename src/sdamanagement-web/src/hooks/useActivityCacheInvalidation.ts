import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Centralizes the canonical set of activity-related query keys.
 *
 * Why this exists: activity mutations live in 4+ sites (AdminActivitiesPage,
 * DepartmentDetailPage, DayDetailDialog, SignalR event handlers). Each site
 * was invalidating a different subset of keys, which caused stale data after
 * mutations (same risk class as the `assignable-officers` cache-poisoning bug).
 *
 * React-query matches keys by prefix, so invalidating `["activities"]` also
 * matches `["activities", id]`, `["activities", "dashboard"]`,
 * `["activities", "my-assignments"]`, `["activities", { departmentId }]`, etc.
 * Likewise `["auth", "calendar"]` covers year-bucketed
 * `["auth", "calendar", start, end, deptIds]` and `["public", "calendar"]`
 * covers `["public", "calendar", start, end]`.
 */
export function useActivityCacheInvalidation() {
  const queryClient = useQueryClient();

  return useMemo(() => {
    const invalidateAll = async (): Promise<void> => {
      await Promise.all([
        // Activity lists — all variants (by department, dashboard, my-assignments, year buckets, etc.)
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        // Single-activity fetches
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
        // Calendar views (authenticated + public). Year-bucketed keys nest under these prefixes.
        queryClient.invalidateQueries({ queryKey: ["auth", "calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "calendar"] }),
        // Public landing-page caches
        queryClient.invalidateQueries({ queryKey: ["public", "next-activity"] }),
        queryClient.invalidateQueries({
          queryKey: ["public", "upcoming-activities"],
        }),
        // Department staffing rollups depend on activity counts/roles
        queryClient.invalidateQueries({
          queryKey: ["departments", "with-staffing"],
        }),
      ]);
    };

    const invalidateActivity = async (id: number): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["activity", id] }),
        // List views still need refresh because activity title/staffing may have changed
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "calendar"] }),
        queryClient.invalidateQueries({
          queryKey: ["departments", "with-staffing"],
        }),
      ]);
    };

    const invalidateDepartment = async (deptId: number): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["activities", { departmentId: deptId }],
        }),
        // Cross-department views still need to refresh (calendars, dashboards, etc.)
        queryClient.invalidateQueries({ queryKey: ["activities"] }),
        queryClient.invalidateQueries({ queryKey: ["activity"] }),
        queryClient.invalidateQueries({ queryKey: ["auth", "calendar"] }),
        queryClient.invalidateQueries({ queryKey: ["public", "calendar"] }),
        queryClient.invalidateQueries({
          queryKey: ["departments", "with-staffing"],
        }),
      ]);
    };

    return { invalidateAll, invalidateActivity, invalidateDepartment };
  }, [queryClient]);
}
