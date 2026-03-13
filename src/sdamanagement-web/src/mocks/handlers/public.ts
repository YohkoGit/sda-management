import { http, HttpResponse } from "msw";
import type { PublicNextActivity, LiveStatus, PublicActivityListItem, PublicProgramSchedule } from "@/types/public";

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

const mockUpcomingActivities: PublicActivityListItem[] = [
  {
    id: 2,
    title: "Culte du Sabbat",
    date: "2026-03-14",
    startTime: "09:30:00",
    endTime: "12:00:00",
    departmentName: "Culte",
    departmentAbbreviation: "CU",
    departmentColor: "#F43F5E",
    predicateurName: "Jean Dupont",
    predicateurAvatarUrl: null,
    specialType: null,
  },
  {
    id: 3,
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
    id: 4,
    title: "Sabbat de la Jeunesse",
    date: "2026-03-21",
    startTime: "09:30:00",
    endTime: "12:00:00",
    departmentName: "Jeunesse Adventiste",
    departmentAbbreviation: "JA",
    departmentColor: "#14B8A6",
    predicateurName: "Marie Lafleur",
    predicateurAvatarUrl: null,
    specialType: "youth-day",
  },
];

const mockProgramSchedules: PublicProgramSchedule[] = [
  {
    title: "École du Sabbat",
    dayOfWeek: 6,
    startTime: "09:30:00",
    endTime: "10:30:00",
    hostName: "Pierre Martin",
    departmentName: "Culte",
    departmentColor: "#F43F5E",
  },
  {
    title: "Culte Divin",
    dayOfWeek: 6,
    startTime: "11:00:00",
    endTime: "12:30:00",
    hostName: null,
    departmentName: "Culte",
    departmentColor: "#F43F5E",
  },
  {
    title: "Programme AY",
    dayOfWeek: 6,
    startTime: "14:00:00",
    endTime: "16:00:00",
    hostName: "Sophie Bernard",
    departmentName: "Jeunesse Adventiste",
    departmentColor: "#14B8A6",
  },
];

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

export const upcomingActivitiesHandlers = [
  http.get("/api/public/upcoming-activities", () =>
    HttpResponse.json(mockUpcomingActivities)
  ),
];

export const upcomingActivitiesHandlersEmpty = [
  http.get("/api/public/upcoming-activities", () =>
    HttpResponse.json([])
  ),
];

export const upcomingActivitiesHandlersError = [
  http.get("/api/public/upcoming-activities", () =>
    new HttpResponse(null, { status: 500 })
  ),
];

export const programScheduleHandlers = [
  http.get("/api/public/program-schedules", () =>
    HttpResponse.json(mockProgramSchedules)
  ),
];

export const programScheduleHandlersEmpty = [
  http.get("/api/public/program-schedules", () =>
    HttpResponse.json([])
  ),
];

export const programScheduleHandlersError = [
  http.get("/api/public/program-schedules", () =>
    new HttpResponse(null, { status: 500 })
  ),
];

export { mockNextActivity, mockUpcomingActivities, mockProgramSchedules };
