import { describe, it, expect } from "vitest";
import { parseYouTubeUrl } from "./youtube";

describe("parseYouTubeUrl", () => {
  it("extracts video ID from youtube.com/watch?v=ID format", () => {
    const result = parseYouTubeUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("extracts video ID from youtu.be/ID short format", () => {
    const result = parseYouTubeUrl("https://youtu.be/dQw4w9WgXcQ");
    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("extracts video ID from youtube.com/embed/ID format", () => {
    const result = parseYouTubeUrl("https://www.youtube.com/embed/dQw4w9WgXcQ");
    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("extracts video ID from youtube.com/live/ID format", () => {
    const result = parseYouTubeUrl("https://www.youtube.com/live/dQw4w9WgXcQ");
    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("extracts video ID when v= is not the first query parameter", () => {
    const result = parseYouTubeUrl(
      "https://www.youtube.com/watch?si=abc123&v=dQw4w9WgXcQ"
    );
    expect(result.videoId).toBe("dQw4w9WgXcQ");
    expect(result.embedUrl).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("returns null videoId for channel URLs (youtube.com/@handle)", () => {
    const result = parseYouTubeUrl("https://www.youtube.com/@sdac-st-hubert");
    expect(result.videoId).toBeNull();
    expect(result.embedUrl).toBeNull();
    expect(result.channelUrl).toBe("https://www.youtube.com/@sdac-st-hubert");
  });

  it("returns null videoId for empty/invalid URLs", () => {
    const result = parseYouTubeUrl("");
    expect(result.videoId).toBeNull();
    expect(result.embedUrl).toBeNull();
  });

  it("preserves original URL as channelUrl", () => {
    const url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    const result = parseYouTubeUrl(url);
    expect(result.channelUrl).toBe(url);
  });
});
