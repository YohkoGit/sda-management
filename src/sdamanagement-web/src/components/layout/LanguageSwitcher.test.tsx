import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/test-utils";
import { testI18n } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import LanguageSwitcher from "./LanguageSwitcher";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  server.resetHandlers();
  testI18n.changeLanguage("fr");
  localStorage.clear();
});
afterAll(() => server.close());

describe("LanguageSwitcher", () => {
  it("renders current language code (FR by default)", () => {
    render(<LanguageSwitcher />);
    const frSpan = screen.getByText("FR");
    expect(frSpan).toBeInTheDocument();
    // Active language is highlighted with text-[var(--ink)]
    expect(frSpan).toHaveClass("text-[var(--ink)]");
  });

  it("has accessible aria-label", () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole("button", { name: /changer en EN/i })).toBeInTheDocument();
  });

  it("toggles language to English on click", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button"));

    // After toggle, EN is highlighted
    expect(screen.getByText("EN")).toHaveClass("text-[var(--ink)]");
    expect(localStorage.getItem("language")).toBe("en");
  });

  it("toggles back to French on second click", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("EN")).toHaveClass("text-[var(--ink)]");

    await user.click(screen.getByRole("button"));
    expect(screen.getByText("FR")).toHaveClass("text-[var(--ink)]");
    expect(localStorage.getItem("language")).toBe("fr");
  });
});
