import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  systemHealthHandlers,
  systemHealthUnhealthyHandler,
} from "@/mocks/handlers/systemHealth";
import AdminSystemHealthPage from "./AdminSystemHealthPage";

const ownerUser = {
  userId: 4,
  email: "owner@test.local",
  firstName: "Test",
  lastName: "Owner",
  role: "OWNER",
};

const adminUser = {
  userId: 3,
  email: "admin@test.local",
  firstName: "Test",
  lastName: "Admin",
  role: "ADMIN",
};

const server = setupServer(...authHandlers, ...systemHealthHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminSystemHealthPage", () => {
  it("renders health data for OWNER user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminSystemHealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Base de données")).toBeInTheDocument();
    });
    expect(screen.getByText("Informations système")).toBeInTheDocument();
    expect(screen.getByText("État de la configuration")).toBeInTheDocument();
  });

  it("shows healthy state with green indicator", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminSystemHealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Fonctionnel")).toBeInTheDocument();
    });

    const dot = screen.getByTestId("status-dot");
    expect(dot.className).toContain("bg-emerald-600");
  });

  it("shows unhealthy state with red indicator and error description", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      systemHealthUnhealthyHandler
    );

    render(<AdminSystemHealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Défaillant")).toBeInTheDocument();
    });

    const dot = screen.getByTestId("status-dot");
    expect(dot.className).toContain("bg-red-500");
    expect(
      screen.getByText("Failed to connect to PostgreSQL")
    ).toBeInTheDocument();
  });

  it("shows setup status counts", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminSystemHealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Configuration de l'église")).toBeInTheDocument();
    });
    expect(screen.getByText("3")).toBeInTheDocument(); // departmentCount
    expect(screen.getByText("5")).toBeInTheDocument(); // templateCount
    expect(screen.getByText("4")).toBeInTheDocument(); // scheduleCount
    expect(screen.getByText("12")).toBeInTheDocument(); // userCount
  });

  it("formats uptime correctly", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminSystemHealthPage />);

    // 138720 seconds = 1 day, 14 hours, 32 minutes
    await waitFor(() => {
      expect(screen.getByText(/1 jour, 14 heures, 32 minutes/)).toBeInTheDocument();
    });
  });

  it("formats uptime less than 1 minute correctly", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/system-health", () =>
        HttpResponse.json({
          status: "Healthy",
          checks: [
            {
              name: "npgsql",
              status: "Healthy",
              description: null,
              duration: "00:00:00.010",
            },
          ],
          version: "1.0.0-test",
          uptimeSeconds: 30,
          environment: "Development",
          setupStatus: {
            churchConfigExists: true,
            departmentCount: 1,
            templateCount: 0,
            scheduleCount: 0,
            userCount: 1,
          },
        })
      )
    );

    render(<AdminSystemHealthPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Moins d'une minute")
      ).toBeInTheDocument();
    });
  });

  it("redirects non-OWNER user away from page", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminSystemHealthPage />);

    await waitFor(() => {
      expect(
        screen.queryByText("Base de données")
      ).not.toBeInTheDocument();
    });
    expect(
      screen.queryByText("Informations système")
    ).not.toBeInTheDocument();
  });

  it("renders manual refresh button", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminSystemHealthPage />);

    await waitFor(() => {
      expect(screen.getByText("Actualiser")).toBeInTheDocument();
    });
  });
});
