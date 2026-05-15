import api from "@/lib/api";
import type { components } from "@/api-generated/schema";
import type { ActivityTemplateFormData } from "@/schemas/activityTemplateSchema";

type Schemas = components["schemas"];

export type TemplateRoleResponse = NonNullable<Schemas["TemplateRoleResponse"]>;
export type ActivityTemplateResponse = NonNullable<Schemas["ActivityTemplateResponse"]>;
export type ActivityTemplateListItem = NonNullable<Schemas["ActivityTemplateListItem"]>;

export const activityTemplateService = {
  getAll: () =>
    api.get<ActivityTemplateListItem[]>("/api/activity-templates"),
  getById: (id: number) =>
    api.get<ActivityTemplateResponse>(`/api/activity-templates/${id}`),
  create: (data: ActivityTemplateFormData) =>
    api.post<ActivityTemplateResponse>("/api/activity-templates", data),
  update: (id: number, data: ActivityTemplateFormData) =>
    api.put<ActivityTemplateResponse>(`/api/activity-templates/${id}`, data),
  delete: (id: number) => api.delete(`/api/activity-templates/${id}`),
};
