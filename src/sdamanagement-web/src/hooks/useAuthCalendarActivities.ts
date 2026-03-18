import { useQuery } from "@tanstack/react-query";
import { calendarService } from "@/services/calendarService";
import type { PublicActivityListItem } from "@/types/public";

export function useAuthCalendarActivities(
  start: string,
  end: string,
  departmentIds?: number[]
) {
  return useQuery<PublicActivityListItem[]>({
    queryKey: ["auth", "calendar", start, end, departmentIds ?? []],
    queryFn: () =>
      calendarService.getCalendarActivities(start, end, departmentIds),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!start && !!end,
  });
}
