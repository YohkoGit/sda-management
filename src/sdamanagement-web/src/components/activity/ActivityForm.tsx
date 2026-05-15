import { useTranslation } from "react-i18next";
import { useForm, Controller } from "react-hook-form";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  baseActivitySchema,
  createActivitySchema,
  SPECIAL_TYPES,
  type CreateActivityFormData,
} from "@/schemas/activitySchema";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/typography";
import type { DepartmentListItem } from "@/services/departmentService";
import type { AssignableOfficer } from "@/services/userService";
import RoleRosterEditor from "./RoleRosterEditor";
import { DateField } from "./DateField";
import { TimeField } from "./TimeField";
import { TagPicker } from "./TagPicker";
import { DeptField } from "./DeptField";
import { ActivityFormStepper } from "./ActivityFormStepper";
import { ActivityFormSidePanel } from "./ActivityFormSidePanel";

export interface ActivityFormProps {
  onSubmit: (data: CreateActivityFormData) => void;
  isPending: boolean;
  departments: DepartmentListItem[];
  defaultValues?: Partial<CreateActivityFormData>;
  existingAssignments?: Map<number, number>;
  initialGuestOfficers?: AssignableOfficer[];
  lockDepartment?: boolean;
  isEditing?: boolean;
  /** When true (create flow), shows stepper + side panel preview. */
  showStepperAndPreview?: boolean;
  /** True if the create flow came through a template. */
  templateApplied?: boolean;
}

