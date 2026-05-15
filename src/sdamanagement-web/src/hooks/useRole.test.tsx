import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse, type JsonBodyType, type HttpResponseInit } from "msw";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { testI18n } from "@/test-utils";
import { useRole } from "./useRole";

interface MeFixture {
  body: JsonBodyType;
  init?: HttpResponseInit;
}

const VIEWER_FIXTURE: MeFixture = {
  body: {
    userId: 10,
    email: "viewer@test.local",
    firstName: "Vera",
    lastName: "Viewer",
    role: "VIEWER",
    departmentIds: [3],
  },
};

const ADMIN_FIXTURE: MeFixture = {
  body: {
    userId: 20,
    email: "admin@test.local",
    firstName: "Anna",
    lastName: "Admin",
    role: "ADMIN",
    departmentIds: [1, 2],
  },
};

const OWNER_FIXTURE: MeFixture = {
  body: {
    userId: 30,
    email: "owner@test.local",
    firstName: "Olive",
    lastName: "Owner",
    role: "OWNER",
    departmentIds: [],
  },
};

const ANONYMOUS_FIXTURE: MeFixture = {
  body: { type: "urn:sdac:unauthenticated", status: 401 },
  init: { status: 401 },
};

let currentMe: MeFixture = ANONYMOUS_FIXTURE;

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json(currentMe.body, currentMe.init),
  ),
  http.post("/api/auth/refresh", () =>
    HttpResponse.json(null, { status: 401 }),
  ),
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  currentMe = ANONYMOUS_FIXTURE;
  server.resetHandlers(
    http.get("/api/auth/me", () =>
      HttpResponse.json(currentMe.body, currentMe.init),
    ),
    http.post("/api/auth/refresh", () =>
      HttpResponse.json(null, { status: 401 }),
    ),
  );
});
afterAll(() => server.close());

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nextProvider i18n={testI18n}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter>
            <AuthProvider>{children}</AuthProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </I18nextProvider>
    );
  };
}

describe("useRole", () => {
  beforeEach(() => {
    currentMe = ANONYMOUS_FIXTURE;
  });

  describe("anonymous (auth check fails with 401)", () => {
    it("returns null role and all flags false", async () => {
      const { result } = renderHook(() => useRole(), { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(result.current.role).toBeNull();
      expect(result.current.isOwner).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isViewer).toBe(false);
      expect(result.current.ownedDepartmentIds).toEqual([]);
      expect(result.current.hasRole("OWNER", "ADMIN", "VIEWER")).toBe(false);
    });
  });

  describe("viewer", () => {
    it("sets only isViewer / isAuthenticated true and exposes departmentIds", async () => {
      currentMe = VIEWER_FIXTURE;

      const { result } = renderHook(() => useRole(), { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.role).toBe("VIEWER");
      expect(result.current.isOwner).toBe(false);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isViewer).toBe(true);
      expect(result.current.ownedDepartmentIds).toEqual([3]);
    });
  });

  describe("admin", () => {
    it("sets only isAdmin true — NOT isOwner (per doc-comment contract)", async () => {
      currentMe = ADMIN_FIXTURE;

      const { result } = renderHook(() => useRole(), { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.role).toBe("ADMIN");
      expect(result.current.isOwner).toBe(false);
      expect(result.current.isAdmin).toBe(true);
      expect(result.current.isViewer).toBe(false);
      expect(result.current.ownedDepartmentIds).toEqual([1, 2]);
    });
  });

  describe("owner", () => {
    it("sets only isOwner true — NOT isAdmin (owner is not auto-admin)", async () => {
      currentMe = OWNER_FIXTURE;

      const { result } = renderHook(() => useRole(), { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.role).toBe("OWNER");
      expect(result.current.isOwner).toBe(true);
      expect(result.current.isAdmin).toBe(false);
      expect(result.current.isViewer).toBe(false);
      expect(result.current.ownedDepartmentIds).toEqual([]);
    });
  });

  describe("hasRole matrix", () => {
    it("admin hasRole('ADMIN') is true; hasRole('OWNER') is false; hasRole('ADMIN','OWNER') is true", async () => {
      currentMe = ADMIN_FIXTURE;

      const { result } = renderHook(() => useRole(), { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.hasRole("ADMIN")).toBe(true);
      expect(result.current.hasRole("OWNER")).toBe(false);
      expect(result.current.hasRole("VIEWER")).toBe(false);
      expect(result.current.hasRole("ADMIN", "OWNER")).toBe(true);
      expect(result.current.hasRole("OWNER", "VIEWER")).toBe(false);
    });

    it("owner hasRole('OWNER') is true; hasRole('ADMIN') is false; hasRole('ADMIN','OWNER') is true", async () => {
      currentMe = OWNER_FIXTURE;

      const { result } = renderHook(() => useRole(), { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.hasRole("OWNER")).toBe(true);
      expect(result.current.hasRole("ADMIN")).toBe(false);
      expect(result.current.hasRole("VIEWER")).toBe(false);
      expect(result.current.hasRole("ADMIN", "OWNER")).toBe(true);
    });

    it("viewer hasRole('VIEWER') is true; everything else false", async () => {
      currentMe = VIEWER_FIXTURE;

      const { result } = renderHook(() => useRole(), { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(true);
      });

      expect(result.current.hasRole("VIEWER")).toBe(true);
      expect(result.current.hasRole("ADMIN")).toBe(false);
      expect(result.current.hasRole("OWNER")).toBe(false);
      expect(result.current.hasRole("ADMIN", "OWNER")).toBe(false);
    });

    it("anonymous hasRole returns false for every input", async () => {
      const { result } = renderHook(() => useRole(), { wrapper: makeWrapper() });

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
      });

      expect(result.current.hasRole("OWNER")).toBe(false);
      expect(result.current.hasRole("ADMIN")).toBe(false);
      expect(result.current.hasRole("VIEWER")).toBe(false);
      expect(result.current.hasRole("OWNER", "ADMIN", "VIEWER")).toBe(false);
    });
  });
});
