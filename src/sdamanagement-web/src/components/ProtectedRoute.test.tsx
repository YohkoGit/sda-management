import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { Routes, Route } from "react-router-dom";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import ProtectedRoute, { hasRole } from "./ProtectedRoute";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("hasRole", () => {
  it("OWNER has all roles", () => {
    expect(hasRole("OWNER", "VIEWER")).toBe(true);
    expect(hasRole("OWNER", "ADMIN")).toBe(true);
    expect(hasRole("OWNER", "OWNER")).toBe(true);
  });

  it("ADMIN has VIEWER and ADMIN but not OWNER", () => {
    expect(hasRole("ADMIN", "VIEWER")).toBe(true);
    expect(hasRole("ADMIN", "ADMIN")).toBe(true);
    expect(hasRole("ADMIN", "OWNER")).toBe(false);
  });

  it("VIEWER only has VIEWER", () => {
    expect(hasRole("VIEWER", "VIEWER")).toBe(true);
    expect(hasRole("VIEWER", "ADMIN")).toBe(false);
    expect(hasRole("VIEWER", "OWNER")).toBe(false);
  });
});

describe("ProtectedRoute", () => {
  it("shows loading spinner while auth check is pending", () => {
    // Use a handler that delays response to keep isLoading=true
    server.use(
      http.get("/api/auth/me", () => {
        return new Promise(() => {}); // Never resolves — keeps loading state
      })
    );

    render(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    expect(screen.getByText("Chargement...")).toBeInTheDocument();
  });

  it("redirects to /login when unauthenticated", async () => {
    render(
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("renders content when authenticated", async () => {
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
          <Route index element={<div>Protected Content</div>} />
        </Route>
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    await waitFor(() => {
      expect(screen.getByText("Protected Content")).toBeInTheDocument();
    });
  });

  it("redirects to /dashboard when wrong role", async () => {
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
        <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
          <Route path="/" element={<div>Admin Content</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard Redirect</div>} />
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    await waitFor(() => {
      expect(screen.getByText("Dashboard Redirect")).toBeInTheDocument();
    });
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });
});
