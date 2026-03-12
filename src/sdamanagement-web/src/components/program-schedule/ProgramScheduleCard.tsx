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
import { programScheduleService } from "@/services/programScheduleService";
import type { ProgramScheduleListItem } from "@/services/programScheduleService";
import { ProgramScheduleFormDialog } from "./ProgramScheduleFormDialog";

interface ProgramScheduleCardProps {
  schedule: ProgramScheduleListItem;
}

export function ProgramScheduleCard({ schedule }: ProgramScheduleCardProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () => programScheduleService.delete(schedule.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-schedules"] });
      toast.success(t("pages.adminProgramSchedules.deleteSuccess"));
    },
    onError: () => {
      toast.error(t("pages.adminProgramSchedules.deleteError"));
    },
  });

  const dayLabel = t(`days.${schedule.dayOfWeek}`);

  return (
    <>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-base">{schedule.title}</h3>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setShowEditDialog(true)}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">
                  {t("pages.adminProgramSchedules.card.edit")}
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
                  {t("pages.adminProgramSchedules.card.delete")}
                </span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Badge variant="secondary" className="text-xs">
              {dayLabel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {schedule.startTime} – {schedule.endTime}
            </Badge>
          </div>
          {schedule.hostName && (
            <p className="text-sm text-muted-foreground">{schedule.hostName}</p>
          )}
          {schedule.departmentName && (
            <p className="text-xs text-muted-foreground mt-1">
              {schedule.departmentName}
            </p>
          )}
        </CardContent>
      </Card>

      <ProgramScheduleFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        schedule={schedule}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("pages.adminProgramSchedules.deleteConfirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("pages.adminProgramSchedules.deleteConfirmMessage")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("pages.adminProgramSchedules.form.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              variant="destructive"
            >
              {t("pages.adminProgramSchedules.deleteConfirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
