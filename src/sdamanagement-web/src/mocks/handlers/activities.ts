import { http, HttpResponse } from "msw";
import type {
  ActivityListItem,
  ActivityResponse,
  ActivityRoleResponse,
} from "@/services/activityService";
import type { ActivityTemplateListItem } from "@/services/activityTemplateService";
import { mockGuestUserIds } from "./users";

const mockActivities: ActivityResponse[] = [
  {
    id: 1,
    title: "Culte du Sabbat",
    description: "Service principal du samedi matin",
    date: "2026-03-07",
    startTime: "10:00:00",
    endTime: "12:00:00",
    departmentId: 1,
    departmentName: "MIFEM",
    departmentAbbreviation: "MIFEM",
    departmentColor: "#4F46E5",
    visibility: "public",
    specialType: "sainte-cene",
    isMeeting: false,
    roles: [
      {
        id: 1,
        roleName: "Predicateur",
        headcount: 1,
        sortOrder: 0,
        isCritical: true,
        assignments: [],
      },
      {
        id: 2,
        roleName: "Ancien de Service",
        headcount: 1,
        sortOrder: 1,
        isCritical: true,
        assignments: [
          { id: 10, userId: 5, firstName: "Jean", lastName: "Dupont", avatarUrl: null, isGuest: false },
        ],
      },
    ],
    staffingStatus: "CriticalGap",
    concurrencyToken: 42,
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-03-01T00:00:00Z",
  },
  {
    id: 2,
    title: "Reunion JA",
    description: null,
    date: "2026-03-07",
    startTime: "14:00:00",
    endTime: "16:00:00",
    departmentId: 2,
    departmentName: "Jeunesse Adventiste",
    departmentAbbreviation: "JA",
    departmentColor: "#10B981",
    visibility: "authenticated",
    specialType: null,
    isMeeting: false,
    roles: [],
    staffingStatus: "NoRoles",
    concurrencyToken: 43,
    createdAt: "2026-03-02T00:00:00Z",
    updatedAt: "2026-03-02T00:00:00Z",
  },
  {
    id: 3,
    title: "Ecole du Sabbat",
    description: "Étude biblique du matin",
    date: "2026-03-14",
    startTime: "09:00:00",
    endTime: "10:00:00",
    departmentId: 1,
    departmentName: "MIFEM",
    departmentAbbreviation: "MIFEM",
    departmentColor: "#4F46E5",
    visibility: "public",
    specialType: null,
    isMeeting: false,
    roles: [
      {
        id: 5,
        roleName: "Predicateur",
        headcount: 1,
        sortOrder: 0,
        isCritical: true,
        assignments: [
          { id: 20, userId: 3, firstName: "Marie", lastName: "Blanc", avatarUrl: null, isGuest: false },
        ],
      },
      {
        id: 6,
        roleName: "Ancien de Service",
        headcount: 1,
        sortOrder: 1,
        isCritical: true,
        assignments: [
          { id: 21, userId: 5, firstName: "Jean", lastName: "Dupont", avatarUrl: null, isGuest: false },
        ],
      },
    ],
    staffingStatus: "FullyStaffed",
    concurrencyToken: 44,
    createdAt: "2026-03-03T00:00:00Z",
    updatedAt: "2026-03-03T00:00:00Z",
  },
  {
    id: 4,
    title: "Veillée de Prière",
    description: null,
    date: "2026-03-14",
    startTime: "19:00:00",
    endTime: "21:00:00",
    departmentId: 1,
    departmentName: "MIFEM",
    departmentAbbreviation: "MIFEM",
    departmentColor: "#4F46E5",
    visibility: "authenticated",
    specialType: null,
    isMeeting: false,
    roles: [
      {
        id: 7,
        roleName: "Predicateur",
        headcount: 1,
        sortOrder: 0,
        isCritical: true,
        assignments: [
          { id: 30, userId: 3, firstName: "Marie", lastName: "Blanc", avatarUrl: null, isGuest: false },
        ],
      },
      {
        id: 8,
        roleName: "Diacres",
        headcount: 3,
        sortOrder: 1,
        isCritical: false,
        assignments: [
          { id: 31, userId: 5, firstName: "Jean", lastName: "Dupont", avatarUrl: null, isGuest: false },
        ],
      },
    ],
    staffingStatus: "PartiallyStaffed",
    concurrencyToken: 45,
    createdAt: "2026-03-04T00:00:00Z",
    updatedAt: "2026-03-04T00:00:00Z",
  },
  {
    id: 5,
    title: "Réunion du comité",
    description: null,
    date: "2026-03-25",
    startTime: "19:00:00",
    endTime: "20:30:00",
    departmentId: 1,
    departmentName: "MIFEM",
    departmentAbbreviation: "MIFEM",
    departmentColor: "#4F46E5",
    visibility: "authenticated",
    specialType: null,
    isMeeting: true,
    meetingType: "zoom",
    zoomLink: "https://zoom.us/j/123456789",
    roles: [],
    staffingStatus: "NoRoles",
    concurrencyToken: 50,
    createdAt: "2026-03-10T00:00:00Z",
    updatedAt: "2026-03-10T00:00:00Z",
  },
  {
    id: 6,
    title: "Réunion de planification",
    description: null,
    date: "2026-03-27",
    startTime: "18:30:00",
    endTime: "20:00:00",
    departmentId: 1,
    departmentName: "MIFEM",
    departmentAbbreviation: "MIFEM",
    departmentColor: "#4F46E5",
    visibility: "authenticated",
    specialType: null,
    isMeeting: true,
    meetingType: "physical",
    locationName: "Salle communautaire",
    locationAddress: "123 rue Principale",
    roles: [],
    staffingStatus: "NoRoles",
    concurrencyToken: 51,
    createdAt: "2026-03-10T00:00:00Z",
    updatedAt: "2026-03-10T00:00:00Z",
  },
];

