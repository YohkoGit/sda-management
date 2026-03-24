import api from "@/lib/api";
import type { CreateActivityFormData, UpdateActivityFormData } from "@/schemas/activitySchema";
import type { MyAssignmentItem } from "@/types/assignment";

export interface RoleAssignmentResponse {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isGuest: boolean;
}

export interface ActivityRoleResponse {
  id: number;
  roleName: string;
  headcount: number;
  sortOrder: number;
  isCritical: boolean;
  assignments: RoleAssignmentResponse[];
}

export interface ActivityResponse {
  id: number;
  title: string;
  /** Omitted from JSON when null (WhenWritingNull) — runtime value is undefined, not null */
  description?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  /** Omitted from JSON when null (WhenWritingNull) — runtime value is undefined, not null */
  departmentId?: number | null;
  departmentName: string;
  departmentAbbreviation: string;
  departmentColor: string;
  visibility: string;
  /** Omitted from JSON when null (WhenWritingNull) — runtime value is undefined, not null */
  specialType?: string | null;
  isMeeting: boolean;
  /** Omitted from JSON when null (WhenWritingNull) — runtime value is undefined, not null */
  meetingType?: string | null;
  /** Omitted from JSON when null (WhenWritingNull) — runtime value is undefined, not null */
  zoomLink?: string | null;
  /** Omitted from JSON when null (WhenWritingNull) — runtime value is undefined, not null */
  locationName?: string | null;
  /** Omitted from JSON when null (WhenWritingNull) — runtime value is undefined, not null */
  locationAddress?: string | null;
  roles: ActivityRoleResponse[];
  staffingStatus: string;
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
  departmentId?: number | null;
  departmentName: string;
  departmentColor: string;
  visibility: string;
  specialType?: string | null;
  isMeeting: boolean;
  meetingType?: string | null;
  locationName?: string | null;
  roleCount: number;
  totalHeadcount: number;
  assignedCount: number;
  staffingStatus: string;
  createdAt: string;
}

export interface DashboardActivityItem {
  id: number;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  departmentId: number | null;
  departmentName: string;
  departmentAbbreviation: string;
  departmentColor: string;
  visibility: string;
  specialType: string | null;
  isMeeting: boolean;
  meetingType?: string | null;
  locationName?: string | null;
  predicateurName: string | null;
  predicateurAvatarUrl: string | null;
  roleCount: number;
  totalHeadcount: number;
  assignedCount: number;
  staffingStatus: string;
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
  update: (id: number, data: UpdateActivityFormData, force = false) =>
    api.put<ActivityResponse>(`/api/activities/${id}${force ? '?force=true' : ''}`, data),
  delete: (id: number) => api.delete(`/api/activities/${id}`),
  getMyAssignments: () =>
    api.get<MyAssignmentItem[]>("/api/activities/my-assignments"),
  getDashboardActivities: () =>
    api.get<DashboardActivityItem[]>("/api/activities/dashboard"),
};
