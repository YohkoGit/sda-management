import { http, HttpResponse } from "msw";
import type { PublicActivityListItem } from "@/types/public";

const mockAuthCalendarActivities: PublicActivityListItem[] = [
  {
    id: 201,
    title: "Culte du Sabbat",
    date: "2026-03-14",
    startTime: "09:30:00",
    endTime: "12:00:00",
    departmentName: "Culte",
    departmentAbbreviation: "CU",
    departmentColor: "#F43F5E",
    predicateurName: "Pasteur Vicuna",
    predicateurAvatarUrl: null,
    specialType: null,
  },
  {
    id: 202,
    title: "Programme JA",
    date: "2026-03-14",
    startTime: "14:00:00",
    endTime: "16:00:00",
    departmentName: "Jeunesse Adventiste",
    departmentAbbreviation: "JA",
    departmentColor: "#14B8A6",
    predicateurName: null,
    predicateurAvatarUrl: null,
    specialType: null,
  },
  {
    id: 203,
    title: "Reunion Comite",
    date: "2026-03-18",
    startTime: "19:00:00",
    endTime: "21:00:00",
    departmentName: "Culte",
    departmentAbbreviation: "CU",
    departmentColor: "#F43F5E",
    predicateurName: null,
    predicateurAvatarUrl: null,
    specialType: null,
  },
];

/** Maps department abbreviation → mock department ID, derived from test mock data. */
const mockDeptAbbrToId: Record<string, number> = { CU: 1, JA: 2, MIFEM: 3 };

export const authCalendarHandlers = [
  http.get("/api/calendar", ({ request }) => {
    const url = new URL(request.url);
    const departmentIds = url.searchParams.getAll("departmentIds");

    if (departmentIds.length > 0) {
      // Mock activities use id as their dept ID (201→dept1, 202→dept2, etc.)
      // Filter by matching mock activity id to approximate dept filtering
      const filtered = mockAuthCalendarActivities.filter((a) => {
        // Map activity to its mock department ID based on abbreviation
        const deptId = mockDeptAbbrToId[a.departmentAbbreviation ?? ""];
        return deptId !== undefined && departmentIds.includes(String(deptId));
      });
      return HttpResponse.json(filtered);
    }

    return HttpResponse.json(mockAuthCalendarActivities);
  }),
];

export const authCalendarHandlersEmpty = [
  http.get("/api/calendar", () => HttpResponse.json([])),
];

export const authCalendarHandlersError = [
  http.get("/api/calendar", () => new HttpResponse(null, { status: 500 })),
];

export { mockAuthCalendarActivities };
