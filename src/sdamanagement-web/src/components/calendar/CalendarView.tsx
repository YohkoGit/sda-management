import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { createCalendarControlsPlugin } from "@schedule-x/calendar-controls";
import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";
import ViewSwitcher from "./ViewSwitcher";
import YearGrid from "./YearGrid";
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
}: CalendarViewProps) {
  const { t, i18n } = useTranslation();
  const [activeView, setActiveView] = useState<CalendarViewType>("month-grid");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [eventsService] = useState(() => createEventsServicePlugin());
  const [calendarControls] = useState(() => createCalendarControlsPlugin());

  const calendar = useCalendarApp({
    views: [createViewMonthGrid(), createViewWeek(), createViewDay()],
    defaultView: createViewMonthGrid().name,
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
    monthGridOptions: {
      nEventsPerDay: 4,
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
        setActiveView("day");
        calendarControls.setView("day");
        calendarControls.setDate(date);
        setSelectedDate(
          new Date(date.year, date.month - 1, date.day),
        );
        onViewChange("day");
      },
    },
  });

  useEffect(() => {
    if (activities && activeView !== "year") {
      eventsService.set(mapToCalendarEvents(activities));
    }
  }, [activities, eventsService, activeView]);

  const handleViewChange = useCallback(
    (view: CalendarViewType) => {
      setActiveView(view);
      onViewChange(view);

      if (view !== "year") {
        calendarControls.setView(view);
      }
    },
    [calendarControls, onViewChange],
  );

  const handleYearDayClick = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      setActiveView("day");
      const plainDate = Temporal.PlainDate.from(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`,
      );
      calendarControls.setView("day");
      calendarControls.setDate(plainDate);
      onViewChange("day");
    },
    [calendarControls, onViewChange],
  );

  const handleYearMonthClick = useCallback(
    (date: Date) => {
      setSelectedDate(date);
      setActiveView("month-grid");
      const plainDate = Temporal.PlainDate.from(
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`,
      );
      calendarControls.setView("month-grid");
      calendarControls.setDate(plainDate);
      onViewChange("month-grid");
    },
    [calendarControls, onViewChange],
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          {t("pages.calendar.title")}
        </h1>
        <ViewSwitcher activeView={activeView} onViewChange={handleViewChange} />
      </div>

      {filterSlot}

      {isError && (
        <div className="mt-4 flex items-center gap-3">
          <p className="text-sm text-red-600">
            {t("pages.calendar.loadError")}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {t("pages.calendar.retry")}
          </button>
        </div>
      )}

      {activeView === "year" ? (
        <div className="mt-6" role="region" aria-label={t("pages.calendar.title")}>
          {yearIsError && (
            <div className="mb-4 flex items-center gap-3">
              <p className="text-sm text-red-600">
                {t("pages.calendar.loadError")}
              </p>
              {onYearRetry && (
                <button
                  type="button"
                  onClick={onYearRetry}
                  className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  {t("pages.calendar.retry")}
                </button>
              )}
            </div>
          )}
          {yearIsPending && (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
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
