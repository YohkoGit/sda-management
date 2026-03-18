import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Routes, Route } from "react-router-dom";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { departmentHandlers } from "@/mocks/handlers/departments";
import { activityHandlers } from "@/mocks/handlers/activities";
import DepartmentDetailPage from "./DepartmentDetailPage";

const viewerUser = {
  userId: 1,
  email: "viewer@test.local",
  firstName: "Test",
  lastName: "Viewer",
  role: "VIEWER",
  departmentIds: [] as number[],
};

const adminUser = {
  userId: 3,
  email: "admin@test.local",
  firstName: "Test",
  lastName: "Admin",
  role: "ADMIN",
  departmentIds: [1],
};

const server = setupServer(
  ...authHandlers,
  ...departmentHandlers,
  ...activityHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderWithRoute(_userId: number = 1, departmentId: number = 1, user = viewerUser) {
  server.use(
    http.get("/api/auth/me", () => HttpResponse.json(user))
  );

  return render(
    <Routes>
      <Route path="/my-departments/:id" element={<DepartmentDetailPage />} />
    </Routes>,
    {
      routerProps: {
        initialEntries: [`/my-departments/${departmentId}`],
      },
    }
  );
}

describe("DepartmentDetailPage", () => {
  it("renders department info and breadcrumb", async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
    expect(screen.getAllByText("JA").length).toBeGreaterThan(0);
    // Breadcrumb
    const breadcrumbLinks = screen.getAllByText("Unités Ministérielles");
    expect(breadcrumbLinks.length).toBeGreaterThan(0);
  });

  it("renders sub-ministries as chips", async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Eclaireurs")).toBeInTheDocument();
    });
    expect(screen.getByText("Ambassadeurs")).toBeInTheDocument();
  });

  it("renders 404 state with back link for non-existent department", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser)),
      http.get("/api/departments/:id", () =>
        HttpResponse.json(null, { status: 404 })
      )
    );

    render(
      <Routes>
        <Route path="/my-departments/:id" element={<DepartmentDetailPage />} />
      </Routes>,
      {
        routerProps: {
          initialEntries: ["/my-departments/999"],
        },
      }
    );

    await waitFor(() => {
      expect(screen.getByText("Département non trouvé")).toBeInTheDocument();
    });
    expect(screen.getByText("Unités Ministérielles")).toBeInTheDocument();
  });

  it("renders empty pipeline with viewer message", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser)),
      http.get("/api/activities", () => HttpResponse.json([]))
    );

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Aucune activité planifiée")).toBeInTheDocument();
    });
  });

  it("renders empty pipeline with admin message when admin has scope", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser)),
      http.get("/api/activities", () => HttpResponse.json([]))
    );

    renderWithRoute(3, 1, adminUser);

    await waitFor(() => {
      expect(
        screen.getByText("Prêt à planifier. Créez votre première activité.")
      ).toBeInTheDocument();
    });
  });

  it("renders no sub-ministries message when department has none", async () => {
    renderWithRoute(1, 2); // MIFEM has no sub-ministries

    await waitFor(() => {
      expect(screen.getByText("Aucun sous-ministère")).toBeInTheDocument();
    });
  });

  it("renders activity pipeline with clickable links to detail page (AC4)", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser)),
      http.get("/api/activities", () =>
        HttpResponse.json([
          {
            id: 42,
            title: "Pipeline Activity",
            date: dateStr,
            startTime: "10:00:00",
            endTime: "12:00:00",
            departmentId: 1,
            departmentName: "JA",
            departmentColor: "#4F46E5",
            visibility: "Public",
            specialType: null,
            roleCount: 2,
            totalHeadcount: 3,
            assignedCount: 2,
            staffingStatus: "PartiallyStaffed",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ])
      )
    );

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Pipeline Activity")).toBeInTheDocument();
    });

    const link = screen.getByText("Pipeline Activity").closest("a");
    expect(link).toHaveAttribute("href", "/activities/42");
  });
});
