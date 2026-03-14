import { http, HttpResponse } from "msw";
import type { MyAssignmentItem } from "@/types/assignment";

const mockAssignments: MyAssignmentItem[] = [
  {
    activityId: 1,
    activityTitle: "Culte du Sabbat",
    date: "2026-03-21",
    startTime: "10:00:00",
    endTime: "12:00:00",
    departmentName: "MIFEM",
    departmentAbbreviation: "MIFEM",
    departmentColor: "#4F46E5",
    specialType: null,
    roleName: "Diacre",
    coAssignees: [
      {
        userId: 2,
        firstName: "Jean",
        lastName: "Dupont",
        avatarUrl: null,
        isGuest: false,
      },
      {
        userId: 3,
        firstName: "Marie",
        lastName: "Laurent",
        avatarUrl: null,
        isGuest: false,
      },
    ],
  },
  {
    activityId: 2,
    activityTitle: "Programme JA",
    date: "2026-04-04",
    startTime: "14:00:00",
    endTime: "16:00:00",
    departmentName: "Jeunesse Adventiste",
    departmentAbbreviation: "JA",
    departmentColor: "#10B981",
    specialType: "youth-day",
    roleName: "Annonces",
    coAssignees: [],
  },
  {
    activityId: 3,
    activityTitle: "Sainte-Cène",
    date: "2026-04-18",
    startTime: "10:00:00",
    endTime: "12:00:00",
    departmentName: "MIFEM",
    departmentAbbreviation: "MIFEM",
    departmentColor: "#4F46E5",
    specialType: "sainte-cene",
    roleName: "Predicateur",
    coAssignees: [
      {
        userId: 5,
        firstName: "Pasteur",
        lastName: "Invité",
        avatarUrl: null,
        isGuest: true,
      },
    ],
  },
];

export const assignmentHandlers = [
  http.get("/api/activities/my-assignments", () => {
    return HttpResponse.json(mockAssignments);
  }),
];

export const assignmentHandlersEmpty = [
  http.get("/api/activities/my-assignments", () => {
    return HttpResponse.json([]);
  }),
];

export const assignmentHandlersError = [
  http.get("/api/activities/my-assignments", () => {
    return HttpResponse.json(
      { type: "urn:sdac:error", title: "Server Error", status: 500 },
      { status: 500 }
    );
  }),
];
