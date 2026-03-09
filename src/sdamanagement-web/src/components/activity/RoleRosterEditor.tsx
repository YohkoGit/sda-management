import { useState } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import type { Control, UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Plus, Minus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CreateActivityFormData } from "@/schemas/activitySchema";

function AssignmentBadge({ assigned, total }: { assigned: number; total: number }) {
  const isFull = assigned >= total;
  const isPartial = assigned > 0 && !isFull;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium border",
        isFull && "bg-primary/10 text-primary border-primary/20",
        isPartial && "bg-warning/10 text-warning border-warning/20",
        !isFull && !isPartial && "bg-muted text-muted-foreground border-border"
      )}
    >
      <span
        className={cn(
          "inline-block h-2 w-2 rounded-full",
          isFull && "bg-primary",
          isPartial && "bg-warning border border-warning",
          !isFull && !isPartial && "border border-muted-foreground"
        )}
        aria-hidden="true"
      />
      {assigned}/{total}
    </span>
  );
}

function HeadcountStepper({
  index,
  control,
  setValue,
}: {
  index: number;
  control: Control<CreateActivityFormData>;
  setValue: UseFormSetValue<CreateActivityFormData>;
}) {
  const { t } = useTranslation();
  const rawValue = useWatch({ control, name: `roles.${index}.headcount` });
  const value = rawValue ?? 1;
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 sm:h-9 sm:w-9"
        disabled={value <= 1}
        onClick={() => setValue(`roles.${index}.headcount`, value - 1)}
        aria-label={t("pages.adminActivities.roleRoster.decreaseHeadcount")}
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-8 text-center text-sm font-medium tabular-nums">{value}</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-11 w-11 sm:h-9 sm:w-9"
        disabled={value >= 99}
        onClick={() => setValue(`roles.${index}.headcount`, value + 1)}
        aria-label={t("pages.adminActivities.roleRoster.increaseHeadcount")}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default function RoleRosterEditor({
  control,
  register,
  setValue,
  errors,
  existingAssignments,
}: {
  control: Control<CreateActivityFormData>;
  register: UseFormRegister<CreateActivityFormData>;
  setValue: UseFormSetValue<CreateActivityFormData>;
  errors: FieldErrors<CreateActivityFormData>;
  existingAssignments?: Map<number, number>;
}) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: "roles" });
  const watchedRoles = useWatch({ control, name: "roles" });
  const [roleToRemove, setRoleToRemove] = useState<{ index: number; assignmentCount: number } | null>(null);

  const handleRemove = (index: number) => {
    const dbId = watchedRoles?.[index]?.id;
    const assignmentCount = dbId && existingAssignments ? (existingAssignments.get(dbId) ?? 0) : 0;

    if (assignmentCount > 0) {
      setRoleToRemove({ index, assignmentCount });
    } else {
      remove(index);
    }
  };

  const rolesError = errors.roles;
  // RHF v7 field arrays: root-level errors may be at .root (useFieldArray) or directly on the object
  const arrayLevelError =
    (rolesError && "root" in rolesError ? (rolesError.root as { message?: string } | undefined)?.message : undefined) ??
    (rolesError && "message" in rolesError ? (rolesError as { message?: string }).message : undefined);

  return (
    <div>
      {arrayLevelError && (
        <p className="mb-2 text-sm text-red-500" role="alert">
          {arrayLevelError}
        </p>
      )}

      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-3">
          {t("pages.adminActivities.roleRoster.emptyState")}
        </p>
      ) : (
        <div className="space-y-3">
          {fields.map((field, index) => {
            const roleErrors = errors.roles?.[index];
            const roleNameError = roleErrors?.roleName;
            const dbRoleId = watchedRoles?.[index]?.id;
            const assignedCount =
              dbRoleId && existingAssignments ? (existingAssignments.get(dbRoleId) ?? 0) : 0;
            const watchedHeadcount = watchedRoles?.[index]?.headcount ?? 1;
            const watchedRoleName = watchedRoles?.[index]?.roleName ?? "";

            return (
              <div
                key={field.id}
                role="group"
                aria-label={`Role ${index + 1}: ${watchedRoleName || t("pages.adminActivities.roleRoster.roleNamePlaceholder")}`}
                className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
              >
                <input type="hidden" {...register(`roles.${index}.id`, { valueAsNumber: true })} />

                <div className="flex-1">
                  <Label
                    htmlFor={`role-name-${index}`}
                    className="sr-only sm:not-sr-only sm:text-sm sm:font-medium"
                  >
                    {t("pages.adminActivities.roleRoster.roleNamePlaceholder")}
                  </Label>
                  <Input
                    id={`role-name-${index}`}
                    placeholder={t("pages.adminActivities.roleRoster.roleNamePlaceholder")}
                    className={cn("min-h-[44px]", roleNameError && "border-red-500")}
                    aria-describedby={roleNameError ? `role-name-error-${index}` : undefined}
                    {...register(`roles.${index}.roleName`)}
                  />
                  {roleNameError && (
                    <p id={`role-name-error-${index}`} className="mt-1 text-sm text-red-500">
                      {roleNameError.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-start sm:gap-3">
                  <HeadcountStepper index={index} control={control} setValue={setValue} />
                  <AssignmentBadge assigned={assignedCount} total={watchedHeadcount} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 sm:h-9 sm:w-9 text-destructive"
                    onClick={() => handleRemove(index)}
                    aria-label={`${t("pages.adminActivities.roleRoster.removeRole")} ${watchedRoleName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-3 min-h-[44px]"
        disabled={fields.length >= 20}
        onClick={() => append({ roleName: "", headcount: 1 })}
      >
        <Plus className="mr-1 h-4 w-4" />
        {fields.length >= 20
          ? t("pages.adminActivities.roleRoster.maxRolesReached")
          : t("pages.adminActivities.roleRoster.addRole")}
      </Button>

      {/* Confirmation dialog for removing roles with assignments */}
      <AlertDialog
        open={!!roleToRemove}
        onOpenChange={(open) => !open && setRoleToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("pages.adminActivities.roleRoster.removeRoleConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.adminActivities.roleRoster.removeRoleConfirmDescription", {
                count: roleToRemove?.assignmentCount ?? 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-[44px]">
              {t("pages.adminActivities.roleRoster.cancelButton")}
            </AlertDialogCancel>
            <AlertDialogAction
              className="min-h-[44px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (roleToRemove) {
                  remove(roleToRemove.index);
                  setRoleToRemove(null);
                }
              }}
            >
              {t("pages.adminActivities.roleRoster.removeRoleConfirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
