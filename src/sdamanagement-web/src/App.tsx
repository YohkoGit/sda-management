import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import PublicLayout from "@/layouts/PublicLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import LoadingSpinner from "@/components/LoadingSpinner";
import LoginPage from "@/pages/LoginPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import HomePage from "@/pages/HomePage";
import PublicCalendarPage from "@/pages/PublicCalendarPage";
import PublicDepartmentsPage from "@/pages/PublicDepartmentsPage";
import LivePage from "@/pages/LivePage";
import NotFoundPage from "@/pages/NotFoundPage";

// Lazy-loaded authenticated layout — code splitting (NFR5)
const AuthenticatedLayout = lazy(() => import("@/layouts/AuthenticatedLayout"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const AuthCalendarPage = lazy(() => import("@/pages/AuthCalendarPage"));
const AuthDepartmentsPage = lazy(() => import("@/pages/AuthDepartmentsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const AdminDepartmentsPage = lazy(() => import("@/pages/AdminDepartmentsPage"));

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TooltipProvider>
          <Routes>
            {/* Auth pages — outside layouts */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Public route tree */}
            <Route element={<PublicLayout />}>
              <Route index element={<HomePage />} />
              <Route path="calendar" element={<PublicCalendarPage />} />
              <Route path="departments" element={<PublicDepartmentsPage />} />
              <Route path="live" element={<LivePage />} />
            </Route>

            {/* Authenticated route tree — lazy loaded */}
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AuthenticatedLayout />
                  </Suspense>
                }
              >
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="my-calendar" element={<AuthCalendarPage />} />
                <Route path="my-departments" element={<AuthDepartmentsPage />} />
              </Route>
            </Route>

            {/* Admin routes — ADMIN+ */}
            <Route element={<ProtectedRoute requiredRole="ADMIN" />}>
              <Route
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AuthenticatedLayout />
                  </Suspense>
                }
              >
                <Route path="admin" element={<AdminPage />} />
              </Route>
            </Route>

            {/* Owner-only admin routes */}
            <Route element={<ProtectedRoute requiredRole="OWNER" />}>
              <Route
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <AuthenticatedLayout />
                  </Suspense>
                }
              >
                <Route path="admin/settings" element={<SettingsPage />} />
                <Route path="admin/departments" element={<AdminDepartmentsPage />} />
              </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </TooltipProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
