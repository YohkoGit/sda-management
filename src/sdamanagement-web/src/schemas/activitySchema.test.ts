import { describe, it, expect } from "vitest";
import { createActivitySchema, updateActivitySchema } from "./activitySchema";

const validBase = {
  title: "Culte du Sabbat",
  date: "2099-06-15",
  startTime: "10:00",
  endTime: "12:00",
  departmentId: 1,
  visibility: "public" as const,
};

describe("createActivitySchema", () => {
  it("accepts a future date", () => {
    const result = createActivitySchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts today's date", () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = createActivitySchema.safeParse({ ...validBase, date: today });
    expect(result.success).toBe(true);
  });

  it("rejects a past date", () => {
    const result = createActivitySchema.safeParse({
      ...validBase,
      date: "2020-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const dateIssue = result.error.issues.find((i) => i.path.includes("date"));
      expect(dateIssue).toBeDefined();
      expect(dateIssue!.message).toBe(
        "La date doit être aujourd'hui ou dans le futur"
      );
    }
  });

  it("rejects yesterday specifically", () => {
    const yesterday = new Date(Date.now() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const result = createActivitySchema.safeParse({
      ...validBase,
      date: yesterday,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateActivitySchema", () => {
  it("allows a past date (editing past activities)", () => {
    const result = updateActivitySchema.safeParse({
      ...validBase,
      date: "2020-01-01",
      concurrencyToken: 1,
    });
    expect(result.success).toBe(true);
  });

  it("requires concurrencyToken", () => {
    const result = updateActivitySchema.safeParse(validBase);
    expect(result.success).toBe(false);
  });

  it("accepts a future date", () => {
    const result = updateActivitySchema.safeParse({
      ...validBase,
      concurrencyToken: 1,
    });
    expect(result.success).toBe(true);
  });
});
