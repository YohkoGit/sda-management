import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { configHandlers } from "@/mocks/handlers/config";
import {
  publicHandlers,
  liveStatusHandlers,
  liveStatusHandlersLive,
} from "@/mocks/handlers/public";
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

  it("renders YouTubeSection when live", async () => {
    // Redesign: YouTubeSection only renders when isLive OR URL has a video ID.
    // Default config is a channel URL — switch to live to make it visible.
    server.use(...liveStatusHandlersLive);

    render(<LivePage />);

    await waitFor(() => {
      expect(screen.getByText("Suivez le culte en direct")).toBeInTheDocument();
    });
  });
});
