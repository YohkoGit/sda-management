import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useAuth } from "@/contexts/AuthContext";
import { useRole } from "@/hooks/useRole";
import { configService, type ChurchConfigResponse } from "@/services/configService";
import { ChurchIdentityForm } from "@/components/settings/ChurchIdentityForm";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
  const { t } = useTranslation();
  const { isLoading: isAuthLoading } = useAuth();
  const { isOwner } = useRole();

  const { data: configData, isLoading } = useQuery<ChurchConfigResponse | null>({
    queryKey: ["config"],
    queryFn: async () => {
      try {
        const response = await configService.getAdmin();
        return response.data;
      } catch (err) {
        if (isAxiosError(err) && err.response?.status === 404) {
          return null;
        }
        throw err;
      }
    },
    enabled: isOwner,
    retry: false,
  });

  if (isAuthLoading) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">{t("pages.settings.title")}</h1>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">{t("pages.settings.title")}</h1>
        <p className="mt-4 text-muted-foreground">
          {t("pages.settings.noSettingsForRole")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">{t("pages.settings.title")}</h1>
        <div className="mt-6 space-y-4">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">{t("pages.settings.title")}</h1>
      <div className="mt-6 max-w-2xl">
        <ChurchIdentityForm existingConfig={configData} />
      </div>
    </div>
  );
}
