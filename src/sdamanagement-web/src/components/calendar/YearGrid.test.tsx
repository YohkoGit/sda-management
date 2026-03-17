import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import YearGrid from "./YearGrid";
import type { PublicDepartment, PublicActivityListItem } from "@/types/public";

const mockDepartments: PublicDepartment[] = [
  {
    id: 1,
    name: "Culte",
    abbreviation: "CU",
    color: "#F43F5E",
    description: null,
    nextActivityTitle: null,
    nextActivityDate: null,
    nextActivityStartTime: null,
  },
  {
    id: 2,
    name: "Jeunesse Adventiste",
    abbreviation: "JA",
    color: "#14B8A6",
    description: null,
    nextActivityTitle: null,
    nextActivityDate: null,
    nextActivityStartTime: null,
  },
];

const mockActivities: PublicActivityListItem[] = [
  {
    id: 1,
    title: "Culte du Sabbat",
    date: "2026-03-14",
    startTime: "09:30:00",
    endTime: "12:00:00",
    departmentName: "Culte",
    departmentAbbreviation: "CU",
    departmentColor: "#F43F5E",
    predicateurName: null,
    predicateurAvatarUrl: null,
    specialType: null,
  },
];

const defaultProps = {
  year: 2026,
  activities: mockActivities,
  departments: mockDepartments,
  onDayClick: vi.fn(),
  onMonthClick: vi.fn(),
  onYearChange: vi.fn(),
};

describe("YearGrid", () => {
  it("renders 12 mini-months", () => {
    render(<YearGrid {...defaultProps} />);
    // Month headers — there should be 12 clickable month buttons
    const monthButtons = screen.getAllByRole("button").filter((btn) => {
      const text = btn.textContent?.toLowerCase() ?? "";
      return [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre",
      ].includes(text);
    });
    expect(monthButtons).toHaveLength(12);
  });

  it("displays the correct year in header", () => {
    render(<YearGrid {...defaultProps} />);
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("fires onDayClick when clicking a day", async () => {
    const user = userEvent.setup();
    const handleDayClick = vi.fn();
    render(<YearGrid {...defaultProps} onDayClick={handleDayClick} />);

    // Find all buttons with text "15" that are in-month (not disabled)
    const dayButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent?.startsWith("15") && !btn.hasAttribute("disabled"),
    );
    expect(dayButtons.length).toBeGreaterThan(0);
    await user.click(dayButtons[0]);
    expect(handleDayClick).toHaveBeenCalled();
  });

  it("fires onMonthClick when clicking a month header", async () => {
    const user = userEvent.setup();
    const handleMonthClick = vi.fn();
    render(<YearGrid {...defaultProps} onMonthClick={handleMonthClick} />);

    await user.click(screen.getByText("mars"));
    expect(handleMonthClick).toHaveBeenCalled();
  });

  it("navigates to previous/next year", async () => {
    const user = userEvent.setup();
    const handleYearChange = vi.fn();
    render(<YearGrid {...defaultProps} onYearChange={handleYearChange} />);

    // Click next year button
    await user.click(screen.getByLabelText("2027"));
    expect(handleYearChange).toHaveBeenCalledWith(2027);

    // Click previous year button
    await user.click(screen.getByLabelText("2025"));
    expect(handleYearChange).toHaveBeenCalledWith(2025);
  });
});
