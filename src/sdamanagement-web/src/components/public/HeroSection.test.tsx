import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { render, screen, waitFor, testI18n } from "@/test-utils";
import { authHandlers } from "@/mocks/handlers/auth";
import { configHandlers } from "@/mocks/handlers/config";
import {
  publicHandlers,
  publicHandlersEmpty,
  publicHandlersError,
  publicHandlersNoPredicateur,
} from "@/mocks/handlers/public";
import HeroSection from "./HeroSection";

const server = setupServer(...authHandlers, ...configHandlers, ...publicHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("HeroSection", () => {
  it("renders skeleton loading states while data loads", () => {
    render(<HeroSection />);

    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders church identity from config", async () => {
    render(<HeroSection />);

    await waitFor(() => {
      expect(
        screen.getByText("Eglise Adventiste du 7e Jour de Saint-Hubert")
      ).toBeInTheDocument();
    });

    expect(
      screen.getByText("1234 Rue de l'Eglise, Saint-Hubert, QC")
    ).toBeInTheDocument();
  });

  it("renders prédicateur name, department badge, and time when data loaded", async () => {
    render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    });

    expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    expect(screen.getByText("CU")).toBeInTheDocument();
    // Verify time formatting (09:30:00 → 09h30, 12:00:00 → 12h00)
    expect(screen.getByText(/09h30/)).toBeInTheDocument();
    expect(screen.getByText(/12h00/)).toBeInTheDocument();
  });

  it("renders 'Ce Sabbat' when activity is this Saturday", async () => {
    // Set system date to Tuesday 2026-03-10 — mock date is Saturday 2026-03-14
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));

    render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByText(/Ce Sabbat/)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("renders French formatted date when activity is not this Saturday", async () => {
    // Set system date to Tuesday 2026-03-03 — mock date 2026-03-14 is next week
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 3, 12, 0, 0));

    render(<HeroSection />);

    await waitFor(() => {
      // date-fns fr locale: "samedi 14 mars" (lowercase)
      expect(screen.getByText(/samedi 14 mars/)).toBeInTheDocument();
    });

    vi.useRealTimers();
  });

  it("renders English formatted date when language is switched to EN", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 3, 12, 0, 0));

    // Switch i18n to English before render
    await testI18n.changeLanguage("en");

    render(<HeroSection />);

    await waitFor(() => {
      // date-fns enUS locale: "Saturday 14 March"
      expect(screen.getByText(/Saturday 14 March/)).toBeInTheDocument();
    });

    // Restore to French
    await testI18n.changeLanguage("fr");
    vi.useRealTimers();
  });

  it("renders activity without speaker section when predicateurName is null", async () => {
    server.use(...publicHandlersNoPredicateur);

    render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByText("Culte du Sabbat")).toBeInTheDocument();
    });

    expect(screen.queryByText("Jean Dupont")).not.toBeInTheDocument();
    expect(screen.getByText("CU")).toBeInTheDocument();
  });

  it("renders empty state message when no activities (204)", async () => {
    server.use(...publicHandlersEmpty);

    render(<HeroSection />);

    await waitFor(() => {
      expect(
        screen.getByText("Aucune activité à venir — revenez bientôt!")
      ).toBeInTheDocument();
    });
  });

  it("renders error state message when API fails, church identity still visible", async () => {
    server.use(...publicHandlersError);

    render(<HeroSection />);

    // retry: 1 in hook causes one retry with exponential backoff — need longer timeout
    await waitFor(
      () => {
        expect(
          screen.getByText("Impossible de charger les activités")
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Church identity should still be visible from separate cached query
    expect(
      screen.getByText("Eglise Adventiste du 7e Jour de Saint-Hubert")
    ).toBeInTheDocument();
  });

  it("renders all text in French (default locale)", async () => {
    render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    });

    // Church name is in French
    expect(
      screen.getByText("Eglise Adventiste du 7e Jour de Saint-Hubert")
    ).toBeInTheDocument();
  });
});
