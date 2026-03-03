import { useTranslation } from "react-i18next";

export default function AuthDepartmentsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-black">{t("pages.departments.title")}</h1>
    </div>
  );
}
