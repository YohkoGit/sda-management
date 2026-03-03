import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import ForgotPasswordPage from "./ForgotPasswordPage";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("ForgotPasswordPage", () => {
  it("renders the forgot password form", () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByText("Mot de passe oublié")).toBeInTheDocument();
    expect(screen.getByLabelText("Adresse courriel")).toBeInTheDocument();
    expect(screen.getByText("Réinitialiser le mot de passe")).toBeInTheDocument();
  });

  it("shows helper text", () => {
    render(<ForgotPasswordPage />);

    expect(
      screen.getByText(
        "Entrez votre adresse courriel pour réinitialiser votre mot de passe."
      )
    ).toBeInTheDocument();
  });

  it("has a back link to login", () => {
    render(<ForgotPasswordPage />);

    const backLink = screen.getByText("Retour");
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest("a")).toHaveAttribute("href", "/login");
  });

  it("submits email and navigates on success", async () => {
    const user = userEvent.setup();
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByLabelText("Adresse courriel");
    await user.type(emailInput, "viewer@test.local");
    await user.click(screen.getByText("Réinitialiser le mot de passe"));

    // The MSW handler returns { token: "mock-reset-token-abc123" }
    // so the page should navigate to /reset-password?token=...
    await waitFor(() => {
      expect(window.location.pathname).toBe("/reset-password");
      expect(window.location.search).toContain("token=");
    });
  });
});
