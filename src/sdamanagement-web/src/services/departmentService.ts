import api from "@/lib/api";
import type { components } from "@/api-generated/schema";
import type {
  DepartmentFormData,
  SubMinistryFormData,
} from "@/schemas/departmentSchema";

type Schemas = components["schemas"];

export type SubMinistryResponse = NonNullable<Schemas["SubMinistryResponse"]>;
export type DepartmentResponse = NonNullable<Schemas["DepartmentResponse"]>;
export type DepartmentListItem = NonNullable<Schemas["DepartmentListItem"]>;
export type DepartmentWithStaffingListItem = NonNullable<Schemas["DepartmentWithStaffingListItem"]>;

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
