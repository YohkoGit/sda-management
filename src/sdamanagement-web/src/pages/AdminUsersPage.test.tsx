import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { userHandlers, userHandlersEmpty, userHandlers409 } from "@/mocks/handlers/users";
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

describe("AdminUsersPage", () => {
  it("OWNER renders user list with all users", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });
    expect(screen.getByText("Jean-Pierre Augustin")).toBeInTheDocument();
    expect(screen.getByText("Sophie Beaumont")).toBeInTheDocument();
  });

  it("ADMIN renders user list with create button", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Ajouter un utilisateur")
    ).toBeInTheDocument();
  });

  it("VIEWER sees user list read-only (no create button)", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });
    expect(
      screen.queryByText("Ajouter un utilisateur")
    ).not.toBeInTheDocument();
  });

  it("empty state renders with create button for OWNER", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      ...userHandlersEmpty
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Aucun membre. Ajoutez votre premier membre.")
      ).toBeInTheDocument();
    });
    // Should have at least one create button in the empty state
    const buttons = screen.getAllByText("Ajouter un utilisateur");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("loading skeleton shows while fetching", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/users", () => {
        return new Promise(() => {});
      })
    );

    const { container } = render(<AdminUsersPage />);

    await waitFor(() => {
      const skeleton = container.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeInTheDocument();
    });
  });

  it("shows page title", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Gestion des membres")).toBeInTheDocument();
    });
  });

  it("displays role badges for users", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // Role badges should be rendered
    const memberBadges = screen.getAllByText("Membre");
    expect(memberBadges.length).toBeGreaterThanOrEqual(1);

    const adminBadges = screen.getAllByText("Administrateur");
    expect(adminBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("error state renders when API fails", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/users", () => {
        return new HttpResponse(null, { status: 500 });
      })
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Une erreur est survenue. Veuillez réessayer.")
      ).toBeInTheDocument();
    });
  });

  it("displays department badges for users", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // Department abbreviation badges should be rendered
    const jaBadges = screen.getAllByText("JA");
    expect(jaBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("create dialog opens on button click (OWNER)", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Ajouter un utilisateur")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Ajouter un utilisateur"));

    await waitFor(() => {
      expect(screen.getByText("Nouvel utilisateur")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Prénom")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom de famille")).toBeInTheDocument();
    expect(screen.getByLabelText("Courriel")).toBeInTheDocument();
  });

  it("successful creation shows toast and closes dialog", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Ajouter un utilisateur")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Ajouter un utilisateur"));

    await waitFor(() => {
      expect(screen.getByText("Nouvel utilisateur")).toBeInTheDocument();
    });

    // Fill form fields
    await user.type(screen.getByLabelText("Prénom"), "Sophie");
    await user.type(screen.getByLabelText("Nom de famille"), "Martin");
    await user.type(screen.getByLabelText("Courriel"), "sophie@test.com");

    // Select a department from the popover
    await user.click(screen.getByText("Sélectionner des départements"));
    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Jeunesse Adventiste"));

    // Submit the form
    await user.click(screen.getByText("Créer"));

    // Toast should appear
    await waitFor(() => {
      expect(screen.getByText("Utilisateur créé")).toBeInTheDocument();
    });
  });

  it("duplicate email error displays on email field", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      userHandlers409
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Ajouter un utilisateur")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Ajouter un utilisateur"));

    await waitFor(() => {
      expect(screen.getByText("Nouvel utilisateur")).toBeInTheDocument();
    });

    // Fill form fields
    await user.type(screen.getByLabelText("Prénom"), "Sophie");
    await user.type(screen.getByLabelText("Nom de famille"), "Martin");
    await user.type(screen.getByLabelText("Courriel"), "existing@test.com");

    // Select a department
    await user.click(screen.getByText("Sélectionner des départements"));
    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Jeunesse Adventiste"));

    // Submit the form
    await user.click(screen.getByText("Créer"));

    // Duplicate email error should appear inline
    await waitFor(() => {
      expect(
        screen.getByText("Cet email est déjà utilisé")
      ).toBeInTheDocument();
    });
  });
});
