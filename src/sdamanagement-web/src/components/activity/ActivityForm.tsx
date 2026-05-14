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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/typography";
import { deptSwatchColor } from "@/lib/dept-color";
import type { DepartmentListItem } from "@/services/departmentService";
import type { AssignableOfficer } from "@/services/userService";
import RoleRosterEditor from "./RoleRosterEditor";

export interface ActivityFormProps {
  onSubmit: (data: CreateActivityFormData) => void;
  isPending: boolean;
  departments: DepartmentListItem[];
  defaultValues?: Partial<CreateActivityFormData>;
  existingAssignments?: Map<number, number>;
  initialGuestOfficers?: AssignableOfficer[];
  lockDepartment?: boolean;
  isEditing?: boolean;
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
  const departmentId = watch("departmentId");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
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
          <Input
            id="date"
            type="date"
            aria-invalid={!!errors.date}
            {...register("date")}
          />
          {errors.date && (
            <p className="text-sm text-[var(--rose)]">{errors.date.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="startTime" className="eyebrow">
            {t("pages.adminActivities.form.startTime")}
          </Label>
          <Input
            id="startTime"
            type="time"
            aria-invalid={!!errors.startTime}
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="text-sm text-[var(--rose)]">{errors.startTime.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime" className="eyebrow">
            {t("pages.adminActivities.form.endTime")}
          </Label>
          <Input
            id="endTime"
            type="time"
            aria-invalid={!!errors.endTime}
            {...register("endTime")}
          />
          {errors.endTime && (
            <p className="text-sm text-[var(--rose)]">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="eyebrow">{t("pages.adminActivities.form.department")}</Label>
          <Select
            value={departmentId ? String(departmentId) : ""}
            onValueChange={(val) =>
              setValue("departmentId", Number(val), { shouldValidate: true })
            }
            disabled={lockDepartment}
          >
            <SelectTrigger
              className={[
                "w-full",
                errors.departmentId ? "border-[var(--rose)]" : "",
                lockDepartment ? "opacity-70" : "",
              ].join(" ")}
            >
              <SelectValue placeholder={t("pages.adminActivities.form.department")} />
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
                    />
                    {dept.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.departmentId && (
            <p className="text-sm text-[var(--rose)]">{errors.departmentId.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="eyebrow">{t("pages.adminActivities.form.specialType")}</Label>
          <Controller
            name="specialType"
            control={control}
            render={({ field, fieldState }) => (
              <Select
                value={field.value ?? "none"}
                onValueChange={(val) => field.onChange(val === "none" ? null : val)}
              >
                <SelectTrigger
                  className={[
                    "w-full",
                    fieldState.invalid ? "border-[var(--rose)]" : "",
                  ].join(" ")}
                  aria-label={t("pages.adminActivities.form.specialType")}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder={t("pages.adminActivities.form.specialTypeNone")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("pages.adminActivities.form.specialTypeNone")}</SelectItem>
                  {SPECIAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {t(`pages.adminActivities.specialType.${type}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <button
                key={option}
                type="button"
                onClick={() => setValue("visibility", option, { shouldDirty: true })}
                className={[
                  "px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors",
                  active
                    ? "bg-[var(--ink)] text-[var(--parchment)]"
                    : "bg-[var(--parchment-2)] text-[var(--ink-2)] hover:bg-[var(--parchment-3)]",
                ].join(" ")}
                aria-pressed={active}
              >
                {option === "public"
                  ? t("pages.adminActivities.form.visibilityPublic")
                  : t("pages.adminActivities.form.visibilityAuthenticated")}
              </button>
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

      <div className="flex justify-end gap-3 border-t border-[var(--hairline)] pt-6">
        <Button type="submit" disabled={isPending}>
          {isPending
            ? t("pages.adminActivities.form.saving")
            : <>
                {t("pages.adminActivities.form.save")} →
              </>}
        </Button>
      </div>
    </form>
  );
}