export function ActivityForm({
  onSubmit,
  isPending,
  departments,
  defaultValues,
  existingAssignments,
  initialGuestOfficers,
  lockDepartment,
  isEditing,
  showStepperAndPreview,
  templateApplied,
}: ActivityFormProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    control,
    formState: { errors, isDirty },
  } = useForm<CreateActivityFormData>({
    resolver: zodResolver(isEditing ? baseActivitySchema : createActivitySchema),
    defaultValues: {
      title: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      departmentId: 0,
      visibility: "public",
      roles: [],
      ...defaultValues,
    },
    mode: "onBlur",
  });

  useUnsavedChangesGuard(isDirty);

  const visibility = watch("visibility");
  const roles = watch("roles");
  const hasRoles = Array.isArray(roles) && roles.length > 0;

  const formNode = (
    <form id="activity-form" onSubmit={handleSubmit(onSubmit)} className="space-y-7">
      <div className="space-y-2">
        <Label htmlFor="title" className="eyebrow">
          {t("pages.adminActivities.form.title")}
        </Label>
        <Input
          id="title"
          placeholder={t("pages.adminActivities.form.titlePlaceholder")}
          aria-invalid={!!errors.title}
          {...register("title")}
        />
        {errors.title && (
          <p className="text-sm text-[var(--rose)]">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="eyebrow">
          {t("pages.adminActivities.form.description")}
        </Label>
        <Textarea
          id="description"
          placeholder={t("pages.adminActivities.form.descriptionPlaceholder")}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-[var(--rose)]">{errors.description.message}</p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="date" className="eyebrow">
            {t("pages.adminActivities.form.date")}
          </Label>
          <Controller
            name="date"
            control={control}
            render={({ field, fieldState }) => (
              <DateField
                id="date"
                value={field.value}
                onChange={field.onChange}
                ariaInvalid={fieldState.invalid}
                ariaLabel={t("pages.adminActivities.form.date")}
              />
            )}
          />
          {errors.date && (
            <p className="text-sm text-[var(--rose)]">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime" className="eyebrow">
            {t("pages.adminActivities.form.startTime")}
          </Label>
          <Controller
            name="startTime"
            control={control}
            render={({ field, fieldState }) => (
              <TimeField
                id="startTime"
                value={field.value}
                onChange={field.onChange}
                ariaInvalid={fieldState.invalid}
                ariaLabel={t("pages.adminActivities.form.startTime")}
                label={t("pages.adminActivities.form.startTime")}
              />
            )}
          />
          {errors.startTime && (
            <p className="text-sm text-[var(--rose)]">{errors.startTime.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime" className="eyebrow">
            {t("pages.adminActivities.form.endTime")}
          </Label>
          <Controller
            name="endTime"
            control={control}
            render={({ field, fieldState }) => (
              <TimeField
                id="endTime"
                value={field.value}
                onChange={field.onChange}
                ariaInvalid={fieldState.invalid}
                ariaLabel={t("pages.adminActivities.form.endTime")}
                label={t("pages.adminActivities.form.endTime")}
              />
            )}
          />
          {errors.endTime && (
            <p className="text-sm text-[var(--rose)]">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="eyebrow">{t("pages.adminActivities.form.department")}</Label>
          <Controller
            name="departmentId"
            control={control}
            render={({ field, fieldState }) => (
              <DeptField
                value={field.value}
                onChange={field.onChange}
                departments={departments}
                disabled={lockDepartment}
                ariaInvalid={fieldState.invalid}
                ariaLabel={t("pages.adminActivities.form.department")}
                placeholder={t("pages.adminActivities.form.department")}
              />
            )}
          />
          {errors.departmentId && (
            <p className="text-sm text-[var(--rose)]">{errors.departmentId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="eyebrow">{t("pages.adminActivities.form.specialType")}</Label>
          <Controller
            name="specialType"
            control={control}
            render={({ field }) => (
              <TagPicker
                value={field.value ?? null}
                onChange={field.onChange}
                noneLabel={t("pages.adminActivities.form.specialTypeNone")}
                options={SPECIAL_TYPES.map((type) => ({
                  value: type,
                  label: t(`pages.adminActivities.specialType.${type}`),
                }))}
                ariaLabel={t("pages.adminActivities.form.specialType")}
              />
            )}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="eyebrow">{t("pages.adminActivities.form.visibility")}</Label>
        <div className="inline-flex overflow-hidden rounded-[var(--radius)] border border-[var(--hairline-2)]">
          {(["public", "authenticated"] as const).map((option) => {
            const active = visibility === option;
            return (
              <Eyebrow
                key={option}
                asChild
                className={[
                  "px-4 py-2.5 transition-colors",
                  active
                    ? "bg-[var(--ink)] text-[var(--parchment)]"
                    : "bg-[var(--parchment-2)] text-[var(--ink-2)] hover:bg-[var(--parchment-3)]",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setValue("visibility", option, { shouldDirty: true })}
                  aria-pressed={active}
                >
                  {option === "public"
                    ? t("pages.adminActivities.form.visibilityPublic")
                    : t("pages.adminActivities.form.visibilityAuthenticated")}
                </button>
              </Eyebrow>
            );
          })}
        </div>
      </div>

      <div className="border-t border-[var(--hairline)] pt-7">
        <Eyebrow gilt>{t("pages.adminActivities.roleRoster.kicker", "Rôles")}</Eyebrow>
        <h3 className="mt-2 font-display text-2xl leading-tight text-[var(--ink)]">
          {t("pages.adminActivities.roleRoster.title")}
        </h3>
        <div className="mt-5">
          <RoleRosterEditor
            control={control}
            register={register}
            setValue={setValue}
            getValues={getValues}
            errors={errors}
            existingAssignments={existingAssignments}
            initialGuestOfficers={initialGuestOfficers}
          />
        </div>
      </div>

      {!showStepperAndPreview && (
        <div className="flex justify-end gap-3 border-t border-[var(--hairline)] pt-6">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? t("pages.adminActivities.form.saving")
              : <>
                  {t("pages.adminActivities.form.save")} →
                </>}
          </Button>
        </div>
      )}
    </form>
  );

  if (!showStepperAndPreview) {
    return formNode;
  }

  return (
    <div className="space-y-8">
      <ActivityFormStepper templateApplied={!!templateApplied} hasRoles={hasRoles} />

      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
        <div>{formNode}</div>
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ActivityFormSidePanel
            control={control}
            departments={departments}
            templateApplied={!!templateApplied}
          />
          <div className="mt-8 border-t border-[var(--hairline)] pt-6">
            <Button type="submit" form="activity-form" disabled={isPending} className="w-full">
              {isPending
                ? t("pages.adminActivities.form.saving")
                : <>
                    {t("pages.adminActivities.form.save")} →
                  </>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
