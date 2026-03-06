import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
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
  type CreateUserFormData,
} from "@/schemas/userSchema";
import { userService } from "@/services/userService";
import { departmentService } from "@/services/departmentService";
import { useAuth } from "@/contexts/AuthContext";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserFormDialog({ open, onOpenChange }: UserFormDialogProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwner = user?.role?.toUpperCase() === "OWNER";

  const {
    register,
    handleSubmit,
    reset,
    control,
    setError,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "Viewer",
      departmentIds: [],
    },
    mode: "onBlur",
  });

  const { data: departmentsData } = useQuery({
    queryKey: ["departments"],
    queryFn: () => departmentService.getAll().then((res) => res.data),
    enabled: open,
  });

  const allDepartments = departmentsData ?? [];
  const isAdmin = user?.role?.toUpperCase() === "ADMIN";
  const departments = isAdmin && user?.departmentIds
    ? allDepartments.filter((d) => user.departmentIds!.includes(d.id))
    : allDepartments;

  const mutation = useMutation({
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

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        role: "Viewer",
        departmentIds: [],
      });
    }
  }, [open, reset]);

  const roleOptions = isOwner
    ? ["Viewer", "Admin", "Owner"]
    : ["Viewer", "Admin"];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("pages.adminUsers.form.title")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
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

          <div className="space-y-2">
            <Label htmlFor="role">{t("pages.adminUsers.form.role")}</Label>
            <Controller
              control={control}
              name="role"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="role" aria-invalid={!!errors.role}>
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
            <Button type="submit" disabled={mutation.isPending}>
              {t("pages.adminUsers.form.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
