import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { SetupStatusResponse } from "@/services/systemHealthService";

interface SetupStatusCardProps {
  setupStatus: SetupStatusResponse;
}

export function SetupStatusCard({ setupStatus }: SetupStatusCardProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-2">
        <h3 className="font-semibold text-base">
          {t("pages.adminSystemHealth.setup.title")}
        </h3>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {t("pages.adminSystemHealth.setup.churchConfig")}
          </span>
          {setupStatus.churchConfigExists ? (
            <span>
              <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span className="sr-only">{t("pages.adminSystemHealth.setup.configured")}</span>
            </span>
          ) : (
            <span>
              <X className="h-4 w-4 text-red-500" aria-hidden="true" />
              <span className="sr-only">{t("pages.adminSystemHealth.setup.notConfigured")}</span>
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {t("pages.adminSystemHealth.setup.departments")}
          </span>
          <span className="text-sm font-mono">
            {setupStatus.departmentCount}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {t("pages.adminSystemHealth.setup.templates")}
          </span>
          <span className="text-sm font-mono">
            {setupStatus.templateCount}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {t("pages.adminSystemHealth.setup.schedules")}
          </span>
          <span className="text-sm font-mono">
            {setupStatus.scheduleCount}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">
            {t("pages.adminSystemHealth.setup.users")}
          </span>
          <span className="text-sm font-mono">{setupStatus.userCount}</span>
        </div>
      </CardContent>
    </Card>
  );
}
