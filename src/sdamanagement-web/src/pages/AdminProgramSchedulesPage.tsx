import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Plus, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import {
  programScheduleService,
  type ProgramScheduleListItem,
} from "@/services/programScheduleService";
import {
  ProgramScheduleCard,
  ProgramScheduleFormDialog,
} from "@/components/program-schedule";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminProgramSchedulesPage() {
  const { t } = useTranslation();
  const { isLoading: isAuthLoading } = useAuth();
  const { isOwner } = useRole();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: schedules, isLoading } = useQuery<ProgramScheduleListItem[]>({
    queryKey: ["program-schedules"],
    queryFn: async () => {
      const res = await programScheduleService.getAll();
      return res.data;
    },
    enabled: isOwner,
  });

  if (isAuthLoading) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminProgramSchedules.title")}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminProgramSchedules.title")}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {t("pages.adminProgramSchedules.noAccess")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminProgramSchedules.title")}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  const isEmpty = !schedules || schedules.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminProgramSchedules.title")}
        </h1>
        {!isEmpty && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("pages.adminProgramSchedules.createButton")}
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {t("pages.adminProgramSchedules.emptyState")}
          </h2>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            {t("pages.adminProgramSchedules.emptyStateHelper")}
          </p>
          <Button className="mt-6" onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("pages.adminProgramSchedules.createButton")}
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => (
            <ProgramScheduleCard key={schedule.id} schedule={schedule} />
          ))}
        </div>
      )}

      <ProgramScheduleFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}
