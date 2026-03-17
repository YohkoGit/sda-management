import { useQuery } from "@tanstack/react-query";
import { activityService, type ActivityResponse } from "@/services/activityService";

export function useActivity(id: number | undefined) {
  return useQuery<ActivityResponse>({
    queryKey: ["activities", id],
    queryFn: () => activityService.getById(id!).then(res => res.data),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
