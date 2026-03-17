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

    // Public TopNav is present
    expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connexion" })).toBeInTheDocument();
    // HeroSection renders church identity from API
    await waitFor(() => {
      expect(screen.getByText("Eglise Adventiste du 7e Jour de Saint-Hubert")).toBeInTheDocument();
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
    expect(screen.queryByText("Tableau de Bord")).not.toBeInTheDocument();
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
      expect(screen.getByText("CENTRE DE COMMANDE")).toBeInTheDocument();
    });
    expect(screen.getByText("Bonjour, Test")).toBeInTheDocument();
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

    // Initially in French — use role selectors to avoid duplicates (nav link + heading)
    expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Calendrier" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Départements" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "En Direct" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Connexion" })).toBeInTheDocument();

    // Click language switcher
    const langButton = screen.getByRole("button", { name: /changer en EN/i });
    await user.click(langButton);

    // Verify all nav labels switched to English
    await waitFor(() => {
      expect(screen.getByRole("link", { name: "Home" })).toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Calendar" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Departments" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Live" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign In" })).toBeInTheDocument();
  });
});
