import { useTranslation } from "react-i18next";

export default function PublicCalendarPage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-black">{t("pages.calendar.title")}</h1>
    </div>
  );
}
