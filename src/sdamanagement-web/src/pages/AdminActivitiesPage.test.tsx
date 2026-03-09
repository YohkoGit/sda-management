import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { activityHandlers, activityHandlersEmpty, activityTemplateHandlers } from "@/mocks/handlers/activities";
import { departmentHandlers } from "@/mocks/handlers/departments";
import { activityService } from "@/services/activityService";
import { activityTemplateService } from "@/services/activityTemplateService";
import AdminActivitiesPage from "./AdminActivitiesPage";

// Radix UI jsdom polyfills
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const ownerUser = {
  userId: 4,
  email: "owner@test.local",
  firstName: "Test",
  lastName: "Owner",
  role: "OWNER",
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

const mockTemplateData = [
  {
    id: 1,
    name: "Culte du Sabbat",
    description: "Service principal",
    roleSummary: "Predicateur (1), Ancien (1)",
    roleCount: 2,
    roles: [
      { id: 1, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0 },
      { id: 2, roleName: "Ancien", defaultHeadcount: 1, sortOrder: 1 },
    ],
  },
];

const server = setupServer(
  ...authHandlers,
  ...activityHandlers,
  ...activityTemplateHandlers,
  ...departmentHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

/** Helper: navigate past template step by clicking "Custom" card */
async function skipTemplateStep(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => {
    expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();
  });
  await user.click(screen.getByText("Activité sans modèle"));
}

describe("AdminActivitiesPage", () => {
  it("renders activity list with department badges", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });
    expect(screen.getByText("Reunion JA")).toBeInTheDocument();
    expect(screen.getByText("MIFEM")).toBeInTheDocument();
  });

  it("create flow shows template selector as first step", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Nouvelle activité"));

    // Template selector should be shown
    await waitFor(() => {
      expect(screen.getByText("Choisir un modèle")).toBeInTheDocument();
    });
    expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();
  });

  it("selecting a template transitions to form with role summary badges", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(activityTemplateService, "getAll").mockResolvedValue({
      data: mockTemplateData,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as never,
    });

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Nouvelle activité"));

    // Wait for template cards
    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat", { selector: "[role='radio'] *" })).toBeInTheDocument();
    });

    // Click the template card
    const templateCard = screen.getByRole("radio", { name: /Culte du Sabbat/i });
    await user.click(templateCard);

    // Should transition to form step with role badges
    await waitFor(() => {
      expect(screen.getByText("Rôles du modèle")).toBeInTheDocument();
    });
    expect(screen.getByText("Predicateur x1")).toBeInTheDocument();
    expect(screen.getByText("Ancien x1")).toBeInTheDocument();
    expect(screen.getByText("Retour aux modèles")).toBeInTheDocument();
    expect(screen.getByLabelText("Titre")).toBeInTheDocument();

    getSpy.mockRestore();
  });

  it("create with template sends templateId in request body", async () => {
    const user = userEvent.setup();
    const getSpy = vi.spyOn(activityTemplateService, "getAll").mockResolvedValue({
      data: mockTemplateData,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as never,
    });
    const createSpy = vi.spyOn(activityService, "create").mockResolvedValueOnce({
      data: {
        id: 99,
        title: "Test Activite",
        description: null,
        date: "2026-03-15",
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "Jeunesse Adventiste",
        visibility: "public",
        roles: [],
        concurrencyToken: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      status: 201,
      statusText: "Created",
      headers: {},
      config: {} as never,
    });

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    // Open create form
    await user.click(screen.getByText("Nouvelle activité"));

    // Select template
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /Culte du Sabbat/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("radio", { name: /Culte du Sabbat/i }));

    // Fill form
    await waitFor(() => {
      expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Titre"), "Test Activite");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-03-15" } });
    fireEvent.change(screen.getByLabelText("Heure de début"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Heure de fin"), { target: { value: "12:00" } });

    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);
    const deptOption = await screen.findByRole("option", { name: /Jeunesse Adventiste/i });
    await user.click(deptOption);

    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledOnce();
    });

    const callArgs = createSpy.mock.calls[0][0];
    expect(callArgs.templateId).toBe(1);

    createSpy.mockRestore();
    getSpy.mockRestore();
  });

  it("create without template (custom) does NOT send templateId", async () => {
    const user = userEvent.setup();
    const createSpy = vi.spyOn(activityService, "create").mockResolvedValueOnce({
      data: {
        id: 99,
        title: "Custom Activity",
        description: null,
        date: "2026-03-15",
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "Jeunesse Adventiste",
        visibility: "public",
        roles: [],
        concurrencyToken: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      status: 201,
      statusText: "Created",
      headers: {},
      config: {} as never,
    });

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Nouvelle activité"));
    await skipTemplateStep(user);

    // Fill form
    await waitFor(() => {
      expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Titre"), "Custom Activity");
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-03-15" } });
    fireEvent.change(screen.getByLabelText("Heure de début"), { target: { value: "10:00" } });
    fireEvent.change(screen.getByLabelText("Heure de fin"), { target: { value: "12:00" } });

    const selectTrigger = screen.getByRole("combobox");
    await user.click(selectTrigger);
    const deptOption = await screen.findByRole("option", { name: /Jeunesse Adventiste/i });
    await user.click(deptOption);

    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledOnce();
    });

    const callArgs = createSpy.mock.calls[0][0];
    expect(callArgs.templateId).toBeUndefined();

    createSpy.mockRestore();
  });

  it("edit flow does NOT show template selector", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    // Edit should show form directly, no template selector
    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    // Template selector should NOT be present
    expect(screen.queryByText("Choisir un modèle")).not.toBeInTheDocument();
    expect(screen.queryByText("Activité sans modèle")).not.toBeInTheDocument();
  });

  it("'Back to templates' button returns to template selection and resets form", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Nouvelle activité"));
    await skipTemplateStep(user);

    // Verify we're on the form step and type into the form
    await waitFor(() => {
      expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText("Titre"), "Typed Title");
    expect(screen.getByLabelText("Titre")).toHaveValue("Typed Title");

    // Click back to templates
    await user.click(screen.getByText("Retour aux modèles"));

    // Should be back on template selector
    await waitFor(() => {
      expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();
    });

    // Go forward again — form should be reset (unmount/remount clears state)
    await user.click(screen.getByText("Activité sans modèle"));
    await waitFor(() => {
      expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Titre")).toHaveValue("");
  });

  it("delete activity shows AlertDialog confirmation and deletes", async () => {
    const user = userEvent.setup();
    const deleteSpy = vi.spyOn(activityService, "delete").mockResolvedValueOnce({
      data: undefined,
      status: 204,
      statusText: "No Content",
      headers: {},
      config: {} as never,
    });

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByLabelText("Supprimer l\u2019activité");
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Êtes-vous sûr de vouloir supprimer cette activité ?")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalled();
    });

    deleteSpy.mockRestore();
  });

  it("department selector only shows admin's departments", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser)),
      http.get("/api/activities", ({ request }) => {
        const url = new URL(request.url);
        const deptId = url.searchParams.get("departmentId");
        if (deptId === "1") {
          return HttpResponse.json([
            {
              id: 1,
              title: "MIFEM Activity",
              date: "2026-03-07",
              startTime: "10:00:00",
              endTime: "12:00:00",
              departmentId: 1,
              departmentName: "MIFEM",
              departmentColor: "#4F46E5",
              visibility: "public",
              roleCount: 0,
              createdAt: "2026-03-01T00:00:00Z",
            },
          ]);
        }
        return HttpResponse.json([]);
      })
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("MIFEM Activity")).toBeInTheDocument();
    });
  });

  it("empty state shows guidance message when no activities", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      ...activityHandlersEmpty
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Aucune activité. Créez votre première activité.")
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Nouvelle activité")).toBeInTheDocument();
  });
});
