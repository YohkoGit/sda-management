import { describe, it, expect, vi, beforeAll } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/test-utils";
import GuestInlineForm from "./GuestInlineForm";

beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

function renderForm(overrides: Partial<React.ComponentProps<typeof GuestInlineForm>> = {}) {
  const defaultProps = {
    defaultName: "Pasteur Damien",
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isSubmitting: false,
    ...overrides,
  };
  return { ...render(<GuestInlineForm {...defaultProps} />), props: defaultProps };
}

describe("GuestInlineForm", () => {
  it("renders name and phone fields", () => {
    renderForm();
    expect(screen.getByLabelText("Nom complet")).toBeInTheDocument();
    expect(screen.getByLabelText("Téléphone")).toBeInTheDocument();
  });

  it("pre-fills name from defaultName prop", () => {
    renderForm({ defaultName: "Pasteur Damien" });
    const nameInput = screen.getByLabelText("Nom complet") as HTMLInputElement;
    expect(nameInput.value).toBe("Pasteur Damien");
  });

  it("calls onSubmit with name and phone when submitted", async () => {
    const user = userEvent.setup();
    const { props } = renderForm({ defaultName: "" });

    const nameInput = screen.getByLabelText("Nom complet");
    await user.type(nameInput, "Jean Remy");

    const phoneInput = screen.getByLabelText("Téléphone");
    await user.click(phoneInput);
    await user.type(phoneInput, "514-555-1234");

    await user.click(screen.getByRole("button", { name: "Créer" }));
    expect(props.onSubmit).toHaveBeenCalledWith({ name: "Jean Remy", phone: "514-555-1234" });
  });

  it("calls onCancel when back button is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderForm();

    await user.click(screen.getByLabelText("Retour à la recherche"));
    expect(props.onCancel).toHaveBeenCalled();
  });

  it("does not submit when name is empty", async () => {
    const user = userEvent.setup();
    const { props } = renderForm({ defaultName: "" });

    await user.click(screen.getByRole("button", { name: "Créer" }));
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("does not submit when name is less than 2 chars", async () => {
    const user = userEvent.setup();
    const { props } = renderForm({ defaultName: "" });

    const nameInput = screen.getByLabelText("Nom complet");
    await user.type(nameInput, "A");

    await user.click(screen.getByRole("button", { name: "Créer" }));
    expect(props.onSubmit).not.toHaveBeenCalled();
  });

  it("shows loading state when isSubmitting is true", () => {
    renderForm({ isSubmitting: true });
    expect(screen.getByText("Création...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Création/i })).toBeDisabled();
  });

  it("submits phone as undefined when phone is empty", async () => {
    const user = userEvent.setup();
    const { props } = renderForm({ defaultName: "Jean Remy" });

    await user.click(screen.getByRole("button", { name: "Créer" }));
    expect(props.onSubmit).toHaveBeenCalledWith({ name: "Jean Remy", phone: undefined });
  });
});
