import { http, HttpResponse } from "msw";
import type {
  DepartmentListItem,
  DepartmentResponse,
  DepartmentWithStaffingListItem,
} from "@/services/departmentService";

const mockDepartments: DepartmentResponse[] = [
  {
    id: 1,
    name: "Jeunesse Adventiste",
    abbreviation: "JA",
    color: "#4F46E5",
    description: "Activites pour la jeunesse",
    subMinistries: [
      { id: 1, name: "Eclaireurs", leadUserId: 10, leadFirstName: "Marie", leadLastName: "Dupont", leadAvatarUrl: null },
      { id: 2, name: "Ambassadeurs", leadUserId: null, leadFirstName: null, leadLastName: null, leadAvatarUrl: null },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Ministere de la Femme",
    abbreviation: "MIFEM",
    color: "#EC4899",
    description: "Activites pour les femmes",
    subMinistries: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Diaconat",
    abbreviation: "DIA",
    color: "#10B981",
    description: null,
    subMinistries: [{ id: 3, name: "Diacres", leadUserId: null, leadFirstName: null, leadLastName: null, leadAvatarUrl: null }],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

function toListItem(dept: DepartmentResponse): DepartmentListItem {
  return {
    id: dept.id,
    name: dept.name,
    abbreviation: dept.abbreviation,
    color: dept.color,
    description: dept.description,
    subMinistryCount: dept.subMinistries.length,
  };
}

const mockStaffingStatuses: Record<number, string> = {
  1: "FullyStaffed",
  2: "CriticalGap",
  3: "NoActivities",
};

function toWithStaffingItem(dept: DepartmentResponse): DepartmentWithStaffingListItem {
  return {
    ...toListItem(dept),
    upcomingActivityCount: dept.id === 3 ? 0 : 2,
    aggregateStaffingStatus: mockStaffingStatuses[dept.id] ?? "NoActivities",
  };
}

export const departmentHandlers = [
  http.get("/api/departments/with-staffing", () => {
    return HttpResponse.json(mockDepartments.map(toWithStaffingItem));
  }),

  http.get("/api/departments", () => {
    return HttpResponse.json(mockDepartments.map(toListItem));
  }),

  http.get("/api/departments/:id", ({ params }) => {
    const id = Number(params.id);
    const dept = mockDepartments.find((d) => d.id === id);
    if (!dept) return HttpResponse.json(null, { status: 404 });
    return HttpResponse.json(dept);
  }),

  http.post("/api/departments", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    const newDept: DepartmentResponse = {
      id: 99,
      name: body.name as string,
      abbreviation: body.abbreviation as string,
      color: body.color as string,
      description: (body.description as string) || null,
      subMinistries: ((body.subMinistryNames as string[]) || []).map(
        (name, i) => ({ id: 100 + i, name, leadUserId: null, leadFirstName: null, leadLastName: null, leadAvatarUrl: null })
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newDept, {
      status: 201,
      headers: { Location: `/api/departments/${newDept.id}` },
    });
  }),

  http.put("/api/departments/:id", async ({ params, request }) => {
    const id = Number(params.id);
    const dept = mockDepartments.find((d) => d.id === id);
    if (!dept) return HttpResponse.json(null, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...dept,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete("/api/departments/:id", ({ params }) => {
    const id = Number(params.id);
    const dept = mockDepartments.find((d) => d.id === id);
    if (!dept) return HttpResponse.json(null, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/departments/:departmentId/sub-ministries", async ({ params, request }) => {
    const deptId = Number(params.departmentId);
    const dept = mockDepartments.find((d) => d.id === deptId);
    if (!dept) return HttpResponse.json(null, { status: 404 });
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: 200,
        name: body.name as string,
        leadUserId: (body.leadUserId as number) ?? null,
        leadFirstName: body.leadUserId ? "Test" : null,
        leadLastName: body.leadUserId ? "Lead" : null,
        leadAvatarUrl: null,
      },
      { status: 201 }
    );
  }),

  http.put("/api/departments/:departmentId/sub-ministries/:id", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 1,
      name: body.name as string,
      leadUserId: (body.leadUserId as number) ?? null,
      leadFirstName: body.leadUserId ? "Test" : null,
      leadLastName: body.leadUserId ? "Lead" : null,
      leadAvatarUrl: null,
    });
  }),

  http.delete("/api/departments/:departmentId/sub-ministries/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const departmentHandlersEmpty = [
  http.get("/api/departments", () => {
    return HttpResponse.json([]);
  }),
];

export const departmentHandlers409 = [
  http.post("/api/departments", () => {
    return HttpResponse.json(
      {
        type: "urn:sdac:conflict",
        title: "Resource Conflict",
        status: 409,
        detail:
          "A department with this abbreviation or color already exists.",
      },
      { status: 409 }
    );
  }),
];
