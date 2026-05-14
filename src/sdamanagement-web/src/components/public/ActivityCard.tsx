import { useTranslation } from "react-i18next";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import { Eyebrow, Numerator } from "@/components/ui/typography";
import { formatTime } from "@/lib/dateFormatting";
import { deptSwatchColor } from "@/lib/dept-color";
import type { PublicActivityListItem } from "@/types/public";

function AvatarInitials({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="flex items-center justify-center rounded-full bg-[var(--parchment-3)] font-display text-[var(--ink-2)]"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

/**
 * Hairline-rule row variant used in dashboard "next activity" / department detail / etc.
 * Public Home no longer uses this card (it uses inline rows) — kept for elsewhere.
 */
export default function ActivityCard({
  activity,
}: {
  activity: PublicActivityListItem;
}) {
  const { t, i18n } = useTranslation();
  const date = new Date(activity.date + "T00:00:00");
  const day = date.getDate();
  const weekday = date.toLocaleDateString(i18n.language, { weekday: "short" });
  const month = date.toLocaleDateString(i18n.language, { month: "short" });
  const timeRange = `${formatTime(activity.startTime, i18n.language)}–${formatTime(activity.endTime, i18n.language)}`;
  const swatch = deptSwatchColor({
    abbreviation: activity.departmentAbbreviation ?? undefined,
    color: activity.departmentColor ?? undefined,
  });

  return (
    <article
      className="grid grid-cols-[auto_1fr] items-start gap-5 border-t border-[var(--hairline)] p-5 first:border-t-0 sm:p-6"
      aria-label={`${activity.title}`}
    >
      <div className="flex flex-col items-start leading-none">
        <Numerator className="text-4xl text-[var(--ink)] sm:text-5xl">{day}</Numerator>
        <Eyebrow className="mt-1.5 capitalize">{weekday} · {month}</Eyebrow>
      </div>

      <div className="min-w-0">
        <h3
          className="font-display text-lg leading-tight text-[var(--ink)] sm:text-xl"
          title={activity.title}
        >
          {activity.title}
        </h3>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm tabular-nums text-[var(--ink-2)]">
            {timeRange}
          </span>
          <ModifiedBadge activityId={activity.id} />
          {activity.departmentAbbreviation && (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: swatch }}
              />
              <span
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]"
                title={activity.departmentName ?? undefined}
              >
                {activity.departmentAbbreviation}
              </span>
            </span>
          )}
          {activity.specialType && (
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gilt-2)]">
              ✣ {t(`pages.home.specialType.${activity.specialType}`)}
            </span>
          )}
        </div>

        {activity.predicateurName && (
          <div className="mt-3 flex items-center gap-2">
            {activity.predicateurAvatarUrl ? (
              <img
                src={activity.predicateurAvatarUrl}
                alt={activity.predicateurName}
                className="h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <AvatarInitials name={activity.predicateurName} />
            )}
            <span className="text-sm text-[var(--ink-2)]">
              <span className="italic">avec</span> {activity.predicateurName}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}
