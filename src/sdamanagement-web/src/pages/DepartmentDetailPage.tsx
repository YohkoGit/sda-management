import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { parseISO, isToday, isFuture } from "date-fns";
import {
  departmentService,
  type DepartmentWithStaffingListItem,
  type DepartmentResponse,
} from "@/services/departmentService";
import { activityService } from "@/services/activityService";
import { StaffingIndicator } from "@/components/activity/StaffingIndicator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { formatActivityDate, formatTime } from "@/lib/dateFormatting";

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const departmentId = id ? Number(id) : undefined;
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: department, isPending: isDeptPending, isError: isDeptError, isPlaceholderData } = useQuery({
    queryKey: ["departments", departmentId],
    queryFn: () => departmentService.getById(departmentId!).then((res) => res.data),
    enabled: !!departmentId,
    retry: false,
    placeholderData: () => {
      const cached = queryClient.getQueryData<DepartmentWithStaffingListItem[]>(
        ["departments", "with-staffing"]
      )?.find((d) => d.id === departmentId);
      if (!cached) return undefined;
      return {
        ...cached,
        subMinistries: [],
        createdAt: "",
        updatedAt: "",
      } as DepartmentResponse;
    },
  });

  const { data: allActivities, isPending: isActivitiesPending } = useQuery({
    queryKey: ["activities", { departmentId }],
    queryFn: () => activityService.getByDepartment(departmentId!).then((res) => res.data),
    enabled: !!departmentId,
  });

  const upcomingActivities = useMemo(() => {
    if (!allActivities) return [];
    return allActivities
      .filter((a) => {
        const d = parseISO(a.date);
        return isToday(d) || isFuture(d);
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [allActivities]);

  useEffect(() => {
    if (department) {
      document.title = department.name;
    }
  }, [department]);

  // 404 handling
  if (isDeptError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        <p className="text-lg font-semibold text-slate-700">{t("pages.authDepartments.departmentNotFound")}</p>
        <Link
          to="/my-departments"
          className="mt-3 inline-block text-indigo-600 hover:underline"
        >
          {t("pages.authDepartments.backToList")}
        </Link>
      </div>
    );
  }

  const isAdminWithScope =
    user?.role === "ADMIN" &&
    departmentId !== undefined &&
    (user.departmentIds?.includes(departmentId) ?? false);
  const isOwner = user?.role === "OWNER";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-slate-500">
        <Link to="/my-departments" className="hover:text-indigo-600 hover:underline">
          {t("pages.authDepartments.backToList")}
        </Link>
        {department && (
          <>
            <span className="mx-2" aria-hidden="true">/</span>
            <span className="font-medium text-slate-700" aria-current="page">{department.abbreviation}</span>
          </>
        )}
      </nav>

      {/* Responsive layout: stacked on mobile, 2-col on sm+ */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_320px]">
        {/* Main content: Activity pipeline */}
        <div>
          <h2 className="text-lg font-bold text-slate-700">
            {t("pages.authDepartments.upcomingActivities")}
          </h2>

          {isActivitiesPending ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-40 flex-1" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                </div>
              ))}
            </div>
          ) : upcomingActivities.length === 0 ? (
            <p className="mt-4 text-sm italic text-slate-400">
              {isAdminWithScope || isOwner
                ? t("pages.authDepartments.noActivitiesAdmin")
                : t("pages.authDepartments.noActivitiesViewer")}
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {upcomingActivities.map((activity) => (
                <Link
                  key={activity.id}
                  to={`/activities/${activity.id}`}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors"
                >
                  <span className="min-w-[120px] text-sm text-slate-500">
                    {formatActivityDate(activity.date, t, i18n.language)}
                    {" "}
                    {formatTime(activity.startTime)}
                  </span>
                  <span className="flex-1 text-sm font-medium text-slate-800 truncate">
                    {activity.title}
                  </span>
                  <StaffingIndicator
                    staffingStatus={activity.staffingStatus}
                    assigned={activity.assignedCount}
                    total={activity.totalHeadcount}
                    size="sm"
                    showLabel={false}
                  />
                  {activity.specialType && (
                    <Badge variant="outline" className="text-xs">
                      {activity.specialType}
                    </Badge>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar: Department info + sub-ministries */}
        <div className="order-first sm:order-last">
          {isDeptPending ? (
            <div className="space-y-4">
              <div className="h-2 w-full rounded" />
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="mt-4 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-28 rounded-full" />
              </div>
            </div>
          ) : department ? (
            <div>
              {/* Color bar accent */}
              <div
                className="h-2 w-full rounded"
                style={{ backgroundColor: department.color || "#E2E8F0" }}
              />
              <div className="mt-3 flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{department.name}</h1>
                <Badge variant="secondary">{department.abbreviation}</Badge>
              </div>
              {department.description && (
                <p className="mt-2 text-sm text-slate-600">{department.description}</p>
              )}

              {/* Sub-ministries section */}
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  {t("pages.authDepartments.subMinistries")}
                </h3>
                {isPlaceholderData ? (
                  <div className="mt-2 space-y-2">
                    <Skeleton className="h-7 w-24 rounded-full" />
                    <Skeleton className="h-7 w-28 rounded-full" />
                  </div>
                ) : department.subMinistries.length === 0 ? (
                  <p className="mt-2 text-sm italic text-slate-400">
                    {t("pages.authDepartments.noSubMinistries")}
                  </p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {department.subMinistries.map((sm) => (
                      <span
                        key={sm.id}
                        className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                      >
                        {sm.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
