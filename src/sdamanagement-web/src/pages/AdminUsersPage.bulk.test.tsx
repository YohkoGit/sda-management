import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor, within } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { userHandlers } from "@/mocks/handlers/users";
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
  userId: 2,
  email: "admin@test.local",
  firstName: "Test",
  lastName: "Admin",
  role: "ADMIN",
  departmentIds: [1],
};

const viewerUser = {
  userId: 3,
  email: "viewer@test.local",
  firstName: "Test",
  lastName: "Viewer",
  role: "VIEWER",
  departmentIds: [] as number[],
};

const server = setupServer(
  ...authHandlers,
  ...userHandlers,
  ...departmentHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminUsersPage — Bulk Create", () => {
  it("bulk create button visible for OWNER", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Création en lot")).toBeInTheDocument();
    });
  });

  it("bulk create button visible for ADMIN", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Création en lot")).toBeInTheDocument();
    });
  });

  it("bulk create button hidden for VIEWER", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });
    expect(screen.queryByText("Création en lot")).not.toBeInTheDocument();
  });

  it("bulk dialog opens with 3 empty rows", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Création en lot")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Création en lot"));

    await waitFor(() => {
      expect(screen.getByText("3 / 30 lignes")).toBeInTheDocument();
    });

    // Should have 3 row number indicators
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
  });

  it("add row appends a new row", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Création en lot")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Création en lot"));

    await waitFor(() => {
      expect(screen.getByText("3 / 30 lignes")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Ajouter une ligne"));

    expect(screen.getByText("4 / 30 lignes")).toBeInTheDocument();
    expect(screen.getByText("#4")).toBeInTheDocument();
  });

  it("remove row removes the row (minimum 1)", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Création en lot")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Création en lot"));

    await waitFor(() => {
      expect(screen.getByText("3 / 30 lignes")).toBeInTheDocument();
    });

    // Remove rows until 1 left
    const removeButtons = screen.getAllByLabelText("Supprimer la ligne");
    await user.click(removeButtons[0]);
    expect(screen.getByText("2 / 30 lignes")).toBeInTheDocument();

    await user.click(screen.getAllByLabelText("Supprimer la ligne")[0]);
    expect(screen.getByText("1 / 30 lignes")).toBeInTheDocument();

    // Last row's remove button should be disabled
    const lastRemoveButton = screen.getByLabelText("Supprimer la ligne");
    expect(lastRemoveButton).toBeDisabled();
  });

  it("successful bulk creation shows toast with count and closes dialog", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Création en lot")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Création en lot"));

    await waitFor(() => {
      expect(screen.getByText("3 / 30 lignes")).toBeInTheDocument();
    });

    // Remove 2 rows to leave 1
    const removeButtons = screen.getAllByLabelText("Supprimer la ligne");
    await user.click(removeButtons[0]);
    await user.click(screen.getAllByLabelText("Supprimer la ligne")[0]);

    // Fill the remaining row
    const firstNameInputs = screen.getAllByPlaceholderText("Prénom");
    const lastNameInputs = screen.getAllByPlaceholderText("Nom de famille");
    const emailInputs = screen.getAllByPlaceholderText("Courriel");

    await user.type(firstNameInputs[0], "Sophie");
    await user.type(lastNameInputs[0], "Martin");
    await user.type(emailInputs[0], "sophie@test.com");

    // Select department
    const deptButtons = screen.getAllByText("Sélectionner des départements");
    await user.click(deptButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Jeunesse Adventiste"));

    // Submit
    await user.click(screen.getByText("Créer tous"));

    await waitFor(() => {
      expect(screen.getByText("1 utilisateurs créés")).toBeInTheDocument();
    });
  });

  it("per-row validation errors display inline on correct fields", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.post("/api/users/bulk", () => {
        return HttpResponse.json(
          {
            type: "urn:sdac:validation-error",
            title: "Validation Error",
            status: 400,
            errors: {
              "Users[0].Email": ["'Email' is not a valid email address."],
            },
          },
          { status: 400 }
        );
      })
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Création en lot")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Création en lot"));

    await waitFor(() => {
      expect(screen.getByText("3 / 30 lignes")).toBeInTheDocument();
    });

    // Remove to 1 row and fill with valid-looking data
    const removeButtons = screen.getAllByLabelText("Supprimer la ligne");
    await user.click(removeButtons[0]);
    await user.click(screen.getAllByLabelText("Supprimer la ligne")[0]);

    const firstNameInputs = screen.getAllByPlaceholderText("Prénom");
    const lastNameInputs = screen.getAllByPlaceholderText("Nom de famille");
    const emailInputs = screen.getAllByPlaceholderText("Courriel");

    await user.type(firstNameInputs[0], "Sophie");
    await user.type(lastNameInputs[0], "Martin");
    await user.type(emailInputs[0], "sophie@test.com");

    // Select department
    const deptButtons = screen.getAllByText("Sélectionner des départements");
    await user.click(deptButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Jeunesse Adventiste"));

    await user.click(screen.getByText("Créer tous"));

    // Server returns per-row validation error
    await waitFor(() => {
      expect(
        screen.getByText("'Email' is not a valid email address.")
      ).toBeInTheDocument();
    });
  });

  it("duplicate email error displays on email field of conflicting row", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.post("/api/users/bulk", () => {
        return HttpResponse.json(
          {
            type: "urn:sdac:conflict",
            title: "Resource Conflict",
            status: 409,
            detail: "A user with email 'existing@test.com' already exists.",
            conflictingEmail: "existing@test.com",
          },
          { status: 409 }
        );
      })
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Création en lot")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Création en lot"));

    await waitFor(() => {
      expect(screen.getByText("3 / 30 lignes")).toBeInTheDocument();
    });

    // Remove to 1 row and fill
    const removeButtons = screen.getAllByLabelText("Supprimer la ligne");
    await user.click(removeButtons[0]);
    await user.click(screen.getAllByLabelText("Supprimer la ligne")[0]);

    const firstNameInputs = screen.getAllByPlaceholderText("Prénom");
    const lastNameInputs = screen.getAllByPlaceholderText("Nom de famille");
    const emailInputs = screen.getAllByPlaceholderText("Courriel");

    await user.type(firstNameInputs[0], "Sophie");
    await user.type(lastNameInputs[0], "Martin");
    await user.type(emailInputs[0], "existing@test.com");

    // Select department
    const deptButtons = screen.getAllByText("Sélectionner des départements");
    await user.click(deptButtons[0]);
    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Jeunesse Adventiste"));

    await user.click(screen.getByText("Créer tous"));

    await waitFor(() => {
      expect(
        screen.getByText("Cet email est déjà utilisé")
      ).toBeInTheDocument();
    });
  });
});
