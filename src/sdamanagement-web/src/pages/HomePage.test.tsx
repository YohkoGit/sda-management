import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { configHandlers } from "@/mocks/handlers/config";
import {
  publicHandlers,
  liveStatusHandlers,
  liveStatusHandlersLive,
  upcomingActivitiesHandlers,
  programScheduleHandlers,
  departmentHandlers,
} from "@/mocks/handlers/public";
import HomePage from "./HomePage";

const server = setupServer(
  ...authHandlers,
  ...configHandlers,
  ...publicHandlers,
  ...liveStatusHandlers,
  ...upcomingActivitiesHandlers,
  ...programScheduleHandlers,
  ...departmentHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HomePage", () => {
  it("renders HeroSection", async () => {
    render(<HomePage />);

    // Redesign: with an activity present, hero heading shows the activity title
    // (FancyTitle splits on space, so use heading role with regex)
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Culte du\s*Sabbat/ })
      ).toBeInTheDocument();
    });
  });

  it("renders activity data from HeroSection", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    });
  });

  it("renders YouTubeSection below HeroSection when live", async () => {
    // Redesign: YouTubeSection only renders when isLive OR URL has a video ID.
    // Default config is a channel URL — switch to live to make it visible.
    server.use(...liveStatusHandlersLive);

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Suivez le culte en direct")).toBeInTheDocument();
    });
  });

  it("renders UpcomingActivitiesSection", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Activités à venir")).toBeInTheDocument();
    });
  });

  it("renders ProgramTimesSection when schedules exist", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Horaire des programmes")).toBeInTheDocument();
    });
  });

  it("renders DepartmentOverviewSection", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Nos Départements")).toBeInTheDocument();
    });
  });
});
