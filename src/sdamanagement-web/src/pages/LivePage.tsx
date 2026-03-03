import { useTranslation } from "react-i18next";

export default function LivePage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-black">{t("pages.live.title")}</h1>
    </div>
  );
}
