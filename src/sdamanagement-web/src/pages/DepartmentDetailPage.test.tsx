import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Routes, Route } from "react-router-dom";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { departmentHandlers } from "@/mocks/handlers/departments";
import { activityHandlers } from "@/mocks/handlers/activities";
import { assignableOfficerHandlers } from "@/mocks/handlers/users";
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
  ...activityHandlers,
  ...assignableOfficerHandlers
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

  it("renders sub-ministries with lead info in read-only mode for VIEWER", async () => {
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Eclaireurs")).toBeInTheDocument();
    });
    expect(screen.getByText("Ambassadeurs")).toBeInTheDocument();
    // Lead info should be visible for Eclaireurs (has lead)
    expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
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
        screen.getByText("Ready to plan? Create your first activity or meeting.")
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
            isMeeting: false,
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

  /* ───── 8.2 — Management buttons & meeting visuals ───── */

  const ownerUser = {
    userId: 10,
    email: "owner@test.local",
    firstName: "Test",
    lastName: "Owner",
    role: "OWNER",
    departmentIds: [] as number[],
  };

  const adminNoScopeUser = {
    userId: 4,
    email: "admin-noscope@test.local",
    firstName: "Test",
    lastName: "NoScope",
    role: "ADMIN",
    departmentIds: [99], // does NOT include dept 1
  };

  it("shows management buttons for ADMIN with scope (8.2)", async () => {
    renderWithRoute(3, 1, adminUser);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    expect(screen.getAllByText("New Activity").length).toBeGreaterThan(0);
    expect(screen.getAllByText("New Meeting").length).toBeGreaterThan(0);
  });

  it("shows management buttons for OWNER (8.2)", async () => {
    renderWithRoute(10, 1, ownerUser);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    expect(screen.getAllByText("New Activity").length).toBeGreaterThan(0);
    expect(screen.getAllByText("New Meeting").length).toBeGreaterThan(0);
  });

  it("hides management buttons for VIEWER (8.2)", async () => {
    renderWithRoute(1, 1, viewerUser);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    expect(screen.queryByText("New Activity")).not.toBeInTheDocument();
    expect(screen.queryByText("New Meeting")).not.toBeInTheDocument();
  });

  it("hides management buttons for ADMIN without scope (8.2)", async () => {
    renderWithRoute(4, 1, adminNoScopeUser);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    expect(screen.queryByText("New Activity")).not.toBeInTheDocument();
    expect(screen.queryByText("New Meeting")).not.toBeInTheDocument();
  });

  it("shows edit/delete icons for admin with scope (8.2)", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    server.use(
      http.get("/api/activities", () =>
        HttpResponse.json([
          {
            id: 50,
            title: "Scoped Activity",
            date: dateStr,
            startTime: "10:00:00",
            endTime: "12:00:00",
            departmentId: 1,
            departmentName: "JA",
            departmentColor: "#4F46E5",
            visibility: "public",
            specialType: null,
            isMeeting: false,
            roleCount: 1,
            totalHeadcount: 2,
            assignedCount: 1,
            staffingStatus: "PartiallyStaffed",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ])
      )
    );

    renderWithRoute(3, 1, adminUser);

    await waitFor(() => {
      expect(screen.getByText("Scoped Activity")).toBeInTheDocument();
    });

    // Edit and delete icon buttons (activity row + sub-ministry rows when canManage)
    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Delete" }).length).toBeGreaterThanOrEqual(1);
  });

  /* ───── 8.3 — Sub-ministry management ───── */

  it("shows SubMinistryManager for ADMIN with scope (8.3)", async () => {
    renderWithRoute(3, 1, adminUser);

    await waitFor(() => {
      expect(screen.getByText("Eclaireurs")).toBeInTheDocument();
    });
    // Should show add button from SubMinistryManager
    expect(screen.getByText("Ajouter un sous-ministère")).toBeInTheDocument();
  });

  it("shows SubMinistryManager for OWNER (8.3)", async () => {
    renderWithRoute(10, 1, ownerUser);

    await waitFor(() => {
      expect(screen.getByText("Eclaireurs")).toBeInTheDocument();
    });
    expect(screen.getByText("Ajouter un sous-ministère")).toBeInTheDocument();
  });

  it("shows read-only sub-ministries for VIEWER (8.3)", async () => {
    renderWithRoute(1, 1, viewerUser);

    await waitFor(() => {
      expect(screen.getByText("Eclaireurs")).toBeInTheDocument();
    });
    // No add button for viewer
    expect(screen.queryByText("Ajouter un sous-ministère")).not.toBeInTheDocument();
    // Lead info visible
    expect(screen.getByText("Marie Dupont")).toBeInTheDocument();
  });

  it("shows read-only sub-ministries for ADMIN without scope (8.3)", async () => {
    renderWithRoute(4, 1, adminNoScopeUser);

    await waitFor(() => {
      expect(screen.getByText("Eclaireurs")).toBeInTheDocument();
    });
    // No add button
    expect(screen.queryByText("Ajouter un sous-ministère")).not.toBeInTheDocument();
  });

  /* ───── 8.4 — OWNER full department access ───── */

  it("renders management controls for OWNER viewing unassigned department (8.4)", async () => {
    // ownerUser has departmentIds: [] — dept 2 (MIFEM) is NOT in their assignments
    renderWithRoute(10, 2, ownerUser);

    await waitFor(() => {
      expect(screen.getByText("Ministere de la Femme")).toBeInTheDocument();
    });

    // OWNER should see management buttons even with zero department assignments
    expect(screen.getAllByText("New Activity").length).toBeGreaterThan(0);
    expect(screen.getAllByText("New Meeting").length).toBeGreaterThan(0);
  });

  it("OWNER sees edit/delete icons on activities in unassigned department (8.4)", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    server.use(
      http.get("/api/activities", () =>
        HttpResponse.json([
          {
            id: 70,
            title: "Owner Access Activity",
            date: dateStr,
            startTime: "10:00:00",
            endTime: "12:00:00",
            departmentId: 2,
            departmentName: "MIFEM",
            departmentColor: "#EC4899",
            visibility: "public",
            specialType: null,
            isMeeting: false,
            roleCount: 1,
            totalHeadcount: 2,
            assignedCount: 1,
            staffingStatus: "PartiallyStaffed",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ])
      )
    );

    renderWithRoute(10, 2, ownerUser);

    await waitFor(() => {
      expect(screen.getByText("Owner Access Activity")).toBeInTheDocument();
    });

    // OWNER should see edit/delete icon buttons (activity row + sub-ministry rows)
    expect(screen.getAllByRole("button", { name: "Edit" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole("button", { name: "Delete" }).length).toBeGreaterThanOrEqual(1);
  });

  it("OWNER sees SubMinistryManager on unassigned department (8.4)", async () => {
    // Dept 3 (Diaconat) has sub-ministry "Diacres" and OWNER has no assignments
    renderWithRoute(10, 3, ownerUser);

    await waitFor(() => {
      expect(screen.getByText("Diaconat")).toBeInTheDocument();
    });
    expect(screen.getByText("Diacres")).toBeInTheDocument();
    expect(screen.getByText("Ajouter un sous-ministère")).toBeInTheDocument();
  });

  it("renders meeting with Video icon instead of StaffingIndicator (8.2)", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const dateStr = futureDate.toISOString().split("T")[0];

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser)),
      http.get("/api/activities", () =>
        HttpResponse.json([
          {
            id: 60,
            title: "Zoom Departmental Meeting",
            date: dateStr,
            startTime: "19:00:00",
            endTime: "20:00:00",
            departmentId: 1,
            departmentName: "JA",
            departmentColor: "#4F46E5",
            visibility: "authenticated",
            specialType: null,
            isMeeting: true,
            meetingType: "zoom",
            roleCount: 0,
            totalHeadcount: 0,
            assignedCount: 0,
            staffingStatus: "NoRoles",
            createdAt: "2026-01-01T00:00:00Z",
          },
        ])
      )
    );

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText("Zoom Departmental Meeting")).toBeInTheDocument();
    });

    // For a zoom meeting, the "Zoom" label text should appear
    expect(screen.getByText("Zoom")).toBeInTheDocument();
  });
});
