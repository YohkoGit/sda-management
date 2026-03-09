import { http, HttpResponse } from "msw";
import type {
  ActivityListItem,
  ActivityResponse,
  ActivityRoleResponse,
} from "@/services/activityService";
import type { ActivityTemplateListItem } from "@/services/activityTemplateService";

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
    visibility: "public",
    roles: [
      {
        id: 1,
        roleName: "Predicateur",
        headcount: 1,
        sortOrder: 0,
        assignments: [],
      },
      {
        id: 2,
        roleName: "Ancien de Service",
        headcount: 1,
        sortOrder: 1,
        assignments: [],
      },
    ],
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
    visibility: "authenticated",
    roles: [],
    concurrencyToken: 43,
    createdAt: "2026-03-02T00:00:00Z",
    updatedAt: "2026-03-02T00:00:00Z",
  },
];

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
  roleCount: a.roles.length,
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
      { id: 1, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0 },
      { id: 2, roleName: "Ancien de Service", defaultHeadcount: 1, sortOrder: 1 },
      { id: 3, roleName: "Diacres", defaultHeadcount: 2, sortOrder: 2 },
    ],
  },
  {
    id: 2,
    name: "Sainte-Cene",
    description: "Service avec communion",
    roleSummary: "Predicateur (1), Ancien (1), Lavement (4)",
    roleCount: 3,
    roles: [
      { id: 4, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0 },
      { id: 5, roleName: "Ancien", defaultHeadcount: 1, sortOrder: 1 },
      { id: 6, roleName: "Lavement", defaultHeadcount: 4, sortOrder: 2 },
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
    const templateId = body.templateId as number | undefined;
    const roles = templateId
      ? templateRolesToActivityRoles(templateId)
      : [];
    const created: ActivityResponse = {
      id: 99,
      title: body.title as string,
      description: (body.description as string) ?? null,
      date: body.date as string,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
      departmentId: body.departmentId as number,
      departmentName: "MIFEM",
      visibility: body.visibility as string,
      roles,
      concurrencyToken: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(created, { status: 201 });
  }),

  http.put("/api/activities/:id", async ({ request, params }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const updated: ActivityResponse = {
      id: Number(params.id),
      title: body.title as string,
      description: (body.description as string) ?? null,
      date: body.date as string,
      startTime: body.startTime as string,
      endTime: body.endTime as string,
      departmentId: body.departmentId as number,
      departmentName: "MIFEM",
      visibility: body.visibility as string,
      roles: [],
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
