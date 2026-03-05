import { http, HttpResponse } from "msw";
import type {
  ProgramScheduleListItem,
  ProgramScheduleResponse,
} from "@/services/programScheduleService";

const mockSchedules: ProgramScheduleResponse[] = [
  {
    id: 1,
    title: "École du Sabbat",
    dayOfWeek: 6,
    startTime: "09:15",
    endTime: "10:30",
    hostName: "Fr. Jean",
    departmentId: 1,
    departmentName: "Jeunesse Adventiste",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: 2,
    title: "Culte Divin",
    dayOfWeek: 6,
    startTime: "11:00",
    endTime: "12:30",
    hostName: null,
    departmentId: null,
    departmentName: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

function toListItem(s: ProgramScheduleResponse): ProgramScheduleListItem {
  return {
    id: s.id,
    title: s.title,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    hostName: s.hostName,
    departmentName: s.departmentName,
  };
}

export const programScheduleHandlers = [
  http.get("/api/program-schedules", () => {
    return HttpResponse.json(mockSchedules.map(toListItem));
  }),

  http.get("/api/program-schedules/:id", ({ params }) => {
    const id = Number(params.id);
    const schedule = mockSchedules.find((s) => s.id === id);
    if (!schedule) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(schedule);
  }),

  http.post("/api/program-schedules", async ({ request }) => {
    const body = (await request.json()) as {
      title: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      hostName?: string;
      departmentId?: number | null;
    };
    const newSchedule: ProgramScheduleResponse = {
      id: 99,
      title: body.title,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      hostName: body.hostName ?? null,
      departmentId: body.departmentId ?? null,
      departmentName: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(newSchedule, { status: 201 });
  }),

  http.put("/api/program-schedules/:id", async ({ request, params }) => {
    const id = Number(params.id);
    const body = (await request.json()) as {
      title: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      hostName?: string;
      departmentId?: number | null;
    };
    const schedule = mockSchedules.find((s) => s.id === id);
    if (!schedule) return new HttpResponse(null, { status: 404 });
    const updated: ProgramScheduleResponse = {
      ...schedule,
      title: body.title,
      dayOfWeek: body.dayOfWeek,
      startTime: body.startTime,
      endTime: body.endTime,
      hostName: body.hostName ?? null,
      departmentId: body.departmentId ?? null,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json(updated);
  }),

  http.delete("/api/program-schedules/:id", () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

export const programScheduleHandlersEmpty = [
  http.get("/api/program-schedules", () => {
    return HttpResponse.json([]);
  }),
];

export const programScheduleHandlers409 = [
  http.post("/api/program-schedules", () => {
    return HttpResponse.json(
      {
        type: "urn:sdac:conflict",
        title: "Resource Conflict",
        status: 409,
        detail: "A program schedule with this title and day already exists.",
      },
      { status: 409 }
    );
  }),
];
