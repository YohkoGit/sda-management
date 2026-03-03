import { useTranslation } from "react-i18next";

export default function SettingsPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-black">{t("pages.settings.title")}</h1>
    </div>
  );
}
