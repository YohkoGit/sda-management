import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, futureDate } from "@/test-utils";
import ActivityCard from "./ActivityCard";
import type { PublicActivityListItem } from "@/types/public";

const baseActivity: PublicActivityListItem = {
  id: 1,
  title: "Culte du Sabbat",
  date: futureDate(4),
  startTime: "09:30:00",
  endTime: "12:00:00",
  departmentName: "Culte",
  departmentAbbreviation: "CU",
  departmentColor: "#F43F5E",
  predicateurName: "Jean Dupont",
  predicateurAvatarUrl: null,
  specialType: null,
};

describe("ActivityCard", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders activity title, date, and time range", () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));

    render(<ActivityCard activity={{ ...baseActivity, date: "2026-03-14" }} />);

    expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    expect(screen.getByText(/Ce Sabbat/)).toBeInTheDocument();
    expect(screen.getByText(/9h30/)).toBeInTheDocument();
    expect(screen.getByText(/12h00/)).toBeInTheDocument();
  });

  it("renders department badge with abbreviation", () => {
    render(<ActivityCard activity={baseActivity} />);

    expect(screen.getByText("CU")).toBeInTheDocument();
  });

  it("renders prédicateur name when available", () => {
    render(<ActivityCard activity={baseActivity} />);

    expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
  });

  it("does NOT render prédicateur section when predicateurName is null", () => {
    render(
      <ActivityCard
        activity={{ ...baseActivity, predicateurName: null, predicateurAvatarUrl: null }}
      />
    );

    expect(screen.queryByText("Jean Dupont")).not.toBeInTheDocument();
  });

  it("renders special type badge when specialType is non-null", () => {
    render(
      <ActivityCard activity={{ ...baseActivity, specialType: "sainte-cene" }} />
    );

    expect(screen.getByText("Sainte-Cène")).toBeInTheDocument();
  });

  it("renders department color as left border", () => {
    render(<ActivityCard activity={baseActivity} />);

    const article = screen.getByRole("article");
    expect(article).toHaveStyle({ borderLeftColor: "#F43F5E" });
  });

  it("has accessible article element with aria-label", () => {
    render(<ActivityCard activity={baseActivity} />);

    const article = screen.getByRole("article");
    expect(article).toHaveAttribute("aria-label");
    expect(article.getAttribute("aria-label")).toContain("Culte du Sabbat");
  });
});
