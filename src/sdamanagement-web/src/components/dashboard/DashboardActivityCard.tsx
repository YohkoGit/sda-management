import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Eyebrow, Numerator } from "@/components/ui/typography";
import { StaffingIndicator } from "@/components/activity/StaffingIndicator";
import { formatRelativeDate, formatTime } from "@/lib/dateFormatting";
import { deptSwatchColor } from "@/lib/dept-color";
import type { DashboardActivityItem } from "@/services/activityService";

interface DashboardActivityCardProps {
  activity: DashboardActivityItem;
  showStaffing?: boolean;
  isToday?: boolean;
}

function parsePredicateurName(fullName: string): { firstName: string; lastName: string } {
  const spaceIndex = fullName.indexOf(" ");
  if (spaceIndex === -1) return { firstName: fullName, lastName: "" };
  return { firstName: fullName.slice(0, spaceIndex), lastName: fullName.slice(spaceIndex + 1) };
}

export function DashboardActivityCard({
  activity,
  showStaffing = false,
  isToday = false,
}: DashboardActivityCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const date = new Date(activity.date + "T00:00:00");
  const day = date.getDate();
  const weekday = date.toLocaleDateString(lang, { weekday: "short" });
  const monthLabel = date.toLocaleDateString(lang, { month: "short" });
  const relativeDate = formatRelativeDate(activity.date, lang);
  const timeRange = `${formatTime(activity.startTime, lang)}–${formatTime(activity.endTime, lang)}`;
  const swatch = deptSwatchColor({
    abbreviation: activity.departmentAbbreviation ?? undefined,
    color: activity.departmentColor ?? undefined,
  });

  const predicateur = activity.predicateurName?.trim()
    ? parsePredicateurName(activity.predicateurName)
    : null;

  return (
    <Link
      to={`/activities/${activity.id}`}
      className="block no-underline text-inherit"
      aria-label={`${activity.title} — ${weekday} ${day}`}
    >
      <article
        className={[
          "grid grid-cols-[auto_1fr] gap-5 border-t border-[var(--hairline)] py-5 transition-colors",
          "hover:bg-[var(--parchment-2)]",
          isToday ? "bg-[var(--gilt-wash)]" : "",
        ].join(" ")}
      >
        <div className="flex flex-col items-start leading-none">
          <Numerator className="text-3xl text-[var(--ink)] sm:text-4xl">{day}</Numerator>
          <Eyebrow className="mt-1 capitalize">{weekday} · {monthLabel}</Eyebrow>
        </div>

        <div className="min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3
              className="truncate font-display text-lg leading-tight text-[var(--ink)] sm:text-xl"
              title={activity.title}
            >
              {activity.title}
            </h3>
            <span className="shrink-0 font-mono text-sm tabular-nums text-[var(--ink-2)]">
              {timeRange}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
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
                  title={activity.departmentName}
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
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-4)]">
              {relativeDate}
            </span>
          </div>

          {predicateur && (
            <div className="mt-3 flex items-center gap-2">
              <InitialsAvatar
                size="xs"
                firstName={predicateur.firstName}
                lastName={predicateur.lastName}
                avatarUrl={activity.predicateurAvatarUrl ?? undefined}
              />
              <span className="text-sm text-[var(--ink-2)]">
                <span className="italic">avec</span> {activity.predicateurName}
              </span>
            </div>
          )}

          {showStaffing && (
            <div className="mt-3">
              <StaffingIndicator
                staffingStatus={activity.staffingStatus}
                assigned={activity.assignedCount}
                total={activity.totalHeadcount}
                size="sm"
              />
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
