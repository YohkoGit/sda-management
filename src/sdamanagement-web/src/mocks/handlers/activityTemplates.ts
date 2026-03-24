import { http, HttpResponse } from "msw";
import type {
  ActivityTemplateListItem,
  ActivityTemplateResponse,
} from "@/services/activityTemplateService";

const mockTemplates: ActivityTemplateResponse[] = [
  {
    id: 1,
    name: "Culte du Sabbat",
    description: "Service principal du samedi",
    roles: [
      { id: 1, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0, isCritical: true, isPredicateur: true },
      { id: 2, roleName: "Ancien de Service", defaultHeadcount: 1, sortOrder: 1, isCritical: true, isPredicateur: false },
      { id: 3, roleName: "Annonces", defaultHeadcount: 1, sortOrder: 2, isCritical: false, isPredicateur: false },
      { id: 4, roleName: "Diacres", defaultHeadcount: 2, sortOrder: 3, isCritical: false, isPredicateur: false },
      { id: 5, roleName: "Diaconesses", defaultHeadcount: 2, sortOrder: 4, isCritical: false, isPredicateur: false },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Sainte-Cene",
    description: "Service de communion",
    roles: [
      { id: 6, roleName: "Ancien", defaultHeadcount: 2, sortOrder: 0, isCritical: true, isPredicateur: false },
      { id: 7, roleName: "Diacres", defaultHeadcount: 4, sortOrder: 1, isCritical: false, isPredicateur: false },
      { id: 8, roleName: "Diaconesses", defaultHeadcount: 4, sortOrder: 2, isCritical: false, isPredicateur: false },
    ],
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
  },
];

function toListItem(t: ActivityTemplateResponse): ActivityTemplateListItem {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    roleSummary: t.roles.map((r) => `${r.roleName} (${r.defaultHeadcount})`).join(", "),
    roleCount: t.roles.length,
    roles: t.roles,
  };
}

export const activityTemplateHandlers = [
  http.get("/api/activity-templates", () => {
    return HttpResponse.json(mockTemplates.map(toListItem));
  }),

  http.get("/api/activity-templates/:id", ({ params }) => {
    const id = Number(params.id);
    const template = mockTemplates.find((t) => t.id === id);
    if (!template) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(template);
  }),

  http.post("/api/activity-templates", async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      roles: { roleName: string; defaultHeadcount: number; isCritical?: boolean; isPredicateur?: boolean }[];
    };
    const newTemplate: ActivityTemplateResponse = {
      id: 99,
      name: body.name,
      description: body.description ?? null,
      roles: body.roles.map((r, i) => ({
        id: 100 + i,
        roleName: r.roleName,
        defaultHeadcount: r.defaultHeadcount,
        sortOrder: i,
        isCritical: r.isCritical ?? false,
        isPredicateur: r.isPredicateur ?? false,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newTemplate, { status: 201 });
  }),

  http.put("/api/activity-templates/:id", async ({ request, params }) => {
    const id = Number(params.id);
    const body = (await request.json()) as {
      name: string;
      description?: string;
      roles: { roleName: string; defaultHeadcount: number; isCritical?: boolean; isPredicateur?: boolean }[];
    };
    const template = mockTemplates.find((t) => t.id === id);
    if (!template) return new HttpResponse(null, { status: 404 });
    const updated: ActivityTemplateResponse = {
      ...template,
      name: body.name,
      description: body.description ?? null,
      roles: body.roles.map((r, i) => ({
        id: 200 + i,
        roleName: r.roleName,
        defaultHeadcount: r.defaultHeadcount,
        sortOrder: i,
        isCritical: r.isCritical ?? false,
        isPredicateur: r.isPredicateur ?? false,
      })),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),

  http.delete("/api/activity-templates/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const activityTemplateHandlersEmpty = [
  http.get("/api/activity-templates", () => {
    return HttpResponse.json([]);
  }),
];

export const activityTemplateHandlers409 = [
  http.post("/api/activity-templates", () => {
    return HttpResponse.json(
      {
        type: "urn:sdac:conflict",
        title: "Resource Conflict",
        status: 409,
        detail: "An activity template with this name already exists.",
      },
      { status: 409 }
    );
  }),
];
