import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { stopConnection } from "@/lib/signalr";
import type { UserRole } from "@/types/auth";

export type { UserRole } from "@/types/auth";

export interface AuthDepartmentBadge {
  id: number;
  name: string;
  abbreviation: string;
  color: string;
}

export interface AuthUser {
  userId: number;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  departmentIds?: number[];
  departments?: AuthDepartmentBadge[];
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (returnUrl?: string) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get<AuthUser>("/api/auth/me");
      setUser(response.data);
      setError(null);
    } catch (err) {
      setUser(null);
      if (!isAxiosError(err) || err.response?.status !== 401) {
        console.warn("Auth check failed unexpectedly:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback((returnUrl?: string) => {
    const target = returnUrl ?? window.location.pathname;
    window.location.href = `/api/auth/google-login?returnUrl=${encodeURIComponent(target)}`;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.warn("Logout API call failed:", error);
    } finally {
      queryClient.clear();
      await stopConnection();
      setUser(null);
      setError(null);
      window.location.href = "/";
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam === "user_not_found") {
      const msg = t("auth.errors.userNotFound");
      setError(msg);
      toast.error(msg, { duration: Infinity });
      window.history.replaceState({}, "", window.location.pathname);
    } else if (errorParam === "auth_failed") {
      const msg = t("auth.errors.authFailed");
      setError(msg);
      toast.error(msg, { duration: Infinity });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [t]);

  useEffect(() => {
    const handleExpired = () => {
      setUser(null);
      setError(null);
    };
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, []);

  return (
    <AuthContext
      value={{ user, isAuthenticated: !!user, isLoading, error, login, logout, checkAuth }}
    >
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
