import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { departmentHandlers } from "@/mocks/handlers/departments";
import AdminDepartmentsPage from "./AdminDepartmentsPage";

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

const server = setupServer(...authHandlers, ...departmentHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminDepartmentsPage", () => {
  it("renders empty state when no departments exist", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/departments", () => HttpResponse.json([]))
    );

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Créez vos départements — ils structurent toute l'application"
        )
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Créer un département")
    ).toBeInTheDocument();
  });

  it("renders department list for OWNER user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
    expect(screen.getByText("Ministere de la Femme")).toBeInTheDocument();
    expect(screen.getByText("Diaconat")).toBeInTheDocument();
  });

  it("shows access denied for ADMIN user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Accès réservé au propriétaire du système.")
      ).toBeInTheDocument();
    });
  });

  it("opens create dialog and submits new department", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    // Click create button
    await user.click(screen.getByText("Créer un département"));

    await waitFor(() => {
      expect(screen.getByText("Nouveau département")).toBeInTheDocument();
    });

    // Fill form
    await user.type(screen.getByLabelText("Nom du département"), "Musique");
    await user.type(screen.getByLabelText(/Abréviation/), "MUS");

    // Open color picker popover and type hex value
    await user.click(screen.getByLabelText("Couleur"));
    const hexInput = await screen.findByLabelText("Hex color");
    await user.clear(hexInput);
    await user.type(hexInput, "#FF5733");

    // Submit
    await user.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(
        screen.getByText("Département créé avec succès")
      ).toBeInTheDocument();
    });
  });

  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    // Open dialog
    await user.click(screen.getByText("Créer un département"));

    await waitFor(() => {
      expect(screen.getByText("Nouveau département")).toBeInTheDocument();
    });

    // Submit empty form — trigger onBlur validations first
    const nameInput = screen.getByLabelText("Nom du département");
    await user.click(nameInput);
    await user.tab(); // triggers onBlur

    await waitFor(() => {
      expect(
        screen.getByText("Le nom du departement est requis")
      ).toBeInTheDocument();
    });
  });

  it("shows delete confirmation and deletes department", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    // Click delete button on the first department
    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByRole("alertdialog")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Cette action est irréversible. Les sous-ministères associés seront également supprimés."
      )
    ).toBeInTheDocument();
  });

  it("handles 409 conflict error on create", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.post("/api/departments", () =>
        HttpResponse.json(
          {
            type: "urn:sdac:conflict",
            title: "Resource Conflict",
            status: 409,
            detail:
              "A department with this abbreviation or color already exists.",
          },
          { status: 409 }
        )
      )
    );

    render(<AdminDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    // Open dialog and submit
    await user.click(screen.getByText("Créer un département"));
    await waitFor(() => {
      expect(screen.getByText("Nouveau département")).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText("Nom du département"), "Test");
    await user.type(screen.getByLabelText(/Abréviation/), "JA");

    // Open color picker popover and type hex value
    await user.click(screen.getByLabelText("Couleur"));
    const hexInput = await screen.findByLabelText("Hex color");
    await user.clear(hexInput);
    await user.type(hexInput, "#4F46E5");

    await user.click(screen.getByText("Enregistrer"));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Un département avec cette abréviation ou couleur existe déjà."
        )
      ).toBeInTheDocument();
    });
  });
});
