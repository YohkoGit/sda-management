import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useProgramSchedules } from "@/hooks/usePublicDashboard";
import { formatTime } from "@/lib/dateFormatting";

export default function ProgramTimesSection() {
  const { t, i18n } = useTranslation();
  const { data, isPending, isError } = useProgramSchedules();

  // Hidden when empty (AC#5) — but NOT when error (show section with error state)
  if (!isPending && !isError && (!data || data.length === 0)) {
    return null;
  }

  const headingId = "program-schedules-heading";

  return (
    <section className="bg-slate-50" aria-labelledby={headingId}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <h2
          id={headingId}
          className="text-2xl font-bold text-slate-900"
        >
          {t("pages.home.programSchedulesTitle")}
        </h2>

        {isPending ? (
          <div className="mt-6 space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <p className="mt-6 text-base text-slate-500">
            {t("pages.home.loadError")}
          </p>
        ) : (
          <div className="mt-6 divide-y divide-slate-200">
            {data!.map((program) => (
              <div
                key={`${program.title}-${program.dayOfWeek}-${program.startTime}`}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4"
              >
                <div>
                  <span className="text-base font-semibold text-slate-900">
                    {program.title}
                  </span>
                  {program.hostName && (
                    <span className="ml-2 text-sm text-slate-500">
                      — {program.hostName}
                    </span>
                  )}
                </div>
                <div className="sm:text-right">
                  <span className="text-sm font-medium text-slate-700">
                    {t(`days.${program.dayOfWeek}`)}
                  </span>
                  <span className="ml-2 text-sm text-slate-500">
                    {formatTime(program.startTime, i18n.language)}–{formatTime(program.endTime, i18n.language)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
