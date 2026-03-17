import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { DashboardGreeting } from "./DashboardGreeting";

// Auth handler that returns an authenticated viewer
const authViewerHandler = http.get("/api/auth/me", () => {
  return HttpResponse.json({
    userId: 1,
    email: "viewer@test.local",
    firstName: "Elisha",
    lastName: "Test",
    role: "VIEWER",
    departmentIds: [],
  });
});

const authAdminHandler = http.get("/api/auth/me", () => {
  return HttpResponse.json({
    userId: 3,
    email: "admin@test.local",
    firstName: "Admin",
    lastName: "Test",
    role: "ADMIN",
    departmentIds: [1],
  });
});

const authOwnerHandler = http.get("/api/auth/me", () => {
  return HttpResponse.json({
    userId: 4,
    email: "owner@test.local",
    firstName: "Owner",
    lastName: "Test",
    role: "OWNER",
    departmentIds: [],
  });
});

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DashboardGreeting", () => {
  it("renders greeting with user's first name", async () => {
    server.use(authViewerHandler);
    render(<DashboardGreeting />);

    await waitFor(() => {
      expect(screen.getByText("Bonjour, Elisha")).toBeInTheDocument();
    });
  });

  it("renders 'Centre de Commande' micro-label", async () => {
    server.use(authViewerHandler);
    render(<DashboardGreeting />);

    await waitFor(() => {
      expect(screen.getByText("CENTRE DE COMMANDE")).toBeInTheDocument();
    });
  });

  it("renders formatted current date", async () => {
    server.use(authViewerHandler);
    render(<DashboardGreeting />);

    // The date is dynamic, so just check some date text is present
    await waitFor(() => {
      expect(screen.getByText("Bonjour, Elisha")).toBeInTheDocument();
    });

    // Find a text element that contains a year (2026)
    const dateElement = screen.getByText(/2026/);
    expect(dateElement).toBeInTheDocument();
  });

  it("renders role badge for VIEWER as 'Membre'", async () => {
    server.use(authViewerHandler);
    render(<DashboardGreeting />);

    await waitFor(() => {
      expect(screen.getByText("Membre")).toBeInTheDocument();
    });
  });

  it("renders role badge for ADMIN as 'Directeur'", async () => {
    server.use(authAdminHandler);
    render(<DashboardGreeting />);

    await waitFor(() => {
      expect(screen.getByText("Directeur")).toBeInTheDocument();
    });
  });

  it("renders role badge for OWNER as 'Propriétaire'", async () => {
    server.use(authOwnerHandler);
    render(<DashboardGreeting />);

    await waitFor(() => {
      expect(screen.getByText("Propriétaire")).toBeInTheDocument();
    });
  });

  it("has h1 heading for accessibility", async () => {
    server.use(authViewerHandler);
    render(<DashboardGreeting />);

    await waitFor(() => {
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toBeInTheDocument();
      expect(heading.textContent).toContain("Bonjour");
    });
  });
});
