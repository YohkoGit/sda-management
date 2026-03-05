import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SystemInfoCardProps {
  version: string;
  uptimeSeconds: number;
  environment: string;
}

function formatUptime(totalSeconds: number, t: TFunction): string {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts: string[] = [];
  if (days > 0)
    parts.push(t("pages.adminSystemHealth.uptime.days", { count: days }));
  if (hours > 0)
    parts.push(t("pages.adminSystemHealth.uptime.hours", { count: hours }));
  if (minutes > 0)
    parts.push(t("pages.adminSystemHealth.uptime.minutes", { count: minutes }));
  return parts.length > 0
    ? parts.join(", ")
    : t("pages.adminSystemHealth.uptime.lessThanMinute");
}

export { formatUptime };

export function SystemInfoCard({
  version,
  uptimeSeconds,
  environment,
}: SystemInfoCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="font-semibold text-base">
          {t("pages.adminSystemHealth.system.title")}
        </h3>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">
            {t("pages.adminSystemHealth.system.version")}
          </p>
          <p className="text-sm font-mono">{version}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t("pages.adminSystemHealth.system.uptime")}
          </p>
          <p className="text-sm font-mono">{formatUptime(uptimeSeconds, t)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">
            {t("pages.adminSystemHealth.system.environment")}
          </p>
          <p className="text-sm font-mono">{environment}</p>
        </div>
      </CardContent>
    </Card>
  );
}
