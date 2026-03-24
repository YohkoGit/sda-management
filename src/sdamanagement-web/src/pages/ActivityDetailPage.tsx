import { useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Pencil, Video, MapPin } from "lucide-react";
import { useActivity } from "@/hooks/useActivity";
import { useAuth } from "@/contexts/AuthContext";
import { useModifiedBadgeStore } from "@/stores/modifiedBadgeStore";
import { RoleSlotDisplay } from "@/components/activity-detail/RoleSlotDisplay";
import { StaffingIndicator } from "@/components/activity/StaffingIndicator";
import { Badge } from "@/components/ui/badge";
import { ModifiedBadge } from "@/components/ui/ModifiedBadge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatActivityDate, formatRelativeDate, formatTime } from "@/lib/dateFormatting";
import { isAxiosError } from "axios";

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { user } = useAuth();

  const activityId = id ? Number(id) : undefined;
  const { data: activity, isLoading, error, refetch } = useActivity(activityId);

  const dismiss = useModifiedBadgeStore((s) => s.dismiss);
  useEffect(() => {
    if (activityId) dismiss(activityId);
  }, [activityId, dismiss]);

  // Loading state
  if (isLoading) {
    return <ActivityDetailSkeleton />;
  }

  // 404 state
  if (error && isAxiosError(error) && error.response?.status === 404) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t("pages.activityDetail.notFound")}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t("pages.activityDetail.notFoundHint")}
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("pages.activityDetail.backToDashboard")}
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !activity) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center py-16">
          <p className="text-destructive mb-4">
            {t("pages.activityDetail.loadError")}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            {t("pages.activityDetail.retry")}
          </Button>
        </div>
      </div>
    );
  }

  const dateLabel = formatActivityDate(activity.date, t, lang);
  const relativeDate = formatRelativeDate(activity.date, lang);
  const timeRange = `${formatTime(activity.startTime)}\u2013${formatTime(activity.endTime)}`;
  const totalHeadcount = activity.roles.reduce((sum, r) => sum + r.headcount, 0);
  const assignedCount = activity.roles.reduce((sum, r) => sum + r.assignments.length, 0);

  const canEdit =
    user?.role?.toUpperCase() === "OWNER" ||
    (user?.role?.toUpperCase() === "ADMIN" &&
      activity.departmentId != null &&
      (user?.departmentIds ?? []).includes(activity.departmentId));

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Top bar: back + edit */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t("pages.activityDetail.back")}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("pages.activityDetail.back")}
        </Link>
        {canEdit && !activity.isMeeting && (
          <Link
            to="/admin/activities"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("pages.activityDetail.edit")}
          </Link>
        )}
      </div>

      {/* Activity header card */}
      <div
        className="rounded-2xl border border-border bg-background p-5 sm:p-6 mb-6"
        style={{
          borderLeftWidth: "4px",
          borderLeftColor: activity.departmentColor || undefined,
        }}
      >
        {/* Department badge + date */}
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {activity.departmentAbbreviation && (
            <span
              className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide text-white"
              style={{ backgroundColor: activity.departmentColor || undefined }}
              aria-label={activity.departmentName}
            >
              {activity.departmentAbbreviation}
            </span>
          )}
          <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
          <span className="text-xs text-muted-foreground">{relativeDate}</span>
        </div>

        {/* Title + badges */}
        <div className="flex items-start justify-between gap-2 mt-2">
          <h1 className="text-2xl font-black text-foreground">{activity.title}</h1>
          <div className="flex items-center gap-1 shrink-0">
            <ModifiedBadge activityId={activity.id} />
            {activity.specialType && (
              <Badge variant="outline" className="shrink-0 text-[11px]">
                {activity.specialType}
              </Badge>
            )}
          </div>
        </div>

        {/* Time range + staffing (or meeting type) */}
        <div className="flex items-center justify-between gap-2 mt-1.5">
          <span className="text-sm text-muted-foreground tabular-nums">{timeRange}</span>
          {activity.isMeeting ? (
            <Badge variant="outline" className="text-xs">
              {activity.meetingType === "zoom" ? (
                <><Video className="mr-1 h-3 w-3 inline" />Zoom</>
              ) : (
                <><MapPin className="mr-1 h-3 w-3 inline" />{t("pages.activityDetail.physical")}</>
              )}
            </Badge>
          ) : (
            <StaffingIndicator
              staffingStatus={activity.staffingStatus}
              assigned={assignedCount}
              total={totalHeadcount}
              size="sm"
            />
          )}
        </div>

        {/* Description */}
        {activity.description && (
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            {activity.description}
          </p>
        )}
      </div>

      <Separator className="mb-6" />

      {activity.isMeeting ? (
        /* Meeting info section */
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4">
            {t("pages.activityDetail.meetingInfo")}
          </h2>
          <div className="space-y-3">
            {activity.meetingType === "zoom" && activity.zoomLink && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t("pages.activityDetail.zoomLink")}</p>
                <a
                  href={activity.zoomLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {activity.zoomLink}
                </a>
              </div>
            )}
            {activity.meetingType === "physical" && (
              <>
                {activity.locationName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("pages.activityDetail.location")}</p>
                    <p className="text-sm text-foreground">{activity.locationName}</p>
                  </div>
                )}
                {activity.locationAddress && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{t("pages.activityDetail.address")}</p>
                    <p className="text-sm text-foreground">{activity.locationAddress}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (
        /* Roster section */
        <>
          <h2 className="text-lg font-bold text-foreground mb-4">
            {t("pages.activityDetail.roster.title")}
          </h2>

          {activity.roles.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {t("pages.activityDetail.roster.noRoles")}
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activity.roles.map((role) => (
                <RoleSlotDisplay
                  key={role.id}
                  roleName={role.roleName}
                  headcount={role.headcount}
                  isCritical={role.isCritical}
                  assignments={role.assignments}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ActivityDetailSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-5 w-16" />
      </div>
      <div className="rounded-2xl border border-border p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-64 mt-2" />
        <Skeleton className="h-4 w-24 mt-2" />
      </div>
      <Skeleton className="h-5 w-48 mb-4" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-8" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
