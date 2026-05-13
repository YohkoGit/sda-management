import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDepartments } from "@/hooks/usePublicDashboard";
import { formatActivityDate, formatTime } from "@/lib/dateFormatting";

function formatDeptActivityDate(
  date: string | null,
  time: string | null,
  t: (key: string) => string,
  lang: string
): string {
  if (!date) return "";
  const dateStr = formatActivityDate(date, t, lang);
  const timeStr = time ? formatTime(time, lang) : "";
  return timeStr ? `${dateStr} ${timeStr}` : dateStr;
}

export default function DepartmentOverviewSection() {
  const { t, i18n } = useTranslation();
  const { data, isPending, isError } = useDepartments();

  const headingId = "department-overview-heading";

  if (!isPending && !isError && data && data.length === 0) {
    return null;
  }

  return (
    <section className="bg-slate-50" aria-labelledby={headingId}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <h2
          id={headingId}
          className="text-2xl font-bold text-slate-900"
        >
          {t("pages.home.departmentsTitle")}
        </h2>

        {isPending ? (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-l-4 border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-5 w-12 rounded-full" />
                </div>
                <Skeleton className="mt-2 h-4 w-full" />
                <Skeleton className="mt-1 h-4 w-3/4" />
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <Skeleton className="h-4 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="mt-6 text-base text-slate-500">
            {t("pages.home.loadError")}
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((dept) => (
              <article
                key={dept.id}
                className="rounded-2xl border border-l-4 border-slate-200 bg-white p-4 sm:p-5"
                style={{ borderLeftColor: dept.color || "#E2E8F0" }}
                aria-label={dept.name}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{dept.name}</h3>
                  <Badge variant="secondary" title={dept.name}>
                    {dept.abbreviation}
                  </Badge>
                </div>
                {dept.description && (
                  <p
                    className="mt-1 line-clamp-2 text-sm text-slate-600"
                    title={dept.description}
                  >
                    {dept.description}
                  </p>
                )}
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {dept.nextActivityTitle ? (
                    <p className="text-sm text-slate-500">
                      {formatDeptActivityDate(dept.nextActivityDate, dept.nextActivityStartTime, t, i18n.language)}
                      {" — "}
                      {dept.nextActivityTitle}
                    </p>
                  ) : (
                    <p className="text-sm italic text-slate-400">
                      {t("pages.home.noPlannedActivity")}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
