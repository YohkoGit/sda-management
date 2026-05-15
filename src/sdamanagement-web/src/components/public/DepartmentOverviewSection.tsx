import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, Serial } from "@/components/ui/typography";
import { useDepartments } from "@/hooks/usePublicDashboard";
import { formatActivityDate, formatTime } from "@/lib/dateFormatting";
import { deptSwatchColor } from "@/lib/dept-color";

function formatDeptActivityDate(
  date: string | null,
  time: string | null,
  t: (key: string) => string,
  lang: string
): string {
  if (!date) return "";
  const dateStr = formatActivityDate(date, t, lang);
  const timeStr = time ? formatTime(time, lang) : "";
  return timeStr ? `${dateStr} · ${timeStr}` : dateStr;
}

export default function DepartmentOverviewSection() {
  const { t, i18n } = useTranslation();
  const { data, isPending, isError } = useDepartments();

  const headingId = "department-overview-heading";

  if (!isPending && !isError && data && data.length === 0) {
    return null;
  }

  return (
    <section className="bg-[var(--parchment)]" aria-labelledby={headingId}>
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="flex items-baseline justify-between gap-6 border-b border-[var(--ink)] pb-4">
          <h2
            id={headingId}
            className="font-display text-3xl leading-tight text-[var(--ink)] lg:text-4xl"
          >
            {t("pages.home.departmentsTitle")}
          </h2>
          <Eyebrow>{t("pages.home.ministries", "Ministères")}</Eyebrow>
        </div>

        {isPending ? (
          <div className="mt-2 grid gap-x-12 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 border-b border-[var(--hairline)] py-5"
              >
                <Skeleton className="h-6 w-6 bg-[var(--parchment-2)]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-40 bg-[var(--parchment-2)]" />
                  <Skeleton className="h-3 w-28 bg-[var(--parchment-2)]" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="mt-6 text-base text-[var(--rose)]">
            {t("pages.home.loadError")}
          </p>
        ) : (
          <ul className="mt-2 grid gap-x-12 sm:grid-cols-2">
            {data!.map((dept, idx) => {
              const swatch = deptSwatchColor({
                abbreviation: dept.abbreviation ?? undefined,
                color: dept.color ?? undefined,
              });
              const nextLabel = dept.nextActivityTitle
                ? `${formatDeptActivityDate(dept.nextActivityDate, dept.nextActivityStartTime, t, i18n.language)} — ${dept.nextActivityTitle}`
                : t("pages.home.noPlannedActivity");
              return (
                <li
                  key={dept.id}
                  className="grid grid-cols-[32px_16px_1fr_auto] items-center gap-4 border-b border-[var(--hairline)] py-5 transition-colors hover:bg-[var(--parchment-2)]"
                >
                  <Serial n={idx + 1} />
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: swatch }}
                  />
                  <div className="min-w-0">
                    <h3 className="font-display text-lg leading-tight text-[var(--ink)]">
                      {dept.name}
                    </h3>
                    {dept.description ? (
                      <p
                        className="mt-0.5 line-clamp-1 text-sm text-[var(--ink-3)]"
                        title={dept.description}
                      >
                        {dept.description}
                      </p>
                    ) : dept.nextActivityTitle ? (
                      <p className="mt-0.5 line-clamp-1 text-sm text-[var(--ink-3)]">
                        {nextLabel}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm italic text-[var(--ink-4)]">
                        {t("pages.home.noPlannedActivity")}
                      </p>
                    )}
                  </div>
                  <Eyebrow asChild>
                    <span>{dept.abbreviation}</span>
                  </Eyebrow>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
