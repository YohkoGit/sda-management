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
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="title">{t("pages.adminActivities.form.title")}</Label>
        <Input
          id="title"
          placeholder={t("pages.adminActivities.form.titlePlaceholder")}
          className={`min-h-[44px] ${errors.title ? "border-red-500" : ""}`}
          {...register("title")}
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">{t("pages.adminActivities.form.description")}</Label>
        <Textarea
          id="description"
          placeholder={t("pages.adminActivities.form.descriptionPlaceholder")}
          className={`min-h-[44px] ${errors.description ? "border-red-500" : ""}`}
          {...register("description")}
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="date">{t("pages.adminActivities.form.date")}</Label>
        <Input
          id="date"
          type="date"
          className={`min-h-[44px] ${errors.date ? "border-red-500" : ""}`}
          {...register("date")}
        />
        {errors.date && (
          <p className="mt-1 text-sm text-red-500">{errors.date.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">{t("pages.adminActivities.form.startTime")}</Label>
          <Input
            id="startTime"
            type="time"
            className={`min-h-[44px] ${errors.startTime ? "border-red-500" : ""}`}
            {...register("startTime")}
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-500">{errors.startTime.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="endTime">{t("pages.adminActivities.form.endTime")}</Label>
          <Input
            id="endTime"
            type="time"
            className={`min-h-[44px] ${errors.endTime ? "border-red-500" : ""}`}
            {...register("endTime")}
          />
          {errors.endTime && (
            <p className="mt-1 text-sm text-red-500">{errors.endTime.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label>{t("pages.adminActivities.form.department")}</Label>
        <Select
          value={departmentId ? String(departmentId) : ""}
          onValueChange={(val) => setValue("departmentId", Number(val), { shouldValidate: true })}
          disabled={lockDepartment}
        >
          <SelectTrigger className={`min-h-[44px] ${errors.departmentId ? "border-red-500" : ""} ${lockDepartment ? "opacity-70" : ""}`}>
            <SelectValue placeholder={t("pages.adminActivities.form.department")} />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={String(dept.id)}>
                <span className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: dept.color }}
                  />
                  {dept.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.departmentId && (
          <p className="mt-1 text-sm text-red-500">{errors.departmentId.message}</p>
        )}
      </div>

      <div>
        <Label>{t("pages.adminActivities.form.visibility")}</Label>
        <div className="mt-2 flex gap-4">
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="public"
              checked={visibility === "public"}
              onChange={() => setValue("visibility", "public")}
              className="h-4 w-4"
            />
            {t("pages.adminActivities.form.visibilityPublic")}
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-2">
            <input
              type="radio"
              value="authenticated"
              checked={visibility === "authenticated"}
              onChange={() => setValue("visibility", "authenticated")}
              className="h-4 w-4"
            />
            {t("pages.adminActivities.form.visibilityAuthenticated")}
          </label>
        </div>
      </div>

      <div>
        <Label>{t("pages.adminActivities.form.specialType")}</Label>
        <Controller
          name="specialType"
          control={control}
          render={({ field, fieldState }) => (
            <Select
              value={field.value ?? "none"}
              onValueChange={(val) => field.onChange(val === "none" ? null : val)}
            >
              <SelectTrigger
                className={`min-h-[44px] ${fieldState.invalid ? "border-red-500" : ""}`}
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

      <Separator className="my-4" />
      <div>
        <h3 className="text-lg font-semibold mb-3">
          {t("pages.adminActivities.roleRoster.title")}
        </h3>
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={isPending} className="min-h-[44px]">
          {isPending
            ? t("pages.adminActivities.form.saving")
            : t("pages.adminActivities.form.save")}
        </Button>
      </div>
    </form>
  );
}
