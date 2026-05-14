import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import LoginPage from "./LoginPage";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("LoginPage", () => {
  it("renders email step initially", () => {
    render(<LoginPage />);

    expect(screen.getByText("— Connexion")).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse courriel")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Continuer →$/i })).toBeInTheDocument();
    expect(screen.getByText("Continuer avec Google")).toBeInTheDocument();
  });

  it("transitions to password step on initiate for user with password", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Adresse courriel");
    await user.type(emailInput, "viewer@test.local");
    await user.click(screen.getByRole("button", { name: /^Continuer →$/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /Se connecter/i })).toBeInTheDocument();
  });

  it("transitions to set-password step for first-login user", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("Adresse courriel");
    await user.type(emailInput, "first-login@test.local");
    await user.click(screen.getByRole("button", { name: /^Continuer →$/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /Définir votre mot de passe/ })).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Nouveau mot de passe")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmer le mot de passe")).toBeInTheDocument();
  });

  it("back button returns to email step from password step", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse courriel"), "viewer@test.local");
    await user.click(screen.getByRole("button", { name: /^Continuer →$/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Retour/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /Retour/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Continuer →$/i })).toBeInTheDocument();
    });
  });

  it("shows password strength indicator in set-password step", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText("Adresse courriel"), "first-login@test.local");
    await user.click(screen.getByRole("button", { name: /^Continuer →$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Minimum 8 caractères/)).toBeInTheDocument();
    });
    expect(screen.getByText(/Majuscules/)).toBeInTheDocument();
    expect(screen.getByText(/Minuscules/)).toBeInTheDocument();
    expect(screen.getByText(/Chiffres/)).toBeInTheDocument();
  });
});
