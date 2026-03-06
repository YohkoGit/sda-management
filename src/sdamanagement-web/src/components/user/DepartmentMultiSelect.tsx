import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface Department {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
}

interface DepartmentMultiSelectProps {
  departments: Department[];
  value: number[];
  onChange: (ids: number[]) => void;
  hasError?: boolean;
  /** Show abbreviations instead of count in trigger text */
  compact?: boolean;
}

export function DepartmentMultiSelect({
  departments,
  value,
  onChange,
  hasError,
  compact,
}: DepartmentMultiSelectProps) {
  const { t } = useTranslation();

  const triggerLabel =
    value.length > 0
      ? compact
        ? departments
            .filter((d) => value.includes(d.id))
            .map((d) => d.abbreviation)
            .join(", ")
        : `${value.length} ${t("pages.adminUsers.form.departments").toLowerCase()}`
      : t("pages.adminUsers.form.selectDepartments");

  return (
    <div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal text-sm"
            aria-invalid={!!hasError}
          >
            {triggerLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full max-w-[400px] p-2" align="start">
          <div className="space-y-1">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className="flex cursor-pointer items-center gap-2 rounded-md p-2 hover:bg-accent"
              >
                <Checkbox
                  checked={value.includes(dept.id)}
                  onCheckedChange={(checked) => {
                    const newIds = checked
                      ? [...value, dept.id]
                      : value.filter((id) => id !== dept.id);
                    onChange(newIds);
                  }}
                />
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: dept.color }}
                />
                <span className="text-sm">{dept.name}</span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {value.map((deptId) => {
            const dept = departments.find((d) => d.id === deptId);
            if (!dept) return null;
            return (
              <Badge key={deptId} variant="outline" className="gap-1 text-xs">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: dept.color }}
                />
                {dept.abbreviation}
                <button
                  type="button"
                  className="ml-1 rounded-full hover:bg-accent"
                  onClick={() => onChange(value.filter((id) => id !== deptId))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
