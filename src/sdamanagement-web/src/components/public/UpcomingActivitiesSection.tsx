import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpcomingActivities } from "@/hooks/usePublicDashboard";
import ActivityCard from "./ActivityCard";

export default function UpcomingActivitiesSection() {
  const { t } = useTranslation();
  const { data, isPending, isError } = useUpcomingActivities();

  const headingId = "upcoming-activities-heading";

  return (
    <section className="bg-white" aria-labelledby={headingId}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12">
        <h2
          id={headingId}
          className="text-2xl font-bold text-slate-900"
        >
          {t("pages.home.upcomingActivitiesTitle")}
        </h2>

        {isPending ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-l-4 border-slate-200 bg-white p-4"
              >
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-2 h-6 w-48" />
                <Skeleton className="mt-2 h-5 w-16" />
                <div className="mt-3 flex items-center gap-2">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <p className="mt-6 text-base text-slate-500">
            {t("pages.home.loadError")}
          </p>
        ) : data && data.length > 0 ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {data.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <p className="mt-6 text-center text-base text-slate-500">
            {t("pages.home.noActivities")}
          </p>
        )}
      </div>
    </section>
  );
}
