import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { render, futureDate } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { activityTemplateHandlers } from "@/mocks/handlers/activityTemplates";
import { departmentHandlers } from "@/mocks/handlers/departments";
import { activityHandlers } from "@/mocks/handlers/activities";
import DayDetailDialog from "./DayDetailDialog";
import type { PublicActivityListItem } from "@/types/public";

const MAIN_DATE = futureDate(30);
const OTHER_DATE = futureDate(31);
const EMPTY_DATE = futureDate(60);

const mockActivities: PublicActivityListItem[] = [
  {
    id: 1,
    title: "Culte du Sabbat",
    date: MAIN_DATE,
    startTime: "09:30:00",
    endTime: "12:00:00",
    departmentName: "Eglise",
    departmentAbbreviation: "EG",
    departmentColor: "#4F46E5",
    predicateurName: "Pasteur Dupont",
    predicateurAvatarUrl: null,
    specialType: null,
  },
  {
    id: 2,
    title: "Réunion JA",
    date: MAIN_DATE,
    startTime: "14:00:00",
    endTime: "16:00:00",
    departmentName: "Jeunesse",
    departmentAbbreviation: "JA",
    departmentColor: "#059669",
    predicateurName: null,
    predicateurAvatarUrl: null,
    specialType: "youth-day",
  },
  {
    id: 3,
    title: "Autre jour",
    date: OTHER_DATE,
    startTime: "10:00:00",
    endTime: "11:00:00",
    departmentName: "Eglise",
    departmentAbbreviation: "EG",
    departmentColor: "#4F46E5",
    predicateurName: null,
    predicateurAvatarUrl: null,
    specialType: null,
  },
];

const adminUser = { role: "ADMIN", departmentIds: [1] };
const ownerUser = { role: "OWNER", departmentIds: [1, 2] };
const viewerUser = { role: "VIEWER", departmentIds: [] };

const server = setupServer(
  ...authHandlers,
  ...activityTemplateHandlers,
  ...departmentHandlers,
  ...activityHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  date: MAIN_DATE,
  activities: mockActivities,
  onCreated: vi.fn(),
  onNavigateToDay: vi.fn(),
};

