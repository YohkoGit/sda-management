import api from "@/lib/api";

export interface HealthCheckItem {
  name: string;
  status: string;
  description: string | null;
  duration: string;
}

export interface SetupStatusResponse {
  churchConfigExists: boolean;
  departmentCount: number;
  templateCount: number;
  scheduleCount: number;
  userCount: number;
}

export interface SystemHealthResponse {
  status: string;
  checks: HealthCheckItem[];
  version: string;
  uptimeSeconds: number;
  environment: string;
  setupStatus: SetupStatusResponse;
}

export const systemHealthService = {
  getSystemHealth: () =>
    api.get<SystemHealthResponse>("/api/system-health").then((res) => res.data),
};
