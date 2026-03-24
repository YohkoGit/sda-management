import { describe, it, expect, vi } from "vitest";
import { render, screen, futureDate } from "@/test-utils";
import CalendarView from "./CalendarView";
import type { PublicDepartment } from "@/types/public";

vi.mock("@schedule-x/react", () => ({
  useCalendarApp: () => ({}),
  ScheduleXCalendar: ({
    calendarApp: _calendarApp,
  }: {
    calendarApp: unknown;
  }) => <div data-testid="schedule-x-calendar" data-calendar="true" />,
}));

vi.mock("@schedule-x/calendar", () => ({
  createViewDay: () => ({ name: "day" }),
  createViewWeek: () => ({ name: "week" }),
  createViewMonthGrid: () => ({ name: "month-grid" }),
}));

vi.mock("@schedule-x/events-service", () => ({
  createEventsServicePlugin: () => ({
    set: vi.fn(),
    getAll: vi.fn(() => []),
  }),
}));

vi.mock("@schedule-x/calendar-controls", () => ({
  createCalendarControlsPlugin: () => ({
    setView: vi.fn(),
    setDate: vi.fn(),
    getView: vi.fn(() => "month-grid"),
    getDate: vi.fn(),
  }),
}));

vi.mock("temporal-polyfill/global", () => {
  globalThis.Temporal = {
    ZonedDateTime: { from: (s: string) => ({ toString: () => s }) },
    PlainDate: { from: (s: string) => ({ toString: () => s }) },
  } as never;
  return {};
});

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
];

const defaultProps = {
  activities: [],
  yearActivities: undefined,
  departments: mockDepartments,
  isError: false,
  onRetry: vi.fn(),
  onRangeChange: vi.fn(),
  onViewChange: vi.fn(),
};

describe("CalendarView", () => {
  it("renders calendar container", () => {
    render(<CalendarView {...defaultProps} />);
    expect(screen.getByTestId("schedule-x-calendar")).toBeInTheDocument();
  });

  it("renders view switcher with 4 options", () => {
    render(<CalendarView {...defaultProps} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
  });

  it("defaults to month-grid view", () => {
    render(<CalendarView {...defaultProps} />);
    const monthTab = screen.getByRole("tab", { name: /Mois/i });
    expect(monthTab).toHaveAttribute("aria-selected", "true");
  });

  it("displays error state", () => {
    render(<CalendarView {...defaultProps} isError={true} />);
    expect(
      screen.getByText("Impossible de charger le calendrier"),
    ).toBeInTheDocument();
    expect(screen.getByText("Réessayer")).toBeInTheDocument();
  });

  it("renders calendar region with aria-label", () => {
    render(<CalendarView {...defaultProps} />);
    const region = screen.getByRole("region", { name: "Calendrier" });
    expect(region).toBeInTheDocument();
  });

  it("accepts onDayAction prop without error", () => {
    const onDayAction = vi.fn();
    render(
      <CalendarView {...defaultProps} onDayAction={onDayAction} />,
    );
    expect(screen.getByTestId("schedule-x-calendar")).toBeInTheDocument();
  });

  it("accepts navigateTo and onNavigateComplete props without error", () => {
    const onNavigateComplete = vi.fn();
    render(
      <CalendarView
        {...defaultProps}
        navigateTo={{ view: "day", date: futureDate(7) }}
        onNavigateComplete={onNavigateComplete}
      />,
    );
    expect(screen.getByTestId("schedule-x-calendar")).toBeInTheDocument();
  });
});
