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
  it("renders 'Suivez le culte en direct' heading when live", async () => {
    // Redesign: section only renders when isLive OR the URL has a video ID.
    // Default config is a channel URL — switch to live to show the heading.
    server.use(...liveStatusHandlersLive);

    render(<YouTubeSection />);

    await waitFor(() => {
      expect(screen.getByText("Suivez le culte en direct")).toBeInTheDocument();
    });
  });

  it("returns null when channel URL only (no video ID, not live)", async () => {
    // Redesign behavior: section is hidden entirely when there's no video ID
    // and the channel is not live. The link card is no longer rendered here.
    render(<YouTubeSection />);

    // Allow live-status query to settle before asserting null
    await waitFor(() => {
      expect(
        document.querySelector('section[aria-labelledby="youtube-section-title"]')
      ).not.toBeInTheDocument();
    });

    expect(screen.queryByText("Suivez le culte en direct")).not.toBeInTheDocument();
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

  it("does NOT render 'EN DIRECT' when API isLive is false (and video URL is configured)", async () => {
    // Use a video URL so the section renders even when not live
    server.use(...configHandlersWithVideoUrl);

    render(<YouTubeSection />);

    await waitFor(() => {
      // Static embed mode: heading is "Regarder sur YouTube" (h2)
      expect(
        screen.getByRole("heading", { name: /Regarder sur YouTube/ })
      ).toBeInTheDocument();
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

  it("falls back to null when live status API errors (channel URL only)", async () => {
    // Redesign: when live status errors and there's no video ID, the section is
    // hidden entirely instead of falling back to a link card.
    server.use(...liveStatusHandlersError);

    render(<YouTubeSection />);

    await waitFor(() => {
      expect(
        document.querySelector('section[aria-labelledby="youtube-section-title"]')
      ).not.toBeInTheDocument();
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

  it("section has aria-labelledby pointing to heading (when rendered)", async () => {
    // Use live status so the section actually renders (default channel URL +
    // not-live produces null in redesign).
    server.use(...liveStatusHandlersLive);

    render(<YouTubeSection />);

    await waitFor(() => {
      const section = document.querySelector(
        'section[aria-labelledby="youtube-section-title"]'
      );
      expect(section).toBeInTheDocument();
    });
  });
});
