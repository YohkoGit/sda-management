import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { departmentService } from "@/services/departmentService";
import { StaffingIndicator } from "@/components/activity/StaffingIndicator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AuthDepartmentsPage() {
  const { t } = useTranslation();

  const { data: departments, isPending, isError, refetch } = useQuery({
    queryKey: ["departments", "with-staffing"],
    queryFn: () => departmentService.getDepartmentsWithStaffing().then((res) => res.data),
  });

  useEffect(() => {
    document.title = t("pages.authDepartments.title");
  }, [t]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
      <h1 className="text-2xl font-black">{t("pages.authDepartments.title")}</h1>

      {isPending ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="rounded-2xl border-l-4 border-slate-200 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-3/4" />
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-3 rounded-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : isError ? (
        <div className="mt-6 text-center">
          <p className="text-base text-slate-500">{t("pages.authDepartments.loadError")}</p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>
            {t("pages.authDepartments.retry")}
          </Button>
        </div>
      ) : departments && departments.length === 0 ? (
        <p className="mt-6 text-base text-slate-500">{t("pages.authDepartments.noDepartments")}</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments?.map((dept) => (
            <Link
              key={dept.id}
              to={`/my-departments/${dept.id}`}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-2xl"
            >
              <Card
                className="cursor-pointer rounded-2xl border-l-4 border-slate-200 p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                style={{ borderLeftColor: dept.color || "#E2E8F0" }}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{dept.name}</h3>
                  <Badge variant="secondary" title={dept.name}>
                    {dept.abbreviation}
                  </Badge>
                </div>
                {dept.description && (
                  <p
                    className="mt-1 line-clamp-2 text-sm text-slate-600"
                    title={dept.description}
                  >
                    {dept.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs text-slate-400">
                    {t("pages.authDepartments.subMinistryCount", { count: dept.subMinistryCount })}
                  </span>
                  {dept.aggregateStaffingStatus !== "NoActivities" && (
                    <StaffingIndicator
                      staffingStatus={dept.aggregateStaffingStatus}
                      assigned={0}
                      total={0}
                      size="sm"
                      showLabel={false}
                    />
                  )}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
