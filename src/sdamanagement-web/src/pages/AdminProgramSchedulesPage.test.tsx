import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { programScheduleHandlers } from "@/mocks/handlers/programSchedules";
import { departmentHandlers } from "@/mocks/handlers/departments";
import AdminProgramSchedulesPage from "./AdminProgramSchedulesPage";

const ownerUser = {
  userId: 4,
  email: "owner@test.local",
  firstName: "Test",
  lastName: "Owner",
  role: "OWNER",
};

const adminUser = {
  userId: 3,
  email: "admin@test.local",
  firstName: "Test",
  lastName: "Admin",
  role: "ADMIN",
};

const server = setupServer(
  ...authHandlers,
  ...programScheduleHandlers,
  ...departmentHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminProgramSchedulesPage", () => {
  it("renders empty state when no schedules exist", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/program-schedules", () => HttpResponse.json([]))
    );

    render(<AdminProgramSchedulesPage />);

    await waitFor(() => {
      expect(
        screen.getByText(
          "Configurez vos horaires récurrents — École du Sabbat, Culte Divin, JA..."
        )
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Créer un horaire")).toBeInTheDocument();
  });

  it("renders schedule list for OWNER user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminProgramSchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText("École du Sabbat")).toBeInTheDocument();
    });
    expect(screen.getByText("Culte Divin")).toBeInTheDocument();
    expect(screen.getByText("09:15 – 10:30")).toBeInTheDocument();
    expect(screen.getByText("Fr. Jean")).toBeInTheDocument();
  });

  it("shows access denied for non-OWNER user", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminProgramSchedulesPage />);

    await waitFor(() => {
      expect(
        screen.getByText("Accès réservé au propriétaire du système.")
      ).toBeInTheDocument();
    });
  });

  it("opens create dialog when clicking create button", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminProgramSchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText("École du Sabbat")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Créer un horaire"));

    await waitFor(() => {
      expect(
        screen.getByText("Nouvel horaire récurrent")
      ).toBeInTheDocument();
    });
  });

  it("shows delete confirmation dialog", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminProgramSchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText("École du Sabbat")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer l\u2019horaire")
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText("Cette action est irréversible.")
    ).toBeInTheDocument();
  });

  it("shows day badge on schedule cards", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminProgramSchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText("École du Sabbat")).toBeInTheDocument();
    });

    // Both schedules are on Saturday (dayOfWeek: 6)
    const saturdayBadges = screen.getAllByText("Samedi");
    expect(saturdayBadges.length).toBe(2);
  });

  it("shows department name on schedule card", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminProgramSchedulesPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
  });
});
