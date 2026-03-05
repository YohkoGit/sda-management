import { describe, it, expect } from "vitest";
import { activityTemplateSchema, templateRoleSchema } from "./activityTemplateSchema";

describe("activityTemplateSchema", () => {
  const validData = {
    name: "Culte du Sabbat",
    description: "Service principal du samedi",
    roles: [
      { roleName: "Predicateur", defaultHeadcount: 1 },
      { roleName: "Ancien de Service", defaultHeadcount: 1 },
    ],
  };

  it("accepts valid template with roles", () => {
    const result = activityTemplateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = activityTemplateSchema.safeParse({ ...validData, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 characters", () => {
    const result = activityTemplateSchema.safeParse({
      ...validData,
      name: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty description", () => {
    const result = activityTemplateSchema.safeParse({
      ...validData,
      description: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts missing description", () => {
    const { description, ...withoutDesc } = validData;
    const result = activityTemplateSchema.safeParse(withoutDesc);
    expect(result.success).toBe(true);
  });

  it("rejects empty roles array", () => {
    const result = activityTemplateSchema.safeParse({
      ...validData,
      roles: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects role with empty name", () => {
    const result = activityTemplateSchema.safeParse({
      ...validData,
      roles: [{ roleName: "", defaultHeadcount: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects headcount less than 1", () => {
    const result = activityTemplateSchema.safeParse({
      ...validData,
      roles: [{ roleName: "Role", defaultHeadcount: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects headcount greater than 99", () => {
    const result = activityTemplateSchema.safeParse({
      ...validData,
      roles: [{ roleName: "Role", defaultHeadcount: 100 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate role names", () => {
    const result = activityTemplateSchema.safeParse({
      ...validData,
      roles: [
        { roleName: "Predicateur", defaultHeadcount: 1 },
        { roleName: "Predicateur", defaultHeadcount: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate role names case-insensitive", () => {
    const result = activityTemplateSchema.safeParse({
      ...validData,
      roles: [
        { roleName: "Predicateur", defaultHeadcount: 1 },
        { roleName: "predicateur", defaultHeadcount: 2 },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("templateRoleSchema", () => {
  it("accepts valid role", () => {
    const result = templateRoleSchema.safeParse({
      roleName: "Predicateur",
      defaultHeadcount: 1,
    });
    expect(result.success).toBe(true);
  });

  it("accepts headcount of 99", () => {
    const result = templateRoleSchema.safeParse({
      roleName: "Role",
      defaultHeadcount: 99,
    });
    expect(result.success).toBe(true);
  });

  it("rejects non-integer headcount", () => {
    const result = templateRoleSchema.safeParse({
      roleName: "Role",
      defaultHeadcount: 1.5,
    });
    expect(result.success).toBe(false);
  });
});
