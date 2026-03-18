import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { departmentHandlers } from "@/mocks/handlers/departments";
import AuthDepartmentsPage from "./AuthDepartmentsPage";

const viewerUser = {
  userId: 1,
  email: "viewer@test.local",
  firstName: "Test",
  lastName: "Viewer",
  role: "VIEWER",
  departmentIds: [],
};

const server = setupServer(...authHandlers, ...departmentHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("AuthDepartmentsPage", () => {
  it("renders department list with aggregate staffing dots", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser))
    );

    render(<AuthDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });
    expect(screen.getByText("Ministere de la Femme")).toBeInTheDocument();
    expect(screen.getByText("Diaconat")).toBeInTheDocument();
    expect(screen.getByText("Unités Ministérielles")).toBeInTheDocument();
  });

  it("renders skeleton loading state initially", () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser)),
      http.get("/api/departments/with-staffing", () =>
        new Promise(() => {}) // Never resolves
      )
    );

    render(<AuthDepartmentsPage />);

    expect(screen.getByText("Unités Ministérielles")).toBeInTheDocument();
  });

  it("renders error state with retry button", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser)),
      http.get("/api/departments/with-staffing", () =>
        HttpResponse.json({ error: "fail" }, { status: 500 })
      )
    );

    render(<AuthDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Erreur de chargement")).toBeInTheDocument();
    });
    expect(screen.getByText("Réessayer")).toBeInTheDocument();
  });

  it("renders empty state when zero departments", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser)),
      http.get("/api/departments/with-staffing", () =>
        HttpResponse.json([])
      )
    );

    render(<AuthDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Aucun département configuré")).toBeInTheDocument();
    });
  });

  it("department cards have links to detail page", async () => {
    server.use(
      http.get("/api/auth/me", () => HttpResponse.json(viewerUser))
    );

    render(<AuthDepartmentsPage />);

    await waitFor(() => {
      expect(screen.getByText("Jeunesse Adventiste")).toBeInTheDocument();
    });

    const links = screen.getAllByRole("link");
    const deptLink = links.find((link) =>
      link.getAttribute("href")?.startsWith("/my-departments/")
    );
    expect(deptLink).toBeTruthy();
  });
});
