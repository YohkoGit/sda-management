import { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Menu, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Wordmark } from "@/components/ui/typography";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useAuth } from "@/contexts/AuthContext";

const publicLinks = [
  { to: "/", labelKey: "nav.public.home" },
  { to: "/calendar", labelKey: "nav.public.calendar" },
  { to: "/departments", labelKey: "nav.public.departments" },
  { to: "/live", labelKey: "nav.public.live" },
] as const;

function desktopNavLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "relative font-mono text-[11px] uppercase tracking-[0.18em] py-1 transition-colors",
    isActive
      ? "text-[var(--ink)] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-px after:bg-[var(--gilt)]"
      : "text-[var(--ink-3)] hover:text-[var(--ink)]",
  ].join(" ");
}

function mobileNavLinkClass({ isActive }: { isActive: boolean }) {
  return [
    "block border-l-2 px-4 py-3 font-display text-lg leading-tight transition-colors",
    isActive
      ? "border-[var(--gilt)] bg-[var(--parchment-2)] text-[var(--ink)]"
      : "border-transparent text-[var(--ink-2)] hover:bg-[var(--parchment-2)]",
  ].join(" ");
}

export default function TopNav() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const { isAuthenticated } = useAuth();
  const ctaLink = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated
    ? t("nav.public.openDashboard")
    : t("nav.public.signIn");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--hairline)] bg-[var(--parchment)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--parchment)]/85">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
        {/* Wordmark */}
        <Link to="/" className="block leading-none">
          <Wordmark size="default" subtitle={t("app.churchSubtitle", "Église Adventiste · 2026")} />
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-10 lg:flex">
          {publicLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              className={desktopNavLinkClass}
            >
              {t(link.labelKey)}
            </NavLink>
          ))}
        </div>

        {/* Right section: language switcher + sign in + mobile hamburger */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          <Button
            asChild
            variant={isAuthenticated ? "default" : "gilt"}
            size="sm"
            className="hidden lg:inline-flex"
          >
            <Link to={ctaLink}>
              {isAuthenticated && <LayoutDashboard className="mr-2 h-4 w-4" />}
              {ctaLabel}
            </Link>
          </Button>

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label={t("nav.public.menu", "Menu")}
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </SheetTrigger>
            <SheetContent
              side={isDesktop ? "right" : "bottom"}
              className={isDesktop ? "w-72" : ""}
            >
              <SheetTitle className="sr-only">
                {t("nav.public.menu", "Menu")}
              </SheetTitle>
              <div className="flex flex-col gap-2 pt-10">
                {publicLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    onClick={() => setMobileOpen(false)}
                    className={mobileNavLinkClass}
                  >
                    {t(link.labelKey)}
                  </NavLink>
                ))}
                <Button asChild variant={isAuthenticated ? "default" : "gilt"} className="mx-4 mt-4">
                  <Link to={ctaLink} onClick={() => setMobileOpen(false)}>
                    {isAuthenticated && <LayoutDashboard className="mr-2 h-4 w-4" />}
                    {ctaLabel}
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
