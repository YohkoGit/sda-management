import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  assignmentHandlers,
  assignmentHandlersEmpty,
  assignmentHandlersError,
} from "@/mocks/handlers/assignments";
import { MyAssignmentsSection } from "./MyAssignmentsSection";

const server = setupServer(...authHandlers, ...assignmentHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("MyAssignmentsSection", () => {
  it("renders section heading with correct i18n key", async () => {
    render(<MyAssignmentsSection />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Mes Affectations" })
    ).toBeInTheDocument();
  });

  it("renders assignment cards when data is available", async () => {
    render(<MyAssignmentsSection />);

    await waitFor(() => {
      expect(screen.getByText("Diacre")).toBeInTheDocument();
    });

    expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    expect(screen.getByText("Programme JA")).toBeInTheDocument();
    // Now multiple matches: title "Sainte-Cène" + translated badge for specialType="sainte-cene"
    expect(screen.getAllByText("Sainte-Cène").length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty state when no assignments", async () => {
    server.use(...assignmentHandlersEmpty);

    render(<MyAssignmentsSection />);

    await waitFor(() => {
      expect(
        screen.getByText("Aucune affectation à venir")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "Les affectations apparaissent ici lorsqu'un administrateur vous assigne un rôle dans une activité."
      )
    ).toBeInTheDocument();
  });

  it("renders skeleton loading state while pending", () => {
    render(<MyAssignmentsSection />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders error state with retry button on API failure", async () => {
    server.use(...assignmentHandlersError);

    render(<MyAssignmentsSection />);

    await waitFor(
      () => {
        expect(
          screen.getByText("Impossible de charger vos affectations")
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    expect(screen.getByText("Réessayer")).toBeInTheDocument();
  });

  it("applies visual emphasis to first card", async () => {
    render(<MyAssignmentsSection />);

    await waitFor(() => {
      expect(screen.getByText("Diacre")).toBeInTheDocument();
    });

    const articles = screen.getAllByRole("article");
    expect(articles[0].className).toContain("bg-primary/5");
    expect(articles[1].className).toContain("bg-background");
  });

  it("renders co-assignee avatars with correct names", async () => {
    render(<MyAssignmentsSection />);

    await waitFor(() => {
      expect(screen.getByText("Diacre")).toBeInTheDocument();
    });

    // Co-assignees on first card: Jean D., Marie L.
    expect(screen.getByLabelText("Jean Dupont")).toBeInTheDocument();
    expect(screen.getByLabelText("Marie Laurent")).toBeInTheDocument();
  });

  it("shows guest label for guest co-assignee", async () => {
    render(<MyAssignmentsSection />);

    await waitFor(() => {
      expect(screen.getByText("Predicateur")).toBeInTheDocument();
    });

    // Guest on third card: "Pasteur I. (Invité)"
    expect(screen.getByText(/Invité/)).toBeInTheDocument();
  });

  it("has proper accessibility: heading hierarchy and focusable cards", async () => {
    render(<MyAssignmentsSection />);

    await waitFor(() => {
      expect(screen.getByText("Diacre")).toBeInTheDocument();
    });

    // h2 heading
    const heading = screen.getByRole("heading", {
      level: 2,
      name: "Mes Affectations",
    });
    expect(heading).toBeInTheDocument();

    // Cards are wrapped in links (focusable natively)
    const articles = screen.getAllByRole("article");
    articles.forEach((article) => {
      // Each article is inside a <Link> (rendered as <a>)
      expect(article.closest("a")).toBeTruthy();
    });

    // Links have aria-label for accessibility
    const links = articles.map((article) => article.closest("a")!);
    links.forEach((link) => {
      expect(link.getAttribute("aria-label")).toBeTruthy();
    });
  });
});
