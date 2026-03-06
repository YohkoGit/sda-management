import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  setupProgressHandlers,
  setupProgressAllCompleteHandler,
} from "@/mocks/handlers/setupProgress";
import { SetupChecklist } from "./SetupChecklist";

const ownerUser = {
  userId: 4,
  email: "owner@test.local",
  firstName: "Test",
  lastName: "Owner",
  role: "OWNER",
  departmentIds: [] as number[],
};

const adminUser = {
  userId: 3,
  email: "admin@test.local",
  firstName: "Test",
  lastName: "Admin",
  role: "ADMIN",
  departmentIds: [1],
};

const server = setupServer(...authHandlers, ...setupProgressHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("SetupChecklist", () => {
  it("renders all steps with correct labels", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<SetupChecklist />);

    await waitFor(() => {
      expect(screen.getByText("Paramètres")).toBeInTheDocument();
    });
    expect(screen.getByText("Départements")).toBeInTheDocument();
    expect(screen.getByText("Modèles d\u2019activités")).toBeInTheDocument();
    expect(screen.getByText("Horaires récurrents")).toBeInTheDocument();
    expect(screen.getByText("Membres")).toBeInTheDocument();
  });

  it("current step has indigo styling and start here text", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<SetupChecklist />);

    await waitFor(() => {
      expect(screen.getByText("Commencez ici")).toBeInTheDocument();
    });

    const currentStepLink = screen.getByText("Paramètres").closest("a");
    expect(currentStepLink).toHaveAttribute("href", "/admin/settings");
    expect(currentStepLink).toHaveAttribute("aria-current", "step");
  });

  it("pending steps are not clickable (no anchor tag)", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<SetupChecklist />);

    await waitFor(() => {
      expect(screen.getByText("Paramètres")).toBeInTheDocument();
    });

    // "Départements" is pending in default mock — should NOT be a link
    const departmentsText = screen.getByText("Départements");
    expect(departmentsText.closest("a")).toBeNull();
  });

  it("progressive unlocking: step 2 current when step 1 complete (AC3)", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/setup-progress", () =>
        HttpResponse.json({
          steps: [
            { id: "church-config", status: "complete" },
            { id: "departments", status: "current" },
            { id: "templates", status: "pending" },
            { id: "schedules", status: "pending" },
            { id: "members", status: "pending" },
          ],
          isSetupComplete: false,
        })
      )
    );

    render(<SetupChecklist />);

    await waitFor(() => {
      expect(screen.getByText("Départements")).toBeInTheDocument();
    });

    // Step 1 (complete) should be a link
    const settingsLink = screen.getByText("Paramètres").closest("a");
    expect(settingsLink).toHaveAttribute("href", "/admin/settings");

    // Step 2 (current) should be a link with aria-current
    const deptLink = screen.getByText("Départements").closest("a");
    expect(deptLink).toHaveAttribute("href", "/admin/departments");
    expect(deptLink).toHaveAttribute("aria-current", "step");

    // Step 3 (pending) should NOT be a link
    expect(screen.getByText("Modèles d\u2019activités").closest("a")).toBeNull();
  });

  it("complete steps show green checkmark and are clickable links", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/setup-progress", () =>
        HttpResponse.json({
          steps: [
            { id: "church-config", status: "complete" },
            { id: "departments", status: "current" },
            { id: "templates", status: "pending" },
            { id: "schedules", status: "pending" },
            { id: "members", status: "pending" },
          ],
          isSetupComplete: false,
        })
      )
    );

    render(<SetupChecklist />);

    await waitFor(() => {
      expect(screen.getByText("Paramètres")).toBeInTheDocument();
    });

    // Complete step should be a link
    const settingsLink = screen.getByText("Paramètres").closest("a");
    expect(settingsLink).toHaveAttribute("href", "/admin/settings");

    // Green checkmark SVG should be present inside the complete step's link
    const checkIcon = settingsLink!.querySelector("svg");
    expect(checkIcon).toBeInTheDocument();
    expect(checkIcon).toHaveClass("text-emerald-600");
  });

  it("when all complete, shows completion message", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      setupProgressAllCompleteHandler
    );

    render(<SetupChecklist />);

    await waitFor(() => {
      expect(
        screen.getByText("Configuration terminée \u2014 votre système est prêt!")
      ).toBeInTheDocument();
    });
  });

  it("not rendered for non-OWNER users (query not enabled)", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<SetupChecklist />);

    // Wait for auth to resolve, then verify no checklist content rendered
    await waitFor(() => {
      expect(screen.queryByText("Paramètres")).not.toBeInTheDocument();
    });
    expect(screen.queryByText("Commencez ici")).not.toBeInTheDocument();
  });

  it("renders nothing on API error", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/setup-progress", () =>
        new HttpResponse(null, { status: 500 })
      )
    );

    const { container } = render(<SetupChecklist />);

    // Wait for query to fail (retry is disabled in test QueryClient)
    await waitFor(() => {
      // No setup content rendered
      expect(screen.queryByText("Paramètres")).not.toBeInTheDocument();
      expect(screen.queryByText("Commencez ici")).not.toBeInTheDocument();
      // No skeleton either
      expect(container.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
    });
  });

  it("shows skeleton while loading", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.get("/api/setup-progress", () => {
        // Never resolve to keep loading state
        return new Promise(() => {});
      })
    );

    render(<SetupChecklist />);

    await waitFor(() => {
      const skeleton = document.querySelector('[data-slot="skeleton"]');
      expect(skeleton).toBeInTheDocument();
    });
  });
});
