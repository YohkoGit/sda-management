import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { UserFormDialog, BulkUserFormDialog } from "@/components/user";
import { useUsers } from "@/hooks/useUsers";
import type { UserListItem } from "@/services/userService";

const ROLE_BADGE_STYLES: Record<string, string> = {
  OWNER: "bg-amber-100 text-amber-800 border-amber-200",
  ADMIN: "bg-indigo-100 text-indigo-800 border-indigo-200",
  VIEWER: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function AdminUsersPage() {
  const { t } = useTranslation();
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("pages.adminUsers.title")}</h1>
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
        <div className="py-12 text-center text-slate-500">
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
          {users.map((user) => (
            <Card key={user.id} className="rounded-2xl p-4">
              <div className="flex items-center gap-4">
                <InitialsAvatar
                  firstName={user.firstName}
                  lastName={user.lastName}
                />
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
                    className="text-slate-400 hover:text-indigo-600"
                    onClick={() => setEditingUser(user)}
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    {t("pages.adminUsers.editButton")}
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
    </div>
  );
}
