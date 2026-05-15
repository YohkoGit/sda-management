import api from "@/lib/api";
import type { components } from "@/api-generated/schema";
import type { ProgramScheduleFormData } from "@/schemas/programScheduleSchema";

type Schemas = components["schemas"];

export type ProgramScheduleResponse = NonNullable<Schemas["ProgramScheduleResponse"]>;
export type ProgramScheduleListItem = NonNullable<Schemas["ProgramScheduleListItem"]>;

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
