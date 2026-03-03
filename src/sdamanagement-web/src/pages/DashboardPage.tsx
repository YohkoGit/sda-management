import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-black">{t("pages.dashboard.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("pages.dashboard.welcome", { name: user?.firstName })}
      </p>
    </div>
  );
}
