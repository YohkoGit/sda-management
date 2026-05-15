import api from "@/lib/api";
import type { components } from "@/api-generated/schema";

type Schemas = components["schemas"];

export type HealthCheckItem = NonNullable<Schemas["HealthCheckItem"]>;
export type SetupStatusResponse = NonNullable<Schemas["SetupStatusResponse"]>;
export type SystemHealthResponse = NonNullable<Schemas["SystemHealthResponse"]>;

export const systemHealthService = {
  getSystemHealth: () =>
    api.get<SystemHealthResponse>("/api/system-health").then((res) => res.data),
};
