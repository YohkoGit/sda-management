import { useTranslation } from "react-i18next";

export default function LiveIndicator() {
  const { t } = useTranslation();

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
      <span className="text-sm font-semibold text-rose-500">
        {t("pages.home.liveNow")}
      </span>
    </span>
  );
}
