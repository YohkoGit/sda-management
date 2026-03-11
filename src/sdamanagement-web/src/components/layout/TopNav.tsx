import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { useMediaQuery } from "@/hooks/useMediaQuery";

const publicLinks = [
  { to: "/", labelKey: "nav.public.home" },
  { to: "/calendar", labelKey: "nav.public.calendar" },
  { to: "/departments", labelKey: "nav.public.departments" },
  { to: "/live", labelKey: "nav.public.live" },
] as const;

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `text-sm font-medium transition-colors hover:text-indigo-600 ${
    isActive
      ? "text-indigo-600 border-b-2 border-indigo-600"
      : "text-foreground"
  }`;
}

export default function TopNav() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Church name / logo */}
        <Link to="/" className="text-sm font-black tracking-tight lg:text-base">
          {t("layout.churchName")}
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 lg:flex">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={navLinkClass}
            >
              {t(link.labelKey)}
            </NavLink>
          ))}
        </div>

        {/* Right section: language switcher + sign in + mobile hamburger */}
        <div className="flex items-center gap-2">
          <LanguageSwitcher />

          <Button asChild variant="default" size="sm" className="hidden lg:inline-flex">
            <Link to="/login">{t("nav.public.signIn")}</Link>
          </Button>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={t("nav.public.menu", "Menu")}>
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </SheetTrigger>
            <SheetContent side={isDesktop ? "right" : "bottom"} className={isDesktop ? "w-64" : ""}>
              <SheetTitle className="sr-only">{t("nav.public.menu", "Menu")}</SheetTitle>
              <div className="flex flex-col gap-4 pt-8">
                {publicLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block px-3 py-2 text-sm font-medium rounded-md ${
                        isActive ? "bg-indigo-50 text-indigo-600" : "text-foreground hover:bg-muted"
                      }`
                    }
                  >
                    {t(link.labelKey)}
                  </NavLink>
                ))}
                <Button asChild variant="default" size="sm" className="mt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    {t("nav.public.signIn")}
                  </Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
