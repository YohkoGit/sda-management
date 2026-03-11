import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import TopNav from "@/components/layout/TopNav";

export default function PublicLayout() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        {t("layout.skipToContent")}
      </a>
      <TopNav />
      <main id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
