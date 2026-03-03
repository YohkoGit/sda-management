import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { Routes, Route } from "react-router-dom";
import { render, screen } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import PublicLayout from "./PublicLayout";

const server = setupServer(...authHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("PublicLayout", () => {
  it("renders TopNav and child content via Outlet", () => {
    render(
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<div>Home Content</div>} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    // TopNav should be rendered
    expect(screen.getByText("Accueil")).toBeInTheDocument();
    expect(screen.getByText("Connexion")).toBeInTheDocument();

    // Child content should be rendered
    expect(screen.getByText("Home Content")).toBeInTheDocument();
  });

  it("has skip-to-content link", () => {
    render(
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<div>Home Content</div>} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    const skipLink = screen.getByText("Aller au contenu principal");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("has a main element with id main-content", () => {
    render(
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<div>Home Content</div>} />
        </Route>
      </Routes>,
      { routerProps: { initialEntries: ["/"] } }
    );

    expect(document.getElementById("main-content")).toBeInTheDocument();
  });
});
