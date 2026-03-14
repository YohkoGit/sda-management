import { useQuery } from "@tanstack/react-query";
import { activityService } from "@/services/activityService";
import type { MyAssignmentItem } from "@/types/assignment";

export function useMyAssignments() {
  return useQuery<MyAssignmentItem[]>({
    queryKey: ["activities", "my-assignments"],
    queryFn: () => activityService.getMyAssignments().then(res => res.data),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
