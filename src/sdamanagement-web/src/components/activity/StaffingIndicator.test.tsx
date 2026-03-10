import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { StaffingIndicator } from "./StaffingIndicator";

describe("StaffingIndicator", () => {
  it("renders green filled circle and 'Complet' for FullyStaffed", () => {
    render(
      <StaffingIndicator staffingStatus="FullyStaffed" assigned={3} total={3} />,
    );

    expect(screen.getByText("Complet")).toBeInTheDocument();
    expect(screen.getByText("Complet")).toHaveClass("text-emerald-600");
  });

  it("renders amber half-circle and 'X/Y' for PartiallyStaffed", () => {
    render(
      <StaffingIndicator
        staffingStatus="PartiallyStaffed"
        assigned={2}
        total={5}
      />,
    );

    expect(screen.getByText("2/5")).toBeInTheDocument();
    expect(screen.getByText("2/5")).toHaveClass("text-amber-600");
  });

  it("renders red empty circle and 'Critique' badge for CriticalGap", () => {
    render(
      <StaffingIndicator staffingStatus="CriticalGap" assigned={1} total={5} />,
    );

    expect(screen.getByText("1/5")).toBeInTheDocument();
    expect(screen.getByText("1/5")).toHaveClass("text-red-600");
    expect(screen.getByText("Critique")).toBeInTheDocument();
  });

  it("renders muted dash and 'Aucun rôle' for NoRoles", () => {
    render(
      <StaffingIndicator staffingStatus="NoRoles" assigned={0} total={0} />,
    );

    expect(screen.getByText("Aucun rôle")).toBeInTheDocument();
  });

  it("has correct aria-label for screen readers", () => {
    render(
      <StaffingIndicator
        staffingStatus="PartiallyStaffed"
        assigned={3}
        total={5}
      />,
    );

    const indicator = screen.getByRole("status");
    expect(indicator).toHaveAttribute(
      "aria-label",
      expect.stringContaining("3"),
    );
    expect(indicator).toHaveAttribute(
      "aria-label",
      expect.stringContaining("5"),
    );
  });

  it("has critical aria-label for CriticalGap", () => {
    render(
      <StaffingIndicator staffingStatus="CriticalGap" assigned={1} total={5} />,
    );

    const indicator = screen.getByRole("status");
    expect(indicator.getAttribute("aria-label")).toContain("critique");
  });

  it("has no-roles aria-label for NoRoles", () => {
    render(
      <StaffingIndicator staffingStatus="NoRoles" assigned={0} total={0} />,
    );

    const indicator = screen.getByRole("status");
    expect(indicator.getAttribute("aria-label")).toContain("rôle");
  });
});
