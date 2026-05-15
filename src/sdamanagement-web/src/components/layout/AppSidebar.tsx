import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { Eyebrow, Wordmark } from "@/components/ui/typography";
import { useAuth } from "@/contexts/AuthContext";
import { hasRole } from "@/components/ProtectedRoute";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

interface NavItem {
  to: string;
  labelKey: string;
  minRole?: string;
  end?: boolean;
}

const primaryNav: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.auth.dashboard" },
  { to: "/my-calendar", labelKey: "nav.auth.calendar" },
  { to: "/my-departments", labelKey: "nav.auth.departments" },
  { to: "/admin/users", labelKey: "nav.auth.adminUsers", minRole: "VIEWER" },
];

const adminNav: NavItem[] = [
  { to: "/admin", labelKey: "nav.auth.admin", minRole: "ADMIN", end: true },
  { to: "/admin/activities", labelKey: "nav.auth.adminActivities", minRole: "ADMIN" },
  { to: "/admin/departments", labelKey: "nav.auth.adminDepartments", minRole: "OWNER" },
  { to: "/admin/activity-templates", labelKey: "nav.auth.adminActivityTemplates", minRole: "OWNER" },
  { to: "/admin/program-schedules", labelKey: "nav.auth.adminProgramSchedules", minRole: "OWNER" },
  { to: "/admin/system-health", labelKey: "nav.auth.adminSystemHealth", minRole: "OWNER" },
  { to: "/admin/settings", labelKey: "nav.auth.settings", minRole: "OWNER" },
];

function NavListItem({
  item,
  index,
  label,
}: {
  item: NavItem;
  index: number;
  label: string;
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end ?? item.to === "/dashboard"}
      className={({ isActive }) =>
        [
          "group relative flex items-baseline gap-3 border-l-2 px-5 py-2.5 transition-colors",
          isActive
            ? "border-[var(--gilt)] bg-[var(--parchment-2)] text-[var(--ink)]"
            : "border-transparent text-[var(--ink-2)] hover:bg-[var(--parchment-2)] hover:text-[var(--ink)]",
        ].join(" ")
      }
    >
      <span className="w-6 shrink-0 font-mono text-[10px] tabular-nums text-[var(--ink-4)] group-hover:text-[var(--ink-3)]">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="font-display text-base leading-tight">{label}</span>
    </NavLink>
  );
}

export default function AppSidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const userRole = user?.role ?? "VIEWER";

  const visiblePrimary = primaryNav.filter(
    (item) => !item.minRole || hasRole(userRole, item.minRole),
  );
  const visibleAdmin = adminNav.filter(
    (item) => !item.minRole || hasRole(userRole, item.minRole),
  );

  const firstName = user?.firstName ?? "";
  const lastName = user?.lastName ?? "";
  const departmentName = user?.departments?.[0]?.name ?? null;
  const roleLabel = t(`pages.dashboard.role.${userRole.toLowerCase()}`);

  return (
    <Sidebar>
      <SidebarHeader className="gap-6 px-6 pt-7 pb-4">
        <Wordmark size="sm" subtitle={t("app.churchSubtitle", "Église Adventiste · 2026")} />
        <div className="flex items-center gap-3 border-t border-[var(--hairline)] pt-5">
          <InitialsAvatar firstName={firstName} lastName={lastName} size="md" avatarUrl={user?.avatarUrl ?? undefined} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-display text-base text-[var(--ink)]">
              {firstName} {lastName}
            </span>
            <Eyebrow asChild className="mt-0.5">
              <span>
                {roleLabel}
                {departmentName ? ` · ${departmentName}` : ""}
              </span>
            </Eyebrow>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-0 py-6">
        <div className="space-y-2">
          <Eyebrow className="px-6">{t("nav.auth.navigation", "Naviguer")}</Eyebrow>
          <nav className="flex flex-col">
            {visiblePrimary.map((item, idx) => (
              <NavListItem
                key={item.to}
                item={item}
                index={idx}
                label={t(item.labelKey)}
              />
            ))}
          </nav>
        </div>

        {visibleAdmin.length > 0 && (
          <div className="mt-10 space-y-2">
            <Eyebrow gilt className="px-6">{t("nav.auth.admin", "Administration")}</Eyebrow>
            <nav className="flex flex-col">
              {visibleAdmin.map((item, idx) => (
                <NavListItem
                  key={item.to}
                  item={item}
                  index={visiblePrimary.length + idx}
                  label={t(item.labelKey)}
                />
              ))}
            </nav>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="gap-3 border-t border-[var(--hairline)] px-6 py-5">
        <div className="flex items-center justify-between">
          <LanguageSwitcher />
          <Eyebrow
            asChild
            className="inline-flex items-center gap-2 rounded-[var(--radius)] px-2 py-1 transition-colors hover:bg-[var(--parchment-2)] hover:text-[var(--ink)]"
          >
            <button type="button" onClick={() => logout()}>
              <LogOut className="h-3.5 w-3.5" />
              {t("nav.auth.signOut")}
            </button>
          </Eyebrow>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