const computeStaffingStatus = (roles: ActivityRoleResponse[]): string => {
  const totalHeadcount = roles.reduce((sum, r) => sum + r.headcount, 0);
  if (totalHeadcount === 0) return "NoRoles";
  const hasCriticalGap = roles.some(
    (r) => r.isCritical && r.assignments.length === 0,
  );
  if (hasCriticalGap) return "CriticalGap";
  const assignedCount = roles.reduce((sum, r) => sum + r.assignments.length, 0);
  if (assignedCount >= totalHeadcount) return "FullyStaffed";
  return "PartiallyStaffed";
};

const toListItem = (a: ActivityResponse): ActivityListItem => ({
  id: a.id,
  title: a.title,
  date: a.date,
  startTime: a.startTime,
  endTime: a.endTime,
  departmentId: a.departmentId,
  departmentName: a.departmentName,
  departmentColor: a.departmentId === 1 ? "#4F46E5" : "#10B981",
  visibility: a.visibility,
  specialType: a.specialType,
  isMeeting: a.isMeeting,
  meetingType: a.meetingType,
  locationName: a.locationName,
  roleCount: a.roles.length,
  totalHeadcount: a.roles.reduce((sum, r) => sum + r.headcount, 0),
  assignedCount: a.roles.reduce((sum, r) => sum + r.assignments.length, 0),
  staffingStatus: computeStaffingStatus(a.roles),
  createdAt: a.createdAt,
});

const mockTemplates: ActivityTemplateListItem[] = [
  {
    id: 1,
    name: "Culte du Sabbat",
    description: "Service principal du samedi matin",
    roleSummary: "Predicateur (1), Ancien de Service (1), Diacres (2)",
    roleCount: 3,
    roles: [
      { id: 1, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0, isCritical: true, isPredicateur: true },
      { id: 2, roleName: "Ancien de Service", defaultHeadcount: 1, sortOrder: 1, isCritical: true, isPredicateur: false },
      { id: 3, roleName: "Diacres", defaultHeadcount: 2, sortOrder: 2, isCritical: false, isPredicateur: false },
    ],
  },
  {
    id: 2,
    name: "Sainte-Cene",
    description: "Service avec communion",
    roleSummary: "Predicateur (1), Ancien (1), Lavement (4)",
    roleCount: 3,
    roles: [
      { id: 4, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0, isCritical: true, isPredicateur: true },
      { id: 5, roleName: "Ancien", defaultHeadcount: 1, sortOrder: 1, isCritical: true, isPredicateur: false },
      { id: 6, roleName: "Lavement", defaultHeadcount: 4, sortOrder: 2, isCritical: false, isPredicateur: false },
    ],
  },
];

const templateRolesToActivityRoles = (
  templateId: number
): ActivityRoleResponse[] => {
  const template = mockTemplates.find((t) => t.id === templateId);
  if (!template) return [];
  return template.roles.map((r, i) => ({
    id: 100 + i,
    roleName: r.roleName,
    headcount: r.defaultHeadcount,
    sortOrder: r.sortOrder,
    isCritical: r.isCritical,
    assignments: [],
  }));
};

