import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Calendar,
  Building2,
  FolderTree,
  Shield,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { hasRole } from "@/components/ProtectedRoute";
import LanguageSwitcher from "@/components/layout/LanguageSwitcher";

interface NavItem {
  to: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  minRole?: string;
}

const navItems: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.auth.dashboard", icon: LayoutDashboard },
  { to: "/my-calendar", labelKey: "nav.auth.calendar", icon: Calendar },
  { to: "/my-departments", labelKey: "nav.auth.departments", icon: Building2 },
  { to: "/admin", labelKey: "nav.auth.admin", icon: Shield, minRole: "ADMIN" },
  { to: "/admin/departments", labelKey: "nav.auth.adminDepartments", icon: FolderTree, minRole: "OWNER" },
  { to: "/admin/settings", labelKey: "nav.auth.settings", icon: Settings, minRole: "OWNER" },
];

export default function AppSidebar() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const userRole = user?.role ?? "VIEWER";

  const visibleItems = navItems.filter(
    (item) => !item.minRole || hasRole(userRole, item.minRole)
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-black">
            {t("app.churchInitials")}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-semibold">
              {user?.firstName} {user?.lastName}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {t(`roles.${userRole.toLowerCase()}`)}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("nav.auth.navigation", "Navigation")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.to}
                      end={item.to === "/admin"}
                      className={({ isActive }) =>
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" : ""
                      }
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{t(item.labelKey)}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex flex-col gap-2">
          <LanguageSwitcher />
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => logout()}>
                <LogOut className="h-4 w-4" />
                <span>{t("nav.auth.signOut")}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
