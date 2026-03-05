import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { activityTemplateService } from "@/services/activityTemplateService";
import type { ActivityTemplateListItem } from "@/services/activityTemplateService";
import { ActivityTemplateFormDialog } from "./ActivityTemplateFormDialog";

interface ActivityTemplateCardProps {
  template: ActivityTemplateListItem;
}

export function ActivityTemplateCard({ template }: ActivityTemplateCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => activityTemplateService.delete(template.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-templates"] });
      toast.success(t("pages.adminActivityTemplates.deleteSuccess"));
    },
    onError: () => {
      toast.error(t("pages.adminActivityTemplates.deleteError"));
    },
  });

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-base">{template.name}</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">
                  {t("pages.adminActivityTemplates.card.edit")}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">
                  {t("pages.adminActivityTemplates.card.delete")}
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {template.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {template.description}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {template.roles.map((role) => (
              <Badge key={role.id} variant="secondary" className="text-xs">
                {role.roleName} ({role.defaultHeadcount})
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {template.roleCount} {t("pages.adminActivityTemplates.card.roles")}
          </p>
        </CardContent>
      </Card>

      <ActivityTemplateFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        template={template}
        editRoles={template.roles.map((r) => ({
          roleName: r.roleName,
          defaultHeadcount: r.defaultHeadcount,
        }))}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("pages.adminActivityTemplates.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.adminActivityTemplates.deleteConfirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("pages.adminActivityTemplates.form.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("pages.adminActivityTemplates.deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
