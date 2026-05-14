import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import AppSidebar from "./AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderSidebar() {
  return render(
    <SidebarProvider>
      <AppSidebar />
    </SidebarProvider>
  );
}

describe("AppSidebar", () => {
  describe("with VIEWER role", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/auth/me", () =>
          HttpResponse.json({
            userId: 1,
            email: "viewer@test.local",
            firstName: "Test",
            lastName: "Viewer",
            role: "VIEWER",
          })
        )
      );
    });

    it("shows basic navigation items for VIEWER", async () => {
      renderSidebar();

      await waitFor(() => {
        expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
      });
      expect(screen.getByText("Calendrier")).toBeInTheDocument();
      expect(screen.getByText("Départements")).toBeInTheDocument();
      expect(screen.getByText("Se déconnecter")).toBeInTheDocument();
    });

    it("does not show admin items for VIEWER", async () => {
      renderSidebar();

      await waitFor(() => {
        expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
      });
      expect(screen.queryByText("Administration")).not.toBeInTheDocument();
      expect(screen.queryByText("Paramètres")).not.toBeInTheDocument();
    });
  });

  describe("with ADMIN role", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/auth/me", () =>
          HttpResponse.json({
            userId: 3,
            email: "admin@test.local",
            firstName: "Test",
            lastName: "Admin",
            role: "ADMIN",
          })
        )
      );
    });

    it("shows admin items for ADMIN", async () => {
      renderSidebar();

      await waitFor(() => {
        expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
      });
      // "Administration" appears as both the section eyebrow heading and a nav link label.
      // Verify the nav link is present.
      expect(screen.getByRole("link", { name: /administration/i })).toBeInTheDocument();
    });

    it("does not show settings for ADMIN", async () => {
      renderSidebar();

      await waitFor(() => {
        expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
      });
      expect(screen.queryByText("Paramètres")).not.toBeInTheDocument();
    });
  });

  describe("with OWNER role", () => {
    beforeEach(() => {
      server.use(
        http.get("/api/auth/me", () =>
          HttpResponse.json({
            userId: 4,
            email: "owner@test.local",
            firstName: "Test",
            lastName: "Owner",
            role: "OWNER",
          })
        )
      );
    });

    it("shows all items including settings for OWNER", async () => {
      renderSidebar();

      await waitFor(() => {
        expect(screen.getByText("Tableau de bord")).toBeInTheDocument();
      });
      // "Administration" appears as section heading + nav link; assert the nav link.
      expect(screen.getByRole("link", { name: /administration/i })).toBeInTheDocument();
      expect(screen.getByText("Paramètres")).toBeInTheDocument();
    });
  });
});
