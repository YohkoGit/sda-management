import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import { ActivityRosterView } from "./ActivityRosterView";
import type { ActivityRoleResponse } from "@/services/activityService";

const mockRoles: ActivityRoleResponse[] = [
  {
    id: 1,
    roleName: "Predicateur",
    headcount: 1,
    sortOrder: 0,
    isCritical: true,
    assignments: [
      {
        id: 10,
        userId: 3,
        firstName: "Marie",
        lastName: "Blanc",
        avatarUrl: null,
        isGuest: false,
      },
    ],
  },
  {
    id: 2,
    roleName: "Diacres",
    headcount: 3,
    sortOrder: 1,
    isCritical: false,
    assignments: [
      {
        id: 11,
        userId: 5,
        firstName: "Jean",
        lastName: "Dupont",
        avatarUrl: null,
        isGuest: false,
      },
    ],
  },
];

describe("ActivityRosterView", () => {
  it("renders role names with headcount badges", () => {
    render(<ActivityRosterView roles={mockRoles} />);

    expect(screen.getByText("Predicateur")).toBeInTheDocument();
    expect(screen.getByText("Diacres")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    expect(screen.getByText("1/3")).toBeInTheDocument();
  });

  it("renders assigned people with formatted names", () => {
    render(<ActivityRosterView roles={mockRoles} />);

    expect(screen.getByText("Blanc, M.")).toBeInTheDocument();
    expect(screen.getByText("Dupont, J.")).toBeInTheDocument();
  });

  it("shows '(Invité)' for guest assignments", () => {
    const rolesWithGuest: ActivityRoleResponse[] = [
      {
        id: 1,
        roleName: "Predicateur",
        headcount: 1,
        sortOrder: 0,
        isCritical: true,
        assignments: [
          {
            id: 10,
            userId: 100,
            firstName: "Damien",
            lastName: "",
            avatarUrl: null,
            isGuest: true,
          },
        ],
      },
    ];

    render(<ActivityRosterView roles={rolesWithGuest} />);

    expect(screen.getByText("Damien")).toBeInTheDocument();
    expect(screen.getByText("(Invité)")).toBeInTheDocument();
  });

  it("shows dashed placeholders for unfilled slots", () => {
    render(<ActivityRosterView roles={mockRoles} />);

    // Diacres has 1/3 filled, so 2 unfilled (capped at 3 displayed)
    const placeholders = screen.getAllByText("Non assigné");
    expect(placeholders.length).toBe(2);
  });

  it("handles empty lastName gracefully for guest avatars", () => {
    const rolesWithEmptyLastName: ActivityRoleResponse[] = [
      {
        id: 1,
        roleName: "Predicateur",
        headcount: 1,
        sortOrder: 0,
        isCritical: true,
        assignments: [
          {
            id: 10,
            userId: 100,
            firstName: "Damien",
            lastName: "",
            avatarUrl: null,
            isGuest: true,
          },
        ],
      },
    ];

    // Should not crash, should render the guest name
    render(<ActivityRosterView roles={rolesWithEmptyLastName} />);
    expect(screen.getByText("Damien")).toBeInTheDocument();
  });

  it("shows 'Aucun rôle' when no roles provided", () => {
    render(<ActivityRosterView roles={[]} />);

    expect(screen.getByText("Aucun rôle")).toBeInTheDocument();
  });
});
