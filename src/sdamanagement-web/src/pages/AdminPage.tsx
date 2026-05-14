import { useTranslation } from "react-i18next";

export default function AdminPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">{t("pages.admin.title")}</h1>
    </div>
  );
}
