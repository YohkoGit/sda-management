import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { fireEvent, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, futureDate } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { activityHandlers, activityHandlersEmpty, activityTemplateHandlers } from "@/mocks/handlers/activities";
import { departmentHandlers } from "@/mocks/handlers/departments";
import { activityService, type ActivityResponse } from "@/services/activityService";
import { activityTemplateService } from "@/services/activityTemplateService";
import type { AxiosError } from "axios";
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
      { id: 1, roleName: "Predicateur", defaultHeadcount: 1, sortOrder: 0, isCritical: true, isPredicateur: true },
      { id: 2, roleName: "Ancien", defaultHeadcount: 1, sortOrder: 1, isCritical: true, isPredicateur: false },
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

/** Helper: pick a date via the DateField popover.
 * The DateField trigger is a button labeled by its ariaLabel; each day cell is
 * a button with aria-label set to its ISO date string. The popover only shows
 * one month at a time, so we navigate the calendar header chevrons until the
 * target month is visible. */
async function pickDate(
  user: ReturnType<typeof userEvent.setup>,
  fieldLabel: string,
  iso: string
) {
  await user.click(screen.getByLabelText(fieldLabel));

  const [y, m] = iso.split("-").map(Number);
  const target = new Date(y, m - 1, 1);
  const today = new Date();
  const cur = new Date(today.getFullYear(), today.getMonth(), 1);
  let diff = (target.getFullYear() - cur.getFullYear()) * 12 + (target.getMonth() - cur.getMonth());

  while (diff !== 0) {
    const nextBtn = screen.getByRole("button", {
      name: diff > 0 ? /Mois suivant/i : /Mois précédent/i,
    });
    await user.click(nextBtn);
    diff += diff > 0 ? -1 : 1;
  }

  const dayBtn = await screen.findByLabelText(iso);
  await user.click(dayBtn);
}

/** Helper: pick a time via the TimeField popover.
 * Opens the popover and types into the inner <input type="time"> then clicks OK. */
