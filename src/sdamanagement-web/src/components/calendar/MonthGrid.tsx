import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { deptSwatchColor } from "@/lib/dept-color";
import type { PublicActivityListItem } from "@/types/public";

interface MonthGridProps {
  /** First day of the month being displayed (use day=1). */
  viewDate: Date;
  activities: PublicActivityListItem[];
  onDayClick: (isoDate: string) => void;
  onNavigate: (next: Date) => void;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

interface CellData {
  date: Date;
  inMonth: boolean;
  events: PublicActivityListItem[];
}

/**
 * Publication-style 7-col Sunday-first month grid.
 *
 * Visual spec from design_handoff_sdac_redesign:
 *  - Sunday column header in gilt-2, others ink-3
 *  - Day cells minimum 132px tall with hairline borders
 *  - Saturday column: parchment-2 wash
 *  - Sainte-Cène or featured day: full-cell gilt-wash + gilt eyebrow "✣ Sainte-cène"
 *  - Today: numerator bumped to 24px + weight 500 + "Aujourd'hui" gilt eyebrow
 *  - Event chips: 4px dept swatch dot + 11px title (truncated)
 */
export default function MonthGrid({
  viewDate,
  activities,
  onDayClick,
  onNavigate,
}: MonthGridProps) {
  const { t, i18n } = useTranslation();
  const today = new Date();

  const cells = useMemo<CellData[]>(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    const firstWeekday = firstOfMonth.getDay(); // 0 = Sunday

    const result: CellData[] = [];
    const indexByDate = new Map<string, PublicActivityListItem[]>();
    for (const a of activities) {
      const list = indexByDate.get(a.date) ?? [];
      list.push(a);
      indexByDate.set(a.date, list);
    }

    // Leading cells from previous month
    for (let i = firstWeekday - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      result.push({ date: d, inMonth: false, events: [] });
    }
    // In-month cells
    for (let d = 1; d <= lastOfMonth.getDate(); d++) {
      const date = new Date(year, month, d);
      const iso = toIso(date);
      result.push({
        date,
        inMonth: true,
        events: indexByDate.get(iso) ?? [],
      });
    }
    // Trailing cells (always 6 rows = 42 cells)
    while (result.length < 42) {
      const last = result[result.length - 1].date;
      const next = new Date(last);
      next.setDate(next.getDate() + 1);
      result.push({ date: next, inMonth: false, events: [] });
    }
    return result;
  }, [viewDate, activities]);

