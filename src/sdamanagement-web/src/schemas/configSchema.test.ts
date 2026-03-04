import { describe, it, expect } from "vitest";
import { churchConfigSchema } from "./configSchema";

describe("churchConfigSchema", () => {
  const validData = {
    churchName: "Eglise Adventiste du 7e Jour de Saint-Hubert",
    address: "1234 Rue de l'Eglise, Saint-Hubert, QC",
    youTubeChannelUrl: "https://www.youtube.com/@sdac-st-hubert",
    phoneNumber: "+1 (450) 555-0100",
    welcomeMessage: "Bienvenue!",
    defaultLocale: "fr" as const,
  };

  it("accepts valid church config data", () => {
    const result = churchConfigSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects empty church name", () => {
    const result = churchConfigSchema.safeParse({
      ...validData,
      churchName: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty address", () => {
    const result = churchConfigSchema.safeParse({
      ...validData,
      address: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid YouTube URL", () => {
    const result = churchConfigSchema.safeParse({
      ...validData,
      youTubeChannelUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty optional fields", () => {
    const result = churchConfigSchema.safeParse({
      churchName: "Test Church",
      address: "123 Test St",
      youTubeChannelUrl: "",
      phoneNumber: "",
      welcomeMessage: "",
      defaultLocale: "fr",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid locale value", () => {
    const result = churchConfigSchema.safeParse({
      ...validData,
      defaultLocale: "de",
    });
    expect(result.success).toBe(false);
  });
});
