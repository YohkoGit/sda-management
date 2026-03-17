import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { Routes, Route } from "react-router-dom";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  activityDetailHandlers,
  activityDetailNotFoundHandler,
  activityDetailErrorHandler,
} from "@/mocks/handlers/activityDetail";
import ActivityDetailPage from "./ActivityDetailPage";

const viewerUser = {
  userId: 1,
  email: "viewer@test.local",
  firstName: "Test",
  lastName: "Viewer",
  role: "VIEWER",
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

const adminNonMatchingUser = {
  userId: 3,
  email: "admin@test.local",
  firstName: "Test",
  lastName: "Admin",
  role: "ADMIN",
  departmentIds: [2],
};

const ownerUser = {
  userId: 4,
  email: "owner@test.local",
  firstName: "Test",
  lastName: "Owner",
  role: "OWNER",
  departmentIds: [] as number[],
};

const authenticatedAuthHandler = (user: typeof viewerUser) =>
  http.get("/api/auth/me", () => HttpResponse.json(user));

const server = setupServer(
  ...authHandlers,
  ...activityDetailHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPage(authUser = viewerUser) {
  server.use(authenticatedAuthHandler(authUser));
  return render(
    <Routes>
      <Route path="activities/:id" element={<ActivityDetailPage />} />
    </Routes>,
    {
      routerProps: {
        initialEntries: ["/activities/1"],
      },
    },
  );
}

describe("ActivityDetailPage", () => {
  it("renders activity title and date", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Culte Divin/i })).toBeInTheDocument();
    });
  });

  it("renders all role sections", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Prédicateur")).toBeInTheDocument();
      expect(screen.getByText("Ancien de Service")).toBeInTheDocument();
      expect(screen.getByText("Diacres")).toBeInTheDocument();
      expect(screen.getByText("Diaconesses")).toBeInTheDocument();
    });
  });

  it("renders assigned people names", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Mario Vicuna")).toBeInTheDocument();
      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
      expect(screen.getByText("Pierre Martin")).toBeInTheDocument();
      expect(screen.getByText("Paul Lefebvre")).toBeInTheDocument();
    });
  });

  it("renders empty slots with 'Non assigné'", async () => {
    renderPage();

    await waitFor(() => {
      // Diacres has 2/3 filled (1 empty), Diaconesses has 1/2 filled (1 empty)
      const unassigned = screen.getAllByText("Non assigné");
      expect(unassigned.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("renders guest label for guest speakers", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("(Invité)")).toBeInTheDocument();
    });
  });

  it("renders department badge with abbreviation", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("JA")).toBeInTheDocument();
    });
  });

  it("renders special type badge", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Journée de la Femme")).toBeInTheDocument();
    });
  });

  it("shows skeleton loading state", () => {
    renderPage();

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows 'Activité non trouvée' on 404", async () => {
    server.use(...activityDetailNotFoundHandler);
    renderPage();

    await waitFor(
      () => {
        expect(screen.getByText("Activité non trouvée")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByText("Retour au tableau de bord")).toBeInTheDocument();
  });

  it("renders staffing indicator with correct status", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeInTheDocument();
    });
  });

  it("back button links to dashboard", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Culte Divin/i })).toBeInTheDocument();
    });

    const backLink = screen.getByRole("link", { name: /retour/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute("href", "/dashboard");
  });

  it("edit button NOT visible for VIEWER", async () => {
    renderPage(viewerUser);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Culte Divin/i })).toBeInTheDocument();
    });

    expect(screen.queryByText("Modifier")).not.toBeInTheDocument();
  });

  it("edit button visible for ADMIN with matching department", async () => {
    renderPage(adminUser);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Culte Divin/i })).toBeInTheDocument();
    });

    expect(screen.getByText("Modifier")).toBeInTheDocument();
  });

  it("edit button NOT visible for ADMIN with non-matching department", async () => {
    renderPage(adminNonMatchingUser);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Culte Divin/i })).toBeInTheDocument();
    });

    expect(screen.queryByText("Modifier")).not.toBeInTheDocument();
  });

  it("edit button visible for OWNER", async () => {
    renderPage(ownerUser);

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Culte Divin/i })).toBeInTheDocument();
    });

    expect(screen.getByText("Modifier")).toBeInTheDocument();
  });

  it("shows error state with retry button on 500", async () => {
    server.use(...activityDetailErrorHandler);
    renderPage();

    await waitFor(
      () => {
        expect(screen.getByText("Impossible de charger l'activité")).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeInTheDocument();
  });

  it("uses proper heading hierarchy", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1, name: /Culte Divin/i })).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { level: 2, name: /Composition de l'activité/i })).toBeInTheDocument();
  });
});
