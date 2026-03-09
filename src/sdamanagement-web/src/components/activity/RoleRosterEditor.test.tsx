import { describe, it, expect, beforeAll, vi } from "vitest";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/test-utils";
import { createActivitySchema, type CreateActivityFormData } from "@/schemas/activitySchema";
import RoleRosterEditor from "./RoleRosterEditor";

// Radix UI jsdom polyfills
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

function TestWrapper({
  defaultRoles = [],
  existingAssignments,
  showSubmit = false,
}: {
  defaultRoles?: CreateActivityFormData["roles"];
  existingAssignments?: Map<number, number>;
  showSubmit?: boolean;
}) {
  const {
    control,
    register,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateActivityFormData>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      title: "Test",
      date: "2026-03-15",
      startTime: "10:00",
      endTime: "12:00",
      departmentId: 1,
      visibility: "public",
      roles: defaultRoles,
    },
    mode: "onBlur",
  });

  return (
    <form onSubmit={handleSubmit(() => {})}>
      <RoleRosterEditor
        control={control}
        register={register}
        setValue={setValue}
        errors={errors}
        existingAssignments={existingAssignments}
      />
      {showSubmit && <button type="submit">Submit</button>}
    </form>
  );
}

describe("RoleRosterEditor", () => {
  it("renders empty state when no roles", () => {
    render(<TestWrapper />);
    expect(
      screen.getByText("Aucun rôle. Ajoutez des rôles pour définir les postes nécessaires.")
    ).toBeInTheDocument();
  });

  it("renders role rows with name, headcount, and assignment indicator", () => {
    render(
      <TestWrapper
        defaultRoles={[
          { roleName: "Predicateur", headcount: 2 },
          { roleName: "Ancien", headcount: 1 },
        ]}
      />
    );
    expect(screen.getByDisplayValue("Predicateur")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Ancien")).toBeInTheDocument();
    // Headcount displays
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    // Assignment indicators (0/headcount)
    expect(screen.getByText("0/2")).toBeInTheDocument();
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  it("clicking 'Add Role' appends a new empty role row", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    await user.click(screen.getByText("Ajouter un rôle"));

    expect(screen.queryByText("Aucun rôle.")).not.toBeInTheDocument();
    const inputs = screen.getAllByPlaceholderText("Nom du rôle");
    expect(inputs).toHaveLength(1);
  });

  it("clicking headcount '+' increases count by 1", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper defaultRoles={[{ roleName: "Predicateur", headcount: 1 }]} />
    );

    const increaseBtn = screen.getByLabelText("Augmenter le nombre");
    await user.click(increaseBtn);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("clicking headcount '-' decreases count by 1 (minimum 1)", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper defaultRoles={[{ roleName: "Predicateur", headcount: 3 }]} />
    );

    const decreaseBtn = screen.getByLabelText("Diminuer le nombre");
    await user.click(decreaseBtn);

    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("headcount '-' button is disabled when count is 1", () => {
    render(
      <TestWrapper defaultRoles={[{ roleName: "Predicateur", headcount: 1 }]} />
    );

    const decreaseBtn = screen.getByLabelText("Diminuer le nombre");
    expect(decreaseBtn).toBeDisabled();
  });

  it("clicking remove on role without assignments removes immediately (no dialog)", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        defaultRoles={[
          { roleName: "Predicateur", headcount: 1 },
          { roleName: "Ancien", headcount: 1 },
        ]}
      />
    );

    const removeButtons = screen.getAllByLabelText(/Supprimer le rôle/);
    await user.click(removeButtons[0]);

    // Should be removed immediately, no dialog
    expect(screen.queryByDisplayValue("Predicateur")).not.toBeInTheDocument();
    expect(screen.getByDisplayValue("Ancien")).toBeInTheDocument();
  });

  it("clicking remove on role with assignments shows confirmation AlertDialog", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        defaultRoles={[{ id: 5, roleName: "Ancien", headcount: 1 }]}
        existingAssignments={new Map([[5, 2]])}
      />
    );

    const removeBtn = screen.getByLabelText(/Supprimer le rôle/);
    await user.click(removeBtn);

    // Confirmation dialog should appear
    expect(screen.getByText("Supprimer le rôle ?")).toBeInTheDocument();
    expect(
      screen.getByText(/Supprimer ce rôle supprimera également 2 assignation/)
    ).toBeInTheDocument();
  });

  it("confirming removal in AlertDialog removes the role", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        defaultRoles={[{ id: 5, roleName: "Ancien", headcount: 1 }]}
        existingAssignments={new Map([[5, 1]])}
      />
    );

    await user.click(screen.getByLabelText(/Supprimer le rôle/));
    await user.click(screen.getByRole("button", { name: "Supprimer" }));

    expect(screen.queryByDisplayValue("Ancien")).not.toBeInTheDocument();
  });

  it("canceling removal in AlertDialog keeps the role", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        defaultRoles={[{ id: 5, roleName: "Ancien", headcount: 1 }]}
        existingAssignments={new Map([[5, 1]])}
      />
    );

    await user.click(screen.getByLabelText(/Supprimer le rôle/));
    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(screen.getByDisplayValue("Ancien")).toBeInTheDocument();
  });

  it("add button shows max reached message when 20 roles exist", () => {
    const roles = Array.from({ length: 20 }, (_, i) => ({
      roleName: `Role ${i + 1}`,
      headcount: 1,
    }));
    render(<TestWrapper defaultRoles={roles} />);

    const addButton = screen.getByText("Maximum 20 rôles atteint.");
    expect(addButton.closest("button")).toBeDisabled();
  });

  it("role rows have correct aria-labels", () => {
    render(
      <TestWrapper defaultRoles={[{ roleName: "Predicateur", headcount: 1 }]} />
    );

    expect(screen.getByRole("group", { name: /Role 1: Predicateur/ })).toBeInTheDocument();
  });

  it("typing in role name input updates the field", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper defaultRoles={[{ roleName: "", headcount: 1 }]} />
    );

    const input = screen.getByPlaceholderText("Nom du rôle");
    await user.type(input, "Predicateur");
    expect(input).toHaveValue("Predicateur");
  });

  it("displays validation error for empty role name on submit", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper defaultRoles={[{ roleName: "", headcount: 1 }]} showSubmit />
    );

    await user.click(screen.getByText("Submit"));

    await screen.findByText(/Too small/);
  });

  it("displays validation error for duplicate role names on submit", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        defaultRoles={[
          { roleName: "Predicateur", headcount: 1 },
          { roleName: "Predicateur", headcount: 1 },
        ]}
        showSubmit
      />
    );

    await user.click(screen.getByText("Submit"));

    await screen.findByRole("alert");
    expect(screen.getByRole("alert")).toHaveTextContent(/Les noms de rôle doivent être uniques/);
  });

  it("keyboard Enter on add button triggers add", async () => {
    const user = userEvent.setup();
    render(<TestWrapper />);

    const addButton = screen.getByText("Ajouter un rôle");
    addButton.focus();
    await user.keyboard("{Enter}");

    const inputs = screen.getAllByPlaceholderText("Nom du rôle");
    expect(inputs).toHaveLength(1);
  });

  it("assignment indicator shows correct states", () => {
    render(
      <TestWrapper
        defaultRoles={[
          { id: 1, roleName: "Full", headcount: 2 },
          { id: 2, roleName: "Partial", headcount: 3 },
          { id: 3, roleName: "Empty", headcount: 1 },
        ]}
        existingAssignments={new Map([[1, 2], [2, 1], [3, 0]])}
      />
    );

    // Full (2/2) - should have primary color indicators
    expect(screen.getByText("2/2")).toBeInTheDocument();
    // Partial (1/3) - should have warning indicators
    expect(screen.getByText("1/3")).toBeInTheDocument();
    // Empty (0/1) - should have muted indicators
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });
});
