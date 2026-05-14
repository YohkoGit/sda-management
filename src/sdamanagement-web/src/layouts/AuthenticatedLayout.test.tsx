import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { Routes, Route } from "react-router-dom";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import AuthenticatedLayout from "./AuthenticatedLayout";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AuthenticatedLayout", () => {
  beforeEach(() => {
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
  });

  it("renders sidebar and child content", async () => {
    render(
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<div>Dashboard Content</div>} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard Content")).toBeInTheDocument();
    });

    // Sidebar elements
    expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
    expect(screen.getByText("Se déconnecter")).toBeInTheDocument();
  });

  it("has a main element with id main-content", async () => {
    render(
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<div>Content</div>} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    await waitFor(() => {
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    expect(document.getElementById("main-content")).toBeInTheDocument();
  });

  it("has skip-to-content link", async () => {
    render(
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route index element={<div>Content</div>} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    await waitFor(() => {
      expect(screen.getByText("Content")).toBeInTheDocument();
    });

    const skipLink = screen.getByText("Aller au contenu principal");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });
});
