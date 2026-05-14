import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  systemHealthService,
  type SystemHealthResponse,
} from "@/services/systemHealthService";
import {
  HealthStatusCard,
  SystemInfoCard,
  SetupStatusCard,
} from "@/components/system-health";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminSystemHealthPage() {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const isOwner = user?.role?.toUpperCase() === "OWNER";
  const queryClient = useQueryClient();

  const { data, isLoading, isFetching } = useQuery<SystemHealthResponse>({
    queryKey: ["system-health"],
    queryFn: systemHealthService.getSystemHealth,
    refetchInterval: 30000,
    enabled: isOwner,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["system-health"] });
  };

  if (isAuthLoading) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminSystemHealth.title")}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminSystemHealth.title")}
        </h1>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">
          {t("pages.adminSystemHealth.title")}
        </h1>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw
            className={`mr-1 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
          />
          {isFetching
            ? t("pages.adminSystemHealth.refreshing")
            : t("pages.adminSystemHealth.refreshButton")}
        </Button>
      </div>

      {data && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.checks.map((check) => (
            <HealthStatusCard key={check.name} check={check} />
          ))}
          <SystemInfoCard
            version={data.version}
            uptimeSeconds={data.uptimeSeconds}
            environment={data.environment}
          />
          <SetupStatusCard setupStatus={data.setupStatus} />
        </div>
      )}
    </div>
  );
}
