import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deptSwatchColor } from "@/lib/dept-color";
import type { DepartmentListItem } from "@/services/departmentService";

interface DeptFieldProps {
  value: number | undefined;
  onChange: (value: number) => void;
  departments: DepartmentListItem[];
  disabled?: boolean;
  ariaInvalid?: boolean;
  ariaLabel?: string;
  placeholder?: string;
}

export function DeptField({
  value,
  onChange,
  departments,
  disabled,
  ariaInvalid,
  ariaLabel,
  placeholder,
}: DeptFieldProps) {
  const { t } = useTranslation();
  const placeholderLabel = placeholder ?? t("pickers.dept.placeholder", "Choisir un département");

  return (
    <Select
      value={value ? String(value) : ""}
      onValueChange={(v) => onChange(Number(v))}
      disabled={disabled}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={[
          "w-full",
          ariaInvalid ? "border-[var(--rose)]" : "",
          disabled ? "opacity-70" : "",
        ].join(" ")}
      >
        <SelectValue placeholder={placeholderLabel} />
      </SelectTrigger>
      <SelectContent>
        {departments.map((dept) => (
          <SelectItem key={dept.id} value={String(dept.id)}>
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{
                  backgroundColor: deptSwatchColor({
                    abbreviation: dept.abbreviation ?? undefined,
                    color: dept.color ?? undefined,
                  }),
                }}
                aria-hidden
              />
              {dept.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
