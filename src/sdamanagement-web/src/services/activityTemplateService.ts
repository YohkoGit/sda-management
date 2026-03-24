import api from "@/lib/api";
import type { ActivityTemplateFormData } from "@/schemas/activityTemplateSchema";

export interface TemplateRoleResponse {
  id: number;
  roleName: string;
  defaultHeadcount: number;
  sortOrder: number;
  isCritical: boolean;
  isPredicateur: boolean;
}

export interface ActivityTemplateResponse {
  id: number;
  name: string;
  description: string | null;
  roles: TemplateRoleResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityTemplateListItem {
  id: number;
  name: string;
  description: string | null;
  roleSummary: string;
  roleCount: number;
  roles: TemplateRoleResponse[];
}

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
