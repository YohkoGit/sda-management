import { useTranslation } from "react-i18next";
import { Minus, Plus, X } from "lucide-react";
import type { UseFormRegister, FieldErrors } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActivityTemplateFormData } from "@/schemas/activityTemplateSchema";

interface TemplateRoleRowProps {
  index: number;
  register: UseFormRegister<ActivityTemplateFormData>;
  errors: FieldErrors<ActivityTemplateFormData>;
  headcount: number;
  onHeadcountChange: (value: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

export function TemplateRoleRow({
  index,
  register,
  errors,
  headcount,
  onHeadcountChange,
  onRemove,
  canRemove,
}: TemplateRoleRowProps) {
  const { t } = useTranslation();
  const roleErrors = errors.roles?.[index];

  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <Input
          placeholder={t("pages.adminActivityTemplates.form.roleNamePlaceholder")}
          {...register(`roles.${index}.roleName`)}
        />
        {roleErrors?.roleName && (
          <p className="text-sm text-destructive mt-1">
            {roleErrors.roleName.message}
          </p>
        )}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onHeadcountChange(Math.max(1, headcount - 1))}
          disabled={headcount <= 1}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          type="number"
          min={1}
          max={99}
          className="w-16 text-center"
          value={headcount}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val)) onHeadcountChange(Math.min(99, Math.max(1, val)));
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => onHeadcountChange(Math.min(99, headcount + 1))}
          disabled={headcount >= 99}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0 text-destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
