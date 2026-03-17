import api from "@/lib/api";
import type { ProgramScheduleFormData } from "@/schemas/programScheduleSchema";

export interface ProgramScheduleResponse {
  id: number;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  hostName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramScheduleListItem {
  id: number;
  title: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  hostName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
}

export const programScheduleService = {
  getAll: () =>
    api.get<ProgramScheduleListItem[]>("/api/program-schedules"),
  getById: (id: number) =>
    api.get<ProgramScheduleResponse>(`/api/program-schedules/${id}`),
  create: (data: ProgramScheduleFormData) =>
    api.post<ProgramScheduleResponse>("/api/program-schedules", data),
  update: (id: number, data: ProgramScheduleFormData) =>
    api.put<ProgramScheduleResponse>(`/api/program-schedules/${id}`, data),
  delete: (id: number) => api.delete(`/api/program-schedules/${id}`),
};
