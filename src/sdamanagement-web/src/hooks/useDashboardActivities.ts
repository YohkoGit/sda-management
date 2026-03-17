import { useQuery } from "@tanstack/react-query";
import { activityService } from "@/services/activityService";
import type { DashboardActivityItem } from "@/services/activityService";

export function useDashboardActivities() {
  return useQuery<DashboardActivityItem[]>({
    queryKey: ["activities", "dashboard"],
    queryFn: () => activityService.getDashboardActivities().then(res => res.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
