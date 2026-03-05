import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { HealthCheckItem } from "@/services/systemHealthService";

interface HealthStatusCardProps {
  check: HealthCheckItem;
}

const checkNameToI18nKey: Record<string, string> = {
  npgsql: "pages.adminSystemHealth.database.title",
};

export function HealthStatusCard({ check }: HealthStatusCardProps) {
  const { t } = useTranslation();

  const statusColor =
    check.status === "Healthy"
      ? "bg-emerald-600"
      : check.status === "Degraded"
        ? "bg-amber-500"
        : "bg-red-500";

  const statusKey =
    check.status === "Healthy"
      ? "pages.adminSystemHealth.database.healthy"
      : check.status === "Degraded"
        ? "pages.adminSystemHealth.database.degraded"
        : "pages.adminSystemHealth.database.unhealthy";

  const titleKey = checkNameToI18nKey[check.name];
  const title = titleKey ? t(titleKey) : check.name;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${statusColor}`}
            data-testid="status-dot"
          />
          <h3 className="font-semibold text-base">{title}</h3>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm">{t(statusKey)}</p>
        {check.description && (
          <p className="mt-1 text-xs text-muted-foreground">
            {check.description}
          </p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          {t("pages.adminSystemHealth.database.duration")}: {check.duration}
        </p>
      </CardContent>
    </Card>
  );
}
