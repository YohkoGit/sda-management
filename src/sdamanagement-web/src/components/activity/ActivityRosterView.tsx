import { useTranslation } from "react-i18next";
import type { ActivityRoleResponse } from "@/services/activityService";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ActivityRosterViewProps {
  roles: ActivityRoleResponse[];
}

export function ActivityRosterView({ roles }: ActivityRosterViewProps) {
  const { t } = useTranslation();

  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        {t("pages.adminActivities.roster.noRoles")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {roles.map((role) => {
        const assignedCount = role.assignments.length;
        const isFull = assignedCount >= role.headcount;
        const unfilledCount = Math.max(0, role.headcount - assignedCount);

        return (
          <div key={role.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RoleDot isFull={isFull} hasAssignments={assignedCount > 0} />
                <span className="text-sm font-medium">{role.roleName}</span>
              </div>
              <span
                className={`text-xs font-medium tabular-nums ${
                  isFull
                    ? "text-emerald-600"
                    : assignedCount > 0
                      ? "text-amber-600"
                      : "text-muted-foreground"
                }`}
              >
                {assignedCount}/{role.headcount}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pl-5">
              {role.assignments.map((assignment) => (
                <Tooltip key={assignment.id}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-muted/50 px-2 py-1">
                      <InitialsAvatar
                        firstName={assignment.firstName}
                        lastName={assignment.lastName || ""}
                        avatarUrl={assignment.avatarUrl ?? undefined}
                        size="xs"
                        className={assignment.isGuest ? "!bg-slate-200" : undefined}
                      />
                      <span className="text-xs">
                        {assignment.isGuest
                          ? assignment.firstName
                          : assignment.lastName
                            ? `${assignment.lastName}, ${assignment.firstName.charAt(0)}.`
                            : assignment.firstName}
                      </span>
                      {assignment.isGuest && (
                        <span className="text-[10px] text-muted-foreground">
                          {t("pages.adminActivities.roster.guest")}
                        </span>
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {assignment.firstName} {assignment.lastName}
                      {assignment.isGuest &&
                        ` ${t("pages.adminActivities.roster.guest")}`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              ))}

              {Array.from({ length: Math.min(unfilledCount, 3) }).map(
                (_, i) => (
                  <span
                    key={`empty-${i}`}
                    className="inline-flex items-center gap-1 rounded-xl border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
                  >
                    {t("pages.adminActivities.roster.unassigned")}
                  </span>
                ),
              )}
              {unfilledCount > 3 && (
                <span className="text-xs text-muted-foreground self-center">
                  {t("pages.adminActivities.roster.moreUnassigned", {
                    count: unfilledCount - 3,
                  })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RoleDot({
  isFull,
  hasAssignments,
}: {
  isFull: boolean;
  hasAssignments: boolean;
}) {
  const color = isFull
    ? "bg-emerald-500"
    : hasAssignments
      ? "bg-amber-500"
      : "bg-muted-foreground/40";

  return <span className={`h-2 w-2 rounded-full ${color}`} aria-hidden="true" />;
}
