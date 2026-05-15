import api from "@/lib/api";
import type { ChurchConfigFormData } from "@/schemas/configSchema";

export interface ChurchConfigResponse {
  id: number;
  churchName: string;
  address: string;
  youTubeChannelUrl: string | null;
  phoneNumber: string | null;
  welcomeMessage: string | null;
  defaultLocale: string;
  /** ISO 8601 instant with offset (e.g. "2026-01-01T00:00:00+00:00"). Wire shape is DateTimeOffset. */
  createdAt: string;
  /** ISO 8601 instant with offset (e.g. "2026-01-01T00:00:00+00:00"). Wire shape is DateTimeOffset. */
  updatedAt: string;
}

export interface PublicChurchConfigResponse {
  churchName: string;
  address: string;
  welcomeMessage: string | null;
  youTubeChannelUrl: string | null;
}

export const configService = {
  getPublic: () => api.get<PublicChurchConfigResponse>("/api/config"),
  getAdmin: () => api.get<ChurchConfigResponse>("/api/config/admin"),
  update: (data: ChurchConfigFormData) =>
    api.put<ChurchConfigResponse>("/api/config", data),
};
