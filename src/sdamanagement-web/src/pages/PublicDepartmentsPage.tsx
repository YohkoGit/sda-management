import { useTranslation } from "react-i18next";

export default function PublicDepartmentsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">{t("pages.departments.title")}</h1>
    </div>
  );
}
