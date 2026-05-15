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
  /** ISO 8601 instant with offset (e.g. "2026-01-01T00:00:00+00:00"). Wire shape is DateTimeOffset. */
  createdAt: string;
  /** ISO 8601 instant with offset (e.g. "2026-01-01T00:00:00+00:00"). Wire shape is DateTimeOffset. */
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
