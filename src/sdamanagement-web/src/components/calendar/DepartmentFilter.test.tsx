import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test-utils";
import userEvent from "@testing-library/user-event";
import DepartmentFilter from "./DepartmentFilter";
import type { PublicDepartment } from "@/types/public";

const mockDepartments: PublicDepartment[] = [
  {
    id: 1,
    name: "Culte",
    abbreviation: "CU",
    color: "#F43F5E",
    description: null,
    nextActivityTitle: null,
    nextActivityDate: null,
    nextActivityStartTime: null,
  },
  {
    id: 2,
    name: "Jeunesse Adventiste",
    abbreviation: "JA",
    color: "#14B8A6",
    description: null,
    nextActivityTitle: null,
    nextActivityDate: null,
    nextActivityStartTime: null,
  },
  {
    id: 3,
    name: "Ministere de la Femme",
    abbreviation: "MIFEM",
    color: "#8B5CF6",
    description: null,
    nextActivityTitle: null,
    nextActivityDate: null,
    nextActivityStartTime: null,
  },
];

describe("DepartmentFilter", () => {
  it("renders department chips for each department", () => {
    render(
      <DepartmentFilter
        departments={mockDepartments}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("CU")).toBeInTheDocument();
    expect(screen.getByText("JA")).toBeInTheDocument();
    expect(screen.getByText("MIFEM")).toBeInTheDocument();
  });

  it("shows 'All' chip active by default when selectedIds is empty", () => {
    render(
      <DepartmentFilter
        departments={mockDepartments}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    );

    const allChip = screen.getByText("Tous");
    expect(allChip.closest("[role='checkbox']")).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("calls onChange with department id when clicking a department chip", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DepartmentFilter
        departments={mockDepartments}
        selectedIds={[]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText("JA"));

    expect(onChange).toHaveBeenCalledWith([2]);
  });

  it("calls onChange with empty array when clicking 'All'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DepartmentFilter
        departments={mockDepartments}
        selectedIds={[1, 2]}
        onChange={onChange}
      />
    );

    await user.click(screen.getByText("Tous"));

    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("shows active state for selected chips and renders dept color dot", () => {
    render(
      <DepartmentFilter
        departments={mockDepartments}
        selectedIds={[1]}
        onChange={vi.fn()}
      />
    );

    const cuChip = screen.getByText("CU").closest("[role='checkbox']");
    expect(cuChip).toHaveAttribute("aria-checked", "true");
    // Active chips now use ink/parchment colors (background-color is set via Tailwind classes);
    // the dept color is rendered as an inline-styled dot inside the chip.
    expect(cuChip?.className).toContain("bg-[var(--ink)]");
    const dot = cuChip?.querySelector("span[aria-hidden]");
    expect(dot).toHaveStyle({ backgroundColor: "#F43F5E" });
  });

  it("has toolbar role with aria-label", () => {
    render(
      <DepartmentFilter
        departments={mockDepartments}
        selectedIds={[]}
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole("toolbar")).toHaveAttribute(
      "aria-label",
      "Filtrer par département"
    );
  });
});
