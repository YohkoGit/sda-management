import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { StaffingIndicator } from "@/components/activity/StaffingIndicator";
import { formatActivityDate, formatRelativeDate, formatTime } from "@/lib/dateFormatting";
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

  const dateLabel = formatActivityDate(activity.date, t, lang);
  const relativeDate = formatRelativeDate(activity.date, lang);
  const timeRange = `${formatTime(activity.startTime, lang)}–${formatTime(activity.endTime, lang)}`;

  const predicateur = activity.predicateurName?.trim()
    ? parsePredicateurName(activity.predicateurName)
    : null;

  return (
    <Link
      to={`/activities/${activity.id}`}
      className="block no-underline text-inherit"
      aria-label={`${activity.title} — ${dateLabel}`}
    >
      <article
        className={`rounded-2xl border border-l-4 border-border p-4 transition-colors cursor-pointer hover:bg-accent/50 ${
          isToday ? "bg-primary/5" : "bg-background"
        }`}
        style={{ borderLeftColor: activity.departmentColor || undefined }}
      >
        {/* Row 1: Department badge + date + relative distance */}
        <div className="flex items-center gap-2 flex-wrap">
          {activity.departmentAbbreviation && (
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold text-white"
              style={{ backgroundColor: activity.departmentColor || undefined }}
              aria-label={activity.departmentName}
            >
              {activity.departmentAbbreviation}
            </span>
          )}
          <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
          <span className="text-xs text-muted-foreground">{relativeDate}</span>
        </div>

        {/* Row 2: Activity title + badges */}
        <div className="mt-1.5 flex items-start justify-between gap-2">
          <h3
            className="truncate text-base font-bold text-foreground"
            title={activity.title}
          >
            {activity.title}
          </h3>
          <div className="flex items-center gap-1 shrink-0">
            <ModifiedBadge activityId={activity.id} />
            {activity.specialType && (
              <Badge variant="outline" className="shrink-0 text-[11px]">
                {t(`pages.home.specialType.${activity.specialType}`)}
              </Badge>
            )}
          </div>
        </div>

        {/* Row 3: Predicateur + time range */}
        <div className="mt-1 flex items-center justify-between gap-2">
          {predicateur ? (
            <div className="flex items-center gap-1.5">
              <InitialsAvatar
                size="xs"
                firstName={predicateur.firstName}
                lastName={predicateur.lastName}
                avatarUrl={activity.predicateurAvatarUrl ?? undefined}
              />
              <span className="text-sm text-muted-foreground">
                {activity.predicateurName}
              </span>
            </div>
          ) : (
            <span />
          )}
          <span className="text-xs text-muted-foreground tabular-nums">
            {timeRange}
          </span>
        </div>

        {/* Row 4 (conditional): Staffing indicator */}
        {showStaffing && (
          <div className="mt-2">
            <StaffingIndicator
              staffingStatus={activity.staffingStatus}
              assigned={activity.assignedCount}
              total={activity.totalHeadcount}
              size="sm"
            />
          </div>
        )}
      </article>
    </Link>
  );
}
