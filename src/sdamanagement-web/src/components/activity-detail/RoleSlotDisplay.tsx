import { useTranslation } from "react-i18next";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import type { RoleAssignmentResponse } from "@/services/activityService";

interface RoleSlotDisplayProps {
  roleName: string;
  headcount: number;
  isCritical: boolean;
  assignments: RoleAssignmentResponse[];
}

const MAX_EMPTY_SLOTS = 3;

export function RoleSlotDisplay({ roleName, headcount, isCritical, assignments }: RoleSlotDisplayProps) {
  const { t } = useTranslation();

  const assignedCount = assignments.length;
  const emptyCount = Math.max(0, headcount - assignedCount);
  const visibleEmpty = Math.min(emptyCount, MAX_EMPTY_SLOTS);
  const overflowEmpty = emptyCount - visibleEmpty;

  const hasCriticalGap = isCritical && assignedCount === 0;

  const fractionColor =
    assignedCount >= headcount
      ? "text-emerald-600"
      : hasCriticalGap
        ? "text-red-600"
        : "text-amber-600";

  return (
    <div
      role="group"
      aria-label={t("pages.activityDetail.roster.ariaRoleStatus", {
        role: roleName,
        assigned: assignedCount,
        total: headcount,
      })}
      className="rounded-2xl border border-border bg-background p-4"
    >
      {/* Role header: label + fraction */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black tracking-wider text-muted-foreground uppercase">
          {roleName}
        </span>
        <span className={`text-sm font-semibold tabular-nums ${fractionColor}`}>
          {t("pages.activityDetail.roster.assigned", {
            assigned: assignedCount,
            total: headcount,
          })}
        </span>
      </div>

      {/* Assignees grid */}
      <div className="flex flex-wrap gap-3">
        {assignments.map((person) => (
          <div key={person.id} className="flex flex-col items-center gap-1 w-20">
            <InitialsAvatar
              firstName={person.firstName}
              lastName={person.lastName}
              size="lg"
              avatarUrl={person.avatarUrl ?? undefined}
            />
            <span className="text-xs text-foreground text-center leading-tight w-full">
              {person.firstName} {person.lastName}
            </span>
            {person.isGuest && (
              <span className="text-[10px] text-muted-foreground">
                {t("pages.activityDetail.roster.guest")}
              </span>
            )}
          </div>
        ))}

        {/* Empty slots */}
        {Array.from({ length: visibleEmpty }).map((_, i) => (
          <div key={`empty-${i}`} className="flex flex-col items-center gap-1 w-20">
            <div
              className="h-12 w-12 rounded-full border-2 border-dashed border-border flex items-center justify-center"
              aria-label={t("pages.activityDetail.roster.unassignedPosition")}
            />
            <span className="text-xs text-muted-foreground text-center leading-tight">
              {t("pages.activityDetail.roster.unassigned")}
            </span>
          </div>
        ))}

        {/* Overflow counter */}
        {overflowEmpty > 0 && (
          <div className="flex flex-col items-center justify-center gap-1 w-20">
            <div className="h-12 w-12 rounded-full border border-border bg-muted flex items-center justify-center">
              <span className="text-xs font-semibold text-muted-foreground">
                +{overflowEmpty}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
