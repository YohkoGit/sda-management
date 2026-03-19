import api from "@/lib/api";
import type {
  DepartmentFormData,
  SubMinistryFormData,
} from "@/schemas/departmentSchema";

export interface SubMinistryResponse {
  id: number;
  name: string;
  leadUserId?: number | null;
  leadFirstName?: string | null;
  leadLastName?: string | null;
  leadAvatarUrl?: string | null;
}

export interface DepartmentResponse {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
  description: string | null;
  subMinistries: SubMinistryResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentListItem {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
  description: string | null;
  subMinistryCount: number;
}

export interface DepartmentWithStaffingListItem extends DepartmentListItem {
  upcomingActivityCount: number;
  aggregateStaffingStatus: string;
}

export const departmentService = {
  getAll: () => api.get<DepartmentListItem[]>("/api/departments"),
  getDepartmentsWithStaffing: () =>
    api.get<DepartmentWithStaffingListItem[]>("/api/departments/with-staffing"),
  getById: (id: number) =>
    api.get<DepartmentResponse>(`/api/departments/${id}`),
  create: (data: DepartmentFormData) =>
    api.post<DepartmentResponse>("/api/departments", data),
  update: (id: number, data: Omit<DepartmentFormData, "subMinistryNames">) =>
    api.put<DepartmentResponse>(`/api/departments/${id}`, data),
  delete: (id: number) => api.delete(`/api/departments/${id}`),
  addSubMinistry: (
    departmentId: number,
    data: SubMinistryFormData & { leadUserId?: number | null }
  ) =>
    api.post<SubMinistryResponse>(
      `/api/departments/${departmentId}/sub-ministries`,
      data
    ),
  updateSubMinistry: (
    departmentId: number,
    id: number,
    data: SubMinistryFormData & { leadUserId?: number | null }
  ) =>
    api.put<SubMinistryResponse>(
      `/api/departments/${departmentId}/sub-ministries/${id}`,
      data
    ),
  deleteSubMinistry: (departmentId: number, id: number) =>
    api.delete(`/api/departments/${departmentId}/sub-ministries/${id}`),
};
