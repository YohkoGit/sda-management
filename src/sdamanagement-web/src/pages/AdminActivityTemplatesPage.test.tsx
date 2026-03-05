import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { activityTemplateHandlers } from "@/mocks/handlers/activityTemplates";
import AdminActivityTemplatesPage from "./AdminActivityTemplatesPage";

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

const server = setupServer(...authHandlers, ...activityTemplateHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminActivityTemplatesPage", () => {
  it("renders empty state when no templates exist", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/activity-templates", () => HttpResponse.json([]))
    );

    render(<AdminActivityTemplatesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Définissez vos modèles d\u2019activités — Sabbat, Sainte-Cène, Réunion..."
        )
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Créer un modèle")).toBeInTheDocument();
  });

  it("renders template list for OWNER user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivityTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });
    expect(screen.getByText("Sainte-Cene")).toBeInTheDocument();
  });

  it("shows access denied for non-OWNER user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminActivityTemplatesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Accès réservé au propriétaire du système.")
      ).toBeInTheDocument();
    });
  });

  it("opens create dialog when clicking create button", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivityTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Créer un modèle"));

    await waitFor(() => {
      expect(
        screen.getByText("Nouveau modèle d\u2019activité")
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for empty template name", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivityTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Créer un modèle"));

    await waitFor(() => {
      expect(
        screen.getByText("Nouveau modèle d\u2019activité")
      ).toBeInTheDocument();
    });

    // Trigger onBlur validation on name field
    const nameInput = screen.getByLabelText("Nom du modèle");
    await user.click(nameInput);
    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByText("Le nom du modele est requis")
      ).toBeInTheDocument();
    });
  });

  it("shows delete confirmation dialog", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminActivityTemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer le modèle")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Cette action est irréversible. Les rôles associés seront également supprimés."
      )
    ).toBeInTheDocument();
  });
});
