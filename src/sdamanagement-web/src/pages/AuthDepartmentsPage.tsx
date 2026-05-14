import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { departmentService } from "@/services/departmentService";
import { StaffingIndicator } from "@/components/activity/StaffingIndicator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Eyebrow, Serial } from "@/components/ui/typography";
import { deptSwatchColor } from "@/lib/dept-color";

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
    <div className="mx-auto max-w-5xl">
      <div className="flex items-baseline justify-between gap-6 border-b border-[var(--ink)] pb-4">
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.authDepartments.title")}
        </h1>
        <Eyebrow>{t("pages.home.ministries", "Ministères")}</Eyebrow>
      </div>

      {isPending ? (
        <ul className="mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="grid grid-cols-[32px_16px_1fr_auto] items-center gap-4 border-b border-[var(--hairline)] py-5"
            >
              <Skeleton className="h-3 w-6 bg-[var(--parchment-2)]" />
              <Skeleton className="h-3 w-3 rounded-full bg-[var(--parchment-2)]" />
              <Skeleton className="h-5 w-1/2 bg-[var(--parchment-2)]" />
              <Skeleton className="h-3 w-12 bg-[var(--parchment-2)]" />
            </li>
          ))}
        </ul>
      ) : isError ? (
        <div className="mt-10 border-t border-[var(--rose)] pt-6 text-center">
          <p className="text-base text-[var(--rose)]">{t("pages.authDepartments.loadError")}</p>
          <Button variant="outline" className="mt-4" onClick={() => refetch()}>
            {t("pages.authDepartments.retry")}
          </Button>
        </div>
      ) : departments && departments.length === 0 ? (
        <p className="mt-12 text-center font-display text-xl italic text-[var(--ink-3)]">
          {t("pages.authDepartments.noDepartments")}
        </p>
      ) : (
        <ul className="mt-2">
          {departments?.map((dept, idx) => {
            const swatch = deptSwatchColor({
              abbreviation: dept.abbreviation ?? undefined,
              color: dept.color ?? undefined,
            });
            return (
              <li key={dept.id}>
                <Link
                  to={`/my-departments/${dept.id}`}
                  className="group grid grid-cols-[32px_16px_1fr_auto_auto] items-center gap-4 border-b border-[var(--hairline)] py-5 transition-colors hover:bg-[var(--parchment-2)] focus-visible:outline-none focus-visible:bg-[var(--parchment-2)] focus-visible:ring-2 focus-visible:ring-[var(--gilt)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--parchment)]"
                  aria-label={dept.name}
                >
                  <Serial n={idx + 1} />
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: swatch }}
                  />
                  <div className="min-w-0">
                    <h3 className="font-display text-lg leading-tight text-[var(--ink)]">
                      {dept.name}
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)] align-middle">
                        {dept.abbreviation}
                      </span>
                    </h3>
                    {dept.description && (
                      <p
                        className="mt-0.5 line-clamp-1 text-sm text-[var(--ink-3)]"
                        title={dept.description}
                      >
                        {dept.description}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-3)] tabular-nums">
                    {t("pages.authDepartments.subMinistryCount", { count: dept.subMinistryCount })}
                  </span>
                  <span className="flex items-center gap-3">
                    {dept.aggregateStaffingStatus !== "NoActivities" && (
                      <StaffingIndicator
                        staffingStatus={dept.aggregateStaffingStatus}
                        assigned={0}
                        total={0}
                        size="sm"
                        showLabel={false}
                      />
                    )}
                    <ChevronRight
                      className="h-4 w-4 text-[var(--ink-4)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--ink)]"
                      aria-hidden
                    />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
