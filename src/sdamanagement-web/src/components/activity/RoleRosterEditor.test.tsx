import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import userEvent from "@testing-library/user-event";
import { render, screen, futureDate } from "@/test-utils";
import { createActivitySchema, type CreateActivityFormData } from "@/schemas/activitySchema";
import RoleRosterEditor from "./RoleRosterEditor";
import type { AssignableOfficer } from "@/services/userService";

const mockOfficers: AssignableOfficer[] = [
  {
    userId: 5,
    firstName: "Jean",
    lastName: "Dupont",
    avatarUrl: null,
    departments: [{ id: 1, name: "MIFEM", abbreviation: "MIFEM", color: "#EC4899" }],
  },
  {
    userId: 6,
    firstName: "Marie",
    lastName: "Tremblay",
    avatarUrl: null,
    departments: [{ id: 2, name: "Jeunesse Adventiste", abbreviation: "JA", color: "#4F46E5" }],
  },
  {
    userId: 7,
    firstName: "Pierre",
    lastName: "Lavoie",
    avatarUrl: null,
    departments: [{ id: 1, name: "MIFEM", abbreviation: "MIFEM", color: "#EC4899" }],
  },
];

// Mock useAssignableOfficers to return test data
vi.mock("@/hooks/useAssignableOfficers", () => ({
  useAssignableOfficers: () => ({
    officers: mockOfficers,
    isPending: false,
    error: null,
  }),
  groupByDepartment: (officers: AssignableOfficer[]) => {
    const map = new Map<string, AssignableOfficer[]>();
    for (const o of officers) {
      for (const d of o.departments) {
        if (!map.has(d.name)) map.set(d.name, []);
        map.get(d.name)!.push(o);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, officers]) => ({ departmentName: name, officers }));
  },
}));

// jsdom polyfills for Radix UI + cmdk
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});

