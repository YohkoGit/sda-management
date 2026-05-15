import api from "@/lib/api";
import type { components } from "@/api-generated/schema";
import type { CreateActivityFormData, UpdateActivityFormData } from "@/schemas/activitySchema";
import type { MyAssignmentItem } from "@/types/assignment";

type Schemas = components["schemas"];

export type RoleAssignmentResponse = NonNullable<Schemas["RoleAssignmentResponse"]>;
export type ActivityRoleResponse = NonNullable<Schemas["ActivityRoleResponse"]>;
export type ActivityResponse = NonNullable<Schemas["ActivityResponse"]>;
export type ActivityListItem = NonNullable<Schemas["ActivityListItem"]>;
export type DashboardActivityItem = NonNullable<Schemas["DashboardActivityItem"]>;

export const activityService = {
  getByDepartment: (departmentId: number) =>
    api.get<ActivityListItem[]>(`/api/activities?departmentId=${departmentId}`),
  getAll: () =>
    api.get<ActivityListItem[]>("/api/activities"),
  getById: (id: number) =>
    api.get<ActivityResponse>(`/api/activities/${id}`),
  create: (data: CreateActivityFormData) =>
    api.post<ActivityResponse>("/api/activities", data),
  update: (id: number, data: UpdateActivityFormData, force = false) =>
    api.put<ActivityResponse>(`/api/activities/${id}${force ? '?force=true' : ''}`, data),
  delete: (id: number) => api.delete(`/api/activities/${id}`),
  getMyAssignments: () =>
    api.get<MyAssignmentItem[]>("/api/activities/my-assignments"),
  getDashboardActivities: () =>
    api.get<DashboardActivityItem[]>("/api/activities/dashboard"),
};
