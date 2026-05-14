import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/AppSidebar";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function AuthenticatedLayout() {
  const { t } = useTranslation();

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius)] focus:bg-[var(--parchment)] focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-[var(--gilt)]"
      >
        {t("layout.skipToContent")}
      </a>
      <AppSidebar />
      <SidebarInset className="bg-[var(--parchment)]">
        <header className="flex h-14 items-center gap-3 border-b border-[var(--hairline)] bg-[var(--parchment)] px-5 md:hidden">
          <SidebarTrigger className="-ml-1" />
          <span className="font-display text-base text-[var(--ink)]">
            {t("layout.churchName")}
          </span>
        </header>
        <main id="main-content" className="flex-1 px-6 py-8 lg:px-10 lg:py-12">
          <Suspense fallback={<LoadingSpinner />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
