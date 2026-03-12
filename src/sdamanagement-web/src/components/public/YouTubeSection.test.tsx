import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import {
  configHandlers,
  configHandlersNoYouTube,
  configHandlersEmptyYouTube,
  configHandlersWithVideoUrl,
} from "@/mocks/handlers/config";
import {
  publicHandlers,
  liveStatusHandlers,
  liveStatusHandlersLive,
  liveStatusHandlersError,
} from "@/mocks/handlers/public";
import YouTubeSection from "./YouTubeSection";

const server = setupServer(
  ...authHandlers,
  ...configHandlers,
  ...publicHandlers,
  ...liveStatusHandlers
);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("YouTubeSection", () => {
  it("renders 'Suivez le culte en direct' heading", async () => {
    render(<YouTubeSection />);

    await waitFor(() => {
      expect(screen.getByText("Suivez le culte en direct")).toBeInTheDocument();
    });
  });

  it("renders YouTube section as link card when channel URL (no video ID, not live)", async () => {
    render(<YouTubeSection />);

    await waitFor(() => {
      expect(screen.getByText("Regarder sur YouTube")).toBeInTheDocument();
    });

    // Link card should open in new tab
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders YouTube section with live embed when API returns isLive with liveVideoId", async () => {
    server.use(...liveStatusHandlersLive);

    render(<YouTubeSection />);

    await waitFor(() => {
      expect(screen.getByText("EN DIRECT")).toBeInTheDocument();
    });

    const iframe = document.querySelector("iframe");
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toContain("youtube.com/embed/dQw4w9WgXcQ");
  });

  it("does NOT render 'EN DIRECT' when API isLive is false", async () => {
    render(<YouTubeSection />);

    await waitFor(() => {
      expect(screen.getByText("Suivez le culte en direct")).toBeInTheDocument();
    });

    expect(screen.queryByText("EN DIRECT")).not.toBeInTheDocument();
  });

  it("returns null when youTubeChannelUrl is null (AC #3)", async () => {
    server.use(...configHandlersNoYouTube);

    render(<YouTubeSection />);

    // Wait for config to load, then verify no YouTube section rendered
    await waitFor(() => {
      expect(
        document.querySelector('section[aria-labelledby="youtube-section-title"]')
      ).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Suivez le culte en direct")).not.toBeInTheDocument();
  });

  it("renders YouTube section with static embed when URL has video ID and not live", async () => {
    server.use(...configHandlersWithVideoUrl);

    render(<YouTubeSection />);

    await waitFor(() => {
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toContain("youtube.com/embed/dQw4w9WgXcQ");
    });

    // Should NOT show live indicator in static embed mode
    expect(screen.queryByText("EN DIRECT")).not.toBeInTheDocument();
  });

  it("returns null when youTubeChannelUrl is empty string", async () => {
    server.use(...configHandlersEmptyYouTube);

    render(<YouTubeSection />);

    await waitFor(() => {
      expect(
        document.querySelector('section[aria-labelledby="youtube-section-title"]')
      ).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Suivez le culte en direct")).not.toBeInTheDocument();
  });

  it("falls back to link card when live status API errors (AC #7)", async () => {
    server.use(...liveStatusHandlersError);

    render(<YouTubeSection />);

    await waitFor(() => {
      expect(screen.getByText("Regarder sur YouTube")).toBeInTheDocument();
    });

    expect(screen.queryByText("EN DIRECT")).not.toBeInTheDocument();
  });

  it("iframe has correct accessibility attributes", async () => {
    server.use(...liveStatusHandlersLive);

    render(<YouTubeSection />);

    await waitFor(() => {
      const iframe = document.querySelector("iframe");
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute("title");
      expect(iframe).toHaveAttribute("allow");
      expect(iframe?.getAttribute("allow")).toContain("autoplay");
    });
  });

  it("section has aria-labelledby pointing to heading", async () => {
    render(<YouTubeSection />);

    await waitFor(() => {
      const section = document.querySelector("section[aria-labelledby]");
      expect(section).toBeInTheDocument();
      expect(section?.getAttribute("aria-labelledby")).toBe("youtube-section-title");
    });
  });
});
