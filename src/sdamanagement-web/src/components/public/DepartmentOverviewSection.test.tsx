import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
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

    await waitFor(() => {
      const articles = screen.getAllByRole("article");
      expect(articles.length).toBe(3);
    });
  });

  it("renders next activity for department with activity", async () => {
    render(<DepartmentOverviewSection />);

    await waitFor(() => {
      expect(screen.getByText(/Culte du Sabbat/)).toBeInTheDocument();
    });
  });

  it("renders 'Aucune activité planifiée' for department without activity", async () => {
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

    await waitFor(() => {
      expect(screen.getAllByRole("article").length).toBe(3);
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
