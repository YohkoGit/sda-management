import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import CalendarView from "@/components/calendar/CalendarView";
import DepartmentFilter from "@/components/calendar/DepartmentFilter";
import { getInitialDateRange, type CalendarViewType } from "@/components/calendar/calendar-utils";
import { useDepartments } from "@/hooks/usePublicDashboard";
import { useAuthCalendarActivities } from "@/hooks/useAuthCalendarActivities";
import { useAuthYearActivities } from "@/hooks/useAuthYearActivities";

export default function AuthCalendarPage() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [activeView, setActiveView] = useState<CalendarViewType>("month-grid");
  const [yearForFetch, setYearForFetch] = useState(() => new Date().getFullYear());
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState<number[]>([]);

  const filterIds = selectedDepartmentIds.length > 0 ? selectedDepartmentIds : undefined;

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
  } = useAuthCalendarActivities(dateRange.start, dateRange.end, filterIds);

  const {
    data: yearActivities,
    isPending: yearPending,
    isError: yearError,
    refetch: refetchYear,
  } = useAuthYearActivities(yearForFetch, activeView === "year", filterIds);

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

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
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
        filterSlot={
          <DepartmentFilter
            departments={departments ?? []}
            selectedIds={selectedDepartmentIds}
            onChange={setSelectedDepartmentIds}
          />
        }
      />
    </div>
  );
}
