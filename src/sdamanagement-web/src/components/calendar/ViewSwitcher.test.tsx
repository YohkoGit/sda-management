import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import ViewSwitcher from "./ViewSwitcher";

describe("ViewSwitcher", () => {
  it("renders 4 view buttons", () => {
    render(<ViewSwitcher activeView="month-grid" onViewChange={vi.fn()} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
  });

  it("highlights the active view", () => {
    render(<ViewSwitcher activeView="week" onViewChange={vi.fn()} />);
    const weekTab = screen.getByRole("tab", { name: /Semaine/i });
    expect(weekTab).toHaveAttribute("aria-selected", "true");

    const monthTab = screen.getByRole("tab", { name: /Mois/i });
    expect(monthTab).toHaveAttribute("aria-selected", "false");
  });

  it("fires onViewChange callback when clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<ViewSwitcher activeView="month-grid" onViewChange={handleChange} />);

    await user.click(screen.getByRole("tab", { name: /Jour/i }));
    expect(handleChange).toHaveBeenCalledWith("day");
  });

  it("uses tablist role for accessibility", () => {
    render(<ViewSwitcher activeView="month-grid" onViewChange={vi.fn()} />);
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
