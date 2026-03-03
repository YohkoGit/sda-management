import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-2xl font-black">{t("pages.home.title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("pages.home.subtitle")}</p>
    </div>
  );
}
