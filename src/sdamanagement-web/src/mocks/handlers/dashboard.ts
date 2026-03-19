import { http, HttpResponse } from "msw";
import type { DashboardActivityItem } from "@/services/activityService";

/** Returns "yyyy-MM-dd" in local timezone, N days from now */
function futureDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const mockDashboardActivities: DashboardActivityItem[] = [
  {
    id: 1,
    title: "Culte Divin",
    date: futureDate(5),
    startTime: "10:00:00",
    endTime: "12:00:00",
    departmentId: 1,
    departmentName: "MIFEM",
    departmentAbbreviation: "MIFEM",
    departmentColor: "#4F46E5",
    visibility: "public",
    specialType: null,
    isMeeting: false,
    predicateurName: "Mario Vicuna",
    predicateurAvatarUrl: null,
    roleCount: 3,
    totalHeadcount: 6,
    assignedCount: 6,
    staffingStatus: "FullyStaffed",
  },
  {
    id: 2,
    title: "Programme JA",
    date: futureDate(19),
    startTime: "14:00:00",
    endTime: "16:00:00",
    departmentId: 2,
    departmentName: "Jeunesse Adventiste",
    departmentAbbreviation: "JA",
    departmentColor: "#10B981",
    visibility: "authenticated",
    specialType: "youth-day",
    isMeeting: false,
    predicateurName: null,
    predicateurAvatarUrl: null,
    roleCount: 2,
    totalHeadcount: 4,
    assignedCount: 2,
    staffingStatus: "PartiallyStaffed",
  },
  {
    id: 3,
    title: "Réunion Diaconat",
    date: futureDate(26),
    startTime: "09:00:00",
    endTime: "10:00:00",
    departmentId: 3,
    departmentName: "Diaconat",
    departmentAbbreviation: "DIA",
    departmentColor: "#F59E0B",
    visibility: "authenticated",
    specialType: null,
    isMeeting: false,
    predicateurName: "Jean Dupont",
    predicateurAvatarUrl: null,
    roleCount: 1,
    totalHeadcount: 1,
    assignedCount: 0,
    staffingStatus: "CriticalGap",
  },
];

export const dashboardHandlers = [
  http.get("/api/activities/dashboard", () => {
    return HttpResponse.json(mockDashboardActivities);
  }),
];

export const dashboardHandlersEmpty = [
  http.get("/api/activities/dashboard", () => {
    return HttpResponse.json([]);
  }),
];

export const dashboardHandlersError = [
  http.get("/api/activities/dashboard", () => {
    return HttpResponse.json(
      { type: "urn:sdac:error", title: "Server Error", status: 500 },
      { status: 500 }
    );
  }),
];