export const activityHandlers = [
  http.get("/api/activities", ({ request }) => {
    const url = new URL(request.url);
    const deptId = url.searchParams.get("departmentId");
    const items = deptId
      ? mockActivities.filter((a) => a.departmentId === Number(deptId)).map(toListItem)
      : mockActivities.map(toListItem);
    return HttpResponse.json(items);
  }),

  http.get("/api/activities/:id", ({ params }) => {
    const id = Number(params.id);
    const activity = mockActivities.find((a) => a.id === id);
    if (!activity) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(activity);
  }),

  http.post("/api/activities", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const explicitRoles = body.roles as Array<{ roleName: string; headcount: number; isCritical?: boolean; assignments?: Array<{ userId: number }> }> | undefined;
    const templateId = body.templateId as number | undefined;

    let roles: ActivityRoleResponse[];
    if (explicitRoles && explicitRoles.length > 0) {
      roles = explicitRoles.map((r, i) => ({
        id: 200 + i,
        roleName: r.roleName,
        headcount: r.headcount,
        sortOrder: i,
        isCritical: r.isCritical ?? false,
        assignments: (r.assignments ?? []).map((a, j) => ({
          id: 500 + i * 10 + j,
          userId: a.userId,
          firstName: "User",
          lastName: `${a.userId}`,
          avatarUrl: null,
          isGuest: mockGuestUserIds.has(a.userId),
        })),
      }));
    } else if (templateId) {
      roles = templateRolesToActivityRoles(templateId);
    } else {
      roles = [];
    }

    const isMeeting = (body.isMeeting as boolean) ?? false;

    const created: ActivityResponse = {
      id: 99,
      title: body.title as string,
      description: (body.description as string) ?? null,
      date: body.date as string,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
      departmentId: body.departmentId as number,
      departmentName: "MIFEM",
      departmentAbbreviation: "MIFEM",
      departmentColor: "#4F46E5",
      visibility: body.visibility as string,
      specialType: (body.specialType as string | null) ?? null,
      isMeeting,
      ...(isMeeting ? {
        meetingType: body.meetingType as string,
        zoomLink: (body.zoomLink as string) || undefined,
        locationName: (body.locationName as string) || undefined,
        locationAddress: (body.locationAddress as string) || undefined,
      } : {}),
      roles,
      staffingStatus: computeStaffingStatus(roles),
      concurrencyToken: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put("/api/activities/:id", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const id = Number(params.id);
    const existing = mockActivities.find((a) => a.id === id);
    const requestRoles = body.roles as Array<{ id?: number; roleName: string; headcount: number; isCritical?: boolean; assignments?: Array<{ userId: number }> | null }> | undefined;

    let roles: ActivityRoleResponse[];
    if (requestRoles !== undefined) {
      roles = requestRoles.map((r, i) => {
        const existingRole = r.id ? existing?.roles.find((er) => er.id === r.id) : undefined;
        // Null assignments = don't modify, undefined = don't modify, array = replace
        const assignments = r.assignments !== undefined && r.assignments !== null
          ? r.assignments.map((a, j) => ({
              id: 600 + i * 10 + j,
              userId: a.userId,
              firstName: "User",
              lastName: `${a.userId}`,
              avatarUrl: null,
              isGuest: mockGuestUserIds.has(a.userId),
            }))
          : existingRole?.assignments ?? [];
        return {
          id: r.id ?? 300 + i,
          roleName: r.roleName,
          headcount: r.headcount,
          sortOrder: i,
          isCritical: r.isCritical ?? existingRole?.isCritical ?? false,
          assignments,
        };
      });
    } else {
      roles = existing?.roles ?? [];
    }

    const isMeetingUpdate = (body.isMeeting as boolean) ?? false;

    const updated: ActivityResponse = {
      id,
      title: body.title as string,
      description: (body.description as string) ?? null,
      date: body.date as string,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
      departmentId: body.departmentId as number,
      departmentName: "MIFEM",
      departmentAbbreviation: "MIFEM",
      departmentColor: "#4F46E5",
      visibility: body.visibility as string,
      specialType: (body.specialType as string | null) ?? null,
      isMeeting: isMeetingUpdate,
      ...(isMeetingUpdate ? {
        meetingType: body.meetingType as string,
        zoomLink: (body.zoomLink as string) || undefined,
        locationName: (body.locationName as string) || undefined,
        locationAddress: (body.locationAddress as string) || undefined,
      } : {}),
      roles,
      staffingStatus: computeStaffingStatus(roles),
      concurrencyToken: 101,
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),

  http.delete("/api/activities/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const activityTemplateHandlers = [
  http.get("/api/activity-templates", () => HttpResponse.json(mockTemplates)),
];

export const activityTemplateHandlersEmpty = [
  http.get("/api/activity-templates", () => HttpResponse.json([])),
];

export const activityHandlersEmpty = [
  http.get("/api/activities", () => HttpResponse.json([])),
];

export { mockTemplates };
