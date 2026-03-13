import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useCalendarApp, ScheduleXCalendar } from "@schedule-x/react";
import {
  createViewDay,
  createViewWeek,
  createViewMonthGrid,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import "temporal-polyfill/global";
import "@schedule-x/theme-default/dist/index.css";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useCalendarActivities,
  useDepartments,
} from "@/hooks/usePublicDashboard";
import type {
  PublicActivityListItem,
  PublicDepartment,
} from "@/types/public";

function getInitialDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(startDate), end: fmt(endDate) };
}

function mapToCalendarEvents(activities: PublicActivityListItem[]) {
  return activities.map((a) => ({
    id: String(a.id),
    title: a.departmentAbbreviation
      ? `[${a.departmentAbbreviation}] ${a.title}`
      : a.title,
    start: Temporal.ZonedDateTime.from(
      `${a.date}T${a.startTime}[America/Toronto]`,
    ),
    end: Temporal.ZonedDateTime.from(
      `${a.date}T${a.endTime}[America/Toronto]`,
    ),
    calendarId: a.departmentAbbreviation ?? "general",
    description: a.departmentName ?? undefined,
    people: a.predicateurName ? [a.predicateurName] : [],
  }));
}

function buildCalendarsFromDepartments(departments: PublicDepartment[]) {
  const calendars: Record<
    string,
    {
      colorName: string;
      lightColors: { main: string; container: string; onContainer: string };
    }
  > = {
    general: {
      colorName: "general",
      lightColors: {
        main: "#94A3B8",
        container: "#F1F5F9",
        onContainer: "#0F172A",
      },
    },
  };

  for (const dept of departments) {
    calendars[dept.abbreviation] = {
      colorName: dept.abbreviation,
      lightColors: {
        main: dept.color,
        container: `${dept.color}20`,
        onContainer: "#0F172A",
      },
    };
  }
  return calendars;
}

function CalendarView({ departments }: { departments: PublicDepartment[] }) {
  const { t, i18n } = useTranslation();
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [eventsService] = useState(() => createEventsServicePlugin());

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
    plugins: [eventsService],
    callbacks: {
      onRangeUpdate(range) {
        setDateRange({
          start: range.start.toString().substring(0, 10),
          end: range.end.toString().substring(0, 10),
        });
      },
    },
  });

  const { data, isError, refetch } = useCalendarActivities(
    dateRange.start,
    dateRange.end,
  );

  useEffect(() => {
    if (data) {
      eventsService.set(mapToCalendarEvents(data));
    }
  }, [data, eventsService]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-bold text-slate-900">
        {t("pages.calendar.title")}
      </h1>

      {isError && (
        <div className="mt-4 flex items-center gap-3">
          <p className="text-sm text-red-600">
            {t("pages.calendar.loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {t("pages.calendar.retry")}
          </button>
        </div>
      )}

      <div
        className="mt-6 h-[600px] sm:h-[700px] lg:h-[800px]"
        role="region"
        aria-label={t("pages.calendar.title")}
      >
        <ScheduleXCalendar calendarApp={calendar} />
      </div>
    </div>
  );
}

export default function PublicCalendarPage() {
  const { t } = useTranslation();
  const {
    data: departments,
    isPending: deptPending,
    isError: deptError,
    refetch: refetchDepts,
  } = useDepartments();

  if (deptPending) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-[600px] w-full rounded-2xl" />
      </div>
    );
  }

  if (deptError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {t("pages.calendar.title")}
        </h1>
        <div className="mt-4 flex items-center gap-3">
          <p className="text-sm text-red-600">
            {t("pages.calendar.loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetchDepts()}
            className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
          >
            {t("pages.calendar.retry")}
          </button>
        </div>
      </div>
    );
  }

  return <CalendarView departments={departments ?? []} />;
}
