import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { act } from "@testing-library/react";
import { render, screen } from "@/test-utils";
import { ModifiedBadge } from "./ModifiedBadge";
import { useModifiedBadgeStore } from "@/stores/modifiedBadgeStore";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  useModifiedBadgeStore.setState({ modifiedActivities: {} });
  localStorage.clear();
});

describe("ModifiedBadge", () => {
  it("renders badge when activity is modified", () => {
    useModifiedBadgeStore.setState({
      modifiedActivities: { 42: new Date().toISOString() },
    });

    render(<ModifiedBadge activityId={42} />);

    expect(screen.getByText("Modifié")).toBeInTheDocument();
  });

  it("renders nothing when activity is not modified", () => {
    render(<ModifiedBadge activityId={42} />);

    expect(screen.queryByText("Modifié")).not.toBeInTheDocument();
  });

  it('badge has aria-live="polite"', () => {
    useModifiedBadgeStore.setState({
      modifiedActivities: { 42: new Date().toISOString() },
    });

    render(<ModifiedBadge activityId={42} />);

    const badge = screen.getByText("Modifié");
    expect(badge).toHaveAttribute("aria-live", "polite");
  });

  it("badge has amber styling", () => {
    useModifiedBadgeStore.setState({
      modifiedActivities: { 42: new Date().toISOString() },
    });

    render(<ModifiedBadge activityId={42} />);

    const badge = screen.getByText("Modifié");
    expect(badge.className).toContain("bg-amber-500");
  });

  it("auto-expires badge after 24h via timer", () => {
    // Set timestamp 23h59m59s ago — 1 second before expiry
    const almostExpired = new Date(
      Date.now() - 24 * 60 * 60 * 1000 + 1000,
    ).toISOString();
    useModifiedBadgeStore.setState({
      modifiedActivities: { 42: almostExpired },
    });

    render(<ModifiedBadge activityId={42} />);
    expect(screen.getByText("Modifié")).toBeInTheDocument();

    // Advance past the remaining 1 second
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.queryByText("Modifié")).not.toBeInTheDocument();
    expect(
      useModifiedBadgeStore.getState().modifiedActivities[42],
    ).toBeUndefined();
  });

  it("English locale has correct modifiedBadge translation", async () => {
    const en = await import("@/../public/locales/en/common.json");
    expect(en.common.modifiedBadge).toBe("Modified");
  });
});
