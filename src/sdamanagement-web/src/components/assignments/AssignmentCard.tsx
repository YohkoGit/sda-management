import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { formatActivityDate, formatRelativeDate, formatTime } from "@/lib/dateFormatting";
import type { MyAssignmentItem } from "@/types/assignment";

interface AssignmentCardProps {
  assignment: MyAssignmentItem;
  isFirst?: boolean;
}

export function AssignmentCard({ assignment, isFirst = false }: AssignmentCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const dateLabel = formatActivityDate(assignment.date, t, lang);
  const relativeDate = formatRelativeDate(assignment.date, lang);
  const timeRange = `${formatTime(assignment.startTime)}\u2013${formatTime(assignment.endTime)}`;

  return (
    <article
      className={`rounded-2xl border border-l-4 border-border p-4 sm:p-5 transition-colors ${
        isFirst ? "bg-primary/5" : "bg-background"
      }`}
      style={{
        borderLeftColor: assignment.departmentColor || undefined,
      }}
      tabIndex={0}
      aria-label={`${assignment.roleName} — ${assignment.activityTitle} — ${dateLabel}`}
    >
      {/* Row 1: Department badge + date + relative distance */}
      <div className="flex items-center gap-2 flex-wrap">
        {assignment.departmentAbbreviation && (
          <span
            className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide text-white"
            style={{ backgroundColor: assignment.departmentColor || undefined }}
            aria-label={assignment.departmentName}
          >
            {assignment.departmentAbbreviation}
          </span>
        )}
        <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
        <span className="text-xs text-muted-foreground">{relativeDate}</span>
      </div>

      {/* Row 2: Activity title + special type badge */}
      <div className="mt-1.5 flex items-start justify-between gap-2">
        <h3
          className="truncate text-base font-bold text-foreground"
          title={assignment.activityTitle}
        >
          {assignment.activityTitle}
        </h3>
        {assignment.specialType && (
          <Badge variant="outline" className="shrink-0 text-[11px]">
            {assignment.specialType}
          </Badge>
        )}
      </div>

      {/* Row 3: Role name + time range */}
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-primary">
          {assignment.roleName}
        </p>
        <span className="text-xs text-muted-foreground tabular-nums">
          {timeRange}
        </span>
      </div>

      {/* Row 4: Co-assignee avatars + names (only if co-assignees exist) */}
      {assignment.coAssignees.length > 0 && (
        <div className="mt-2.5 flex items-center gap-2">
          <div className="flex -space-x-1">
            {assignment.coAssignees.map((person) => (
              <InitialsAvatar
                key={person.userId}
                firstName={person.firstName}
                lastName={person.lastName}
                size="xs"
                avatarUrl={person.avatarUrl ?? undefined}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            {assignment.coAssignees.map((p) => {
              const name = `${p.firstName} ${p.lastName.charAt(0)}.`;
              return p.isGuest ? `${name} (${t("pages.dashboard.myAssignments.guest")})` : name;
            }).join(", ")}
          </span>
        </div>
      )}
    </article>
  );
}
