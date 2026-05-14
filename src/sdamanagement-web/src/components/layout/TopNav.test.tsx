import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { Routes, Route } from "react-router-dom";
import { render, screen } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import TopNav from "./TopNav";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("TopNav", () => {
  it("renders all public nav links with French labels", () => {
    render(<TopNav />);

    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Calendrier")).toBeInTheDocument();
    expect(screen.getByText("Départements")).toBeInTheDocument();
    expect(screen.getByText("En Direct")).toBeInTheDocument();
  });

  it("renders the Connexion button", () => {
    render(<TopNav />);
    expect(screen.getByText("Connexion")).toBeInTheDocument();
  });

  it("renders the church name", () => {
    render(<TopNav />);
    expect(screen.getByText("Saint-Hubert")).toBeInTheDocument();
  });

  it("renders the language switcher", () => {
    render(<TopNav />);
    // LanguageSwitcher renders FR/EN spans; FR is active by default with text-[var(--ink)]
    expect(screen.getByText("FR")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("nav links point to correct routes", () => {
    render(<TopNav />);

    expect(screen.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Calendrier" })).toHaveAttribute("href", "/calendar");
    expect(screen.getByRole("link", { name: "Départements" })).toHaveAttribute("href", "/departments");
    expect(screen.getByRole("link", { name: "En Direct" })).toHaveAttribute("href", "/live");
  });

  it("active link gets aria-current='page' and active styling", () => {
    render(
      <Routes>
        <Route path="calendar" element={<TopNav />} />
      </Routes>,
      { routerProps: { initialEntries: ["/calendar"] } }
    );

    const calendarLink = screen.getByRole("link", { name: "Calendrier" });
    expect(calendarLink).toHaveAttribute("aria-current", "page");
    // Active link uses --ink color + gilt underline
    expect(calendarLink.className).toContain("text-[var(--ink)]");

    // Non-active links should NOT have aria-current
    const homeLink = screen.getByRole("link", { name: "Accueil" });
    expect(homeLink).not.toHaveAttribute("aria-current");
  });
});
