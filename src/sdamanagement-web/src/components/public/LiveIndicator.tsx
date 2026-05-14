import { useTranslation } from "react-i18next";

export default function LiveIndicator() {
  const { t } = useTranslation();
  return <span className="live">{t("pages.home.liveNow")}</span>;
}
