import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { format } from "date-fns";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  dashboardHandlers,
  dashboardHandlersEmpty,
  dashboardHandlersError,
} from "@/mocks/handlers/dashboard";
import { assignmentHandlers } from "@/mocks/handlers/assignments";
import { DashboardUpcomingSection } from "./DashboardUpcomingSection";

// Auth handlers for different roles
const authViewerHandler = http.get("/api/auth/me", () => {
  return HttpResponse.json({
    userId: 1,
    email: "viewer@test.local",
    firstName: "Test",
    lastName: "Viewer",
    role: "VIEWER",
    departmentIds: [],
  });
});

const authAdminHandler = http.get("/api/auth/me", () => {
  return HttpResponse.json({
    userId: 3,
    email: "admin@test.local",
    firstName: "Test",
    lastName: "Admin",
    role: "ADMIN",
    departmentIds: [1, 3],
  });
});

const authOwnerHandler = http.get("/api/auth/me", () => {
  return HttpResponse.json({
    userId: 4,
    email: "owner@test.local",
    firstName: "Test",
    lastName: "Owner",
    role: "OWNER",
    departmentIds: [],
  });
});

const server = setupServer(
  ...authHandlers,
  ...dashboardHandlers,
  ...assignmentHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("DashboardUpcomingSection", () => {
  it("renders activity cards when data is available", async () => {
    server.use(authViewerHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    });

    expect(screen.getByText("Programme JA")).toBeInTheDocument();
    expect(screen.getByText("Réunion Diaconat")).toBeInTheDocument();
  });

  it("renders empty state when no activities", async () => {
    server.use(authViewerHandler, ...dashboardHandlersEmpty);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Aucune activité à venir")).toBeInTheDocument();
    });
  });

  it("renders loading skeleton state", () => {
    server.use(authViewerHandler);
    render(<DashboardUpcomingSection />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders department abbreviation badges on cards", async () => {
    server.use(authViewerHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("MIFEM")).toBeInTheDocument();
    });

    expect(screen.getByText("JA")).toBeInTheDocument();
    expect(screen.getByText("DIA")).toBeInTheDocument();
  });

  it("shows predicateur name when available", async () => {
    server.use(authViewerHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Mario Vicuna")).toBeInTheDocument();
    });
  });

  it("shows staffing indicators for ADMIN user", async () => {
    server.use(authAdminHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    });

    // StaffingIndicator renders with role="status"
    const statusElements = screen.getAllByRole("status");
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it("does NOT show staffing indicators for VIEWER user", async () => {
    server.use(authViewerHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    });

    // StaffingIndicator has role="status" — should not be present for VIEWER
    const statusElements = screen.queryAllByRole("status");
    // Only the empty state "status" or no status elements for viewer
    const staffingStatuses = statusElements.filter(
      (el) => el.getAttribute("aria-label")?.includes("postes") ||
              el.getAttribute("aria-label")?.includes("rôle")
    );
    expect(staffingStatuses.length).toBe(0);
  });

  it("renders section heading with correct i18n key", async () => {
    server.use(authViewerHandler);
    render(<DashboardUpcomingSection />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Activités à Venir" })
    ).toBeInTheDocument();
  });

  it("cards are links to activity detail page", async () => {
    server.use(authViewerHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    });

    const articles = screen.getAllByRole("article");
    articles.forEach((article) => {
      const link = article.closest("a");
      expect(link).toBeTruthy();
      expect(link?.getAttribute("href")).toMatch(/\/activities\/\d+/);
    });
  });

  it("renders error state with retry button", async () => {
    server.use(authViewerHandler, ...dashboardHandlersError);
    render(<DashboardUpcomingSection />);

    await waitFor(
      () => {
        expect(
          screen.getByText("Impossible de charger les activités")
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    expect(screen.getByText("Réessayer")).toBeInTheDocument();
  });

  it("'View All' link visible for ADMIN, hidden for VIEWER", async () => {
    // Test with ADMIN
    server.use(authAdminHandler);
    const { unmount } = render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    });

    const viewAllLink = screen.getByText("Voir tout").closest("a");
    expect(viewAllLink).toBeTruthy();
    expect(viewAllLink?.getAttribute("href")).toBe("/admin/activities");
    unmount();

    // Test with VIEWER
    server.use(authViewerHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    });

    expect(screen.queryByText("Voir tout")).not.toBeInTheDocument();
  });

  it("ADMIN empty state shows admin hint", async () => {
    server.use(authAdminHandler, ...dashboardHandlersEmpty);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Aucune activité à venir")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Créez une activité depuis la page d'administration.")
    ).toBeInTheDocument();
  });

  it("OWNER sees 'Vue d'ensemble' subtitle", async () => {
    server.use(authOwnerHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Vue d'ensemble")).toBeInTheDocument();
    });
  });

  it("shows staffing indicators for OWNER user", async () => {
    server.use(authOwnerHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    });

    // StaffingIndicator renders with role="status" — OWNER (hierarchy ≥ ADMIN) should see them
    const statusElements = screen.getAllByRole("status");
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it("today's activity card has emphasis styling", async () => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayHandler = http.get("/api/activities/dashboard", () => {
      return HttpResponse.json([
        {
          id: 99,
          title: "Today Activity",
          date: todayStr,
          startTime: "10:00:00",
          endTime: "12:00:00",
          departmentId: 1,
          departmentName: "MIFEM",
          departmentAbbreviation: "MIFEM",
          departmentColor: "#4F46E5",
          visibility: "public",
          specialType: null,
          predicateurName: null,
          predicateurAvatarUrl: null,
          roleCount: 2,
          totalHeadcount: 4,
          assignedCount: 4,
          staffingStatus: "FullyStaffed",
        },
      ]);
    });

    server.use(authViewerHandler, todayHandler);
    render(<DashboardUpcomingSection />);

    await waitFor(() => {
      expect(screen.getByText("Today Activity")).toBeInTheDocument();
    });

    const article = screen.getByRole("article");
    expect(article.className).toContain("bg-primary/5");
  });
});
