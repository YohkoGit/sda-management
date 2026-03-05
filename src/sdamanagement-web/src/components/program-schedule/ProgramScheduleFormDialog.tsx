import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  programScheduleSchema,
  type ProgramScheduleFormData,
} from "@/schemas/programScheduleSchema";
import { programScheduleService } from "@/services/programScheduleService";
import type { ProgramScheduleListItem } from "@/services/programScheduleService";
import {
  departmentService,
  type DepartmentListItem,
} from "@/services/departmentService";

interface ProgramScheduleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ProgramScheduleListItem | null;
}

const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6];

export function ProgramScheduleFormDialog({
  open,
  onOpenChange,
  schedule,
}: ProgramScheduleFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!schedule;

  const { data: departments } = useQuery<DepartmentListItem[]>({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await departmentService.getAll();
      return res.data;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProgramScheduleFormData>({
    resolver: zodResolver(programScheduleSchema),
    defaultValues: isEditMode
      ? {
          title: schedule.title,
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          hostName: schedule.hostName ?? "",
          departmentId: schedule.departmentId,
        }
      : {
          title: "",
          dayOfWeek: 6,
          startTime: "",
          endTime: "",
          hostName: "",
          departmentId: null,
        },
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: async (data: ProgramScheduleFormData) => {
      if (isEditMode) {
        return programScheduleService.update(schedule!.id, data);
      }
      return programScheduleService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-schedules"] });
      toast.success(
        t(
          isEditMode
            ? "pages.adminProgramSchedules.updateSuccess"
            : "pages.adminProgramSchedules.createSuccess"
        )
      );
      handleClose();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(t("pages.adminProgramSchedules.conflictError"));
      } else {
        toast.error(t("common.error.generic"));
      }
    },
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const watchedDayOfWeek = watch("dayOfWeek");
  const watchedDepartmentId = watch("departmentId");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEditMode
                ? "pages.adminProgramSchedules.form.editTitle"
                : "pages.adminProgramSchedules.form.createTitle"
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <fieldset disabled={mutation.isPending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-title">
              {t("pages.adminProgramSchedules.form.title")}
            </Label>
            <Input
              id="schedule-title"
              placeholder={t(
                "pages.adminProgramSchedules.form.titlePlaceholder"
              )}
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("pages.adminProgramSchedules.form.dayOfWeek")}</Label>
            <Select
              value={String(watchedDayOfWeek)}
              onValueChange={(val) =>
                setValue("dayOfWeek", Number(val), { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    {t(`days.${day}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.dayOfWeek && (
              <p className="text-sm text-destructive">
                {errors.dayOfWeek.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schedule-start-time">
                {t("pages.adminProgramSchedules.form.startTime")}
              </Label>
              <Input
                id="schedule-start-time"
                type="time"
                step="60"
                {...register("startTime")}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">
                  {errors.startTime.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="schedule-end-time">
                {t("pages.adminProgramSchedules.form.endTime")}
              </Label>
              <Input
                id="schedule-end-time"
                type="time"
                step="60"
                {...register("endTime")}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="schedule-host-name">
              {t("pages.adminProgramSchedules.form.hostName")}
            </Label>
            <Input
              id="schedule-host-name"
              placeholder={t(
                "pages.adminProgramSchedules.form.hostNamePlaceholder"
              )}
              {...register("hostName")}
            />
            {errors.hostName && (
              <p className="text-sm text-destructive">
                {errors.hostName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("pages.adminProgramSchedules.form.department")}</Label>
            <Select
              value={watchedDepartmentId ? String(watchedDepartmentId) : "none"}
              onValueChange={(val) =>
                setValue(
                  "departmentId",
                  val === "none" ? null : Number(val),
                  { shouldValidate: true }
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  {t("pages.adminProgramSchedules.form.departmentNone")}
                </SelectItem>
                {departments?.map((dept) => (
                  <SelectItem key={dept.id} value={String(dept.id)}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("pages.adminProgramSchedules.form.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t("pages.adminProgramSchedules.form.saving")
                : t("pages.adminProgramSchedules.form.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
