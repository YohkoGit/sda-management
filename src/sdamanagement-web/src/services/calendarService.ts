import api from "@/lib/api";
import type { PublicActivityListItem } from "@/types/public";

export const calendarService = {
  getCalendarActivities: (
    start: string,
    end: string,
    departmentIds?: number[]
  ) =>
    api
      .get<PublicActivityListItem[]>("/api/calendar", {
        params: { start, end, departmentIds },
      })
      .then((res) => res.data),
};
