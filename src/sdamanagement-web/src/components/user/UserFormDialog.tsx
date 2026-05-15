import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useUnsavedChangesGuard } from "@/hooks/useUnsavedChangesGuard";
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
import { DepartmentMultiSelect } from "./DepartmentMultiSelect";
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormData,
  type UpdateUserFormData,
} from "@/schemas/userSchema";
import { userService, type UserResponse, type UserListItem } from "@/services/userService";
import { departmentService } from "@/services/departmentService";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editUser?: UserResponse | UserListItem;
}

export function UserFormDialog({ open, onOpenChange, editUser }: UserFormDialogProps) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { isOwner, isAdmin } = useRole();
  const queryClient = useQueryClient();
  const isEditMode = !!editUser;
  const isSelfEdit = isEditMode && editUser.id === authUser?.userId;

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setError,
    formState: { errors, isDirty },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(isEditMode ? (updateUserSchema as unknown as typeof createUserSchema) : createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "Viewer",
      departmentIds: [],
    },
    mode: "onBlur",
  });

  useUnsavedChangesGuard(isDirty);

  const watchedRole = watch("role");
  const showRoleDowngradeWarning =
    isEditMode &&
    editUser.role.toUpperCase() === "ADMIN" &&
    watchedRole?.toUpperCase() === "VIEWER";

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentService.getAll().then((res) => res.data),
    enabled: open,
  });

  const allDepartments = departmentsData ?? [];
  const departments = isAdmin && authUser?.departmentIds
    ? allDepartments.filter((d) => authUser.departmentIds!.includes(d.id))
    : allDepartments;

  const createMutation = useMutation({
    mutationFn: (data: CreateUserFormData) =>
      userService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("pages.adminUsers.toast.created"));
      handleClose();
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.response?.status === 409) {
          setError("email", {
            message: t("pages.adminUsers.toast.error.duplicate"),
          });
        } else if (error.response?.status === 403) {
          toast.error(t("pages.adminUsers.toast.error.forbidden"));
        }
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserFormData) =>
      userService.updateUser(editUser!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("pages.adminUsers.toast.updated"));
      handleClose();
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.response?.status === 403) {
          toast.error(t("pages.adminUsers.toast.error.forbidden"));
        } else if (error.response?.status === 404) {
          toast.error(t("pages.adminUsers.toast.error.notFound"));
        }
      }
    },
  });

  const mutation = isEditMode ? updateMutation : createMutation;

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

  useEffect(() => {
    if (open && editUser) {
      reset({
        firstName: editUser.firstName,
        lastName: editUser.lastName,
        email: "",
        role: editUser.role as CreateUserFormData["role"],
        departmentIds: editUser.departments.map((d) => d.id),
      });
    } else if (open && !editUser) {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        role: "Viewer",
        departmentIds: [],
      });
    }
  }, [open, editUser, reset]);

  const roleOptions = isOwner
    ? ["Viewer", "Admin", "Owner"]
    : ["Viewer", "Admin"];

  const onSubmit = handleSubmit((data) => {
    if (isEditMode) {
      const { email: _email, ...updateData } = data;
      updateMutation.mutate(updateData);
    } else {
      createMutation.mutate(data);
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditMode
              ? t("pages.adminUsers.editForm.title")
              : t("pages.adminUsers.form.title")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">
                {t("pages.adminUsers.form.firstName")}
              </Label>
              <Input
                id="firstName"
                autoFocus
                aria-invalid={!!errors.firstName}
                aria-describedby={errors.firstName ? "firstName-error" : undefined}
                {...register("firstName")}
              />
              {errors.firstName && (
                <p id="firstName-error" className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">
                {t("pages.adminUsers.form.lastName")}
              </Label>
              <Input
                id="lastName"
                aria-invalid={!!errors.lastName}
                aria-describedby={errors.lastName ? "lastName-error" : undefined}
                {...register("lastName")}
              />
              {errors.lastName && (
                <p id="lastName-error" className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          {isEditMode ? (
            <div className="space-y-2">
              <Label htmlFor="email">
                {t("pages.adminUsers.form.email")}
              </Label>
              <Input
                id="email"
                type="email"
                disabled
                value={editUser.email}
                className="bg-slate-50 text-slate-500 cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground">
                {t("pages.adminUsers.editForm.emailReadonly")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">
                {t("pages.adminUsers.form.email")}
              </Label>
              <Input
                id="email"
                type="email"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                {...register("email")}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="role">{t("pages.adminUsers.form.role")}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSelfEdit}
                >
                  <SelectTrigger
                    id="role"
                    aria-invalid={!!errors.role}
                    className={isSelfEdit ? "bg-slate-50 cursor-not-allowed" : ""}
                  >
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
            {isSelfEdit && (
              <p className="text-xs text-muted-foreground">
                {t("pages.adminUsers.editForm.selfRoleDisabled")}
              </p>
            )}
            {showRoleDowngradeWarning && (
              <p className="text-xs text-amber-600">
                {t("pages.adminUsers.editForm.roleDowngradeWarning")}
              </p>
            )}
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t("pages.adminUsers.form.departments")}</Label>
            <Controller
              control={control}
              name="departmentIds"
              render={({ field }) => (
                <DepartmentMultiSelect
                  departments={departments}
                  value={field.value}
                  onChange={field.onChange}
                  hasError={!!errors.departmentIds}
                />
              )}
            />
            {errors.departmentIds && (
              <p className="text-sm text-destructive">
                {errors.departmentIds.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t("pages.adminUsers.form.cancel")}
            </Button>
            <Button type="submit" disabled={mutation.isPending || (isEditMode && !isDirty)}>
              {isEditMode
                ? t("pages.adminUsers.editForm.submit")
                : t("pages.adminUsers.form.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
