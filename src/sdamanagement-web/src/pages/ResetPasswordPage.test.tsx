import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import ResetPasswordPage from "./ResetPasswordPage";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Helper to set the URL search params before rendering
function renderWithToken(token: string) {
  window.history.pushState({}, "", `/reset-password?token=${encodeURIComponent(token)}`);
  return render(<ResetPasswordPage />);
}

describe("ResetPasswordPage", () => {
  it("shows no-token error when token is missing", () => {
    window.history.pushState({}, "", "/reset-password");
    render(<ResetPasswordPage />);

    expect(
      screen.getByText(
        "Aucun jeton de réinitialisation fourni. Veuillez utiliser le lien envoyé."
      )
    ).toBeInTheDocument();
  });

  it("renders the reset form when token is present", () => {
    renderWithToken("valid-token");

    expect(screen.getByRole("heading", { name: "Nouveau mot de passe" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nouveau mot de passe")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmer le mot de passe")).toBeInTheDocument();
    expect(
      screen.getByText("Confirmer le nouveau mot de passe")
    ).toBeInTheDocument();
  });

  it("shows password strength indicator", () => {
    renderWithToken("valid-token");

    expect(screen.getByText(/Minimum 8 caractères/)).toBeInTheDocument();
    expect(screen.getByText(/Majuscules/)).toBeInTheDocument();
    expect(screen.getByText(/Minuscules/)).toBeInTheDocument();
    expect(screen.getByText(/Chiffres/)).toBeInTheDocument();
  });

  it("shows helper text", () => {
    renderWithToken("valid-token");

    expect(
      screen.getByText("Entrez votre nouveau mot de passe.")
    ).toBeInTheDocument();
  });

  it("submits and navigates to login on success", async () => {
    const user = userEvent.setup();
    renderWithToken("valid-token");

    await user.type(screen.getByLabelText("Nouveau mot de passe"), "StrongPass1");
    await user.type(screen.getByLabelText("Confirmer le mot de passe"), "StrongPass1");
    await user.click(screen.getByText("Confirmer le nouveau mot de passe"));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
  });
});
