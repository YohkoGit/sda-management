import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Eyebrow, Numerator } from "@/components/ui/typography";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import { formatActivityDate, formatRelativeDate, formatTime } from "@/lib/dateFormatting";
import { deptSwatchColor } from "@/lib/dept-color";
import type { MyAssignmentItem } from "@/types/assignment";

interface AssignmentCardProps {
  assignment: MyAssignmentItem;
  isFirst?: boolean;
}

export function AssignmentCard({ assignment, isFirst = false }: AssignmentCardProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const date = new Date(assignment.date + "T00:00:00");
  const day = date.getDate();
  const weekday = date.toLocaleDateString(lang, { weekday: "long" });
  const dateLabel = formatActivityDate(assignment.date, t, lang);
  const relativeDate = formatRelativeDate(assignment.date, lang);
  const timeRange = `${formatTime(assignment.startTime, lang)}–${formatTime(assignment.endTime, lang)}`;
  const swatch = deptSwatchColor({
    abbreviation: assignment.departmentAbbreviation ?? undefined,
    color: assignment.departmentColor ?? undefined,
  });

  return (
    <Link
      to={`/activities/${assignment.activityId}`}
      className="block no-underline text-inherit"
      aria-label={`${assignment.roleName} — ${assignment.activityTitle} — ${dateLabel}`}
    >
      <article
        className={[
          "relative grid grid-cols-[auto_1fr] gap-6 px-1 py-6 transition-colors",
          "border-t border-[var(--hairline)] hover:bg-[var(--parchment-2)]",
          isFirst ? "border-t-2 border-[var(--gilt)]" : "",
        ].join(" ")}
      >
        <div className="flex flex-col items-start leading-none">
          <Numerator className="text-5xl text-[var(--ink)] sm:text-6xl">{day}</Numerator>
          <Eyebrow className="mt-2 capitalize">{weekday}</Eyebrow>
          <span className="mt-1 font-mono text-[10px] tabular-nums text-[var(--ink-4)]">
            {relativeDate}
          </span>
        </div>

        <div className="min-w-0">
          <Eyebrow gilt>
            {assignment.roleName}
          </Eyebrow>
          <h3
            className="mt-2 font-display text-2xl leading-tight text-[var(--ink)] sm:text-3xl"
            title={assignment.activityTitle}
          >
            {assignment.activityTitle}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: swatch }}
              />
              <Eyebrow asChild>
                <span>{assignment.departmentAbbreviation ?? "—"}</span>
              </Eyebrow>
            </span>
            <span className="font-mono text-sm tabular-nums text-[var(--ink-2)]">
              {timeRange}
            </span>
            <ModifiedBadge activityId={assignment.activityId} />
            {assignment.specialType && (
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gilt-2)]">
                ✣ {t(`pages.home.specialType.${assignment.specialType}`)}
              </span>
            )}
          </div>

          {assignment.coAssignees.length > 0 && (
            <div className="mt-5 flex items-center gap-3 border-t border-[var(--hairline)] pt-4">
              <div className="flex -space-x-2">
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
              <span className="text-sm text-[var(--ink-3)]">
                <span className="italic">{t("pages.dashboard.myAssignments.coAssignees")}:</span>{" "}
                {assignment.coAssignees
                  .map((p) => {
                    const name = `${p.firstName} ${p.lastName.charAt(0)}.`;
                    return p.isGuest ? `${name} (${t("pages.dashboard.myAssignments.guest")})` : name;
                  })
                  .join(", ")}
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