describe("DayDetailDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("renders activity list for the selected date", async () => {
    render(
      <DayDetailDialog {...defaultProps} user={viewerUser} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
      expect(screen.getByText("Réunion JA")).toBeInTheDocument();
    });
    // Activity from different date should NOT appear
    expect(screen.queryByText("Autre jour")).not.toBeInTheDocument();
  });

  it("shows 'Nouvelle activité' button when user is ADMIN", async () => {
    render(
      <DayDetailDialog {...defaultProps} user={adminUser} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Nouvelle activité")).toBeInTheDocument();
    });
  });

  it("hides 'Nouvelle activité' button when user is VIEWER", async () => {
    render(
      <DayDetailDialog {...defaultProps} user={viewerUser} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });
    expect(screen.queryByText("Nouvelle activité")).not.toBeInTheDocument();
  });

  it("hides 'Nouvelle activité' button when user is null (anonymous)", async () => {
    render(
      <DayDetailDialog {...defaultProps} user={null} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });
    expect(screen.queryByText("Nouvelle activité")).not.toBeInTheDocument();
  });

  it("disables 'Nouvelle activité' button for past dates", async () => {
    render(
      <DayDetailDialog
        {...defaultProps}
        date="2020-01-01"
        activities={[]}
        user={adminUser}
      />,
    );

    await waitFor(() => {
      const btn = screen.getByText("Nouvelle activité");
      expect(btn.closest("button")).toBeDisabled();
    });
  });

  it("clicking 'Nouvelle activité' transitions to template step", async () => {
    const user = userEvent.setup();
    render(
      <DayDetailDialog {...defaultProps} user={adminUser} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Nouvelle activité")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Nouvelle activité"));

    await waitFor(() => {
      expect(screen.getByText("Choisir un modèle")).toBeInTheDocument();
    });
  });

  it("back button from template step returns to detail step", async () => {
    const user = userEvent.setup();
    render(
      <DayDetailDialog {...defaultProps} user={adminUser} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Nouvelle activité")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Nouvelle activité"));

    await waitFor(() => {
      expect(screen.getByText("Retour")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Retour"));

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });
  });

  it("shows 'View full day' link and calls onNavigateToDay on click", async () => {
    const onNavigateToDay = vi.fn();
    const user = userEvent.setup();
    render(
      <DayDetailDialog
        {...defaultProps}
        user={viewerUser}
        onNavigateToDay={onNavigateToDay}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Voir la journée complète")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Voir la journée complète"));
    expect(onNavigateToDay).toHaveBeenCalledWith(MAIN_DATE);
  });

  it("shows empty state when no activities for selected date", async () => {
    render(
      <DayDetailDialog
        {...defaultProps}
        date={EMPTY_DATE}
        user={viewerUser}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Aucune activité planifiée")).toBeInTheDocument();
    });
  });

  it("renders formatted date heading", async () => {
    render(
      <DayDetailDialog {...defaultProps} user={viewerUser} />,
    );

    // Derive expected fragments from MAIN_DATE (YYYY-MM-DD)
    const [y, m, d] = MAIN_DATE.split("-");
    const expectedDay = String(Number(d)); // strip leading zero
    const expectedYear = y;
    const expectedMonth = new Date(Number(y), Number(m) - 1, Number(d))
      .toLocaleDateString("fr-CA", { month: "long" });

    await waitFor(() => {
      const heading = screen.getByRole("heading");
      expect(heading.textContent).toContain(expectedDay);
      expect(heading.textContent).toContain(expectedYear);
      expect(heading.textContent).toMatch(new RegExp(expectedMonth, "i"));
    });
  });

  it("OWNER user sees 'Nouvelle activité' button", async () => {
    render(
      <DayDetailDialog {...defaultProps} user={ownerUser} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Nouvelle activité")).toBeInTheDocument();
    });
  });

  it("full creation flow: detail → template → form with pre-filled date", async () => {
    const user = userEvent.setup();

    render(
      <DayDetailDialog {...defaultProps} user={adminUser} />,
    );

    // Step 1: Click "Nouvelle activité" to go to template step
    await waitFor(() => {
      expect(screen.getByText("Nouvelle activité")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Nouvelle activité"));

    // Step 2: Wait for templates to load and select "Custom" (no template)
    await waitFor(() => {
      expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Activité sans modèle"));

    // Step 3: Form renders with date pre-filled and submit button available
    await waitFor(() => {
      expect(screen.getByLabelText("Titre")).toBeInTheDocument();
    });

    // Date field should be pre-filled from the dialog's date prop
    const dateInput = screen.getByLabelText("Date") as HTMLInputElement;
    expect(dateInput.value).toBe(MAIN_DATE);

    // Department should be auto-selected (ADMIN with departmentIds=[1], single dept available)
    // Submit button should be present
    expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();

    // Back button returns to template step
    await user.click(screen.getByText("Retour aux modèles"));
    await waitFor(() => {
      expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();
    });
  });

  it("shows department error with retry when department fetch fails", async () => {
    server.use(
      http.get("/api/departments", () => new HttpResponse(null, { status: 500 })),
    );

    const user = userEvent.setup();
    render(
      <DayDetailDialog {...defaultProps} user={adminUser} />,
    );

    // Navigate to form step
    await waitFor(() => {
      expect(screen.getByText("Nouvelle activité")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Nouvelle activité"));

    await waitFor(() => {
      expect(screen.getByText("Activité sans modèle")).toBeInTheDocument();
    });
    await user.click(screen.getByText("Activité sans modèle"));

    // Should show department error with retry button
    await waitFor(() => {
      expect(screen.getByText("Impossible de charger les départements")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
  });
});
