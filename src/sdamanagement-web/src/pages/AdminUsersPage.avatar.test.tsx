import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import userEvent from "@testing-library/user-event";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  userHandlers,
  avatarHandlerUpload,
  avatarHandlerGet,
} from "@/mocks/handlers/users";
import { departmentHandlers } from "@/mocks/handlers/departments";
import { userService } from "@/services/userService";
import AdminUsersPage from "./AdminUsersPage";

const ownerUser = {
  userId: 1,
  email: "owner@test.local",
  firstName: "Test",
  lastName: "Owner",
  role: "OWNER",
  departmentIds: [] as number[],
};

const viewerUser = {
  userId: 3,
  email: "viewer@test.local",
  firstName: "Test",
  lastName: "Viewer",
  role: "VIEWER",
  departmentIds: [] as number[],
};

// Radix jsdom polyfills
beforeAll(() => {
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
});

const server = setupServer(
  ...authHandlers,
  ...userHandlers,
  ...departmentHandlers,
  avatarHandlerUpload,
  avatarHandlerGet,
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AdminUsersPage — Avatar Upload", () => {
  it("OWNER sees avatar upload buttons for all users", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // All avatar areas should be clickable (OWNER can upload for any user)
    const avatarButtons = screen.getAllByRole("button", {
      name: /changer l'avatar/i,
    });
    expect(avatarButtons.length).toBeGreaterThan(0);
  });

  it("VIEWER does not see avatar upload buttons", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser)),
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // No avatar upload buttons should be available
    const avatarButtons = screen.queryAllByRole("button", {
      name: /changer l'avatar/i,
    });
    expect(avatarButtons.length).toBe(0);
  });

  it("avatar upload triggers file input and calls uploadAvatar", async () => {
    const uploadSpy = vi.spyOn(userService, "uploadAvatar").mockResolvedValue({} as never);
    const user = userEvent.setup();
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // Click avatar button first to set the pending user ID
    const avatarButtons = screen.getAllByRole("button", {
      name: /changer l'avatar/i,
    });
    await user.click(avatarButtons[0]);

    // Then upload a file via the hidden file input
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toBeTruthy();

    const file = new File(["test-image-content"], "avatar.jpg", {
      type: "image/jpeg",
    });
    await user.upload(fileInput, file);

    // Service should have been called with the correct user ID
    await waitFor(() => {
      expect(uploadSpy).toHaveBeenCalledWith(2, expect.any(File));
    });

    // Toast should show success
    await waitFor(() => {
      expect(
        screen.getByText("Avatar téléversé avec succès"),
      ).toBeInTheDocument();
    });

    uploadSpy.mockRestore();
  });

  it("shows upload spinner during upload", async () => {
    // Mock uploadAvatar with a delayed resolution to keep spinner visible
    let resolveUpload!: () => void;
    const uploadPromise = new Promise<void>((resolve) => { resolveUpload = resolve; });
    const uploadSpy = vi.spyOn(userService, "uploadAvatar").mockReturnValue(uploadPromise as never);

    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // Click avatar to set pending upload user ID
    const avatarButtons = screen.getAllByRole("button", {
      name: /changer l'avatar/i,
    });
    const user = userEvent.setup();
    await user.click(avatarButtons[0]);

    // Trigger file change via fireEvent
    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    const file = new File(["test"], "avatar.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Spinner should appear while uploading
    await waitFor(() => {
      const spinners = document.querySelectorAll(".animate-spin");
      expect(spinners.length).toBeGreaterThan(0);
    });

    // Resolve the upload
    resolveUpload();

    // After upload completes, success toast should appear
    await waitFor(() => {
      expect(
        screen.getByText("Avatar téléversé avec succès"),
      ).toBeInTheDocument();
    });

    uploadSpy.mockRestore();
  });

  it("file input accepts only JPEG, PNG, and WebP", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    expect(fileInput.accept).toBe("image/jpeg,image/png,image/webp");
  });

  it("shows uploaded image when avatarUrl is present", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // Marie-Claire (id 2) has avatarUrl in mock data
    const avatarImg = screen.getByAltText("Marie-Claire Legault");
    expect(avatarImg).toBeInTheDocument();
    expect(avatarImg.tagName).toBe("IMG");
  });

  it("shows initials when avatarUrl is null", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(ownerUser)),
    );

    render(<AdminUsersPage />);

    await waitFor(() => {
      expect(screen.getByText("Marie-Claire Legault")).toBeInTheDocument();
    });

    // Jean-Pierre Augustin (id 3) has no avatarUrl — should show initials
    const initialsAvatar = screen.getByRole("img", {
      name: "Jean-Pierre Augustin",
    });
    expect(initialsAvatar).toBeInTheDocument();
    expect(initialsAvatar.tagName).toBe("DIV"); // Initials div, not IMG
  });
});
