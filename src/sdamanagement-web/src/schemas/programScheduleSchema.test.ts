import { describe, it, expect } from "vitest";
import { programScheduleSchema } from "./programScheduleSchema";

describe("programScheduleSchema", () => {
  const validData = {
    title: "Ecole du Sabbat",
    dayOfWeek: 6,
    startTime: "09:30",
    endTime: "10:30",
    hostName: "Fr. Joseph",
    departmentId: 1,
  };

  it("accepts valid schedule with all fields", () => {
    const result = programScheduleSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("accepts valid schedule without optional fields", () => {
    const { hostName, departmentId, ...required } = validData;
    const result = programScheduleSchema.safeParse(required);
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = programScheduleSchema.safeParse({ ...validData, title: "" });
    expect(result.success).toBe(false);
  });

  it("rejects title exceeding 100 characters", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      title: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects dayOfWeek less than 0", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      dayOfWeek: -1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects dayOfWeek greater than 6", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      dayOfWeek: 7,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid time format", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      startTime: "9:30",
    });
    expect(result.success).toBe(false);
  });

  it("rejects endTime before startTime", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      startTime: "14:00",
      endTime: "10:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects endTime equals startTime", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      startTime: "10:00",
      endTime: "10:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects hostName exceeding 100 characters", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      hostName: "A".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty hostName", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      hostName: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts null departmentId", () => {
    const result = programScheduleSchema.safeParse({
      ...validData,
      departmentId: null,
    });
    expect(result.success).toBe(true);
  });

  it("accepts all valid dayOfWeek values", () => {
    for (let day = 0; day <= 6; day++) {
      const result = programScheduleSchema.safeParse({
        ...validData,
        dayOfWeek: day,
      });
      expect(result.success).toBe(true);
    }
  });
});
