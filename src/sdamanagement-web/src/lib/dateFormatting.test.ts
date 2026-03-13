import { describe, it, expect, vi, afterEach } from "vitest";
import { formatTime, formatActivityDate, getDateLocale } from "./dateFormatting";
import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";

describe("formatTime", () => {
  it("converts HH:mm:ss to French format", () => {
    expect(formatTime("09:30:00")).toBe("9h30");
  });

  it("handles noon format", () => {
    expect(formatTime("12:00:00")).toBe("12h00");
  });

  it("handles single-digit hour", () => {
    expect(formatTime("08:00:00")).toBe("8h00");
  });

  it("handles empty string returns empty", () => {
    expect(formatTime("")).toBe("");
  });

  it("handles malformed input returns gracefully", () => {
    expect(formatTime("invalid")).toBe("invalid");
  });
});

describe("formatActivityDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Ce Sabbat' for this Saturday", () => {
    // Set system date to Tuesday 2026-03-10 — test date 2026-03-14 is this Saturday
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));

    const t = (key: string) => (key === "pages.home.thisSabbath" ? "Ce Sabbat" : key);
    const result = formatActivityDate("2026-03-14", t, "fr");

    expect(result).toBe("Ce Sabbat");
  });

  it("returns French date format for other dates", () => {
    // Set system date to Tuesday 2026-03-03 — test date 2026-03-14 is next week
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 3, 12, 0, 0));

    const t = (key: string) => key;
    const result = formatActivityDate("2026-03-14", t, "fr");

    expect(result).toBe("samedi 14 mars");
  });
});

describe("getDateLocale", () => {
  it("returns fr for French", () => {
    expect(getDateLocale("fr")).toBe(fr);
  });

  it("returns enUS for English", () => {
    expect(getDateLocale("en")).toBe(enUS);
  });

  it("returns fr for fr-CA", () => {
    expect(getDateLocale("fr-CA")).toBe(fr);
  });

  it("returns enUS for en-US", () => {
    expect(getDateLocale("en-US")).toBe(enUS);
  });
});
