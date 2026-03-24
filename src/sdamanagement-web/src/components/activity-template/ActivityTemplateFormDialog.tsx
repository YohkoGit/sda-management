import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  activityTemplateSchema,
  type ActivityTemplateFormData,
} from "@/schemas/activityTemplateSchema";
import { activityTemplateService } from "@/services/activityTemplateService";
import type { ActivityTemplateListItem } from "@/services/activityTemplateService";
import { TemplateRoleRow } from "./TemplateRoleRow";

interface ActivityTemplateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: ActivityTemplateListItem | null;
  editRoles?: { roleName: string; defaultHeadcount: number }[];
}

export function ActivityTemplateFormDialog({
  open,
  onOpenChange,
  template,
  editRoles,
}: ActivityTemplateFormDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const isEditMode = !!template;

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ActivityTemplateFormData>({
    resolver: zodResolver(activityTemplateSchema),
    defaultValues: isEditMode
      ? {
          name: template.name,
          description: template.description ?? "",
          roles: editRoles ?? [{ roleName: "", defaultHeadcount: 1 }],
        }
      : {
          name: "",
          description: "",
          roles: [{ roleName: "", defaultHeadcount: 1 }],
        },
    mode: "onBlur",
  });

  useUnsavedChangesGuard(isDirty);

  const { fields, append, remove } = useFieldArray({ control, name: "roles" });

  const mutation = useMutation({
    mutationFn: async (data: ActivityTemplateFormData) => {
      if (isEditMode) {
        return activityTemplateService.update(template!.id, data);
      }
      return activityTemplateService.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-templates"] });
      toast.success(
        t(
          isEditMode
            ? "pages.adminActivityTemplates.updateSuccess"
            : "pages.adminActivityTemplates.createSuccess"
        )
      );
      handleClose();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        toast.error(t("pages.adminActivityTemplates.conflictError"));
      } else {
        toast.error(t("common.error.generic"));
      }
    },
  });

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      if (!window.confirm("Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?")) {
        return;
      }
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t(
              isEditMode
                ? "pages.adminActivityTemplates.form.editTitle"
                : "pages.adminActivityTemplates.form.createTitle"
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))}>
          <fieldset disabled={mutation.isPending} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template-name">
              {t("pages.adminActivityTemplates.form.name")}
            </Label>
            <Input
              id="template-name"
              placeholder={t(
                "pages.adminActivityTemplates.form.namePlaceholder"
              )}
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-description">
              {t("pages.adminActivityTemplates.form.description")}
            </Label>
            <Textarea
              id="template-description"
              placeholder={t(
                "pages.adminActivityTemplates.form.descriptionPlaceholder"
              )}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("pages.adminActivityTemplates.form.roles")}</Label>
              <span className="text-xs text-muted-foreground">
                {t("pages.adminActivityTemplates.form.headcount")}
              </span>
            </div>
            <div className="space-y-2">
              {fields.map((field, index) => (
                <TemplateRoleRow
                  key={field.id}
                  index={index}
                  register={register}
                  errors={errors}
                  headcount={watch(`roles.${index}.defaultHeadcount`)}
                  onHeadcountChange={(val) =>
                    setValue(`roles.${index}.defaultHeadcount`, val, {
                      shouldValidate: true,
                    })
                  }
                  onRemove={() => remove(index)}
                  canRemove={fields.length > 1}
                />
              ))}
            </div>
            {errors.roles?.root && (
              <p className="text-sm text-destructive">
                {errors.roles.root.message}
              </p>
            )}
            {errors.roles?.message && (
              <p className="text-sm text-destructive">
                {errors.roles.message}
              </p>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ roleName: "", defaultHeadcount: 1 })}
            >
              <Plus className="mr-1 h-4 w-4" />
              {t("pages.adminActivityTemplates.form.addRole")}
            </Button>
          </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("pages.adminActivityTemplates.form.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending
                ? t("pages.adminActivityTemplates.form.saving")
                : t("pages.adminActivityTemplates.form.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
