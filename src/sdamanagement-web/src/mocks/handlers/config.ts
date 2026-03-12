import { http, HttpResponse } from "msw";
import type { ChurchConfigResponse, PublicChurchConfigResponse } from "@/services/configService";

const mockConfig: ChurchConfigResponse = {
  id: 1,
  churchName: "Eglise Adventiste du 7e Jour de Saint-Hubert",
  address: "1234 Rue de l'Eglise, Saint-Hubert, QC",
  youTubeChannelUrl: "https://www.youtube.com/@sdac-st-hubert",
  phoneNumber: "+1 (450) 555-0100",
  welcomeMessage: "Bienvenue!",
  defaultLocale: "fr",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mockPublicConfig: PublicChurchConfigResponse = {
  churchName: mockConfig.churchName,
  address: mockConfig.address,
  welcomeMessage: mockConfig.welcomeMessage,
  youTubeChannelUrl: mockConfig.youTubeChannelUrl,
};

export const configHandlers = [
  http.get("/api/config", () => {
    return HttpResponse.json(mockPublicConfig);
  }),

  http.get("/api/config/admin", () => {
    return HttpResponse.json(mockConfig);
  }),

  http.put("/api/config", async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      ...mockConfig,
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),
];

export const configHandlers404 = [
  http.get("/api/config/admin", () => {
    return HttpResponse.json(null, { status: 404 });
  }),
];

export const configHandlersError = [
  http.put("/api/config", () => {
    return HttpResponse.json(
      {
        type: "urn:sdac:validation-error",
        title: "Validation Error",
        status: 400,
        errors: { churchName: ["Church name is required"] },
      },
      { status: 400 }
    );
  }),
];

export const configHandlersNoYouTube = [
  http.get("/api/config", () => {
    return HttpResponse.json({
      ...mockPublicConfig,
      youTubeChannelUrl: null,
    });
  }),
];

export const configHandlersEmptyYouTube = [
  http.get("/api/config", () => {
    return HttpResponse.json({
      ...mockPublicConfig,
      youTubeChannelUrl: "",
    });
  }),
];

export const configHandlersWithVideoUrl = [
  http.get("/api/config", () => {
    return HttpResponse.json({
      ...mockPublicConfig,
      youTubeChannelUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  }),
];
