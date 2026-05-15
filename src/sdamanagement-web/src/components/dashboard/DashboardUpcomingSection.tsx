import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow } from "@/components/ui/typography";
import { useRole } from "@/hooks/useRole";
import { useDashboardActivities } from "@/hooks/useDashboardActivities";
import { deptSwatchColor } from "@/lib/dept-color";
import { DashboardActivityCard } from "./DashboardActivityCard";

export function DashboardUpcomingSection() {
  const { t } = useTranslation();
  const { isOwner, hasRole } = useRole();
  const { data, isLoading, isError, refetch } = useDashboardActivities();

  // "ADMIN or higher" — owners also see staffing
  const showStaffing = hasRole("ADMIN", "OWNER");
  const todayStr = format(new Date(), "yyyy-MM-dd");

  const deptBadges = useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, { color: string; name?: string | null }>();
    data.forEach((a) => {
      if (a.departmentAbbreviation && !seen.has(a.departmentAbbreviation))
        seen.set(a.departmentAbbreviation, {
          color: a.departmentColor,
          name: a.departmentName,
        });
    });
    return Array.from(seen.entries());
  }, [data]);

  const renderSubtitle = () => {
    if (isOwner) {
      return (
        <Eyebrow className="mt-1">
          {t("pages.dashboard.upcoming.overview")}
        </Eyebrow>
      );
    }
    if (showStaffing) {
      if (deptBadges.length >= 5) {
        return (
          <Eyebrow className="mt-1">
            {t("pages.dashboard.upcoming.overview")}
          </Eyebrow>
        );
      }
      if (deptBadges.length > 0) {
        return (
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            {deptBadges.map(([abbr, info]) => (
              <span key={abbr} className="inline-flex items-center gap-1.5">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    backgroundColor: deptSwatchColor({
                      abbreviation: abbr,
                      color: info.color ?? undefined,
                    }),
                  }}
                />
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
                  {abbr}
                </span>
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
      <div className="flex items-baseline justify-between gap-4 border-b border-[var(--ink)] pb-4">
        <div>
          <h2
            id="upcoming-activities-heading"
            className="font-display text-2xl leading-tight text-[var(--ink)] sm:text-3xl"
          >
            {t("pages.dashboard.upcoming.title")}
          </h2>
          {renderSubtitle()}
        </div>
        {showStaffing && (
          <Link
            to="/admin/activities"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--gilt-2)] hover:text-[var(--ink)] hover:underline"
          >
            {t("pages.dashboard.upcoming.viewAll")} →
          </Link>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="mt-2 space-y-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border-t border-[var(--hairline)] py-5">
              <Skeleton className="h-10 w-16 bg-[var(--parchment-2)]" />
              <Skeleton className="mt-2 h-5 w-2/3 bg-[var(--parchment-2)]" />
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="mt-6 border-t border-[var(--rose)] pt-4" role="alert">
          <p className="text-sm text-[var(--rose)]">
            {t("pages.dashboard.upcoming.loadError")}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-2)] underline-offset-4 hover:underline"
          >
            {t("pages.dashboard.upcoming.retry")}
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && data?.length === 0 && (
        <div className="mt-2 border-t border-[var(--hairline)] py-12 text-center" role="status">
          <p className="font-display text-xl italic text-[var(--ink-3)]">
            {t("pages.dashboard.upcoming.empty")}
          </p>
          {showStaffing && (
            <p className="mt-3 text-sm text-[var(--ink-3)]">
              {t("pages.dashboard.upcoming.emptyHintAdmin")}
            </p>
          )}
        </div>
      )}

      {/* Data state */}
      {!isLoading && !isError && data && data.length > 0 && (
        <div className="mt-2">
          {data.map((activity) => (
            <DashboardActivityCard
              key={activity.id}
              activity={activity}
              showStaffing={showStaffing}
              isToday={activity.date === todayStr}
            />
          ))}
        </div>
      )}
    </section>
  );
}
