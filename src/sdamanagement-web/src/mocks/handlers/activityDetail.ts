import { http, HttpResponse } from "msw";
import type { ActivityResponse } from "@/services/activityService";

export const mockActivityDetail: ActivityResponse = {
  id: 1,
  title: "Culte Divin",
  description: "Service principal du samedi matin",
  date: "2026-03-21",
  startTime: "10:00:00",
  endTime: "12:00:00",
  departmentId: 1,
  departmentName: "Jeunesse Adventiste",
  departmentAbbreviation: "JA",
  departmentColor: "#14B8A6",
  visibility: "public",
  specialType: "Journée de la Femme",
  isMeeting: false,
  roles: [
    {
      id: 1,
      roleName: "Prédicateur",
      headcount: 1,
      sortOrder: 0,
      isCritical: true,
      assignments: [
        { id: 10, userId: 5, firstName: "Mario", lastName: "Vicuna", avatarUrl: null, isGuest: false },
      ],
    },
    {
      id: 2,
      roleName: "Ancien de Service",
      headcount: 1,
      sortOrder: 1,
      isCritical: true,
      assignments: [
        { id: 11, userId: 6, firstName: "Jean", lastName: "Dupont", avatarUrl: null, isGuest: false },
      ],
    },
    {
      id: 3,
      roleName: "Diacres",
      headcount: 3,
      sortOrder: 2,
      isCritical: false,
      assignments: [
        { id: 12, userId: 7, firstName: "Pierre", lastName: "Martin", avatarUrl: null, isGuest: false },
        { id: 13, userId: 8, firstName: "Paul", lastName: "Lefebvre", avatarUrl: null, isGuest: false },
      ],
    },
    {
      id: 4,
      roleName: "Diaconesses",
      headcount: 2,
      sortOrder: 3,
      isCritical: false,
      assignments: [
        { id: 14, userId: 9, firstName: "Pasteur", lastName: "Invité", avatarUrl: null, isGuest: true },
      ],
    },
  ],
  staffingStatus: "PartiallyStaffed",
  concurrencyToken: 42,
  createdAt: "2026-03-01T00:00:00Z",
  updatedAt: "2026-03-01T00:00:00Z",
};

export const activityDetailHandlers = [
  http.get("/api/activities/:id", () => {
    return HttpResponse.json(mockActivityDetail);
  }),
];

export const activityDetailNotFoundHandler = [
  http.get("/api/activities/:id", () => {
    return new HttpResponse(null, { status: 404 });
  }),
];

export const activityDetailErrorHandler = [
  http.get("/api/activities/:id", () => {
    return new HttpResponse(null, { status: 500 });
  }),
];
