import api from "@/lib/api";
import type { CreateActivityFormData, UpdateActivityFormData } from "@/schemas/activitySchema";

export interface RoleAssignmentResponse {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface ActivityRoleResponse {
  id: number;
  roleName: string;
  headcount: number;
  sortOrder: number;
  assignments: RoleAssignmentResponse[];
}

export interface ActivityResponse {
  id: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string;
  endTime: string;
  departmentId: number | null;
  departmentName: string;
  visibility: string;
  specialType: string | null;
  roles: ActivityRoleResponse[];
  concurrencyToken: number;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityListItem {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  departmentId: number | null;
  departmentName: string;
  departmentColor: string;
  visibility: string;
  specialType: string | null;
  roleCount: number;
  createdAt: string;
}

export const activityService = {
  getByDepartment: (departmentId: number) =>
    api.get<ActivityListItem[]>(`/api/activities?departmentId=${departmentId}`),
  getAll: () =>
    api.get<ActivityListItem[]>("/api/activities"),
  getById: (id: number) =>
    api.get<ActivityResponse>(`/api/activities/${id}`),
  create: (data: CreateActivityFormData) =>
    api.post<ActivityResponse>("/api/activities", data),
  update: (id: number, data: UpdateActivityFormData) =>
    api.put<ActivityResponse>(`/api/activities/${id}`, data),
  delete: (id: number) => api.delete(`/api/activities/${id}`),
};
