import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import userEvent from "@testing-library/user-event";
import { Routes, Route } from "react-router-dom";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { configHandlers } from "@/mocks/handlers/config";
import { publicHandlers } from "@/mocks/handlers/public";
import PublicLayout from "@/layouts/PublicLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import HomePage from "@/pages/HomePage";
import DashboardPage from "@/pages/DashboardPage";

const server = setupServer(...authHandlers, ...configHandlers, ...publicHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("Route navigation integration", () => {
  it("/ renders public home page with TopNav", async () => {
    render(
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    // Public TopNav is present — redesign also adds the same links in the
    // PublicFooter "Naviguer" section, so use getAllByRole to allow duplicates.
    expect(screen.getAllByRole("link", { name: "Accueil" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Connexion" })).toBeInTheDocument();
    // HeroSection renders the activity title (church identity is reflected in the
    // footer). FancyTitle splits the title text — use heading role with regex.
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Culte du\s*Sabbat/ })
      ).toBeInTheDocument();
    });
  });

  it("/dashboard redirects to /login when unauthenticated", async () => {
    render(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { routerProps: { initialEntries: ["/dashboard"] } }
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Tableau de bord")).not.toBeInTheDocument();
  });

  it("/dashboard renders dashboard when authenticated", async () => {
    server.use(
      http.get("/api/auth/me", () =>
        HttpResponse.json({
          userId: 1,
          email: "viewer@test.local",
          firstName: "Test",
          lastName: "Viewer",
          role: "VIEWER",
        })
      )
    );

    render(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { routerProps: { initialEntries: ["/dashboard"] } }
    );

    await waitFor(() => {
      expect(screen.getByText("Bonjour, Test", { exact: false })).toBeInTheDocument();
    });
  });
});

describe("i18n integration", () => {
  it("switching language updates all nav labels from French to English", async () => {
    const user = userEvent.setup();

    render(
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    // Initially in French — redesign added a PublicFooter with the same nav
    // links, so each label appears in both TopNav and footer. Use getAllByRole.
    expect(screen.getAllByRole("link", { name: "Accueil" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Calendrier" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Départements" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "En Direct" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Connexion" })).toBeInTheDocument();

    // Click language switcher
    const langButton = screen.getByRole("button", { name: /changer en EN/i });
    await user.click(langButton);

    // Verify all nav labels switched to English
    await waitFor(() => {
      expect(screen.getAllByRole("link", { name: "Home" }).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole("link", { name: "Calendar" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Departments" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Live" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
  });
});
