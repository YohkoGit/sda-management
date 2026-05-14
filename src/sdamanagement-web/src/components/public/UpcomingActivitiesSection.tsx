import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, Numerator, Serial } from "@/components/ui/typography";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import { useUpcomingActivities } from "@/hooks/usePublicDashboard";
import { formatTime } from "@/lib/dateFormatting";
import { deptSwatchColor } from "@/lib/dept-color";
import type { PublicActivityListItem } from "@/types/public";

function UpcomingRow({
  activity,
  index,
  weekdayLabel,
  monthLabel,
}: {
  activity: PublicActivityListItem;
  index: number;
  weekdayLabel: string;
  monthLabel: string;
}) {
  const { i18n, t } = useTranslation();
  const day = Number(activity.date.slice(-2));
  const timeRange = `${formatTime(activity.startTime, i18n.language)}–${formatTime(activity.endTime, i18n.language)}`;
  const swatch = deptSwatchColor({
    abbreviation: activity.departmentAbbreviation ?? undefined,
    color: activity.departmentColor ?? undefined,
  });

  return (
    <article
      className="grid grid-cols-[40px_minmax(60px,72px)_1fr_minmax(60px,90px)_minmax(110px,auto)] items-center gap-4 border-t border-[var(--hairline)] py-5 first:border-t-0 sm:gap-6 sm:py-6"
      aria-label={`${activity.title} — ${weekdayLabel} ${day}`}
    >
      <Serial n={index + 1} />

      <div className="flex flex-col leading-none">
        <Numerator className="text-3xl sm:text-4xl text-[var(--ink)]">{day}</Numerator>
        <Eyebrow className="mt-1.5 capitalize">{monthLabel}</Eyebrow>
      </div>

      <div className="min-w-0">
        <Eyebrow className="capitalize">{weekdayLabel}</Eyebrow>
        <h3 className="mt-1 font-display text-lg leading-tight text-[var(--ink)] sm:text-xl">
          {activity.title}
        </h3>
        {activity.predicateurName && (
          <p className="mt-1 text-sm text-[var(--ink-3)]">
            <span className="italic">avec</span> {activity.predicateurName}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <ModifiedBadge activityId={activity.id} />
          {activity.specialType && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gilt-2)]">
              ✣ {t(`pages.home.specialType.${activity.specialType}`)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: swatch }}
        />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
          {activity.departmentAbbreviation ?? "—"}
        </span>
      </div>

      <span className="text-right font-mono text-sm tabular-nums text-[var(--ink-2)]">
        {timeRange}
      </span>
    </article>
  );
}

export default function UpcomingActivitiesSection() {
  const { t, i18n } = useTranslation();
  const { data, isPending, isError } = useUpcomingActivities();

  const headingId = "upcoming-activities-heading";

  return (
    <section className="bg-[var(--parchment-2)]" aria-labelledby={headingId}>
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="flex items-baseline justify-between gap-6 border-b border-[var(--ink)] pb-4">
          <h2
            id={headingId}
            className="font-display text-3xl leading-tight text-[var(--ink)] lg:text-4xl"
          >
            {t("pages.home.upcomingActivitiesTitle")}
          </h2>
          <Eyebrow>
            {data && data.length > 0
              ? t("pages.home.upcomingCount", "{{count}} à venir", { count: data.length })
              : t("pages.home.thisSeason", "Saison 2026")}
          </Eyebrow>
        </div>

        <div className="mt-2">
          {isPending ? (
            <div className="divide-y divide-[var(--hairline)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-6">
                  <Skeleton className="h-10 w-10 bg-[var(--parchment-3)]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-20 bg-[var(--parchment-3)]" />
                    <Skeleton className="h-6 w-3/4 bg-[var(--parchment-3)]" />
                  </div>
                  <Skeleton className="h-4 w-24 bg-[var(--parchment-3)]" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="py-10 text-base text-[var(--rose)]">
              {t("pages.home.loadError")}
            </p>
          ) : data && data.length > 0 ? (
            <div>
              {data.map((activity, idx) => {
                const date = new Date(activity.date + "T00:00:00");
                const weekday = date.toLocaleDateString(i18n.language, {
                  weekday: "long",
                });
                const month = date.toLocaleDateString(i18n.language, {
                  month: "short",
                });
                return (
                  <UpcomingRow
                    key={activity.id}
                    activity={activity}
                    index={idx}
                    weekdayLabel={weekday}
                    monthLabel={month}
                  />
                );
              })}
            </div>
          ) : (
            <p className="py-12 text-center font-display text-xl italic text-[var(--ink-3)]">
              {t("pages.home.noActivities")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
