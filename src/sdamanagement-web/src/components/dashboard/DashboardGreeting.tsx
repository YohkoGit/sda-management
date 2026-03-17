import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { getDateLocale } from "@/lib/dateFormatting";

function getRoleLabelKey(role: string): string {
  switch (role?.toUpperCase()) {
    case "ADMIN":
      return "pages.dashboard.role.admin";
    case "OWNER":
      return "pages.dashboard.role.owner";
    default:
      return "pages.dashboard.role.viewer";
  }
}

export function DashboardGreeting() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const locale = getDateLocale(i18n.language);
  const formattedDate = format(new Date(), "EEEE d MMMM yyyy", { locale });

  return (
    <section className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-black uppercase tracking-widest text-primary">
          {t("pages.dashboard.commandCenter")}
        </p>
        <h1 className="mt-1 text-2xl font-black text-foreground sm:text-3xl">
          {t("pages.dashboard.greeting", { name: user?.firstName })}
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground capitalize">
          {formattedDate}
        </p>
      </div>
      <Badge
        variant="outline"
        className="shrink-0 mt-1"
        aria-label={t(getRoleLabelKey(user?.role ?? ""))}
      >
        {t(getRoleLabelKey(user?.role ?? ""))}
      </Badge>
    </section>
  );
}