  const weekdays = useMemo(() => {
    // Sunday-first
    const base = new Date(2024, 5, 9); // June 9 2024 is a Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(i18n.language, { weekday: "short" });
    });
  }, [i18n.language]);

  const monthLabel = viewDate.toLocaleDateString(i18n.language, {
    month: "long",
    year: "numeric",
  });

  const goPrev = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() - 1);
    onNavigate(d);
  };
  const goNext = () => {
    const d = new Date(viewDate);
    d.setMonth(d.getMonth() + 1);
    onNavigate(d);
  };
  const goToday = () => onNavigate(new Date(today.getFullYear(), today.getMonth(), 1));

  return (
    <div className="border border-[var(--hairline)] border-t-0 bg-[var(--parchment)]">
      {/* Navigation strip */}
      <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
        <button
          type="button"
          onClick={goToday}
          className="rounded-[var(--radius)] border border-[var(--hairline-2)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)]"
        >
          {t("pages.calendar.today", "Aujourd'hui")}
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={goPrev}
            aria-label={t("pages.calendar.previous", "Précédent")}
            className="rounded-[var(--radius)] p-1.5 text-[var(--ink-2)] transition-colors hover:bg-[var(--parchment-2)] hover:text-[var(--ink)]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-display text-lg capitalize text-[var(--ink)]">
            {monthLabel}
          </span>
          <button
            type="button"
            onClick={goNext}
            aria-label={t("pages.calendar.next", "Suivant")}
            className="rounded-[var(--radius)] p-1.5 text-[var(--ink-2)] transition-colors hover:bg-[var(--parchment-2)] hover:text-[var(--ink)]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {/* Right spacer keeps the month label visually centered */}
        <div aria-hidden className="invisible">
          <span className="font-mono text-[10px]">·</span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-[var(--hairline)]">
        {weekdays.map((w, i) => (
          <div
            key={i}
            className={[
              "px-3 py-3 font-mono text-[10px] uppercase tracking-[0.18em] capitalize",
              i > 0 ? "border-l border-[var(--hairline)]" : "",
              i === 0 ? "text-[var(--gilt-2)]" : "text-[var(--ink-3)]",
            ].join(" ")}
          >
            {w}.
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {cells.map((cell, idx) => {
          const row = Math.floor(idx / 7);
          const col = idx % 7;
          const isLastRow = row === Math.floor((cells.length - 1) / 7);
          const isSaturday = col === 6;
          const isToday = isSameDay(cell.date, today);
          const isFeatured =
            cell.inMonth &&
            cell.events.some((e) => e.specialType === "sainte-cene");
          const featuredEvent = cell.events.find(
            (e) => e.specialType === "sainte-cene",
          );
          const iso = toIso(cell.date);

          let bg = "transparent";
          if (isFeatured) bg = "var(--gilt-wash)";
          else if (isSaturday && cell.inMonth) bg = "var(--parchment-2)";

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onDayClick(iso)}
              disabled={!cell.inMonth}
              className={[
                "group flex min-h-[132px] flex-col gap-2 p-3 text-left transition-colors",
                col > 0 ? "border-l border-[var(--hairline)]" : "",
                !isLastRow ? "border-b border-[var(--hairline)]" : "",
                cell.inMonth ? "hover:bg-[var(--parchment-3)]" : "opacity-35",
                "cursor-pointer disabled:cursor-default",
              ].join(" ")}
              style={{ background: bg }}
              aria-label={cell.date.toLocaleDateString(i18n.language, {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            >
              <div className="flex items-baseline justify-between">
                <span
                  className={[
                    "numerator text-[var(--ink)]",
                    isToday ? "text-2xl font-medium" : "text-xl font-light",
                  ].join(" ")}
                >
                  {cell.date.getDate()}
                </span>
                {isToday && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--gilt-2)]">
                    {t("pages.calendar.today", "Aujourd'hui")}
                  </span>
                )}
                {isFeatured && !isToday && featuredEvent?.specialType && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--gilt-2)]">
                    ✣ {t(`pages.home.specialType.${featuredEvent.specialType}`)}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1">
                {cell.events.slice(0, 4).map((ev) => {
                  const swatch = deptSwatchColor({
                    abbreviation: ev.departmentAbbreviation ?? undefined,
                    color: ev.departmentColor ?? undefined,
                  });
                  const featured = ev.specialType === "sainte-cene";
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center gap-1.5 text-[11px] leading-tight"
                    >
                      <span
                        aria-hidden
                        className="h-1 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: swatch }}
                      />
                      <span
                        className={[
                          "truncate font-sans",
                          featured
                            ? "font-semibold text-[var(--ink)]"
                            : "text-[var(--ink-2)]",
                        ].join(" ")}
                        title={ev.title}
                      >
                        {ev.title}
                      </span>
                    </div>
                  );
                })}
                {cell.events.length > 4 && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    +{cell.events.length - 4}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer legend */}
      <div className="flex items-center gap-5 border-t border-[var(--hairline)] px-4 py-3">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--gilt)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
            {t("pages.calendar.legendFeatured", "Sabbat / Sainte-cène")}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="h-3 w-3 bg-[var(--parchment-2)] ring-1 ring-[var(--hairline)]" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
            {t("pages.calendar.legendSaturday", "Samedi")}
          </span>
        </span>
      </div>
    </div>
  );
}
