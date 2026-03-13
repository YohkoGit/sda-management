import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  upcomingActivitiesHandlers,
  upcomingActivitiesHandlersEmpty,
  upcomingActivitiesHandlersError,
} from "@/mocks/handlers/public";
import UpcomingActivitiesSection from "./UpcomingActivitiesSection";

const server = setupServer(...authHandlers, ...upcomingActivitiesHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("UpcomingActivitiesSection", () => {
  it("renders section heading", async () => {
    render(<UpcomingActivitiesSection />);

    await waitFor(() => {
      expect(screen.getByText("Activités à venir")).toBeInTheDocument();
    });
  });

  it("renders activity cards when data available", async () => {
    render(<UpcomingActivitiesSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    expect(screen.getByText("Programme JA")).toBeInTheDocument();
    expect(screen.getByText("Sabbat de la Jeunesse")).toBeInTheDocument();
  });

  it("renders multiple cards for multiple activities", async () => {
    render(<UpcomingActivitiesSection />);

    await waitFor(() => {
      const articles = screen.getAllByRole("article");
      expect(articles.length).toBe(3);
    });
  });

  it("renders empty state message when API returns empty array", async () => {
    server.use(...upcomingActivitiesHandlersEmpty);

    render(<UpcomingActivitiesSection />);

    await waitFor(() => {
      expect(
        screen.getByText("Aucune activité à venir — revenez bientôt!")
      ).toBeInTheDocument();
    });
  });

  it("renders skeleton loading states while pending", () => {
    render(<UpcomingActivitiesSection />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error message on API failure", async () => {
    server.use(...upcomingActivitiesHandlersError);

    render(<UpcomingActivitiesSection />);

    await waitFor(
      () => {
        expect(
          screen.getByText("Impossible de charger les activités")
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );
  });
});
