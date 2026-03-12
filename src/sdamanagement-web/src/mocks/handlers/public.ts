import { http, HttpResponse } from "msw";
import type { PublicNextActivity, LiveStatus } from "@/types/public";

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

const mockLiveStatusNotLive: LiveStatus = {
  isLive: false,
  liveVideoId: null,
  liveTitle: null,
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

export const liveStatusHandlers = [
  http.get("/api/public/live-status", () => {
    return HttpResponse.json(mockLiveStatusNotLive);
  }),
];

export const liveStatusHandlersLive = [
  http.get("/api/public/live-status", () => {
    return HttpResponse.json({
      isLive: true,
      liveVideoId: "dQw4w9WgXcQ",
      liveTitle: "Culte du Sabbat — En Direct",
    });
  }),
];

export const liveStatusHandlersError = [
  http.get("/api/public/live-status", () => {
    return new HttpResponse(null, { status: 500 });
  }),
];

export { mockNextActivity };
