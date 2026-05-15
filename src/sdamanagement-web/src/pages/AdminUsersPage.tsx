import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { UserFormDialog, BulkUserFormDialog, DeleteUserDialog } from "@/components/user";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { useUsers } from "@/hooks/useUsers";
import { queryClient } from "@/lib/queryClient";
import { userService } from "@/services/userService";
import type { UserListItem } from "@/services/userService";

const ROLE_BADGE_STYLES: Record<string, string> = {
  OWNER: "bg-[var(--gilt-wash)] text-[var(--gilt-2)] border-[var(--gilt-soft)]",
  ADMIN: "bg-[var(--parchment-3)] text-[var(--ink)] border-[var(--hairline-2)]",
  VIEWER: "bg-[var(--parchment-2)] text-[var(--ink-2)] border-[var(--hairline)]",
};

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();
  const { isOwner } = useRole();
  const {
    users,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isAdminOrOwner,
  } = useUsers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);
  const [uploadingUserId, setUploadingUserId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadUserIdRef = useRef<number | null>(null);

  const uploadAvatarMutation = useMutation({
    mutationFn: ({ userId, file }: { userId: number; file: File }) =>
      userService.uploadAvatar(userId, file),
    onSuccess: () => {
      toast.success(t("pages.adminUsers.toast.avatarUploadSuccess"));
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUploadingUserId(null);
    },
    onError: (error: unknown) => {
      setUploadingUserId(null);
      const axiosErr = error as { response?: { status?: number } };
      if (axiosErr?.response?.status === 400) {
        toast.error(t("pages.adminUsers.toast.avatarFileTooLarge"));
      } else if (axiosErr?.response?.status === 403) {
        toast.error(t("pages.adminUsers.toast.error.forbidden"));
      } else {
        toast.error(t("pages.adminUsers.toast.avatarUploadError"));
      }
    },
  });

  const canUploadAvatar = (user: UserListItem) => {
    if (!authUser || !isAdminOrOwner) return false;
    if (isOwner) return true;
    // ADMIN can upload for users sharing a department
    return user.departments.some((d) =>
      authUser.departmentIds?.includes(d.id),
    );
  };

  const handleAvatarClick = (userId: number) => {
    pendingUploadUserIdRef.current = userId;
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const userId = pendingUploadUserIdRef.current;
    if (file && userId) {
      setUploadingUserId(userId);
      uploadAvatarMutation.mutate({ userId, file });
    }
    // Reset input so same file can be re-selected
    e.target.value = "";
    pendingUploadUserIdRef.current = null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">{t("pages.adminUsers.title")}</h1>
        {isAdminOrOwner && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkDialogOpen(true)}>
              <Users className="mr-2 h-4 w-4" />
              {t("pages.adminUsers.bulkCreateButton")}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("pages.adminUsers.createButton")}
            </Button>
          </div>
        )}
      </div>

      {isError && (
        <div className="py-12 text-center text-destructive">
          <p>{t("auth.error.generic")}</p>
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-60" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && !isError && users.length === 0 && (
        <div className="py-12 text-center text-[var(--ink-3)]">
          <p>{t("pages.adminUsers.emptyState")}</p>
          {isAdminOrOwner && (
            <Button className="mt-4" onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t("pages.adminUsers.createButton")}
            </Button>
          )}
        </div>
      )}

      {!isLoading && !isError && users.length > 0 && (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
          />
          {users.map((user) => (
            <Card key={user.id} className="rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className={`relative flex-shrink-0 ${canUploadAvatar(user) ? "cursor-pointer group" : "cursor-default"}`}
                  onClick={() => canUploadAvatar(user) && handleAvatarClick(user.id)}
                  disabled={!canUploadAvatar(user)}
                  aria-label={canUploadAvatar(user) ? t("pages.adminUsers.toast.changeAvatar") : undefined}
                >
                  <InitialsAvatar
                    firstName={user.firstName}
                    lastName={user.lastName}
                    avatarUrl={user.avatarUrl ?? undefined}
                  />
                  {uploadingUserId === user.id && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                      <Loader2 className="h-5 w-5 animate-spin text-white" />
                    </div>
                  )}
                  {canUploadAvatar(user) && uploadingUserId !== user.id && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/20 transition-colors">
                      <Pencil className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {user.firstName} {user.lastName}
                    </span>
                    <Badge
                      variant="outline"
                      className={
                        ROLE_BADGE_STYLES[user.role.toUpperCase()] ?? ""
                      }
                    >
                      {t(`roles.${user.role.toLowerCase()}`)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {user.email}
                  </p>
                  {user.departments.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {user.departments.map((dept) => (
                        <Badge
                          key={dept.id}
                          variant="outline"
                          className="text-xs gap-1"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: dept.color }}
                          />
                          {dept.abbreviation}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {isAdminOrOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[var(--ink-4)] hover:text-[var(--ink)]"
                    onClick={() => setEditingUser(user)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {t("pages.adminUsers.editButton")}
                  </Button>
                )}
                {isOwner &&
                  user.id !== authUser?.userId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      aria-label={t("pages.adminUsers.deleteDialog.title")}
                      onClick={() => setDeletingUser(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {hasNextPage && (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {t("pages.adminUsers.loadMore")}
        </Button>
      )}

      <UserFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <UserFormDialog
        open={!!editingUser}
        onOpenChange={(open) => { if (!open) setEditingUser(null); }}
        editUser={editingUser ?? undefined}
      />
      <BulkUserFormDialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen} />
      <DeleteUserDialog
        user={deletingUser}
        open={!!deletingUser}
        onOpenChange={(open) => {
          if (!open) setDeletingUser(null);
        }}
      />
    </div>
  );
}
