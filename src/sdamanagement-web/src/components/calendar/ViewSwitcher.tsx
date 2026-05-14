import { useTranslation } from "react-i18next";
import type { CalendarViewType } from "./calendar-utils";

const VIEW_OPTIONS: CalendarViewType[] = ["day", "week", "month-grid", "year"];

const VIEW_KEYS: Record<CalendarViewType, string> = {
  day: "pages.calendar.views.day",
  week: "pages.calendar.views.week",
  "month-grid": "pages.calendar.views.month",
  year: "pages.calendar.views.year",
};

const VIEW_ABBR_KEYS: Record<CalendarViewType, string> = {
  day: "pages.calendar.views.dayAbbr",
  week: "pages.calendar.views.weekAbbr",
  "month-grid": "pages.calendar.views.monthAbbr",
  year: "pages.calendar.views.yearAbbr",
};

interface ViewSwitcherProps {
  activeView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
}

export default function ViewSwitcher({
  activeView,
  onViewChange,
}: ViewSwitcherProps) {
  const { t } = useTranslation();

  return (
    <div
      role="tablist"
      aria-label={t("pages.calendar.views.label")}
      className="inline-flex divide-x divide-[var(--hairline-2)] overflow-hidden rounded-[var(--radius)] border border-[var(--hairline-2)] bg-[var(--parchment-2)]"
    >
      {VIEW_OPTIONS.map((view) => {
        const isActive = view === activeView;
        return (
          <button
            key={view}
            role="tab"
            type="button"
            aria-selected={isActive}
            onClick={() => onViewChange(view)}
            className={[
              "px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
              isActive
                ? "bg-[var(--ink)] text-[var(--parchment)]"
                : "text-[var(--ink-2)] hover:bg-[var(--parchment-3)]",
            ].join(" ")}
          >
            <span className="hidden sm:inline">{t(VIEW_KEYS[view])}</span>
            <span className="sm:hidden">{t(VIEW_ABBR_KEYS[view])}</span>
          </button>
        );
      })}
    </div>
  );
}
