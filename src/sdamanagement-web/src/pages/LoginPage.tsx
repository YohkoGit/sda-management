import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import {
  emailSchema,
  loginSchema,
  setPasswordSchema,
  type EmailFormData,
  type LoginFormData,
  type SetPasswordFormData,
} from "@/schemas/authSchema";

type LoginStep = "email" | "password" | "set-password";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Focus first field on step transition
  useEffect(() => {
    firstInputRef.current?.focus();
  }, [step]);

  // Email step form
  const emailForm = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  // Password step form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  // Set-password step form
  const setPasswordForm = useForm<SetPasswordFormData>({
    resolver: zodResolver(setPasswordSchema),
    defaultValues: { email: "", newPassword: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const newPasswordValue = setPasswordForm.watch("newPassword");

  const handleEmailSubmit = async (data: EmailFormData) => {
    setServerError(null);
    try {
      const response = await api.post<{ flow: string }>("/api/auth/initiate", {
        email: data.email,
      });
      setEmail(data.email);
      const flow = response.data.flow as LoginStep;
      if (flow === "password") {
        loginForm.setValue("email", data.email);
        setStep("password");
      } else {
        setPasswordForm.setValue("email", data.email);
        setStep("set-password");
      }
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleLoginSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await api.post("/api/auth/login", data);
      await checkAuth();
      navigate("/dashboard");
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) {
        setServerError(t("auth.login.error.invalidCredentials"));
      } else {
        handleApiError(err);
      }
    }
  };

  const handleSetPasswordSubmit = async (data: SetPasswordFormData) => {
    setServerError(null);
    try {
      await api.post("/api/auth/set-password", {
        email: data.email,
        newPassword: data.newPassword,
      });
      toast.success(t("auth.setPassword.success"));
      await checkAuth();
      navigate("/dashboard");
    } catch (err) {
      handleApiError(err);
    }
  };

  const handleApiError = (err: unknown) => {
    if (isAxiosError(err) && err.response?.data?.type) {
      const problemType = err.response.data.type as string;
      const i18nKey = `auth.error.${problemType.replace("urn:sdac:", "")}`;
      const translated = t(i18nKey);
      // If translation key not found, show generic error
      setServerError(translated !== i18nKey ? translated : t("auth.error.generic"));
    } else {
      toast.error(t("auth.error.generic"));
    }
  };

  const handleBack = () => {
    setServerError(null);
    loginForm.reset();
    setPasswordForm.reset();
    setStep("email");
  };

  const handleGoogleLogin = () => {
    window.location.href = `/api/auth/google-login?returnUrl=${encodeURIComponent("/dashboard")}`;
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:w-[400px] lg:w-[500px]">
        {/* Email step */}
        {step === "email" && (
          <div>
            <h1 className="mb-6 text-2xl font-bold">{t("auth.login.title")}</h1>

            <Button
              type="button"
              variant="outline"
              className="mb-4 w-full min-h-[44px]"
              onClick={handleGoogleLogin}
            >
              <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t("auth.login.googleButton")}
            </Button>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-2 text-muted-foreground">
                  {t("auth.login.or")}
                </span>
              </div>
            </div>

            <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base font-medium">
                    {t("auth.login.email")}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="min-h-[44px] text-base"
                    aria-invalid={!!emailForm.formState.errors.email}
                    aria-describedby={
                      emailForm.formState.errors.email ? "email-error" : undefined
                    }
                    {...emailForm.register("email")}
                    ref={(e) => {
                      emailForm.register("email").ref(e);
                      (firstInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                    }}
                  />
                  {emailForm.formState.errors.email && (
                    <p id="email-error" className="text-sm text-destructive">
                      {emailForm.formState.errors.email.message}
                    </p>
                  )}
                </div>

                {serverError && (
                  <p className="text-sm text-destructive" role="alert">
                    {serverError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full min-h-[44px]"
                  disabled={emailForm.formState.isSubmitting}
                >
                  {emailForm.formState.isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("auth.login.continue")
                  )}
                </Button>
              </div>
            </form>

            <button
              type="button"
              className="mt-4 text-sm text-muted-foreground hover:underline"
              onClick={() => navigate("/forgot-password")}
            >
              {t("auth.login.forgotPassword")}
            </button>
          </div>
        )}

        {/* Password step */}
        {step === "password" && (
          <div>
            <h1 className="mb-6 text-2xl font-bold">{t("auth.login.title")}</h1>

            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">{t("auth.login.email")}</Label>
                  <Input
                    type="email"
                    value={email}
                    readOnly
                    className="min-h-[44px] text-base bg-muted"
                    tabIndex={-1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-base font-medium">
                    {t("auth.login.password")}
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    className="min-h-[44px] text-base"
                    aria-invalid={!!loginForm.formState.errors.password}
                    aria-describedby={
                      loginForm.formState.errors.password ? "password-error" : undefined
                    }
                    {...loginForm.register("password")}
                    ref={(e) => {
                      loginForm.register("password").ref(e);
                      (firstInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                    }}
                  />
                  {loginForm.formState.errors.password && (
                    <p id="password-error" className="text-sm text-destructive">
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>

                {serverError && (
                  <p className="text-sm text-destructive" role="alert">
                    {serverError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full min-h-[44px]"
                  disabled={loginForm.formState.isSubmitting}
                >
                  {loginForm.formState.isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("auth.login.submit")
                  )}
                </Button>
              </div>
            </form>

            <button
              type="button"
              className="mt-4 text-sm text-muted-foreground hover:underline"
              onClick={handleBack}
            >
              {t("auth.login.back")}
            </button>
          </div>
        )}

        {/* Set-password step (first login) */}
        {step === "set-password" && (
          <div>
            <h1 className="mb-2 text-2xl font-bold">{t("auth.setPassword.title")}</h1>
            <p className="mb-6 text-sm text-muted-foreground">
              {t("auth.setPassword.helper")}
            </p>

            <form onSubmit={setPasswordForm.handleSubmit(handleSetPasswordSubmit)}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-base font-medium">{t("auth.login.email")}</Label>
                  <Input
                    type="email"
                    value={email}
                    readOnly
                    className="min-h-[44px] text-base bg-muted"
                    tabIndex={-1}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-base font-medium">
                    {t("auth.setPassword.newPassword")}
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    autoComplete="new-password"
                    className="min-h-[44px] text-base"
                    aria-invalid={!!setPasswordForm.formState.errors.newPassword}
                    aria-describedby="newPassword-error password-strength"
                    {...setPasswordForm.register("newPassword")}
                    ref={(e) => {
                      setPasswordForm.register("newPassword").ref(e);
                      (firstInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                    }}
                  />
                  {setPasswordForm.formState.errors.newPassword && (
                    <p id="newPassword-error" className="text-sm text-destructive">
                      {setPasswordForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-base font-medium">
                    {t("auth.setPassword.confirmPassword")}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className="min-h-[44px] text-base"
                    aria-invalid={!!setPasswordForm.formState.errors.confirmPassword}
                    aria-describedby={
                      setPasswordForm.formState.errors.confirmPassword
                        ? "confirmPassword-error"
                        : undefined
                    }
                    {...setPasswordForm.register("confirmPassword")}
                  />
                  {setPasswordForm.formState.errors.confirmPassword && (
                    <p id="confirmPassword-error" className="text-sm text-destructive">
                      {setPasswordForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>

                <div id="password-strength">
                  <PasswordStrengthIndicator password={newPasswordValue || ""} />
                </div>

                {serverError && (
                  <p className="text-sm text-destructive" role="alert">
                    {serverError}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full min-h-[44px]"
                  disabled={setPasswordForm.formState.isSubmitting}
                >
                  {setPasswordForm.formState.isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    t("auth.setPassword.submit")
                  )}
                </Button>
              </div>
            </form>

            <button
              type="button"
              className="mt-4 text-sm text-muted-foreground hover:underline"
              onClick={handleBack}
            >
              {t("auth.login.back")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
