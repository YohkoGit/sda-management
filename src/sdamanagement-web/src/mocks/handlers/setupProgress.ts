import { http, HttpResponse } from "msw";
import type { SetupProgressResponse } from "@/services/setupProgressService";

const mockEmptyDbResponse: SetupProgressResponse = {
  steps: [
    { id: "church-config", status: "current" },
    { id: "departments", status: "pending" },
    { id: "templates", status: "pending" },
    { id: "schedules", status: "pending" },
  ],
  isSetupComplete: false,
};

const mockStep2CurrentResponse: SetupProgressResponse = {
  steps: [
    { id: "church-config", status: "complete" },
    { id: "departments", status: "current" },
    { id: "templates", status: "pending" },
    { id: "schedules", status: "pending" },
  ],
  isSetupComplete: false,
};

const mockAllCompleteResponse: SetupProgressResponse = {
  steps: [
    { id: "church-config", status: "complete" },
    { id: "departments", status: "complete" },
    { id: "templates", status: "complete" },
    { id: "schedules", status: "complete" },
  ],
  isSetupComplete: true,
};

export const setupProgressHandlers = [
  http.get("/api/setup-progress", () => {
    return HttpResponse.json(mockEmptyDbResponse);
  }),
];

export const setupProgressStep2Handler = http.get(
  "/api/setup-progress",
  () => {
    return HttpResponse.json(mockStep2CurrentResponse);
  }
);

export const setupProgressAllCompleteHandler = http.get(
  "/api/setup-progress",
  () => {
    return HttpResponse.json(mockAllCompleteResponse);
  }
);
