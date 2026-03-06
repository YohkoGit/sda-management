import { http, HttpResponse } from "msw";
import type { SetupProgressResponse } from "@/services/setupProgressService";

const mockEmptyDbResponse: SetupProgressResponse = {
  steps: [
    { id: "church-config", status: "current" },
    { id: "departments", status: "pending" },
    { id: "templates", status: "pending" },
    { id: "schedules", status: "pending" },
    { id: "members", status: "pending" },
  ],
  isSetupComplete: false,
};

const mockAllCompleteResponse: SetupProgressResponse = {
  steps: [
    { id: "church-config", status: "complete" },
    { id: "departments", status: "complete" },
    { id: "templates", status: "complete" },
    { id: "schedules", status: "complete" },
    { id: "members", status: "complete" },
  ],
  isSetupComplete: true,
};

export const setupProgressHandlers = [
  http.get("/api/setup-progress", () => {
    return HttpResponse.json(mockEmptyDbResponse);
  }),
];

export const setupProgressAllCompleteHandler = http.get(
  "/api/setup-progress",
  () => {
    return HttpResponse.json(mockAllCompleteResponse);
  }
);
