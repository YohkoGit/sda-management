import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@/test-utils";

// Polyfills for Radix AlertDialog in jsdom
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

import { authHandlers } from "@/mocks/handlers/auth";
import {
  userHandlers,
  userHandlerDelete,
  userHandlerDelete403,
  userHandlerDelete404,
  userHandlerDelete409,
} from "@/mocks/handlers/users";
import { departmentHandlers } from "@/mocks/handlers/departments";
import AdminUsersPage from "./AdminUsersPage";

const ownerUser = {
  userId: 1,
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

const viewerUser = {
  userId: 10,
  email: "viewer@test.local",
  firstName: "Test",
  lastName: "Viewer",
  role: "VIEWER",
  departmentIds: [] as number[],
};

const server = setupServer(
  ...authHandlers,
  ...userHandlers,
  userHandlerDelete,
  ...departmentHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminUsersPage — Delete", () => {
  it("delete button visible for OWNER, hidden for ADMIN", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // OWNER sees delete buttons (Trash2 icons) — one per user except self
    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer l'utilisateur" });
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("delete button hidden for ADMIN", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(adminUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByRole("button", { name: "Supprimer l'utilisateur" });
    expect(deleteButtons).toHaveLength(0);
  });

  it("delete button hidden for VIEWER", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const deleteButtons = screen.queryAllByRole("button", { name: "Supprimer l'utilisateur" });
    expect(deleteButtons).toHaveLength(0);
  });

  it("delete button NOT visible on own user card", async () => {
    // Set ownerUser.userId to match a mock user id (id: 2 is Marie-Claire)
    const selfOwner = { ...ownerUser, userId: 2 };
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(selfOwner))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // Find the card for Marie-Claire (id: 2 = self) — should NOT have delete button
    const cards = document.querySelectorAll("[class*='rounded-2xl']");
    const marieCard = Array.from(cards).find((card) =>
      card.textContent?.includes("Marie-Claire Legault")
    );
    expect(marieCard).toBeDefined();
    const deleteInSelfCard = marieCard!.querySelector(`button[aria-label="Supprimer l'utilisateur"]`);
    expect(deleteInSelfCard).toBeNull();

    // Other cards SHOULD have delete buttons
    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer l'utilisateur" });
    expect(deleteButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("clicking delete opens AlertDialog with user name", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // Click the first delete button
    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer l'utilisateur" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer l'utilisateur")
      ).toBeInTheDocument();
    });

    // Description should contain user's full name in context
    expect(
      screen.getByText(/irréversible.*Marie-Claire Legault/)
    ).toBeInTheDocument();
  });

  it("cancel button closes dialog without API call", async () => {
    const user = userEvent.setup();
    let deleteCalled = false;
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      http.delete("/api/users/:id", () => {
        deleteCalled = true;
        return new HttpResponse(null, { status: 204 });
      })
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer l'utilisateur" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer l'utilisateur")
      ).toBeInTheDocument();
    });

    await user.click(screen.getByText("Annuler"));

    await waitFor(() => {
      expect(
        screen.queryByText("Supprimer l'utilisateur")
      ).not.toBeInTheDocument();
    });

    expect(deleteCalled).toBe(false);
  });

  it("confirm delete calls API and shows success toast", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser))
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer l'utilisateur" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer l'utilisateur")
      ).toBeInTheDocument();
    });

    // Find the confirm button (the one with destructive styling inside the dialog)
    const confirmButton = screen.getByRole("button", {
      name: "Supprimer",
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Utilisateur supprimé")).toBeInTheDocument();
    });
  });

  it("409 error shows last owner toast", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      userHandlerDelete409
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer l'utilisateur" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer l'utilisateur")
      ).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", {
      name: "Supprimer",
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(
        screen.getByText("Impossible de supprimer le dernier propriétaire")
      ).toBeInTheDocument();
    });
  });

  it("403 error shows forbidden toast", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      userHandlerDelete403
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer l'utilisateur" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer l'utilisateur")
      ).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", {
      name: "Supprimer",
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Accès refusé")).toBeInTheDocument();
    });
  });

  it("404 error shows not found toast", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
      userHandlerDelete404
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole("button", { name: "Supprimer l'utilisateur" });
    await user.click(deleteButtons[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Supprimer l'utilisateur")
      ).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole("button", {
      name: "Supprimer",
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Utilisateur introuvable")).toBeInTheDocument();
    });
  });
});
