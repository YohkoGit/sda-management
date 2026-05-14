import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow } from "@/components/ui/typography";
import CalendarView from "@/components/calendar/CalendarView";
import DayDetailDialog from "@/components/calendar/DayDetailDialog";
import { getInitialDateRange, type CalendarViewType } from "@/components/calendar/calendar-utils";
import {
  useCalendarActivities,
  useDepartments,
} from "@/hooks/usePublicDashboard";
import { useYearActivities } from "@/hooks/useYearActivities";

export default function PublicCalendarPage() {
  const { t, i18n } = useTranslation();
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [activeView, setActiveView] = useState<CalendarViewType>("month-grid");
  const [yearForFetch, setYearForFetch] = useState(() => new Date().getFullYear());
  const [dayDialogDate, setDayDialogDate] = useState<string | null>(null);
  const [navigateTo, setNavigateTo] = useState<{ view: CalendarViewType; date: string } | null>(null);

  const dayDialogOpen = dayDialogDate !== null;

  const {
    data: departments,
    isPending: deptPending,
    isError: deptError,
    refetch: refetchDepts,
  } = useDepartments();

  const {
    data: activities,
    isError: calError,
    refetch: refetchCal,
  } = useCalendarActivities(dateRange.start, dateRange.end);

  const {
    data: yearActivities,
    isPending: yearPending,
    isError: yearError,
    refetch: refetchYear,
  } = useYearActivities(yearForFetch, activeView === "year");

  const handleRangeChange = useCallback((start: string, end: string) => {
    setDateRange({ start, end });
  }, []);

  const handleViewChange = useCallback((view: CalendarViewType) => {
    setActiveView(view);
    if (view === "year") {
      setYearForFetch(new Date().getFullYear());
    }
  }, []);

  const handleYearChange = useCallback((year: number) => {
    setYearForFetch(year);
  }, []);

  const handleDayAction = useCallback((date: string) => {
    setDayDialogDate(date);
  }, []);

  const handleNavigateToDay = useCallback((date: string) => {
    setDayDialogDate(null);
    setNavigateTo({ view: "day", date });
  }, []);

  if (deptPending) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <Skeleton className="h-10 w-64 bg-[var(--parchment-2)]" />
        <Skeleton className="mt-8 h-[600px] w-full bg-[var(--parchment-2)]" />
      </div>
    );
  }

  if (deptError) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
        <Eyebrow gilt>{t("nav.public.calendar")}</Eyebrow>
        <h1 className="mt-3 font-display text-4xl leading-tight text-[var(--ink)]">
          {t("pages.calendar.title")}
          <span className="text-[var(--gilt-2)]">.</span>
        </h1>
        <div className="mt-6 flex items-center gap-3">
          <p className="text-sm text-[var(--rose)]">
            {t("pages.calendar.loadError")}
          </p>
          <button
            type="button"
            onClick={() => refetchDepts()}
            className="rounded-[var(--radius)] border border-[var(--hairline-2)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] transition-colors hover:border-[var(--ink)]"
          >
            {t("pages.calendar.retry")}
          </button>
        </div>
      </div>
    );
  }

  // dateRange.start is the leading-week start (may fall in the prev month).
  // Offset by ~12 days to land safely inside the displayed month.
  const labelDate = new Date(dateRange.start + "T00:00:00");
  labelDate.setDate(labelDate.getDate() + 12);
  const monthLabel = labelDate.toLocaleDateString(i18n.language, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 lg:px-8 lg:py-16">
      <header className="mb-8">
        <Eyebrow gilt>{t("pages.calendar.kicker", "Calendrier liturgique")}</Eyebrow>
        <h1 className="mt-3 font-display text-4xl leading-tight text-[var(--ink)] lg:text-5xl">
          <span className="capitalize">{monthLabel}</span>
          <span className="text-[var(--gilt-2)]">.</span>
        </h1>
      </header>

      <CalendarView
        activities={activities ?? []}
        yearActivities={yearActivities}
        departments={departments ?? []}
        isError={calError}
        onRetry={() => refetchCal()}
        onRangeChange={handleRangeChange}
        onViewChange={handleViewChange}
        onYearChange={handleYearChange}
        yearIsPending={activeView === "year" && yearPending}
        yearIsError={activeView === "year" && yearError}
        onYearRetry={() => refetchYear()}
        onDayAction={handleDayAction}
        navigateTo={navigateTo}
        onNavigateComplete={() => setNavigateTo(null)}
        hidePageTitle
      />

      <DayDetailDialog
        open={dayDialogOpen}
        onOpenChange={(open) => { if (!open) setDayDialogDate(null); }}
        date={dayDialogDate ?? ""}
        activities={activities ?? []}
        user={null}
        onCreated={() => {}}
        onNavigateToDay={handleNavigateToDay}
      />
    </div>
  );
}
