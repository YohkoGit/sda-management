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
  createdAt: string;
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
