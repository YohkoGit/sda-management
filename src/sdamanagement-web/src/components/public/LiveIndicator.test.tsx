import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import LiveIndicator from "./LiveIndicator";

describe("LiveIndicator", () => {
  it("renders with .live class (pulsing dot is rendered via CSS ::before)", () => {
    render(<LiveIndicator />);
    const indicator = document.querySelector(".live");
    expect(indicator).toBeInTheDocument();
  });

  it("renders 'EN DIRECT' text", () => {
    render(<LiveIndicator />);
    expect(screen.getByText("EN DIRECT")).toBeInTheDocument();
  });
});
