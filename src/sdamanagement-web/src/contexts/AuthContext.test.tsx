import { describe, it, expect, vi, beforeAll, afterAll, afterEach, beforeEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import { queryClient as singletonQueryClient } from "@/lib/queryClient";

// Track logout API calls
let logoutCallCount = 0;

const server = setupServer(
  http.get("/api/auth/me", () =>
    HttpResponse.json({
      userId: 1,
      email: "viewer@test.local",
      firstName: "Test",
      lastName: "Viewer",
      role: "VIEWER",
    })
  ),
  http.post("/api/auth/logout", () => {
    logoutCallCount++;
    return HttpResponse.json(null, { status: 200 });
  }),
  http.post("/api/auth/refresh", () =>
    HttpResponse.json(null, { status: 401 })
  )
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => {
  server.resetHandlers();
  logoutCallCount = 0;
});
afterAll(() => server.close());

// Save and restore window.location for redirect testing
const originalLocation = window.location;

beforeEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: {
      href: "http://localhost/",
      pathname: "/",
      search: "",
      origin: "http://localhost",
      assign: vi.fn(),
      replace: vi.fn(),
      reload: vi.fn(),
      toString: () => "http://localhost/",
    },
  });
});

afterEach(() => {
  Object.defineProperty(window, "location", {
    configurable: true,
    writable: true,
    value: originalLocation,
  });
});

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function LogoutHelper() {
  const { user, isAuthenticated, logout } = useAuth();
  return (
    <div>
      <span data-testid="user-email">{user?.email ?? "null"}</span>
      <span data-testid="is-authenticated">{String(isAuthenticated)}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

describe("AuthContext logout", () => {
  it("calls POST /api/auth/logout via API", async () => {
    const user = userEvent.setup();
    render(<LogoutHelper />, { wrapper: TestWrapper });

    // Wait for auth check to complete (user becomes authenticated)
    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(logoutCallCount).toBe(1);
    });
  });

  it("after logout, user state is null and isAuthenticated is false", async () => {
    const user = userEvent.setup();
    render(<LogoutHelper />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(screen.getByTestId("user-email")).toHaveTextContent("null");
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("false");
    });
  });

  it("logout redirects to /", async () => {
    const user = userEvent.setup();
    render(<LogoutHelper />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(window.location.href).toBe("/");
    });
  });

  it("logout still redirects and clears cache even if API call fails", async () => {
    const clearSpy = vi.spyOn(singletonQueryClient, "clear");

    server.use(
      http.post("/api/auth/logout", () => {
        return HttpResponse.error();
      })
    );

    const user = userEvent.setup();
    render(<LogoutHelper />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(window.location.href).toBe("/");
      expect(clearSpy).toHaveBeenCalledOnce();
    });

    clearSpy.mockRestore();
  });

  it("logout clears the singleton queryClient cache", async () => {
    const clearSpy = vi.spyOn(singletonQueryClient, "clear");
    const user = userEvent.setup();
    render(<LogoutHelper />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId("is-authenticated")).toHaveTextContent("true");
    });

    await user.click(screen.getByText("Logout"));

    await waitFor(() => {
      expect(clearSpy).toHaveBeenCalledOnce();
    });

    clearSpy.mockRestore();
  });
});
