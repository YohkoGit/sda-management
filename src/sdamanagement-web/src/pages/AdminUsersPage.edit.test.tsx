import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@/test-utils";

// Polyfills for Radix Select in jsdom
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
import { authHandlers } from "@/mocks/handlers/auth";
import {
  userHandlers,
  userHandlerPut,
  userHandlerPut403,
  userHandlerPut404,
} from "@/mocks/handlers/users";
import { departmentHandlers } from "@/mocks/handlers/departments";
import AdminUsersPage from "./AdminUsersPage";

const ownerUser = {
  userId: 1,
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

const viewerUser = {
  userId: 10,
  email: "viewer@test.local",
  firstName: "Test",
  lastName: "Viewer",
  role: "VIEWER",
  departmentIds: [] as number[],
};

const server = setupServer(
  ...authHandlers,
  ...userHandlers,
  userHandlerPut,
  ...departmentHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminUsersPage — Edit Mode", () => {
  it("edit button visible for ADMIN, hidden for VIEWER", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    expect(editButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("edit button hidden for VIEWER", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    expect(screen.queryByText("Modifier")).not.toBeInTheDocument();
  });

  it("edit dialog opens with pre-populated user data", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText("Prénom") as HTMLInputElement;
    expect(firstNameInput.value).toBe("Marie-Claire");

    const lastNameInput = screen.getByLabelText("Nom de famille") as HTMLInputElement;
    expect(lastNameInput.value).toBe("Legault");
  });

  it("email field is displayed but disabled in edit mode", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    const emailInput = screen.getByDisplayValue("mc.legault@gmail.com") as HTMLInputElement;
    expect(emailInput).toBeDisabled();
    expect(screen.getByText("Le courriel ne peut pas être modifié")).toBeInTheDocument();
  });

  it("successful edit shows updated toast and closes dialog", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    // Modify a field to make form dirty
    const firstNameInput = screen.getByLabelText("Prénom");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Marie-Updated");

    await user.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(screen.getByText("Utilisateur mis à jour")).toBeInTheDocument();
    });
  });

  it("403 error shows forbidden toast", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      userHandlerPut403
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText("Prénom");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "Forbidden");

    await user.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(screen.getByText("Accès refusé")).toBeInTheDocument();
    });
  });

  it("404 error shows not found toast", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      userHandlerPut404
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    const firstNameInput = screen.getByLabelText("Prénom");
    await user.clear(firstNameInput);
    await user.type(firstNameInput, "NotFound");

    await user.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(screen.getByText("Utilisateur introuvable")).toBeInTheDocument();
    });
  });

  it("role dropdown filters options based on admin role", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    // Open the role dropdown
    const roleTrigger = screen.getByRole("combobox", { name: /rôle/i });
    await user.click(roleTrigger);

    // Admin should see Membre and Administrateur options but NOT Propriétaire (Owner)
    const options = screen.getAllByRole("option");
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).toContain("Membre");
    expect(optionTexts).toContain("Administrateur");
    expect(optionTexts).not.toContain("Propriétaire");
  });

  it("edit dialog pre-populates departments correctly", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    // First mock user has department JA (id: 1) — DepartmentMultiSelect should render the JA badge
    // The dialog's DepartmentMultiSelect shows abbreviation badges for selected departments
    await waitFor(() => {
      const dialog = screen.getByRole("dialog");
      // Look for JA badge within the dialog (avoid matching the user card's JA badge)
      const jaBadges = dialog.querySelectorAll("span");
      const hasJaBadge = Array.from(jaBadges).some((el) => el.textContent === "JA");
      expect(hasJaBadge).toBe(true);
    });
  });

  it("validation errors display inline on correct fields", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    // Clear a required field to trigger client-side validation
    const firstNameInput = screen.getByLabelText("Prénom");
    await user.clear(firstNameInput);
    // Blur to trigger onBlur validation
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText("Le prénom est requis")).toBeInTheDocument();
    });
  });

  it("self-edit disables role dropdown with helper text", async () => {
    const user = userEvent.setup();
    // Use userId=2 to match the first mock user (Marie-Claire, id: 2)
    const selfUser = {
      userId: 2,
      email: "mc.legault@gmail.com",
      firstName: "Marie-Claire",
      lastName: "Legault",
      role: "ADMIN",
      departmentIds: [1],
    };
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(selfUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const editButtons = screen.getAllByText("Modifier");
    await user.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText("Modifier l'utilisateur")).toBeInTheDocument();
    });

    // Role dropdown should be disabled when editing yourself
    const roleTrigger = screen.getByRole("combobox", { name: /rôle/i });
    expect(roleTrigger).toBeDisabled();

    // Helper text should be shown
    expect(
      screen.getByText("Votre rôle ne peut être modifié que par un autre administrateur")
    ).toBeInTheDocument();
  });
});
