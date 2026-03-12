import { describe, it, expect } from "vitest";
import { render, screen } from "@/test-utils";
import LiveIndicator from "./LiveIndicator";

describe("LiveIndicator", () => {
  it("renders pulsing dot with animate-pulse class", () => {
    render(<LiveIndicator />);
    const dot = document.querySelector(".animate-pulse");
    expect(dot).toBeInTheDocument();
  });

  it("renders 'EN DIRECT' text", () => {
    render(<LiveIndicator />);
    expect(screen.getByText("EN DIRECT")).toBeInTheDocument();
  });
});
