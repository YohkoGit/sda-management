import { http, HttpResponse } from "msw";
import type { SystemHealthResponse } from "@/services/systemHealthService";

const mockHealthyResponse: SystemHealthResponse = {
  status: "Healthy",
  checks: [
    {
      name: "npgsql",
      status: "Healthy",
      description: null,
      duration: "00:00:00.023",
    },
  ],
  version: "1.0.0-test",
  uptimeSeconds: 138720,
  environment: "Development",
  setupStatus: {
    churchConfigExists: true,
    departmentCount: 3,
    templateCount: 5,
    scheduleCount: 4,
    userCount: 12,
  },
};

const mockUnhealthyResponse: SystemHealthResponse = {
  status: "Unhealthy",
  checks: [
    {
      name: "npgsql",
      status: "Unhealthy",
      description: "Failed to connect to PostgreSQL",
      duration: "00:00:05.000",
    },
  ],
  version: "1.0.0-test",
  uptimeSeconds: 138720,
  environment: "Development",
  setupStatus: {
    churchConfigExists: false,
    departmentCount: 0,
    templateCount: 0,
    scheduleCount: 0,
    userCount: 1,
  },
};

export const systemHealthHandlers = [
  http.get("/api/system-health", () => {
    return HttpResponse.json(mockHealthyResponse);
  }),
];

export const systemHealthUnhealthyHandler = http.get(
  "/api/system-health",
  () => {
    return HttpResponse.json(mockUnhealthyResponse);
  }
);
