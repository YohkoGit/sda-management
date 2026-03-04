import { describe, it, expect } from "vitest";
import { departmentSchema, subMinistrySchema } from "./departmentSchema";

describe("departmentSchema", () => {
  const validData = {
    name: "Jeunesse Adventiste",
    abbreviation: "JA",
    color: "#4F46E5",
    description: "Activites pour la jeunesse",
  };

  it("accepts valid department data", () => {
    const result = departmentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = departmentSchema.safeParse({ ...validData, name: "" });
    expect(result.success).toBe(false);
  });

  it("accepts empty abbreviation (optional, auto-filled by backend)", () => {
    const result = departmentSchema.safeParse({
      ...validData,
      abbreviation: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts missing abbreviation", () => {
    const { abbreviation, ...withoutAbbreviation } = validData;
    const result = departmentSchema.safeParse(withoutAbbreviation);
    expect(result.success).toBe(true);
  });

  it("rejects invalid abbreviation (special characters)", () => {
    const result = departmentSchema.safeParse({
      ...validData,
      abbreviation: "J@A!",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid hex color", () => {
    const result = departmentSchema.safeParse({
      ...validData,
      color: "red",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid hex color", () => {
    const result = departmentSchema.safeParse({
      ...validData,
      color: "#FF0000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty optional description", () => {
    const result = departmentSchema.safeParse({
      ...validData,
      description: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts data with sub-ministry names", () => {
    const result = departmentSchema.safeParse({
      ...validData,
      subMinistryNames: ["Eclaireurs", "Ambassadeurs"],
    });
    expect(result.success).toBe(true);
  });
});

describe("subMinistrySchema", () => {
  it("accepts valid sub-ministry name", () => {
    const result = subMinistrySchema.safeParse({ name: "Eclaireurs" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = subMinistrySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});
