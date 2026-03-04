import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { configHandlers } from "@/mocks/handlers/config";
import SettingsPage from "./SettingsPage";

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

const server = setupServer(
  ...authHandlers,
  ...configHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("SettingsPage", () => {
  it("renders church identity form for OWNER user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByText("Identité de l'église")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Nom de l'église")).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse")).toBeInTheDocument();
  });

  it("shows 'no settings' message for ADMIN user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Aucun paramètre disponible pour votre rôle.")
      ).toBeInTheDocument();
    });
  });

  it("shows empty state when no config exists (404 from API)", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/config/admin", () =>
        HttpResponse.json(null, { status: 404 })
      )
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Configurez l'identité de votre église")
      ).toBeInTheDocument();
    });
  });

  it("populates form with existing config data", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Nom de l'église")).toHaveValue(
        "Eglise Adventiste du 7e Jour de Saint-Hubert"
      );
    });
    expect(screen.getByLabelText("Adresse")).toHaveValue(
      "1234 Rue de l'Eglise, Saint-Hubert, QC"
    );
  });

  it("submits form and shows success toast", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Nom de l'église")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Sauvegarder"));

    await waitFor(() => {
      expect(
        screen.getByText("Paramètres de l'église sauvegardés avec succès")
      ).toBeInTheDocument();
    });
  });

  it("shows validation errors for invalid input", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/config/admin", () =>
        HttpResponse.json(null, { status: 404 })
      )
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Nom de l'église")).toBeInTheDocument();
    });

    // Submit empty form to trigger validation
    await user.click(screen.getByText("Sauvegarder"));

    await waitFor(() => {
      expect(screen.getByText("Le nom de l'eglise est requis")).toBeInTheDocument();
    });
  });

  it("shows error toast when API call fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.put("/api/config", () =>
        HttpResponse.json(
          { type: "urn:sdac:validation-error", title: "Error", status: 500 },
          { status: 500 }
        )
      )
    );

    render(<SettingsPage />);

    await waitFor(() => {
      expect(screen.getByLabelText("Nom de l'église")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Sauvegarder"));

    await waitFor(() => {
      expect(
        screen.getByText("Erreur lors de la sauvegarde des paramètres")
      ).toBeInTheDocument();
    });
  });
});
