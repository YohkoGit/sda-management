import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";
import { Eyebrow } from "@/components/ui/typography";
import ViewSwitcher from "./ViewSwitcher";
import YearGrid from "./YearGrid";
import MonthGrid from "./MonthGrid";
import {
  mapToCalendarEvents,
  buildCalendarsFromDepartments,
  type CalendarViewType,
} from "./calendar-utils";
import type {
  PublicActivityListItem,
  PublicDepartment,
} from "@/types/public";

interface CalendarViewProps {
  activities: PublicActivityListItem[];
  yearActivities: PublicActivityListItem[] | undefined;
  departments: PublicDepartment[];
  isError: boolean;
  onRetry: () => void;
  onRangeChange: (start: string, end: string) => void;
  onViewChange: (view: CalendarViewType) => void;
  onYearChange?: (year: number) => void;
  yearIsPending?: boolean;
  yearIsError?: boolean;
  onYearRetry?: () => void;
  /** Optional slot rendered between the heading row and the calendar body. */
  filterSlot?: React.ReactNode;
  /** Called when user clicks/taps a day. Passes ISO date string "YYYY-MM-DD". */
  onDayAction?: (date: string) => void;
  /** When set, CalendarView navigates to the specified view and date programmatically. */
  navigateTo?: { view: CalendarViewType; date: string } | null;
  /** Called after programmatic navigation completes so parent can clear navigateTo. */
  onNavigateComplete?: () => void;
  /** When true, suppresses the built-in "Calendrier" h1 so the parent page can render its own. */
  hidePageTitle?: boolean;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toIso(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export default function CalendarView({
  activities,
  yearActivities,
  departments,
  isError,
  onRetry,
  onRangeChange,
  onViewChange,
  onYearChange,
  yearIsPending,
  yearIsError,
  onYearRetry,
  filterSlot,
  onDayAction,
  navigateTo,
  onNavigateComplete,
  hidePageTitle = false,
}: CalendarViewProps) {
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState<CalendarViewType>("month-grid");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [eventsService] = useState(() => createEventsServicePlugin());
  const [calendarControls] = useState(() => createCalendarControlsPlugin());

  const calendar = useCalendarApp({
    views: [createViewWeek(), createViewDay()],
    defaultView: createViewWeek().name,
    firstDayOfWeek: 7,
    timezone: "America/Toronto",
    locale: i18n.language === "fr" ? "fr-FR" : "en-US",
    isResponsive: true,
    dayBoundaries: { start: "06:00", end: "22:00" },
    weekOptions: {
      gridHeight: 1800,
      nDays: 7,
      eventWidth: 95,
    },
    calendars: buildCalendarsFromDepartments(departments),
    events: [],
    plugins: [eventsService, calendarControls],
    callbacks: {
      onRangeUpdate(range) {
        onRangeChange(
          range.start.toString().substring(0, 10),
          range.end.toString().substring(0, 10),
        );
      },
      onClickDate(date: Temporal.PlainDate) {
        const isoDate = `${date.year}-${pad2(date.month)}-${pad2(date.day)}`;
        if (onDayAction) {
          onDayAction(isoDate);
        } else {
          setActiveView("day");
          calendarControls.setView("day");
          calendarControls.setDate(date);
          setSelectedDate(new Date(date.year, date.month - 1, date.day));
          onViewChange("day");
        }
      },
      onClickDateTime(dateTime: Temporal.ZonedDateTime) {
        if (onDayAction) {
          const isoDate = dateTime.toPlainDate().toString();
          onDayAction(isoDate);
        }
      },
    },
  });

  // Sync events into Schedule-X when in day/week view
  useEffect(() => {
    if (activities && (activeView === "day" || activeView === "week")) {
      eventsService.set(mapToCalendarEvents(activities));
    }
  }, [activities, eventsService, activeView]);

  // Push range change for the custom MonthGrid view
  useEffect(() => {
    if (activeView === "month-grid") {
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      // Include leading/trailing weeks so events from prev/next month are loaded
      const firstWeekday = new Date(year, month, 1).getDay();
      const lastDate = new Date(year, month + 1, 0).getDate();
      const start = new Date(year, month, 1 - firstWeekday);
      const end = new Date(year, month, lastDate + (6 - new Date(year, month, lastDate).getDay()));
      onRangeChange(toIso(start), toIso(end));
    }
  }, [activeView, selectedDate, onRangeChange]);

  useEffect(() => {
    if (navigateTo) {
      const { view, date } = navigateTo;
      setActiveView(view);
      const parsed = new Date(date + "T00:00:00");
      setSelectedDate(parsed);
      if (view === "day" || view === "week") {
        calendarControls.setView(view);
        calendarControls.setDate(Temporal.PlainDate.from(date));
      }
      onViewChange(view);
      onNavigateComplete?.();
    }
  }, [navigateTo, calendarControls, onViewChange, onNavigateComplete]);

  const handleViewChange = useCallback(
    (view: CalendarViewType) => {
      setActiveView(view);
      onViewChange(view);

      if (view === "day" || view === "week") {
        calendarControls.setView(view);
      }
    },
    [calendarControls, onViewChange],
  );

  const handleMonthDayClick = useCallback(
    (iso: string) => {
      if (onDayAction) {
        onDayAction(iso);
      } else {
        const parsed = new Date(iso + "T00:00:00");
        setSelectedDate(parsed);
        setActiveView("day");
        calendarControls.setView("day");
        calendarControls.setDate(Temporal.PlainDate.from(iso));
        onViewChange("day");
      }
    },
    [calendarControls, onViewChange, onDayAction],
  );

  const handleMonthNavigate = useCallback((next: Date) => {
    setSelectedDate(new Date(next.getFullYear(), next.getMonth(), 1));
  }, []);

  const handleYearDayClick = useCallback(
    (date: Date) => {
      const isoDate = toIso(date);
      if (onDayAction) {
        onDayAction(isoDate);
      } else {
        setSelectedDate(date);
        setActiveView("day");
        const plainDate = Temporal.PlainDate.from(isoDate);
        calendarControls.setView("day");
        calendarControls.setDate(plainDate);
        onViewChange("day");
      }
    },
    [calendarControls, onViewChange, onDayAction],
  );

  const handleYearMonthClick = useCallback(
    (date: Date) => {
      setSelectedDate(new Date(date.getFullYear(), date.getMonth(), 1));
      setActiveView("month-grid");
      onViewChange("month-grid");
    },
    [onViewChange],
  );

  const handleYearNavigate = useCallback(
    (year: number) => {
      setSelectedDate(new Date(year, 0, 1));
      onYearChange?.(year);
    },
    [onYearChange],
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        {!hidePageTitle && (
          <h1 className="font-display text-3xl leading-tight text-[var(--ink)] lg:text-4xl">
            {t("pages.calendar.title")}
            <span className="text-[var(--gilt-2)]">.</span>
          </h1>
        )}
        <div className={hidePageTitle ? "ml-auto" : ""}>
          <ViewSwitcher activeView={activeView} onViewChange={handleViewChange} />
        </div>
      </div>

      {filterSlot}

      {isError && (
        <div className="mt-4 flex items-center gap-3">
          <p className="text-sm text-[var(--rose)]">
            {t("pages.calendar.loadError")}
          </p>
          <Eyebrow
            asChild
            className="rounded-[var(--radius)] border border-[var(--hairline-2)] px-3 py-1.5 text-[var(--ink-2)] transition-colors hover:border-[var(--ink)]"
          >
            <button type="button" onClick={onRetry}>
              {t("pages.calendar.retry")}
            </button>
          </Eyebrow>
        </div>
      )}

      {activeView === "year" ? (
        <div className="mt-6" role="region" aria-label={t("pages.calendar.title")}>
          {yearIsError && (
            <div className="mb-4 flex items-center gap-3">
              <p className="text-sm text-[var(--rose)]">
                {t("pages.calendar.loadError")}
              </p>
              {onYearRetry && (
                <Eyebrow
                  asChild
                  className="rounded-[var(--radius)] border border-[var(--hairline-2)] px-3 py-1.5 text-[var(--ink-2)] transition-colors hover:border-[var(--ink)]"
                >
                  <button type="button" onClick={onYearRetry}>
                    {t("pages.calendar.retry")}
                  </button>
                </Eyebrow>
              )}
            </div>
          )}
          {yearIsPending && (
            <div className="mb-4 flex items-center gap-2 text-sm text-[var(--ink-3)]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--hairline-2)] border-t-[var(--gilt)]" />
              {t("layout.loading")}
            </div>
          )}
          <YearGrid
            year={selectedDate.getFullYear()}
            activities={yearActivities ?? []}
            departments={departments}
            onDayClick={handleYearDayClick}
            onMonthClick={handleYearMonthClick}
            onYearChange={handleYearNavigate}
          />
        </div>
      ) : activeView === "month-grid" ? (
        <div className="mt-6" role="region" aria-label={t("pages.calendar.title")}>
          <MonthGrid
            viewDate={selectedDate}
            activities={activities}
            onDayClick={handleMonthDayClick}
            onNavigate={handleMonthNavigate}
          />
        </div>
      ) : (
        <div
          className="mt-6 h-[600px] sm:h-[700px] lg:h-[800px]"
          role="region"
          aria-label={t("pages.calendar.title")}
        >
          <ScheduleXCalendar calendarApp={calendar} />
        </div>
      )}
    </div>
  );
}
