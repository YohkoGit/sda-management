import { useTranslation } from "react-i18next";

export default function PublicDepartmentsPage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-2xl font-black">{t("pages.departments.title")}</h1>
    </div>
  );
}