// Force desktop layout
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === "(min-width: 640px)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function TestWrapper({
  defaultRoles = [],
  existingAssignments,
  initialGuestOfficers,
  showSubmit = false,
}: {
  defaultRoles?: CreateActivityFormData["roles"];
  existingAssignments?: Map<number, number>;
  initialGuestOfficers?: AssignableOfficer[];
  showSubmit?: boolean;
}) {
  const {
    control,
    register,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateActivityFormData>({
    resolver: zodResolver(createActivitySchema),
    defaultValues: {
      title: "Test",
      date: futureDate(30),
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
        getValues={getValues}
        errors={errors}
        existingAssignments={existingAssignments}
        initialGuestOfficers={initialGuestOfficers}
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
          { id: 1, roleName: "Full", headcount: 2, assignments: [{ userId: 5 }, { userId: 6 }] },
          { id: 2, roleName: "Partial", headcount: 3, assignments: [{ userId: 7 }] },
          { id: 3, roleName: "Empty", headcount: 1 },
        ]}
      />
    );

    // Full (2/2) - should have primary color indicators
    expect(screen.getByText("2/2")).toBeInTheDocument();
    // Partial (1/3) - should have warning indicators
    expect(screen.getByText("1/3")).toBeInTheDocument();
    // Empty (0/1) - should have muted indicators
    expect(screen.getByText("0/1")).toBeInTheDocument();
  });

  // ---- Assignment-related tests (Story 4.4) ----

  it("displays assignment chips for roles with existing assignments", () => {
    render(
      <TestWrapper
        defaultRoles={[
          {
            roleName: "Predicateur",
            headcount: 2,
            assignments: [{ userId: 5 }],
          },
        ]}
      />
    );

    // Assignment chip shows the officer's name
    expect(screen.getByText("Dupont, J.")).toBeInTheDocument();
    // Remove button exists for the chip
    expect(
      screen.getByLabelText("Jean Dupont — appuyer pour retirer")
    ).toBeInTheDocument();
  });

  it("shows dashed 'Non assigné' placeholder for empty assignment slots", () => {
    render(
      <TestWrapper
        defaultRoles={[
          { roleName: "Predicateur", headcount: 2 },
        ]}
      />
    );

    const placeholders = screen.getAllByText("Non assigné");
    expect(placeholders.length).toBeGreaterThanOrEqual(1);
  });

  it("removes assignment chip when 'x' remove button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        defaultRoles={[
          {
            roleName: "Predicateur",
            headcount: 2,
            assignments: [{ userId: 5 }, { userId: 6 }],
          },
        ]}
      />
    );

    // Badge should show 2/2
    expect(screen.getByText("2/2")).toBeInTheDocument();

    // Click remove on first assignment (use exact match to avoid duplicates)
    const removeBtn = screen.getByLabelText("Jean Dupont — appuyer pour retirer");
    await user.click(removeBtn);

    // Should now show 1/2
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.queryByText("Dupont, J.")).not.toBeInTheDocument();
    // Other assignment should still be there
    expect(screen.getByText("Tremblay, M.")).toBeInTheDocument();
  });

  it("shows role with form-level assignments triggers confirmation on remove", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        defaultRoles={[
          {
            roleName: "Predicateur",
            headcount: 2,
            assignments: [{ userId: 5 }],
          },
        ]}
      />
    );

    // Delete role button
    const removeBtn = screen.getByLabelText(/Supprimer le rôle/);
    await user.click(removeBtn);

    // Should show confirmation dialog because the role has assignments
    expect(screen.getByText("Supprimer le rôle ?")).toBeInTheDocument();
  });

  it("shows multiple assignment chips wrapping in flex container", () => {
    render(
      <TestWrapper
        defaultRoles={[
          {
            roleName: "Diacres",
            headcount: 3,
            assignments: [{ userId: 5 }, { userId: 6 }, { userId: 7 }],
          },
        ]}
      />
    );

    expect(screen.getByText("Dupont, J.")).toBeInTheDocument();
    expect(screen.getByText("Tremblay, M.")).toBeInTheDocument();
    expect(screen.getByText("Lavoie, P.")).toBeInTheDocument();
    // Badge shows 3/3
    expect(screen.getByText("3/3")).toBeInTheDocument();
  });

  it("shows assign trigger when not fully staffed", () => {
    render(
      <TestWrapper
        defaultRoles={[
          { roleName: "Predicateur", headcount: 2 },
        ]}
      />
    );

    // The ContactPicker trigger (+ button) should be present
    expect(screen.getByRole("button", { name: /assigner/i })).toBeInTheDocument();
  });

  it("shows editing ring when contact picker is opened", async () => {
    const user = userEvent.setup();
    render(
      <TestWrapper
        defaultRoles={[{ roleName: "Predicateur", headcount: 2 }]}
      />
    );

    const roleGroup = screen.getByRole("group", { name: /Role 1: Predicateur/ });

    // Before opening, no ring
    expect(roleGroup).not.toHaveClass("ring-2");

    // Open the contact picker
    await user.click(screen.getByRole("button", { name: /assigner/i }));

    // After opening, ring should be applied
    expect(roleGroup).toHaveClass("ring-2");
  });

  it("hides unassigned placeholders when all slots filled", () => {
    render(
      <TestWrapper
        defaultRoles={[
          {
            roleName: "Predicateur",
            headcount: 1,
            assignments: [{ userId: 5 }],
          },
        ]}
      />
    );

    expect(screen.queryByText("Non assigné")).not.toBeInTheDocument();
  });

  // ---- Guest assignment tests (Story 4.6) ----

  it("renders guest assignment chip with '(Invité)' label and data-testid", () => {
    const guestOfficer: AssignableOfficer = {
      userId: 500,
      firstName: "Pasteur",
      lastName: "Damien",
      avatarUrl: null,
      departments: [],
      isGuest: true,
    };
    render(
      <TestWrapper
        defaultRoles={[
          {
            roleName: "Predicateur",
            headcount: 1,
            assignments: [{ userId: 500 }],
          },
        ]}
        initialGuestOfficers={[guestOfficer]}
      />
    );

    // Guest chip shows full name (not "LastName, F." format)
    expect(screen.getByText("Pasteur Damien")).toBeInTheDocument();
    // Guest label
    expect(screen.getByText("(Invité)")).toBeInTheDocument();
    // Guest chip data-testid
    expect(screen.getByTestId("guest-assignment-chip")).toBeInTheDocument();
  });

  it("renders regular member chip without '(Invité)' label", () => {
    render(
      <TestWrapper
        defaultRoles={[
          {
            roleName: "Predicateur",
            headcount: 1,
            assignments: [{ userId: 5 }],
          },
        ]}
      />
    );

    // Regular chip shows "LastName, F." format
    expect(screen.getByText("Dupont, J.")).toBeInTheDocument();
    // No guest label
    expect(screen.queryByText("(Invité)")).not.toBeInTheDocument();
    // No guest data-testid
    expect(screen.queryByTestId("guest-assignment-chip")).not.toBeInTheDocument();
  });

  it("shows guest chip after guest creation via initialGuestOfficers (edit mode)", () => {
    const guestOfficers: AssignableOfficer[] = [
      {
        userId: 501,
        firstName: "Jean",
        lastName: "Remy",
        avatarUrl: null,
        departments: [],
        isGuest: true,
      },
    ];
    render(
      <TestWrapper
        defaultRoles={[
          {
            roleName: "Predicateur",
            headcount: 2,
            assignments: [{ userId: 5 }, { userId: 501 }],
          },
        ]}
        initialGuestOfficers={guestOfficers}
      />
    );

    // Regular officer
    expect(screen.getByText("Dupont, J.")).toBeInTheDocument();
    // Guest officer with full name
    expect(screen.getByText("Jean Remy")).toBeInTheDocument();
    // Guest label on guest chip only
    expect(screen.getByText("(Invité)")).toBeInTheDocument();
    // Badge shows 2/2
    expect(screen.getByText("2/2")).toBeInTheDocument();
  });
});
