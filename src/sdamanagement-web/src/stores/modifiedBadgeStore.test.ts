import { describe, it, expect, afterEach } from "vitest";
import { useModifiedBadgeStore } from "./modifiedBadgeStore";

afterEach(() => {
  useModifiedBadgeStore.setState({ modifiedActivities: {} });
  localStorage.clear();
});

describe("modifiedBadgeStore", () => {
  it("markModified adds activity to store", () => {
    useModifiedBadgeStore.getState().markModified(42);

    const timestamp = useModifiedBadgeStore.getState().modifiedActivities[42];
    expect(timestamp).toBeDefined();
    expect(new Date(timestamp).getTime()).toBeCloseTo(Date.now(), -2);
  });

  it("isModified returns true for recently marked activity", () => {
    useModifiedBadgeStore.getState().markModified(42);

    expect(useModifiedBadgeStore.getState().isModified(42)).toBe(true);
  });

  it("isModified returns false for unknown activity", () => {
    expect(useModifiedBadgeStore.getState().isModified(999)).toBe(false);
  });

  it("dismiss removes activity from store", () => {
    useModifiedBadgeStore.getState().markModified(42);
    useModifiedBadgeStore.getState().dismiss(42);

    expect(useModifiedBadgeStore.getState().isModified(42)).toBe(false);
    expect(
      useModifiedBadgeStore.getState().modifiedActivities[42],
    ).toBeUndefined();
  });

  it("cleanupExpired removes entries older than 24h", () => {
    const twentyFiveHoursAgo = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();
    useModifiedBadgeStore.setState({
      modifiedActivities: { 42: twentyFiveHoursAgo },
    });

    useModifiedBadgeStore.getState().cleanupExpired();

    expect(
      useModifiedBadgeStore.getState().modifiedActivities[42],
    ).toBeUndefined();
  });

  it("cleanupExpired keeps entries younger than 24h", () => {
    useModifiedBadgeStore.getState().markModified(42);

    useModifiedBadgeStore.getState().cleanupExpired();

    expect(
      useModifiedBadgeStore.getState().modifiedActivities[42],
    ).toBeDefined();
  });

  it("isModified returns false for expired entry", () => {
    const twentyFiveHoursAgo = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();
    useModifiedBadgeStore.setState({
      modifiedActivities: { 42: twentyFiveHoursAgo },
    });

    expect(useModifiedBadgeStore.getState().isModified(42)).toBe(false);
  });

  it("markModified updates timestamp for already-marked activity", () => {
    useModifiedBadgeStore.getState().markModified(42);
    const first = useModifiedBadgeStore.getState().modifiedActivities[42];

    useModifiedBadgeStore.getState().markModified(42);
    const second = useModifiedBadgeStore.getState().modifiedActivities[42];

    // Second timestamp should be >= first (same or later)
    expect(new Date(second).getTime()).toBeGreaterThanOrEqual(
      new Date(first).getTime(),
    );
  });
});
