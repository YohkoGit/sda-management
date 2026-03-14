import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { SetupChecklist } from "@/components/setup";
import { MyAssignmentsSection } from "@/components/assignments/MyAssignmentsSection";

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isOwner = user?.role?.toUpperCase() === "OWNER";

  return (
    <div>
      {isOwner && (
        <div className="mb-6">
          <SetupChecklist />
        </div>
      )}
      <h1 className="text-2xl font-black">{t("pages.dashboard.title")}</h1>
      <p className="mt-2 text-muted-foreground">
        {t("pages.dashboard.welcome", { name: user?.firstName })}
      </p>
      <div className="mt-6">
        <MyAssignmentsSection />
      </div>
    </div>
  );
}
