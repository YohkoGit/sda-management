import { useTranslation } from "react-i18next";
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

interface ConflictAlertDialogProps {
  open: boolean;
  onReload: () => void;
  onOverwrite: () => void;
  onOpenChange: (open: boolean) => void;
}

export function ConflictAlertDialog({
  open,
  onReload,
  onOverwrite,
  onOpenChange,
}: ConflictAlertDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("pages.adminActivities.conflict.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("pages.adminActivities.conflict.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onReload}>
            {t("pages.adminActivities.conflict.reload")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onOverwrite}
            variant="destructive"
          >
            {t("pages.adminActivities.conflict.overwrite")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
