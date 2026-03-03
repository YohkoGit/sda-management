import { useTranslation } from "react-i18next";

export default function AdminPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-black">{t("pages.admin.title")}</h1>
    </div>
  );
}
