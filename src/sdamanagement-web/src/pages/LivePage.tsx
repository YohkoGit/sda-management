import { useTranslation } from "react-i18next";
import YouTubeSection from "@/components/public/YouTubeSection";

export default function LivePage() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 font-display text-4xl font-normal text-[var(--ink)] leading-tight tracking-tight">{t("pages.live.title")}</h1>
      <YouTubeSection />
    </div>
  );
}
