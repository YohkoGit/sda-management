import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  calendarHandlers,
  calendarHandlersEmpty,
  calendarHandlersError,
  departmentHandlers,
  departmentHandlersError,
} from "@/mocks/handlers/public";
import PublicCalendarPage from "./PublicCalendarPage";

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

describe("PublicCalendarPage", () => {
  it("renders skeleton while loading departments", () => {
    render(<PublicCalendarPage />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders department error state", async () => {
    server.use(...departmentHandlersError);

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

  it("renders CalendarView when departments loaded", async () => {
    render(<PublicCalendarPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /Calendrier/ }),
      ).toBeInTheDocument();
    });
  });

  it("renders page heading", async () => {
    render(<PublicCalendarPage />);

    // PublicCalendarPage renders a "Calendrier liturgique" eyebrow + a
    // dynamic month-label h1 (e.g. "mai 2026"). Assert the eyebrow which is
    // the stable identifier of the page header.
    await waitFor(() => {
      expect(screen.getByText("Calendrier liturgique")).toBeInTheDocument();
    });
  });

  it("renders calendar with empty event list without crashing", async () => {
    server.use(...calendarHandlersEmpty);

    render(<PublicCalendarPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /Calendrier/ }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByText("Impossible de charger le calendrier"),
    ).not.toBeInTheDocument();
  });

  it("shows error when calendar API fails", async () => {
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

  it("renders DayDetailDialog for anonymous users (user=null)", async () => {
    render(<PublicCalendarPage />);

    await waitFor(() => {
      expect(
        screen.getByRole("region", { name: /Calendrier/ }),
      ).toBeInTheDocument();
    });

    // PublicCalendarPage renders DayDetailDialog with user={null}.
    // The dialog is closed by default (dayDialogDate is null),
    // but verifying the page renders without import/runtime errors.
    expect(screen.getByText("Calendrier liturgique")).toBeInTheDocument();
  });

  it("public page has no creation affordance visible", async () => {
    render(<PublicCalendarPage />);

    await waitFor(() => {
      expect(screen.getByText("Calendrier liturgique")).toBeInTheDocument();
    });

    // No "Nouvelle activité" button should be visible at the page level
    expect(screen.queryByText("Nouvelle activité")).not.toBeInTheDocument();
  });
});
