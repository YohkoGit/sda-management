import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { getDateLocale } from "@/lib/dateFormatting";
import { Eyebrow } from "@/components/ui/typography";

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
  const formattedDate = format(new Date(), "EEEE d MMMM · yyyy", { locale });
  const firstName = user?.firstName ?? "";
  const roleLabel = t(getRoleLabelKey(user?.role ?? ""));

  return (
    <section className="flex flex-col gap-4 border-b border-[var(--hairline)] pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <Eyebrow className="capitalize">{formattedDate}</Eyebrow>
        <h1 className="mt-3 font-display text-4xl leading-[1.05] text-[var(--ink)] sm:text-5xl">
          {t("pages.dashboard.greeting", { name: firstName })}
          <span className="italic font-normal text-[var(--ink-2)]">.</span>
        </h1>
      </div>
      <div className="text-right">
        <Eyebrow gilt>{roleLabel}</Eyebrow>
      </div>
    </section>
  );
}
