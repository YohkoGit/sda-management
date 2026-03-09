import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
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
import { userService, type UserListItem } from "@/services/userService";

interface DeleteUserDialogProps {
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: DeleteUserDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => userService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("pages.adminUsers.toast.deleted"));
      onOpenChange(false);
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        if (error.response?.status === 409)
          toast.error(t("pages.adminUsers.toast.error.lastOwner"));
        else if (error.response?.status === 403)
          toast.error(t("pages.adminUsers.toast.error.forbidden"));
        else if (error.response?.status === 404)
          toast.error(t("pages.adminUsers.toast.error.notFound"));
        else toast.error(t("pages.adminUsers.toast.error.deleteFailed"));
      } else {
        toast.error(t("pages.adminUsers.toast.error.deleteFailed"));
      }
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("pages.adminUsers.deleteDialog.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("pages.adminUsers.deleteDialog.description", {
              name: user ? `${user.firstName} ${user.lastName}` : "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMutation.mutate(user!.id)}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            disabled={deleteMutation.isPending}
          >
            {t("pages.adminUsers.deleteDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
