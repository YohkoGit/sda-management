import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  departmentHandlers,
  departmentHandlersEmpty,
  departmentHandlersError,
} from "@/mocks/handlers/public";
import DepartmentOverviewSection from "./DepartmentOverviewSection";

const server = setupServer(...authHandlers, ...departmentHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DepartmentOverviewSection", () => {
  it("renders section heading", async () => {
    render(<DepartmentOverviewSection />);

    await waitFor(() => {
      expect(screen.getByText("Nos Départements")).toBeInTheDocument();
    });
  });

  it("renders department cards when data available", async () => {
    render(<DepartmentOverviewSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte")).toBeInTheDocument();
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
      expect(screen.getByText("Ministère de la Femme")).toBeInTheDocument();
    });
  });

  it("renders correct card count", async () => {
    render(<DepartmentOverviewSection />);

    // Redesign: departments are list items (<li>), not <article> cards
    await waitFor(() => {
      const items = screen.getAllByRole("listitem");
      expect(items.length).toBe(3);
    });
  });

  it("renders description for department with description", async () => {
    // Redesign: when a department has a description, the description is shown
    // (it takes priority over the next-activity title text).
    render(<DepartmentOverviewSection />);

    await waitFor(() => {
      expect(
        screen.getByText(/Organisation des cultes et services religieux/)
      ).toBeInTheDocument();
    });
  });

  it("renders 'Aucune activité planifiée' when no description AND no activity", async () => {
    // All three default departments have descriptions, so the
    // "noPlannedActivity" branch is never reached. Use a custom handler.
    server.use(
      ...departmentHandlersEmpty
    );
    server.use(
      http.get("/api/public/departments", () =>
        HttpResponse.json([
          {
            id: 99,
            name: "Empty Dept",
            abbreviation: "ED",
            color: "#000000",
            description: null,
            nextActivityTitle: null,
            nextActivityDate: null,
            nextActivityStartTime: null,
          },
        ])
      )
    );

    render(<DepartmentOverviewSection />);

    await waitFor(() => {
      expect(
        screen.getByText("Aucune activité planifiée")
      ).toBeInTheDocument();
    });
  });

  it("hides section when no departments", async () => {
    server.use(...departmentHandlersEmpty);

    render(<DepartmentOverviewSection />);

    await waitFor(() => {
      expect(
        screen.queryByText("Nos Départements")
      ).not.toBeInTheDocument();
    });
  });

  it("renders skeleton loading states while pending", () => {
    render(<DepartmentOverviewSection />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("has correct accessibility attributes (AC 8)", async () => {
    render(<DepartmentOverviewSection />);

    // Redesign: departments are list items (<li>) inside a <ul>
    await waitFor(() => {
      expect(screen.getAllByRole("listitem").length).toBe(3);
    });

    // h2 heading with correct id
    const heading = screen.getByText("Nos Départements");
    expect(heading.tagName).toBe("H2");
    expect(heading.id).toBe("department-overview-heading");

    // section references heading via aria-labelledby
    const section = heading.closest("section");
    expect(section).toHaveAttribute("aria-labelledby", "department-overview-heading");

    // truncated descriptions have title with full text
    const description = screen.getByText(
      /Organisation des cultes et services religieux/
    );
    expect(description).toHaveAttribute(
      "title",
      "Organisation des cultes et services religieux chaque sabbat."
    );
  });

  it("renders error message on API failure", async () => {
    server.use(...departmentHandlersError);

    render(<DepartmentOverviewSection />);

    // useDepartments() has retry: 1 which overrides QueryClient's retry: false,
    // so TanStack Query retries once (~1s delay) before surfacing the error
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
