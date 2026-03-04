import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  departmentSchema,
  type DepartmentFormData,
} from "@/schemas/departmentSchema";
import { departmentService } from "@/services/departmentService";
import type { DepartmentListItem } from "@/services/departmentService";

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: DepartmentListItem | null;
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
}: DepartmentFormDialogProps) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!department;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: department
      ? {
          name: department.name,
          abbreviation: department.abbreviation,
          color: department.color,
          description: department.description ?? "",
          subMinistryNames: [],
        }
      : {
          name: "",
          abbreviation: "",
          color: "",
          description: "",
          subMinistryNames: [],
        },
    mode: "onBlur",
  });

  const [subMinistryInputs, setSubMinistryInputs] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async (data: DepartmentFormData) => {
      if (isEditMode) {
        const { subMinistryNames, ...updateData } = data;
        return departmentService.update(department!.id, updateData);
      }
      return departmentService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(
        t(
          isEditMode
            ? "pages.adminDepartments.updateSuccess"
            : "pages.adminDepartments.createSuccess"
        )
      );
      handleClose();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(t("pages.adminDepartments.conflictError"));
      }
    },
  });

  const handleClose = () => {
    reset();
    setSubMinistryInputs([]);
    onOpenChange(false);
  };

  const onSubmit = (data: DepartmentFormData) => {
    // Include sub-ministry names from separate state for create mode
    if (!isEditMode) {
      data.subMinistryNames = subMinistryInputs.filter((n) => n.trim() !== "");
    }
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEditMode
                ? "pages.adminDepartments.form.editTitle"
                : "pages.adminDepartments.form.createTitle"
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t("pages.adminDepartments.form.name")}
            </Label>
            <Input
              id="name"
              placeholder={t("pages.adminDepartments.form.namePlaceholder")}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="abbreviation">
                {t("pages.adminDepartments.form.abbreviation")} (
                {i18n.language === "fr" ? "optionnel" : "optional"})
              </Label>
              <Input
                id="abbreviation"
                placeholder={
                  watch("name")
                    ? watch("name").toUpperCase().slice(0, 10)
                    : t("pages.adminDepartments.form.abbreviationPlaceholder")
                }
                {...register("abbreviation")}
              />
              <p className="text-xs text-muted-foreground">
                {t("pages.adminDepartments.form.abbreviationHint")}
              </p>
              {errors.abbreviation && (
                <p className="text-sm text-destructive">
                  {errors.abbreviation.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">
                {t("pages.adminDepartments.form.color")}
              </Label>
              <ColorPicker
                id="color"
                value={watch("color") || ""}
                onChange={(color) => setValue("color", color, { shouldValidate: true })}
              />
              {errors.color && (
                <p className="text-sm text-destructive">
                  {errors.color.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              {t("pages.adminDepartments.form.description")} (
              {i18n.language === "fr" ? "optionnel" : "optional"})
            </Label>
            <Textarea
              id="description"
              placeholder={t(
                "pages.adminDepartments.form.descriptionPlaceholder"
              )}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Sub-ministries — create mode only */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label>{t("pages.adminDepartments.form.subMinistries")}</Label>
              <div className="space-y-2">
                {subMinistryInputs.map((value, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={value}
                      onChange={(e) => {
                        const newInputs = [...subMinistryInputs];
                        newInputs[index] = e.target.value;
                        setSubMinistryInputs(newInputs);
                      }}
                      placeholder={t(
                        "pages.adminDepartments.form.subMinistryPlaceholder"
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => {
                        setSubMinistryInputs(
                          subMinistryInputs.filter((_, i) => i !== index)
                        );
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubMinistryInputs([...subMinistryInputs, ""])}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t("pages.adminDepartments.form.addSubMinistry")}
              </Button>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("pages.adminDepartments.form.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t("pages.adminDepartments.form.saving")
                : t("pages.adminDepartments.form.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
