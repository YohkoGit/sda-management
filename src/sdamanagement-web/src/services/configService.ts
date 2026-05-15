import api from "@/lib/api";
import type { components } from "@/api-generated/schema";
import type { ChurchConfigFormData } from "@/schemas/configSchema";

type Schemas = components["schemas"];

export type ChurchConfigResponse = NonNullable<Schemas["ChurchConfigResponse"]>;
export type PublicChurchConfigResponse = NonNullable<Schemas["PublicChurchConfigResponse"]>;

export const configService = {
  getPublic: () => api.get<PublicChurchConfigResponse>("/api/config"),
  getAdmin: () => api.get<ChurchConfigResponse>("/api/config/admin"),
  update: (data: ChurchConfigFormData) =>
    api.put<ChurchConfigResponse>("/api/config", data),
};
