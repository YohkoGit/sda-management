import { memo } from "react";
import { cn } from "@/lib/utils";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import type { AssignableOfficer } from "@/services/userService";

interface ContactPickerResultItemProps {
  officer: AssignableOfficer;
  isAssigned: boolean;
}

export const ContactPickerResultItem = memo(function ContactPickerResultItem({
  officer,
  isAssigned,
}: ContactPickerResultItemProps) {
  const displayName = `${officer.lastName}, ${officer.firstName.charAt(0)}.`;
  const deptBadge = officer.departments[0];

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isAssigned && "opacity-50"
      )}
    >
      <InitialsAvatar
        firstName={officer.firstName}
        lastName={officer.lastName}
        size="xs"
        avatarUrl={officer.avatarUrl ?? undefined}
      />
      <span className="max-w-[10rem] truncate text-sm">{displayName}</span>
      {deptBadge && (
        <span
          className="ml-auto shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `${deptBadge.color}20`,
            color: deptBadge.color,
          }}
        >
          {deptBadge.abbreviation}
        </span>
      )}
    </div>
  );
});
