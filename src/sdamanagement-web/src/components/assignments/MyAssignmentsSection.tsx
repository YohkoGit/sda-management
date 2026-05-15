import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow } from "@/components/ui/typography";
import { useMyAssignments } from "@/hooks/useMyAssignments";
import { AssignmentCard } from "./AssignmentCard";

export function MyAssignmentsSection() {
  const { t } = useTranslation();
  const { data: assignments, isLoading, isError, refetch } = useMyAssignments();

  return (
    <section aria-labelledby="my-assignments-heading">
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--ink)] pb-4">
        <h2
          id="my-assignments-heading"
          className="font-display text-2xl leading-tight text-[var(--ink)] sm:text-3xl"
        >
          {t("pages.dashboard.myAssignments.title")}
        </h2>
        <Eyebrow>
          {assignments && assignments.length > 0
            ? t("pages.dashboard.myAssignments.count", "{{count}} affectations", {
                count: assignments.length,
              })
            : ""}
        </Eyebrow>
      </div>

      {isLoading && (
        <div className="mt-2 space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border-t border-[var(--hairline)] py-6">
              <Skeleton className="h-16 w-24 bg-[var(--parchment-2)]" />
              <Skeleton className="mt-3 h-6 w-2/3 bg-[var(--parchment-2)]" />
              <Skeleton className="mt-2 h-4 w-1/3 bg-[var(--parchment-2)]" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div
          className="mt-6 border-t border-[var(--rose)] pt-4"
          role="alert"
        >
          <p className="text-sm text-[var(--rose)]">
            {t("pages.dashboard.myAssignments.loadError")}
          </p>
          <Eyebrow asChild className="mt-2 text-[var(--ink-2)] underline-offset-4 hover:underline">
            <button onClick={() => refetch()}>
              {t("pages.dashboard.myAssignments.retry")}
            </button>
          </Eyebrow>
        </div>
      )}

      {!isLoading && !isError && assignments?.length === 0 && (
        <div className="mt-2 border-t border-[var(--hairline)] py-12 text-center" role="status">
          <p className="font-display text-xl italic text-[var(--ink-3)]">
            {t("pages.dashboard.myAssignments.empty")}
          </p>
          <p className="mt-3 text-sm text-[var(--ink-3)]">
            {t("pages.dashboard.myAssignments.emptyHint")}
          </p>
        </div>
      )}

      {!isLoading && !isError && assignments && assignments.length > 0 && (
        <div className="mt-2">
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
