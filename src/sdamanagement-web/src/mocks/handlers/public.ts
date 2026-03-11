import { http, HttpResponse } from "msw";
import type { PublicNextActivity } from "@/types/public";

const mockNextActivity: PublicNextActivity = {
  id: 1,
  title: "Culte du Sabbat",
  date: "2026-03-14",
  startTime: "09:30:00",
  endTime: "12:00:00",
  departmentName: "Culte",
  departmentAbbreviation: "CU",
  departmentColor: "#4F46E5",
  predicateurName: "Jean Dupont",
  predicateurAvatarUrl: null,
  specialType: null,
};

export const publicHandlers = [
  http.get("/api/public/next-activity", () => {
    return HttpResponse.json(mockNextActivity);
  }),
];

export const publicHandlersEmpty = [
  http.get("/api/public/next-activity", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const publicHandlersError = [
  http.get("/api/public/next-activity", () => {
    return new HttpResponse(null, { status: 500 });
  }),
];

export const publicHandlersNoPredicateur = [
  http.get("/api/public/next-activity", () => {
    return HttpResponse.json({
      ...mockNextActivity,
      predicateurName: null,
      predicateurAvatarUrl: null,
    });
  }),
];

export { mockNextActivity };
