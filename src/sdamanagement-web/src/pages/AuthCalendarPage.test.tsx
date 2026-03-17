import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  calendarHandlers,
  departmentHandlers,
} from "@/mocks/handlers/public";
import AuthCalendarPage from "./AuthCalendarPage";

vi.mock("@schedule-x/react", () => ({
  useCalendarApp: () => ({}),
  ScheduleXCalendar: ({ calendarApp: _calendarApp }: { calendarApp: unknown }) => (
    <div data-testid="schedule-x-calendar" data-calendar="true" />
  ),
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

const server = setupServer(
  ...authHandlers,
  ...departmentHandlers,
  ...calendarHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AuthCalendarPage", () => {
  it("renders calendar heading", async () => {
    render(<AuthCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText("Calendrier")).toBeInTheDocument();
    });
  });

  it("renders calendar container", async () => {
    render(<AuthCalendarPage />);

    await waitFor(() => {
      expect(screen.getByTestId("schedule-x-calendar")).toBeInTheDocument();
    });
  });

  it("renders skeleton while loading", () => {
    render(<AuthCalendarPage />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
