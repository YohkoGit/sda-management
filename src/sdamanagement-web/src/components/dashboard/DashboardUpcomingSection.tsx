import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { hasRole } from "@/components/ProtectedRoute";
import { useDashboardActivities } from "@/hooks/useDashboardActivities";
import { DashboardActivityCard } from "./DashboardActivityCard";

export function DashboardUpcomingSection() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useDashboardActivities();

  const showStaffing = hasRole(user?.role ?? "", "ADMIN");
  const isOwner = user?.role?.toUpperCase() === "OWNER";
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Build department badges from response data for ADMIN subtitle
  const deptBadges = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, string>();
    data.forEach((a) => {
      if (a.departmentAbbreviation && !seen.has(a.departmentAbbreviation))
        seen.set(a.departmentAbbreviation, a.departmentColor);
    });
    return Array.from(seen.entries());
  }, [data]);

  // Subtitle logic
  const renderSubtitle = () => {
    if (isOwner) {
      return (
        <p className="mt-1 text-sm text-muted-foreground">
          {t("pages.dashboard.upcoming.overview")}
        </p>
      );
    }
    if (hasRole(user?.role ?? "", "ADMIN")) {
      // If admin covers >= 5 departments, show "Vue d'ensemble" (pastor case)
      if (deptBadges.length >= 5) {
        return (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("pages.dashboard.upcoming.overview")}
          </p>
        );
      }
      if (deptBadges.length > 0) {
        return (
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {deptBadges.map(([abbr, color]) => (
              <span
                key={abbr}
                className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
                style={{ backgroundColor: color || undefined }}
              >
                {abbr}
              </span>
            ))}
          </div>
        );
      }
    }
    return null;
  };

  return (
    <section aria-labelledby="upcoming-activities-heading">
      <h2
        id="upcoming-activities-heading"
        className="text-xl font-bold text-foreground"
      >
        {t("pages.dashboard.upcoming.title")}
      </h2>
      {renderSubtitle()}

      {/* Loading state */}
      {isLoading && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-l-4 border-border bg-background p-4"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-14 rounded-md" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="mt-2 h-5 w-48" />
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-7 w-7 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div
          className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-center"
          role="alert"
        >
          <p className="text-sm text-destructive">
            {t("pages.dashboard.upcoming.loadError")}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-sm font-medium text-primary hover:text-primary/80"
          >
            {t("pages.dashboard.upcoming.retry")}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data?.length === 0 && (
        <div
          className="mt-4 rounded-2xl border border-border bg-background p-8 text-center"
          role="status"
        >
          <p className="text-sm font-medium text-muted-foreground">
            {t("pages.dashboard.upcoming.empty")}
          </p>
          {hasRole(user?.role ?? "", "ADMIN") && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t("pages.dashboard.upcoming.emptyHintAdmin")}
            </p>
          )}
        </div>
      )}

      {/* Data state */}
      {!isLoading && !isError && data && data.length > 0 && (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {data.map((activity) => (
              <DashboardActivityCard
                key={activity.id}
                activity={activity}
                showStaffing={showStaffing}
                isToday={activity.date === todayStr}
              />
            ))}
          </div>
          {hasRole(user?.role ?? "", "ADMIN") && (
            <div className="mt-4">
              <Link
                to="/admin/activities"
                className="text-sm text-primary hover:underline"
              >
                {t("pages.dashboard.upcoming.viewAll")}
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
