import { memo } from "react";
import { CommandGroup, CommandItem } from "@/components/ui/command";
import { ContactPickerResultItem } from "./ContactPickerResultItem";
import type { AssignableOfficer } from "@/services/userService";

interface ContactPickerGroupProps {
  departmentName: string;
  officers: AssignableOfficer[];
  assignedUserIds: number[];
  onSelect: (userId: number) => void;
}

export const ContactPickerGroup = memo(function ContactPickerGroup({
  departmentName,
  officers,
  assignedUserIds,
  onSelect,
}: ContactPickerGroupProps) {
  return (
    <CommandGroup heading={departmentName}>
      {officers.map((officer) => {
        const isAssigned = assignedUserIds.includes(officer.userId);
        return (
          <CommandItem
            key={officer.userId}
            value={`${officer.lastName} ${officer.firstName}`}
            keywords={[officer.firstName, officer.lastName, ...officer.departments.map((d) => d.name)]}
            disabled={isAssigned}
            onSelect={() => {
              if (!isAssigned) onSelect(officer.userId);
            }}
            className="py-2"
          >
            <ContactPickerResultItem officer={officer} isAssigned={isAssigned} />
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
});
