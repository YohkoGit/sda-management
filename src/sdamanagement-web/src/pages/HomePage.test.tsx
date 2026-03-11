import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { configHandlers } from "@/mocks/handlers/config";
import { publicHandlers } from "@/mocks/handlers/public";
import HomePage from "./HomePage";

const server = setupServer(...authHandlers, ...configHandlers, ...publicHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HomePage", () => {
  it("renders HeroSection", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(
        screen.getByText("Eglise Adventiste du 7e Jour de Saint-Hubert")
      ).toBeInTheDocument();
    });
  });

  it("renders activity data from HeroSection", async () => {
    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });
  });
});
