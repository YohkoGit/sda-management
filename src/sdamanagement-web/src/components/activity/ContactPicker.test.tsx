import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@/test-utils";
import { Plus } from "lucide-react";
import ContactPicker from "./ContactPicker";
import type { AssignableOfficer } from "@/services/userService";

// jsdom polyfills for Radix UI + cmdk
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();

  // cmdk uses ResizeObserver internally
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver;
});

const mockOfficers: AssignableOfficer[] = [
  {
    userId: 2,
    firstName: "Marie-Claire",
    lastName: "Legault",
    avatarUrl: null,
    departments: [
      { id: 1, name: "Jeunesse Adventiste", abbreviation: "JA", color: "#4F46E5" },
    ],
  },
  {
    userId: 3,
    firstName: "Jean-Pierre",
    lastName: "Augustin",
    avatarUrl: null,
    departments: [
      { id: 1, name: "Jeunesse Adventiste", abbreviation: "JA", color: "#4F46E5" },
      { id: 2, name: "MIFEM", abbreviation: "MIFEM", color: "#EC4899" },
    ],
  },
  {
    userId: 4,
    firstName: "Sophie",
    lastName: "Beaumont",
    avatarUrl: null,
    departments: [
      { id: 2, name: "MIFEM", abbreviation: "MIFEM", color: "#EC4899" },
    ],
  },
  {
    userId: 5,
    firstName: "André",
    lastName: "Dupont",
    avatarUrl: null,
    departments: [
      { id: 3, name: "Diaconat", abbreviation: "DIA", color: "#10B981" },
    ],
  },
];

// Force desktop layout for most tests
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

function renderPicker(overrides: Partial<React.ComponentProps<typeof ContactPicker>> = {}) {
  const defaultProps = {
    officers: mockOfficers,
    assignedUserIds: [] as number[],
    headcount: 2,
    roleName: "Predicateur",
    onSelect: vi.fn(),
    trigger: <Plus className="h-4 w-4" />,
    ...overrides,
  };
  return { ...render(<ContactPicker {...defaultProps} />), props: defaultProps };
}

describe("ContactPicker", () => {
  it("renders trigger button", () => {
    renderPicker();
    expect(screen.getByRole("button", { name: /assigner/i })).toBeInTheDocument();
  });

  it("shows empty system state when officers array is empty", async () => {
    const user = userEvent.setup();
    renderPicker({ officers: [] });

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    expect(
      screen.getByText(/Aucun membre enregistré/)
    ).toBeInTheDocument();
  });

  it("opens popover with search input on desktop when trigger clicked", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    expect(screen.getByPlaceholderText("Rechercher un membre...")).toBeInTheDocument();
  });

  it("shows officer names in opened picker", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    expect(screen.getByText("Legault, M.")).toBeInTheDocument();
    // Augustin appears in 2 departments (JA + MIFEM) so may appear twice in the list
    expect(screen.getAllByText("Augustin, J.").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Beaumont, S.")).toBeInTheDocument();
    expect(screen.getByText("Dupont, A.")).toBeInTheDocument();
  });

  it("shows department badges for officers", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    expect(screen.getAllByText("JA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MIFEM").length).toBeGreaterThan(0);
  });

  it("calls onSelect when officer is clicked", async () => {
    const user = userEvent.setup();
    const { props } = renderPicker();

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    const option = screen.getByText("Legault, M.").closest("[cmdk-item]");
    if (option) {
      await user.click(option);
      expect(props.onSelect).toHaveBeenCalledWith(2);
    }
  });

  it("disables already-assigned officers", async () => {
    const user = userEvent.setup();
    renderPicker({ assignedUserIds: [2] });

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    // The assigned officer's item should have disabled styling (opacity-50)
    const assignedItem = screen.getByText("Legault, M.").closest("[cmdk-item]");
    expect(assignedItem).toHaveAttribute("data-disabled", "true");
  });

  it("disables trigger when fully staffed and shows tooltip text", () => {
    renderPicker({ assignedUserIds: [2, 3], headcount: 2 });

    const button = screen.getByRole("button", { name: /Complet/i });
    expect(button).toBeDisabled();
  });

  it("shows 'Frequently assigned' section when frequentUserIds provided", async () => {
    const user = userEvent.setup();
    renderPicker({ frequentUserIds: [2, 3] });

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    expect(screen.getByText("Fréquemment assignés")).toBeInTheDocument();
  });

  it("does not show 'Frequently assigned' section when frequentUserIds is empty", async () => {
    const user = userEvent.setup();
    renderPicker({ frequentUserIds: [] });

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    expect(screen.queryByText("Fréquemment assignés")).not.toBeInTheDocument();
  });

  it("renders inline with back-arrow on mobile", async () => {
    // Mock mobile viewport
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, // < 640px
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    // Mobile shows "Selection pour: {role}" text
    expect(screen.getByText(/Sélection pour/)).toBeInTheDocument();
    // Back arrow button is present
    expect(screen.getByRole("button", { name: /Retour/i })).toBeInTheDocument();
  });

  it("mobile back arrow closes picker", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /assigner/i }));
    expect(screen.getByText(/Sélection pour/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Retour/i }));

    // After closing, back to trigger button
    expect(screen.queryByText(/Sélection pour/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /assigner/i })).toBeInTheDocument();
  });

  it("shows department group headings", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    // Department names should appear as group headings
    expect(screen.getByText("Diaconat")).toBeInTheDocument();
    expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
  });

  it("shows 'Afficher plus...' button when more than 20 officers", async () => {
    // Generate 25 officers
    const manyOfficers: AssignableOfficer[] = Array.from({ length: 25 }, (_, i) => ({
      userId: 100 + i,
      firstName: `First${i}`,
      lastName: `Last${i}`,
      avatarUrl: null,
      departments: [{ id: 1, name: "Dept", abbreviation: "D", color: "#000" }],
    }));

    const user = userEvent.setup();
    renderPicker({ officers: manyOfficers });

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    expect(screen.getByText("Afficher plus...")).toBeInTheDocument();
  });

  it("does not show 'Afficher plus...' when 20 or fewer officers", async () => {
    const user = userEvent.setup();
    renderPicker(); // default mockOfficers has 4

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    expect(screen.queryByText("Afficher plus...")).not.toBeInTheDocument();
  });

  it("calls onOpenChange when picker opens and closes", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderPicker({ onOpenChange });

    await user.click(screen.getByRole("button", { name: /assigner/i }));
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("shows no results message and disabled add guest button", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(screen.getByRole("button", { name: /assigner/i }));

    const searchInput = screen.getByPlaceholderText("Rechercher un membre...");
    await user.type(searchInput, "zzzzzzz");

    expect(screen.getByText("Aucun membre trouvé.")).toBeInTheDocument();
    const addGuestBtn = screen.getByText("Ajouter un invité");
    expect(addGuestBtn).toBeDisabled();
  });
});
