import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { departmentService } from "@/services/departmentService";
import type {
  DepartmentListItem,
  DepartmentResponse,
} from "@/services/departmentService";
import { DepartmentFormDialog } from "./DepartmentFormDialog";
import { SubMinistryManager } from "./SubMinistryManager";

interface DepartmentCardProps {
  department: DepartmentListItem;
}

export function DepartmentCard({ department }: DepartmentCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const { data: detail } = useQuery<DepartmentResponse>({
    queryKey: ["departments", department.id],
    queryFn: async () => {
      const res = await departmentService.getById(department.id);
      return res.data;
    },
    enabled: showDetail,
  });

  const deleteMutation = useMutation({
    mutationFn: () => departmentService.delete(department.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success(t("pages.adminDepartments.deleteSuccess"));
    },
    onError: () => {
      toast.error(t("pages.adminDepartments.deleteError"));
    },
  });

  return (
    <>
      <Card
        className="overflow-hidden cursor-pointer"
        style={{ borderLeft: `4px solid ${department.color}` }}
        onClick={() => setShowDetail(!showDetail)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">{department.name}</h3>
              <Badge
                variant="secondary"
                aria-label={department.name}
              >
                {department.abbreviation}
              </Badge>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowEditDialog(true);
                }}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">
                  {t("pages.adminDepartments.card.edit")}
                </span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteDialog(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">
                  {t("pages.adminDepartments.card.delete")}
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {department.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {department.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            {department.subMinistryCount}{" "}
            {t("pages.adminDepartments.card.subMinistries")}
          </p>

          {showDetail && detail && (
            <div
              className="mt-4 border-t pt-3"
              onClick={(e) => e.stopPropagation()}
            >
              <SubMinistryManager
                departmentId={department.id}
                subMinistries={detail.subMinistries}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <DepartmentFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        department={department}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("pages.adminDepartments.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.adminDepartments.deleteConfirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("pages.adminDepartments.form.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              variant="destructive"
            >
              {t("pages.adminDepartments.deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
