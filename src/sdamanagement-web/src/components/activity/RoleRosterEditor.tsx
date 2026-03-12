import { useState, memo } from "react";
import { useFieldArray, useWatch } from "react-hook-form";
import type { Control, UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Plus, Minus, Trash2, X } from "lucide-react";
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
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import ContactPicker from "./ContactPicker";
import { toast } from "sonner";
import { useAssignableOfficers } from "@/hooks/useAssignableOfficers";
import { userService } from "@/services/userService";
import type { CreateActivityFormData } from "@/schemas/activitySchema";
import type { AssignableOfficer } from "@/services/userService";

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

function AssignmentChip({
  officer,
  onRemove,
}: {
  officer: AssignableOfficer;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const isGuest = officer.isGuest === true;
  const displayName = isGuest
    ? `${officer.firstName} ${officer.lastName}`.trim()
    : `${officer.lastName}, ${officer.firstName.charAt(0)}.`;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-xl border bg-background px-2 py-1"
      data-testid={isGuest ? "guest-assignment-chip" : undefined}
    >
      <InitialsAvatar
        firstName={officer.firstName}
        lastName={officer.lastName}
        size="xs"
        avatarUrl={officer.avatarUrl ?? undefined}
        className={isGuest ? "!bg-slate-200" : undefined}
      />
      <span className="flex flex-col">
        <span className="max-w-[10rem] truncate text-sm">{displayName}</span>
        {isGuest && (
          <span className="text-[10px] text-muted-foreground leading-none">
            {t("pages.adminActivities.roleRoster.guestLabel")}
          </span>
        )}
      </span>
      <button
        type="button"
        className="p-2 -mr-1 text-muted-foreground hover:text-foreground"
        onClick={onRemove}
        aria-label={t("pages.adminActivities.roleRoster.removeAssignment", {
          name: `${officer.firstName} ${officer.lastName}`,
        })}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

const RoleRow = memo(function RoleRow({
  index,
  control,
  register,
  setValue,
  errors,
  officers,
  allAssignments,
  onCreateGuest,
}: {
  index: number;
  control: Control<CreateActivityFormData>;
  register: UseFormRegister<CreateActivityFormData>;
  setValue: UseFormSetValue<CreateActivityFormData>;
  errors: FieldErrors<CreateActivityFormData>;
  officers: AssignableOfficer[];
  allAssignments: { userId: number }[][];
  onCreateGuest?: (data: { name: string; phone?: string }) => void;
}) {
  const { t } = useTranslation();
  const [pickerActive, setPickerActive] = useState(false);

  const watchedRole = useWatch({ control, name: `roles.${index}` });
  const roleErrors = errors.roles?.[index];
  const roleNameError = roleErrors?.roleName;
  const watchedHeadcount = watchedRole?.headcount ?? 1;
  const watchedRoleName = watchedRole?.roleName ?? "";
  const roleAssignments = watchedRole?.assignments ?? [];

  // Build assigned count: from form state assignments
  const assignedCount = roleAssignments.length;

  // Compute frequent userIds from all assignments across all roles (deduplicated)
  const frequentUserIds = [...new Set(allAssignments.flat().map((a) => a.userId))];

  const handleAddAssignment = (userId: number) => {
    const current = roleAssignments;
    setValue(`roles.${index}.assignments`, [...current, { userId }]);
    setPickerActive(false);
  };

  const handleRemoveAssignment = (userId: number) => {
    const current = roleAssignments;
    setValue(
      `roles.${index}.assignments`,
      current.filter((a) => a.userId !== userId)
    );
  };

  const assignedUserIds = roleAssignments.map((a) => a.userId);

  return (
    <div
      role="group"
      aria-label={`Role ${index + 1}: ${watchedRoleName || t("pages.adminActivities.roleRoster.roleNamePlaceholder")}`}
      className={cn(
        "flex flex-col gap-2 rounded-lg border p-3",
        pickerActive && "ring-2 ring-primary"
      )}
    >
      <input type="hidden" {...register(`roles.${index}.id`, { valueAsNumber: true })} />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
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
        </div>
      </div>

      {/* Assignment chips area */}
      <div className="flex flex-wrap gap-1.5">
        {roleAssignments.map((assignment) => {
          const officer = officers.find((o) => o.userId === assignment.userId);
          if (!officer) return null;
          return (
            <AssignmentChip
              key={assignment.userId}
              officer={officer}
              onRemove={() => handleRemoveAssignment(assignment.userId)}
            />
          );
        })}

        {/* Empty slot placeholders */}
        {assignedCount < watchedHeadcount &&
          Array.from({ length: Math.min(watchedHeadcount - assignedCount, 3) }).map((_, i) => (
            <span
              key={`empty-${i}`}
              className="inline-flex items-center gap-1 rounded-xl border border-dashed px-3 py-1.5 text-xs text-muted-foreground"
            >
              {t("pages.adminActivities.roleRoster.unassigned")}
            </span>
          ))}

        {/* Add assignment trigger */}
        <ContactPicker
          officers={officers}
          assignedUserIds={assignedUserIds}
          headcount={watchedHeadcount}
          roleName={watchedRoleName}
          onSelect={handleAddAssignment}
          onOpenChange={setPickerActive}
          onCreateGuest={onCreateGuest}
          frequentUserIds={frequentUserIds}
          trigger={<Plus className="h-4 w-4" />}
        />
      </div>
    </div>
  );
});

export default function RoleRosterEditor({
  control,
  register,
  setValue,
  errors,
  existingAssignments,
  initialGuestOfficers,
}: {
  control: Control<CreateActivityFormData>;
  register: UseFormRegister<CreateActivityFormData>;
  setValue: UseFormSetValue<CreateActivityFormData>;
  errors: FieldErrors<CreateActivityFormData>;
  existingAssignments?: Map<number, number>;
  initialGuestOfficers?: AssignableOfficer[];
}) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: "roles" });
  const watchedRoles = useWatch({ control, name: "roles" });
  const [roleToRemove, setRoleToRemove] = useState<{ index: number; assignmentCount: number } | null>(null);
  const { officers } = useAssignableOfficers();
  const [guestOfficers, setGuestOfficers] = useState<AssignableOfficer[]>(
    initialGuestOfficers ?? []
  );

  const handleCreateGuest = async (data: { name: string; phone?: string }, roleIndex: number) => {
    try {
      const response = await userService.createGuest(data);
      const guestOfficer: AssignableOfficer = {
        userId: response.data.userId,
        firstName: response.data.firstName,
        lastName: response.data.lastName,
        avatarUrl: null,
        departments: [],
        isGuest: true,
      };
      setGuestOfficers((prev) => [...prev, guestOfficer]);
      const currentAssignments = watchedRoles?.[roleIndex]?.assignments ?? [];
      setValue(`roles.${roleIndex}.assignments`, [...currentAssignments, { userId: response.data.userId }]);
    } catch (error) {
      toast.error(t("pages.adminActivities.contactPicker.guestError"));
      throw error;
    }
  };

  const mergedOfficers = [...officers, ...guestOfficers];

  const handleRemove = (index: number) => {
    const dbId = watchedRoles?.[index]?.id;
    const formAssignments = watchedRoles?.[index]?.assignments?.length ?? 0;
    const existingCount = dbId && existingAssignments ? (existingAssignments.get(dbId) ?? 0) : 0;
    const assignmentCount = Math.max(formAssignments, existingCount);

    if (assignmentCount > 0) {
      setRoleToRemove({ index, assignmentCount });
    } else {
      remove(index);
    }
  };

  const allAssignments = (watchedRoles ?? []).map((r) => r?.assignments ?? []);

  const rolesError = errors.roles;
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
          {fields.map((field, index) => (
            <div key={field.id} className="relative">
              <RoleRow
                index={index}
                control={control}
                register={register}
                setValue={setValue}
                errors={errors}
                officers={mergedOfficers}
                allAssignments={allAssignments}
                onCreateGuest={(data) => handleCreateGuest(data, index)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-11 w-11 sm:h-9 sm:w-9 text-destructive"
                onClick={() => handleRemove(index)}
                aria-label={`${t("pages.adminActivities.roleRoster.removeRole")} ${watchedRoles?.[index]?.roleName ?? ""}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
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
              variant="destructive"
              className="min-h-[44px]"
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
