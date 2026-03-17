import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyAssignments } from "@/hooks/useMyAssignments";
import { AssignmentCard } from "./AssignmentCard";

export function MyAssignmentsSection() {
  const { t } = useTranslation();
  const { data: assignments, isLoading, isError, refetch } = useMyAssignments();

  return (
    <section aria-labelledby="my-assignments-heading">
      <p className="text-xs font-black uppercase tracking-widest text-primary">
        {t("pages.dashboard.personalRegister")}
      </p>
      <h2
        id="my-assignments-heading"
        className="mt-1 text-xl font-bold text-foreground"
      >
        {t("pages.dashboard.myAssignments.title")}
      </h2>

      {isLoading && (
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-l-4 border-border bg-background p-4 sm:p-5"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-12 rounded-full" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="mt-2 h-5 w-48" />
              <div className="mt-1.5 flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center" role="alert">
          <p className="text-sm text-destructive">
            {t("pages.dashboard.myAssignments.loadError")}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            {t("pages.dashboard.myAssignments.retry")}
          </button>
        </div>
      )}

      {!isLoading && !isError && assignments?.length === 0 && (
        <div
          className="mt-4 rounded-2xl border border-border bg-background p-8 text-center"
          role="status"
        >
          <p className="text-sm font-medium text-muted-foreground">
            {t("pages.dashboard.myAssignments.empty")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("pages.dashboard.myAssignments.emptyHint")}
          </p>
        </div>
      )}

      {!isLoading && !isError && assignments && assignments.length > 0 && (
        <div className="mt-4 space-y-3">
          {assignments.map((assignment, index) => (
            <AssignmentCard
              key={`${assignment.activityId}-${assignment.roleName}-${index}`}
              assignment={assignment}
              isFirst={index === 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}
