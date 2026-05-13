import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import { formatActivityDate, formatTime } from "@/lib/dateFormatting";
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
      className="flex items-center justify-center rounded-full bg-indigo-600 font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}

export default function ActivityCard({
  activity,
}: {
  activity: PublicActivityListItem;
}) {
  const { t, i18n } = useTranslation();
  const dateLabel = formatActivityDate(activity.date, t, i18n.language);
  const timeRange = `${formatTime(activity.startTime, i18n.language)}\u2013${formatTime(activity.endTime, i18n.language)}`;

  return (
    <article
      className="rounded-2xl border border-l-4 border-slate-200 bg-white p-4 sm:p-5"
      style={{
        borderLeftColor: activity.departmentColor ?? "#E2E8F0",
      }}
      aria-label={`${activity.title} — ${dateLabel}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-indigo-600">{dateLabel}</p>
          <p className="text-sm text-slate-600">{timeRange}</p>
        </div>
      </div>

      <h3
        className="mt-2 truncate text-lg font-bold text-slate-900"
        title={activity.title}
      >
        {activity.title}
      </h3>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ModifiedBadge activityId={activity.id} />
        {activity.departmentAbbreviation && (
          <Badge
            variant="secondary"
            title={activity.departmentName ?? undefined}
          >
            {activity.departmentAbbreviation}
          </Badge>
        )}
        {activity.specialType && (
          <Badge variant="outline">
            {t(`pages.home.specialType.${activity.specialType}`)}
          </Badge>
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
          <span className="text-sm text-slate-700">
            {activity.predicateurName}
          </span>
        </div>
      )}
    </article>
  );
}