async function pickTime(
  user: ReturnType<typeof userEvent.setup>,
  fieldLabel: string,
  time: string
) {
  await user.click(screen.getByLabelText(fieldLabel));
  // Find the time input inside the open popover and set its value.
  const inputs = document.querySelectorAll('input[type="time"]');
  const input = inputs[inputs.length - 1] as HTMLInputElement;
  fireEvent.change(input, { target: { value: time } });
  // Click the OK button to commit
  const okButtons = screen.getAllByRole("button", { name: /^OK$/i });
  await user.click(okButtons[okButtons.length - 1]);
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
    expect(screen.getAllByText("MIFEM").length).toBeGreaterThanOrEqual(1);
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

  it("selecting a template transitions to form with pre-populated role roster", async () => {
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

    // Should transition to form step with role roster pre-populated from template
    await waitFor(() => {
      expect(screen.getByText("Rôles de l\u2019activité")).toBeInTheDocument();
    });
    expect(screen.getByDisplayValue("Predicateur")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ancien")).toBeInTheDocument();
    expect(screen.getByText("Retour aux modèles")).toBeInTheDocument();
    expect(screen.getByLabelText("Titre")).toBeInTheDocument();

    getSpy.mockRestore();
  });

  it("create with template sends roles (not templateId) when roles are pre-populated", async () => {
    const user = userEvent.setup();
    const date = futureDate();
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
        date,
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "Jeunesse Adventiste",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        visibility: "public",
        specialType: null,
        isMeeting: false,
        roles: [
          { id: 200, roleName: "Predicateur", headcount: 1, sortOrder: 0, isCritical: true, assignments: [] },
          { id: 201, roleName: "Ancien", headcount: 1, sortOrder: 1, isCritical: true, assignments: [] },
        ],
        staffingStatus: "NoRoles",
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
    await pickDate(user, "Date", date);
    await pickTime(user, "Heure de début", "10:00");
    await pickTime(user, "Heure de fin", "12:00");

    const selectTrigger = screen.getAllByRole("combobox")[0];
    await user.click(selectTrigger);
    const deptOption = await screen.findByRole("option", { name: /Jeunesse Adventiste/i });
    await user.click(deptOption);

    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledOnce();
    });

    const callArgs = createSpy.mock.calls[0][0];
    // With pre-populated roles, templateId should be undefined (roles override)
    expect(callArgs.templateId).toBeUndefined();
    expect(callArgs.roles).toHaveLength(2);
    expect(callArgs.roles![0].roleName).toBe("Predicateur");
    expect(callArgs.roles![1].roleName).toBe("Ancien");

    createSpy.mockRestore();
    getSpy.mockRestore();
  });

  it("create without template (custom) does NOT send templateId", async () => {
    const user = userEvent.setup();
    const date = futureDate();
    const createSpy = vi.spyOn(activityService, "create").mockResolvedValueOnce({
      data: {
        id: 99,
        title: "Custom Activity",
        description: null,
        date,
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "Jeunesse Adventiste",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        visibility: "public",
        specialType: null,
        isMeeting: false,
        roles: [],
        staffingStatus: "NoRoles",
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
    await pickDate(user, "Date", date);
    await pickTime(user, "Heure de début", "10:00");
    await pickTime(user, "Heure de fin", "12:00");

    const selectTrigger = screen.getAllByRole("combobox")[0];
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
              date: futureDate(),
              startTime: "10:00:00",
              endTime: "12:00:00",
              departmentId: 1,
              departmentName: "MIFEM",
              departmentColor: "#4F46E5",
              visibility: "public",
              specialType: null,
              isMeeting: false,
              roleCount: 0,
              totalHeadcount: 0,
              assignedCount: 0,
              staffingStatus: "NoRoles",
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

  // --- Role Roster Integration Tests (Story 4.3) ---

  it("create flow with custom starts with empty role roster", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Rôles de l\u2019activité")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Aucun rôle. Ajoutez des rôles pour définir les postes nécessaires.")
    ).toBeInTheDocument();
  });

  it("edit flow pre-populates RoleRosterEditor with existing activity roles", async () => {
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

    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    // Activity 1 has "Predicateur" and "Ancien de Service" roles
    expect(screen.getByDisplayValue("Predicateur")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ancien de Service")).toBeInTheDocument();
  });

  it("role section appears with heading in form", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Rôles de l\u2019activité")).toBeInTheDocument();
    });

    // The heading should be an h3
    const heading = screen.getByText("Rôles de l\u2019activité");
    expect(heading.tagName).toBe("H3");
  });

  it("'Back to templates' resets role roster", async () => {
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

    // Select template to get pre-populated roles
    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /Culte du Sabbat/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("radio", { name: /Culte du Sabbat/i }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Predicateur")).toBeInTheDocument();
    });

    // Go back to templates
    await user.click(screen.getByText("Retour aux modèles"));

    // Select custom (no template)
    await waitFor(() => {
      expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Activité sans modèle"));

    // Role roster should be empty
    await waitFor(() => {
      expect(
        screen.getByText("Aucun rôle. Ajoutez des rôles pour définir les postes nécessaires.")
      ).toBeInTheDocument();
    });

    getSpy.mockRestore();
  });

  it("adding a role in create flow includes it in submit request", async () => {
    const user = userEvent.setup();
    const date = futureDate();
    const createSpy = vi.spyOn(activityService, "create").mockResolvedValueOnce({
      data: {
        id: 99,
        title: "With Role",
        description: null,
        date,
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "Jeunesse Adventiste",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        visibility: "public",
        specialType: null,
        isMeeting: false,
        roles: [{ id: 200, roleName: "Musicien", headcount: 1, sortOrder: 0, isCritical: false, assignments: [] }],
        staffingStatus: "NoRoles",
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

    await waitFor(() => {
      expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    });

    // Fill required fields
    await user.type(screen.getByLabelText("Titre"), "With Role");
    await pickDate(user, "Date", date);
    await pickTime(user, "Heure de début", "10:00");
    await pickTime(user, "Heure de fin", "12:00");

    const selectTrigger = screen.getAllByRole("combobox")[0];
    await user.click(selectTrigger);
    const deptOption = await screen.findByRole("option", { name: /Jeunesse Adventiste/i });
    await user.click(deptOption);

    // Add a role
    await user.click(screen.getByText("Ajouter un rôle"));
    const roleInput = screen.getByPlaceholderText("Nom du rôle");
    await user.type(roleInput, "Musicien");

    // Submit
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledOnce();
    });

    const callArgs = createSpy.mock.calls[0][0];
    expect(callArgs.roles).toHaveLength(1);
    expect(callArgs.roles![0].roleName).toBe("Musicien");
    expect(callArgs.roles![0].headcount).toBe(1);

    createSpy.mockRestore();
  });

  it("modifying roles in edit flow sends updated roles in request", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(activityService, "update").mockResolvedValueOnce({
      data: {
        id: 1,
        title: "Culte du Sabbat",
        description: "Service principal du samedi matin",
        date: futureDate(),
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "MIFEM",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        visibility: "public",
        specialType: null,
        isMeeting: false,
        roles: [
          { id: 1, roleName: "Predicateur", headcount: 3, sortOrder: 0, isCritical: true, assignments: [] },
          { id: 2, roleName: "Ancien de Service", headcount: 1, sortOrder: 1, isCritical: true, assignments: [] },
        ],
        staffingStatus: "NoRoles",
        concurrencyToken: 101,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: new Date().toISOString(),
      },
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

    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Predicateur")).toBeInTheDocument();
    });

    // Increase headcount on Predicateur role
    const increaseButtons = screen.getAllByLabelText("Augmenter le nombre");
    await user.click(increaseButtons[0]);
    await user.click(increaseButtons[0]);

    // Submit
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledOnce();
    });

    const callArgs = updateSpy.mock.calls[0];
    const data = callArgs[1];
    expect(data.roles).toHaveLength(2);
    expect(data.roles![0].roleName).toBe("Predicateur");
    expect(data.roles![0].headcount).toBe(3);

    updateSpy.mockRestore();
  });

  it("removing all roles in edit sends empty roles array", async () => {
    const user = userEvent.setup();
    const updateSpy = vi.spyOn(activityService, "update").mockResolvedValueOnce({
      data: {
        id: 1,
        title: "Culte du Sabbat",
        description: "Service principal du samedi matin",
        date: futureDate(),
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "MIFEM",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        visibility: "public",
        specialType: null,
        isMeeting: false,
        roles: [],
        staffingStatus: "NoRoles",
        concurrencyToken: 101,
        createdAt: "2026-03-01T00:00:00Z",
        updatedAt: new Date().toISOString(),
      },
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

    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Predicateur")).toBeInTheDocument();
    });

    // Remove all roles (Predicateur has no assignments, Ancien de Service has 1)
    const removeButtons = screen.getAllByLabelText(/Supprimer le rôle/);
    // Remove first role (Predicateur — no assignments, immediate removal)
    await user.click(removeButtons[0]);

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Predicateur")).not.toBeInTheDocument();
    });

    // Remove second role (Ancien de Service — has assignments, needs confirmation)
    const remainingRemoveBtn = screen.getByLabelText(/Supprimer le rôle/);
    await user.click(remainingRemoveBtn);

    // Confirm removal in dialog
    await waitFor(() => {
      expect(screen.getByText("Supprimer le rôle ?")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    await waitFor(() => {
      expect(screen.queryByDisplayValue("Ancien de Service")).not.toBeInTheDocument();
    });

    // Submit
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledOnce();
    });

    const callArgs = updateSpy.mock.calls[0];
    const data = callArgs[1];
    expect(data.roles).toHaveLength(0);

    updateSpy.mockRestore();
  });

  // --- SpecialType Tests (Story 4.5) ---

  it("renders specialType select with all options in create form", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Type spécial")).toBeInTheDocument();
    });

    // The specialType field is now a TagPicker (ToggleGroup); each option is a
    // radio rendered inline (Radix ToggleGroup with type="single").
    const tagGroup = screen.getByRole("group", { name: "Type spécial" });
    expect(tagGroup).toBeInTheDocument();

    // "Aucun" (none) and each special type option
    expect(screen.getByRole("radio", { name: "Aucun" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Sainte-Cène" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Semaine de prière" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Camp Meeting" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Journée de la jeunesse" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Journée de la famille" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Journée de la femme" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Évangélisation" })).toBeInTheDocument();
  });

  it("selecting specialType includes it in the create payload", async () => {
    const user = userEvent.setup();
    const date = futureDate(14);
    const createSpy = vi.spyOn(activityService, "create").mockResolvedValueOnce({
      data: {
        id: 99,
        title: "Sainte-Cene",
        description: null,
        date,
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "Jeunesse Adventiste",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        visibility: "public",
        specialType: "sainte-cene",
        isMeeting: false,
        roles: [],
        staffingStatus: "NoRoles",
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

    await waitFor(() => {
      expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    });

    // Fill required fields
    await user.type(screen.getByLabelText("Titre"), "Sainte-Cene");
    await pickDate(user, "Date", date);
    await pickTime(user, "Heure de début", "10:00");
    await pickTime(user, "Heure de fin", "12:00");

    // Select department
    const deptTrigger = screen.getAllByRole("combobox")[0];
    await user.click(deptTrigger);
    const deptOption = await screen.findByRole("option", { name: /Jeunesse Adventiste/i });
    await user.click(deptOption);

    // Select specialType via the TagPicker — click the Sainte-Cène radio
    // (Radix ToggleGroup with type="single" renders items as radios).
    const tagGroup = screen.getByRole("group", { name: "Type spécial" });
    await user.click(within(tagGroup).getByRole("radio", { name: "Sainte-Cène" }));

    // Submit
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledOnce();
    });

    const callArgs = createSpy.mock.calls[0][0];
    expect(callArgs.specialType).toBe("sainte-cene");

    createSpy.mockRestore();
  });

  it("selecting 'None' sends null specialType", async () => {
    const user = userEvent.setup();
    const date = futureDate(14);
    const createSpy = vi.spyOn(activityService, "create").mockResolvedValueOnce({
      data: {
        id: 99,
        title: "No Special",
        description: null,
        date,
        startTime: "10:00:00",
        endTime: "12:00:00",
        departmentId: 1,
        departmentName: "Jeunesse Adventiste",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
        visibility: "public",
        specialType: null,
        isMeeting: false,
        roles: [],
        staffingStatus: "NoRoles",
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

    await waitFor(() => {
      expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Titre"), "No Special");
    await pickDate(user, "Date", date);
    await pickTime(user, "Heure de début", "10:00");
    await pickTime(user, "Heure de fin", "12:00");

    const deptTrigger = screen.getAllByRole("combobox")[0];
    await user.click(deptTrigger);
    const deptOption = await screen.findByRole("option", { name: /Jeunesse Adventiste/i });
    await user.click(deptOption);

    // Submit without selecting specialType (default is None/null)
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledOnce();
    });

    const callArgs = createSpy.mock.calls[0][0];
    // Default is undefined/null — not set
    expect(callArgs.specialType ?? null).toBeNull();

    createSpy.mockRestore();
  });

  it("edit flow pre-populates specialType from existing activity", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    // Click edit on first activity (which has specialType: "sainte-cene" in mock)
    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    // The specialType select should show "Sainte-Cène" (pre-populated)
    // There may be multiple "Sainte-Cène" elements (badge in table + select in form)
    const sainteCeneElements = screen.getAllByText("Sainte-Cène");
    expect(sainteCeneElements.length).toBeGreaterThanOrEqual(2); // badge + select value
  });

  it("renders specialType badge for activities with specialType", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    // First activity has specialType: "sainte-cene" — should show badge
    expect(screen.getByText("Sainte-Cène")).toBeInTheDocument();
  });

  it("does not render specialType badge for activities without specialType", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Reunion JA")).toBeInTheDocument();
    });

    // Second activity has specialType: null — no badge should appear
    const reunionRow = screen.getByText("Reunion JA").closest("tr")!;
    const specialBadges = reunionRow.querySelectorAll('[data-testid="special-type-badge"]');
    expect(specialBadges).toHaveLength(0);
  });

  // --- Staffing Indicator Tests (Story 4.7) ---

  it("activity table rows show staffing indicator column", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    // Check that the staffing column header is present
    expect(screen.getByText("Effectif")).toBeInTheDocument();

    // "Culte du Sabbat" has CriticalGap — label combines count and "Critique"
    // (e.g. "0/1 · Critique"). Match via partial regex.
    expect(screen.getByText(/Critique/)).toBeInTheDocument();

    // "Reunion JA" has NoRoles — should show "Aucun rôle" (may appear in multiple rows)
    expect(screen.getAllByText("Aucun rôle").length).toBeGreaterThanOrEqual(1);

    // "Ecole du Sabbat" is FullyStaffed — should show "Complet"
    expect(screen.getByText("Complet")).toBeInTheDocument();
  });

  it("clicking activity row opens read-only roster panel", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    // Click on the row (not the edit button)
    const row = screen.getByText("Culte du Sabbat").closest("tr")!;
    await user.click(row);

    // Roster panel should open with activity details
    await waitFor(() => {
      // The detail endpoint returns roles — check that the roster view renders
      expect(screen.getByText("Predicateur")).toBeInTheDocument();
    });

    // Should show headcount badge for the Ancien de Service role
    await waitFor(() => {
      expect(screen.getByText("Dupont, J.")).toBeInTheDocument();
    });
  });

  it("edit button still opens edit form via stopPropagation", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    // Click the edit button (should NOT open the roster panel)
    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    // Should open the edit form, NOT the roster view
    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    // The edit form should have the "Enregistrer" submit button
    expect(screen.getByRole("button", { name: /enregistrer/i })).toBeInTheDocument();
  });

  // --- Conflict Dialog Tests (Story 4.8) ---

  it("update mutation receiving 409 opens conflict dialog (not a toast)", async () => {
    const user = userEvent.setup();
    const error409 = Object.assign(new Error("Conflict"), {
      response: { status: 409 },
      isAxiosError: true,
    }) as AxiosError;

    const updateSpy = vi.spyOn(activityService, "update").mockRejectedValueOnce(error409);

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    // Open edit form
    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    // Submit the form
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    // Conflict dialog should open
    await waitFor(() => {
      expect(screen.getByText("Conflit de modification")).toBeInTheDocument();
    });

    // Both action buttons should be present
    expect(screen.getByText("Recharger les données")).toBeInTheDocument();
    expect(screen.getByText("Écraser avec mes modifications")).toBeInTheDocument();

    updateSpy.mockRestore();
  });

  it("edit form remains open when conflict dialog appears", async () => {
    const user = userEvent.setup();
    const error409 = Object.assign(new Error("Conflict"), {
      response: { status: 409 },
      isAxiosError: true,
    }) as AxiosError;

    const updateSpy = vi.spyOn(activityService, "update").mockRejectedValueOnce(error409);

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText("Conflit de modification")).toBeInTheDocument();
    });

    // The edit form title should still be visible behind the dialog
    expect(screen.getByText("Modifier l\u2019activité")).toBeInTheDocument();

    updateSpy.mockRestore();
  });

  it("clicking 'Recharger' in conflict dialog fetches fresh data and resets form", async () => {
    const user = userEvent.setup();
    const error409 = Object.assign(new Error("Conflict"), {
      response: { status: 409 },
      isAxiosError: true,
    }) as AxiosError;

    const freshActivity: ActivityResponse = {
      id: 1,
      title: "Updated By Admin B",
      description: null,
      date: futureDate(),
      startTime: "10:00:00",
      endTime: "12:00:00",
      departmentId: 1,
      departmentName: "MIFEM",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
      visibility: "public",
      specialType: null,
      isMeeting: false,
      roles: [],
        staffingStatus: "NoRoles",
      concurrencyToken: 999,
      createdAt: "2026-03-01T00:00:00Z",
      updatedAt: "2026-03-05T00:00:00Z",
    };

    const updateSpy = vi.spyOn(activityService, "update").mockRejectedValueOnce(error409);
    const getByIdSpy = vi.spyOn(activityService, "getById")
      .mockResolvedValueOnce({
        data: {
          id: 1,
          title: "Culte du Sabbat",
          description: "Service principal du samedi matin",
          date: futureDate(),
          startTime: "10:00:00",
          endTime: "12:00:00",
          departmentId: 1,
          departmentName: "MIFEM",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
          visibility: "public",
          specialType: "sainte-cene",
          isMeeting: false,
          roles: [
            { id: 1, roleName: "Predicateur", headcount: 1, sortOrder: 0, isCritical: true, assignments: [] },
            { id: 2, roleName: "Ancien de Service", headcount: 1, sortOrder: 1, isCritical: true, assignments: [{ id: 10, userId: 5, firstName: "Jean", lastName: "Dupont", avatarUrl: null, isGuest: false }] },
          ],
        staffingStatus: "NoRoles",
          concurrencyToken: 42,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: "2026-03-01T00:00:00Z",
        },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as never,
      })
      .mockResolvedValueOnce({
        data: freshActivity,
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

    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText("Conflit de modification")).toBeInTheDocument();
    });

    // Click Reload
    await user.click(screen.getByText("Recharger les données"));

    // After reload, the form should show updated data
    await waitFor(() => {
      expect(screen.getByDisplayValue("Updated By Admin B")).toBeInTheDocument();
    });

    // AC3: success toast confirms "Données rechargées"
    await waitFor(() => {
      expect(screen.getByText("Données rechargées")).toBeInTheDocument();
    });

    updateSpy.mockRestore();
    getByIdSpy.mockRestore();
  });

  it("clicking 'Écraser' in conflict dialog retries with force=true", async () => {
    const user = userEvent.setup();
    const error409 = Object.assign(new Error("Conflict"), {
      response: { status: 409 },
      isAxiosError: true,
    }) as AxiosError;

    const updateSpy = vi.spyOn(activityService, "update")
      .mockRejectedValueOnce(error409)
      .mockResolvedValueOnce({
        data: {
          id: 1,
          title: "Culte du Sabbat",
          description: "Service principal du samedi matin",
          date: futureDate(),
          startTime: "10:00:00",
          endTime: "12:00:00",
          departmentId: 1,
          departmentName: "MIFEM",
        departmentAbbreviation: "JA",
        departmentColor: "#14B8A6",
          visibility: "public",
          specialType: "sainte-cene",
          isMeeting: false,
          roles: [],
        staffingStatus: "NoRoles",
          concurrencyToken: 200,
          createdAt: "2026-03-01T00:00:00Z",
          updatedAt: new Date().toISOString(),
        },
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

    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText("Conflit de modification")).toBeInTheDocument();
    });

    // Click Overwrite
    await user.click(screen.getByText("Écraser avec mes modifications"));

    // The update should be retried with force=true
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    // Second call should have force=true (third argument)
    const secondCallArgs = updateSpy.mock.calls[1];
    expect(secondCallArgs[2]).toBe(true);

    // AC4: normal success toast appears after overwrite
    await waitFor(() => {
      expect(screen.getByText("Activité modifiée")).toBeInTheDocument();
    });

    // AC4: edit form closes after successful overwrite
    await waitFor(() => {
      expect(screen.queryByText("Modifier l\u2019activité")).not.toBeInTheDocument();
    });

    updateSpy.mockRestore();
  });

  it("force-save 409 falls back to toast instead of reopening dialog (loop guard)", async () => {
    const user = userEvent.setup();
    const error409 = Object.assign(new Error("Conflict"), {
      response: { status: 409 },
      isAxiosError: true,
    }) as AxiosError;

    // Both calls return 409 — first triggers dialog, second (force=true) triggers toast fallback
    const updateSpy = vi.spyOn(activityService, "update")
      .mockRejectedValueOnce(error409)
      .mockRejectedValueOnce(error409);

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivitiesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    // Open edit form
    const editButtons = screen.getAllByLabelText("Modifier l\u2019activité");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Culte du Sabbat")).toBeInTheDocument();
    });

    // Submit → first 409 → opens conflict dialog
    await user.click(screen.getByRole("button", { name: /enregistrer/i }));

    await waitFor(() => {
      expect(screen.getByText("Conflit de modification")).toBeInTheDocument();
    });

    // Click Overwrite → force=true retry → second 409
    await user.click(screen.getByText("Écraser avec mes modifications"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledTimes(2);
    });

    // Loop guard: toast.error should appear (fallback), NOT a re-opened conflict dialog
    await waitFor(() => {
      expect(screen.getByText("Cette activité a été modifiée par un autre utilisateur. Rechargez et réessayez.")).toBeInTheDocument();
    });

    // Conflict dialog should NOT reopen
    expect(screen.queryByText("Conflit de modification")).not.toBeInTheDocument();

    updateSpy.mockRestore();
  });
});
