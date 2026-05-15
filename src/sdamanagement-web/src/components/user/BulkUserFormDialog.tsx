import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DepartmentMultiSelect } from "./DepartmentMultiSelect";
import {
  bulkCreateUsersSchema,
  type BulkCreateUsersFormData,
} from "@/schemas/userSchema";
import { userService } from "@/services/userService";
import { departmentService } from "@/services/departmentService";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";

const MAX_ROWS = 30;

const emptyRow = () => ({
  firstName: "",
  lastName: "",
  email: "",
  role: "Viewer" as const,
  departmentIds: [] as number[],
});

interface BulkUserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkUserFormDialog({ open, onOpenChange }: BulkUserFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOwner, isAdmin } = useRole();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    getValues,
    formState: { errors },
  } = useForm<BulkCreateUsersFormData>({
    resolver: zodResolver(bulkCreateUsersSchema),
    defaultValues: {
      users: [emptyRow(), emptyRow(), emptyRow()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "users",
    rules: { minLength: 1, maxLength: MAX_ROWS },
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentService.getAll().then((res) => res.data),
    enabled: open,
  });

  const allDepartments = departmentsData ?? [];
  const departments = isAdmin && user?.departmentIds
    ? allDepartments.filter((d) => user.departmentIds!.includes(d.id))
    : allDepartments;

  const roleOptions = isOwner
    ? ["Viewer", "Admin", "Owner"]
    : ["Viewer", "Admin"];

  const mutation = useMutation({
    mutationFn: (data: BulkCreateUsersFormData) =>
      userService.bulkCreateUsers(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("pages.adminUsers.toast.bulkCreated", { count: response.data.count }));
      handleClose();
    },
    onError: (error) => {
      if (isAxiosError(error) && error.response?.status === 400) {
        const problemDetails = error.response.data;
        if (problemDetails.errors) {
          Object.entries(problemDetails.errors).forEach(([key, messages]) => {
            const formPath = key
              .replace(/\[(\d+)\]/g, ".$1")
              .split(".")
              .map((s) => (/^\d+$/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1)))
              .join(".");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            setError(formPath as any, {
              message: (messages as string[])[0],
            });
          });
        }
        toast.error(t("pages.adminUsers.toast.error.bulkValidation"));
      }
      if (isAxiosError(error) && error.response?.status === 409) {
        const conflictingEmail = error.response.data?.conflictingEmail;
        if (conflictingEmail) {
          const rowIndex = getValues("users").findIndex(
            (u) => u.email.toLowerCase() === conflictingEmail.toLowerCase()
          );
          if (rowIndex >= 0) {
            setError(`users.${rowIndex}.email`, {
              message: t("pages.adminUsers.toast.error.duplicate"),
            });
            return;
          }
        }
        toast.error(t("pages.adminUsers.toast.error.duplicate"));
      }
      if (isAxiosError(error) && error.response?.status === 403) {
        toast.error(t("pages.adminUsers.toast.error.forbidden"));
      }
    },
  });

  const handleClose = () => {
    reset({ users: [emptyRow(), emptyRow(), emptyRow()] });
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      reset({ users: [emptyRow(), emptyRow(), emptyRow()] });
    }
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("pages.adminUsers.bulkForm.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-4 min-h-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t("pages.adminUsers.bulkForm.rowCount", {
                current: fields.length,
                max: MAX_ROWS,
              })}
            </span>
          </div>

          {errors.users?.root?.message && (
            <p className="text-sm text-destructive">{errors.users.root.message}</p>
          )}
          {errors.users?.message && (
            <p className="text-sm text-destructive">{errors.users.message}</p>
          )}

          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="border border-slate-200 rounded-lg p-3 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 font-mono">#{index + 1}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-slate-400 hover:text-destructive"
                    onClick={() => remove(index)}
                    disabled={fields.length <= 1}
                    aria-label={t("pages.adminUsers.bulkForm.removeRow")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_120px_1fr] gap-3">
                  {/* First Name */}
                  <div className="space-y-1">
                    <Label className="text-xs sm:hidden">{t("pages.adminUsers.form.firstName")}</Label>
                    <Input
                      placeholder={t("pages.adminUsers.form.firstName")}
                      aria-invalid={!!errors.users?.[index]?.firstName}
                      {...register(`users.${index}.firstName`)}
                    />
                    {errors.users?.[index]?.firstName && (
                      <p className="text-sm text-destructive">
                        {errors.users[index].firstName.message}
                      </p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1">
                    <Label className="text-xs sm:hidden">{t("pages.adminUsers.form.lastName")}</Label>
                    <Input
                      placeholder={t("pages.adminUsers.form.lastName")}
                      aria-invalid={!!errors.users?.[index]?.lastName}
                      {...register(`users.${index}.lastName`)}
                    />
                    {errors.users?.[index]?.lastName && (
                      <p className="text-sm text-destructive">
                        {errors.users[index].lastName.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <Label className="text-xs sm:hidden">{t("pages.adminUsers.form.email")}</Label>
                    <Input
                      type="email"
                      placeholder={t("pages.adminUsers.form.email")}
                      aria-invalid={!!errors.users?.[index]?.email}
                      {...register(`users.${index}.email`)}
                    />
                    {errors.users?.[index]?.email && (
                      <p className="text-sm text-destructive">
                        {errors.users[index].email.message}
                      </p>
                    )}
                  </div>

                  {/* Role */}
                  <div className="space-y-1">
                    <Label className="text-xs sm:hidden">{t("pages.adminUsers.form.role")}</Label>
                    <Controller
                      control={control}
                      name={`users.${index}.role`}
                      render={({ field: roleField }) => (
                        <Select
                          value={roleField.value}
                          onValueChange={roleField.onChange}
                        >
                          <SelectTrigger aria-invalid={!!errors.users?.[index]?.role}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roleOptions.map((role) => (
                              <SelectItem key={role} value={role}>
                                {t(`roles.${role.toLowerCase()}`)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.users?.[index]?.role && (
                      <p className="text-sm text-destructive">
                        {errors.users[index].role.message}
                      </p>
                    )}
                  </div>

                  {/* Departments */}
                  <div className="space-y-1">
                    <Label className="text-xs sm:hidden">{t("pages.adminUsers.form.departments")}</Label>
                    <Controller
                      control={control}
                      name={`users.${index}.departmentIds`}
                      render={({ field: deptField }) => (
                        <DepartmentMultiSelect
                          departments={departments}
                          value={deptField.value}
                          onChange={deptField.onChange}
                          hasError={!!errors.users?.[index]?.departmentIds}
                          compact
                        />
                      )}
                    />
                    {errors.users?.[index]?.departmentIds && (
                      <p className="text-sm text-destructive">
                        {errors.users[index].departmentIds.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => append(emptyRow())}
            disabled={fields.length >= MAX_ROWS}
            aria-label={t("pages.adminUsers.bulkForm.addRow")}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("pages.adminUsers.bulkForm.addRow")}
          </Button>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("pages.adminUsers.bulkForm.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {t("pages.adminUsers.bulkForm.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
