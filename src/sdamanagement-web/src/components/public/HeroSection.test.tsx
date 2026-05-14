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

    // With default activity present, heading shows the activity title ("Culte du Sabbat"),
    // not the church name. Church identity is now reflected via welcome message and the
    // first segment of the address (rendered as the "Lieu" meta item).
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Culte du\s*Sabbat/ })
      ).toBeInTheDocument();
    });

    // Welcome message from churchInfo is rendered
    expect(screen.getByText("Bienvenue!")).toBeInTheDocument();

    // Only the first segment of the address is rendered ("Lieu" meta item)
    expect(screen.getByText("1234 Rue de l'Eglise")).toBeInTheDocument();
    expect(
      screen.queryByText("1234 Rue de l'Eglise, Saint-Hubert, QC")
    ).not.toBeInTheDocument();
  });

  it("renders prédicateur name, department badge, and time when data loaded", async () => {
    render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    });

    // Title is wrapped in FancyTitle (splits text), use heading role with regex
    expect(
      screen.getByRole("heading", { name: /Culte du\s*Sabbat/ })
    ).toBeInTheDocument();
    expect(screen.getByText("CU")).toBeInTheDocument();
    // Verify time formatting (09:30:00 → 9h30, 12:00:00 → 12h00) — joined by " – "
    expect(screen.getByText(/9h30\s*–\s*12h00/)).toBeInTheDocument();
  });

  it("renders 'Ce Sabbat' when activity is this Saturday", async () => {
    // Set system date to Tuesday 2026-03-10 — mock date is Saturday 2026-03-14
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 2, 10, 12, 0, 0));

    render(<HeroSection />);

    // "Ce Sabbat" appears in both the eyebrow and the meta "Date" item when the
    // activity is this Saturday (formatActivityDate also returns "Ce Sabbat").
    await waitFor(() => {
      const matches = screen.getAllByText("Ce Sabbat");
      expect(matches.length).toBeGreaterThan(0);
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
      expect(
        screen.getByRole("heading", { name: /Culte du\s*Sabbat/ })
      ).toBeInTheDocument();
    });

    expect(screen.queryByText("Jean Dupont")).not.toBeInTheDocument();
    // Without predicateur, the department badge is not rendered (it lives in
    // the predicateur block) — verify the heading is the activity title only.
    expect(screen.queryByText("CU")).not.toBeInTheDocument();
  });

  it("renders empty state message when no activities (204)", async () => {
    server.use(...publicHandlersEmpty);

    render(<HeroSection />);

    // No-activity state renders the message in both columns (left meta and right panel)
    await waitFor(() => {
      const matches = screen.getAllByText(
        "Aucune activité à venir — revenez bientôt!"
      );
      expect(matches.length).toBeGreaterThan(0);
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

    // Church name still drives the title fallback (no activity → churchName as title).
    // FancyTitle splits on the last space, so the computed name concatenates the
    // last word without a separating space ("de" + "Saint-Hubert" → "deSaint-Hubert").
    expect(
      screen.getByRole("heading", { name: /Eglise Adventiste du 7e Jour de\s*Saint-Hubert/ })
    ).toBeInTheDocument();
  });

  it("renders all text in French (default locale)", async () => {
    render(<HeroSection />);

    await waitFor(() => {
      expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
    });

    // French labels: eyebrow "Ce Sabbat" / meta labels in French
    expect(screen.getByText("Ce Sabbat")).toBeInTheDocument();
    expect(screen.getByText("Lieu")).toBeInTheDocument();
    expect(screen.getByText("Horaire")).toBeInTheDocument();
  });
});
