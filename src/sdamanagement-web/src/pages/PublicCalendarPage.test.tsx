import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  calendarHandlers,
  calendarHandlersEmpty,
  calendarHandlersError,
  departmentHandlers,
} from "@/mocks/handlers/public";
import PublicCalendarPage from "./PublicCalendarPage";

// Mock Schedule-X to avoid jsdom rendering issues with the calendar library
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

vi.mock("temporal-polyfill/global", () => ({}));

const server = setupServer(
  ...authHandlers,
  ...departmentHandlers,
  ...calendarHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("PublicCalendarPage", () => {
  it("renders page heading", async () => {
    render(<PublicCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText("Calendrier")).toBeInTheDocument();
    });
  });

  it("renders calendar container", async () => {
    render(<PublicCalendarPage />);

    await waitFor(() => {
      expect(screen.getByTestId("schedule-x-calendar")).toBeInTheDocument();
    });
  });

  it("renders error message on API failure", async () => {
    server.use(...calendarHandlersError);

    render(<PublicCalendarPage />);

    await waitFor(
      () => {
        expect(
          screen.getByText("Impossible de charger le calendrier"),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("renders skeleton while loading departments", () => {
    render(<PublicCalendarPage />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("has proper accessibility attributes", async () => {
    render(<PublicCalendarPage />);

    await waitFor(() => {
      const region = screen.getByRole("region", { name: "Calendrier" });
      expect(region).toHaveAttribute("aria-label", "Calendrier");
    });
  });

  it("renders calendar with empty event list without crashing", async () => {
    server.use(...calendarHandlersEmpty);

    render(<PublicCalendarPage />);

    await waitFor(() => {
      expect(screen.getByTestId("schedule-x-calendar")).toBeInTheDocument();
    });

    // No error message should appear
    expect(
      screen.queryByText("Impossible de charger le calendrier"),
    ).not.toBeInTheDocument();
  });
});
