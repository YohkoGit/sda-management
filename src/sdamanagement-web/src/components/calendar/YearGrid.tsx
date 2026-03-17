import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  format,
  eachMonthOfInterval,
} from "date-fns";
import { fr, enUS, type Locale } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PublicActivityListItem, PublicDepartment } from "@/types/public";

interface YearGridProps {
  year: number;
  activities: PublicActivityListItem[];
  departments: PublicDepartment[];
  onDayClick: (date: Date) => void;
  onMonthClick: (date: Date) => void;
  onYearChange?: (year: number) => void;
}

export default function YearGrid({
  year,
  activities,
  departments,
  onDayClick,
  onMonthClick,
  onYearChange,
}: YearGridProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "fr" ? fr : enUS;
  const today = useMemo(() => new Date(), []);

  const deptColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) {
      map.set(d.abbreviation, d.color);
    }
    return map;
  }, [departments]);

  const activityByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const a of activities) {
      const existing = map.get(a.date);
      if (existing) {
        if (a.departmentAbbreviation) existing.add(a.departmentAbbreviation);
      } else {
        const set = new Set<string>();
        if (a.departmentAbbreviation) set.add(a.departmentAbbreviation);
        map.set(a.date, set);
      }
    }
    return map;
  }, [activities]);

  const months = useMemo(() => {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return eachMonthOfInterval({ start, end });
  }, [year]);

  const dayHeaders = useMemo(() => {
    const sunday = startOfWeek(new Date(year, 0, 1), { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return format(d, "EEEEE", { locale });
    });
  }, [year, locale]);

  const handlePrevYear = () => onYearChange?.(year - 1);
  const handleNextYear = () => onYearChange?.(year + 1);

  return (
    <div role="grid" aria-label={`${t("pages.calendar.views.year")} ${year}`}>
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          type="button"
          onClick={handlePrevYear}
          className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
          aria-label={String(year - 1)}
        >
          <ChevronLeft className="h-5 w-5 text-slate-600" />
        </button>
        <span className="text-xl font-bold text-slate-900">{year}</span>
        <button
          type="button"
          onClick={handleNextYear}
          className="p-1.5 rounded-md hover:bg-slate-100 transition-colors"
          aria-label={String(year + 1)}
        >
          <ChevronRight className="h-5 w-5 text-slate-600" />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {months.map((month) => (
          <MiniMonth
            key={month.getTime()}
            month={month}
            today={today}
            dayHeaders={dayHeaders}
            activityByDate={activityByDate}
            deptColorMap={deptColorMap}
            locale={locale}
            onDayClick={onDayClick}
            onMonthClick={onMonthClick}
          />
        ))}
      </div>
    </div>
  );
}

interface MiniMonthProps {
  month: Date;
  today: Date;
  dayHeaders: string[];
  activityByDate: Map<string, Set<string>>;
  deptColorMap: Map<string, string>;
  locale: Locale;
  onDayClick: (date: Date) => void;
  onMonthClick: (date: Date) => void;
}

function MiniMonth({
  month,
  today,
  dayHeaders,
  activityByDate,
  deptColorMap,
  locale,
  onDayClick,
  onMonthClick,
}: MiniMonthProps) {
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [month]);

  return (
    <div className="rounded-xl border border-slate-200 p-3 bg-white">
      <button
        type="button"
        onClick={() => onMonthClick(month)}
        className="w-full text-left text-sm font-semibold text-slate-800 mb-2 hover:text-indigo-600 transition-colors capitalize"
      >
        {format(month, "MMMM", { locale })}
      </button>

      <div className="grid grid-cols-7 gap-px text-center">
        {dayHeaders.map((dh, i) => (
          <div
            key={i}
            className="text-[10px] font-medium text-slate-400 pb-1"
          >
            {dh}
          </div>
        ))}

        {weeks.flat().map((day) => {
          const inMonth = isSameMonth(day, month);
          const isToday = isSameDay(day, today);
          const dateKey = format(day, "yyyy-MM-dd");
          const depts = activityByDate.get(dateKey);

          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => inMonth && onDayClick(day)}
              disabled={!inMonth}
              className={`relative flex flex-col items-center justify-start py-0.5 text-[11px] rounded transition-colors ${
                !inMonth
                  ? "text-slate-200 cursor-default"
                  : isToday
                    ? "bg-indigo-600 text-white font-bold"
                    : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {day.getDate()}
              {depts && depts.size > 0 && inMonth && (
                <div className="flex gap-px mt-px">
                  {Array.from(depts)
                    .slice(0, 3)
                    .map((abbr) => (
                      <span
                        key={abbr}
                        className="block h-1 w-1 rounded-full"
                        style={{
                          backgroundColor:
                            deptColorMap.get(abbr) ?? "#94A3B8",
                        }}
                      />
                    ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
