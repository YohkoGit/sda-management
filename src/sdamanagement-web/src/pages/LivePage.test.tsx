import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { configHandlers } from "@/mocks/handlers/config";
import { publicHandlers, liveStatusHandlers } from "@/mocks/handlers/public";
import LivePage from "./LivePage";

const server = setupServer(...authHandlers, ...configHandlers, ...publicHandlers, ...liveStatusHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("LivePage", () => {
  it("renders page title", () => {
    render(<LivePage />);
    expect(screen.getByText("En Direct")).toBeInTheDocument();
  });

  it("renders YouTubeSection", async () => {
    render(<LivePage />);

    await waitFor(() => {
      expect(screen.getByText("Suivez le culte en direct")).toBeInTheDocument();
    });
  });
});
