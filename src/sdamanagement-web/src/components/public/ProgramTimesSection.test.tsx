import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  programScheduleHandlers,
  programScheduleHandlersEmpty,
  programScheduleHandlersError,
} from "@/mocks/handlers/public";
import ProgramTimesSection from "./ProgramTimesSection";

const server = setupServer(...authHandlers, ...programScheduleHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ProgramTimesSection", () => {
  it("renders section heading", async () => {
    render(<ProgramTimesSection />);

    await waitFor(() => {
      expect(screen.getByText("Horaire des programmes")).toBeInTheDocument();
    });
  });

  it("renders program schedule rows with title, day, and time range", async () => {
    render(<ProgramTimesSection />);

    await waitFor(() => {
      expect(screen.getByText("École du Sabbat")).toBeInTheDocument();
    });

    expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    expect(screen.getByText("Programme AY")).toBeInTheDocument();

    // Day names in French
    const saturdayLabels = screen.getAllByText("Samedi");
    expect(saturdayLabels.length).toBe(3);

    // Time formatting — component renders "9h30 – 10h30" with en-dash + spaces
    expect(screen.getByText(/9h30\s+–\s+10h30/)).toBeInTheDocument();
    expect(screen.getByText(/11h00\s+–\s+12h30/)).toBeInTheDocument();
  });

  it("renders host name when available", async () => {
    render(<ProgramTimesSection />);

    await waitFor(() => {
      expect(screen.getByText(/Pierre Martin/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Sophie Bernard/)).toBeInTheDocument();
  });

  it("returns null (hidden) when API returns empty array", async () => {
    server.use(...programScheduleHandlersEmpty);

    const { container } = render(<ProgramTimesSection />);

    await waitFor(() => {
      // The program-schedules section should not be rendered
      expect(
        container.querySelector('[aria-labelledby="program-schedules-heading"]')
      ).toBeNull();
    });
  });

  it("renders error message on API failure (not silently hidden)", async () => {
    server.use(...programScheduleHandlersError);

    const { container } = render(<ProgramTimesSection />);

    await waitFor(
      () => {
        expect(
          screen.getByText("Impossible de charger les activités")
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Section should be visible (not hidden like empty state)
    expect(
      container.querySelector('[aria-labelledby="program-schedules-heading"]')
    ).not.toBeNull();
  });

  it("shows skeleton while loading", () => {
    render(<ProgramTimesSection />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
