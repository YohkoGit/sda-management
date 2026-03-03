import { useRef, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/schemas/authSchema";

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, newPassword: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const newPasswordValue = form.watch("newPassword");

  const onSubmit = async (data: ResetPasswordFormData) => {
    setServerError(null);
    try {
      await api.post("/api/auth/password-reset/confirm", {
        token: data.token,
        newPassword: data.newPassword,
      });
      toast.success(t("auth.resetPassword.confirmSuccess"));
      navigate("/login");
    } catch (err) {
      if (isAxiosError(err) && err.response?.data?.type) {
        setServerError(t("auth.resetPassword.error.invalidToken"));
      } else {
        toast.error(t("auth.error.generic"));
      }
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:w-[400px] lg:w-[500px]">
          <p className="text-destructive">{t("auth.resetPassword.error.noToken")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:w-[400px] lg:w-[500px]">
        <h1 className="mb-2 text-2xl font-bold">{t("auth.resetPassword.confirmTitle")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {t("auth.resetPassword.confirmHelper")}
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-base font-medium">
                {t("auth.setPassword.newPassword")}
              </Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className="min-h-[44px] text-base"
                aria-invalid={!!form.formState.errors.newPassword}
                aria-describedby="newPassword-error password-strength"
                {...form.register("newPassword")}
                ref={(e) => {
                  form.register("newPassword").ref(e);
                  (firstInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                }}
              />
              {form.formState.errors.newPassword && (
                <p id="newPassword-error" className="text-sm text-destructive">
                  {form.formState.errors.newPassword.message}
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
                aria-invalid={!!form.formState.errors.confirmPassword}
                aria-describedby={
                  form.formState.errors.confirmPassword
                    ? "confirmPassword-error"
                    : undefined
                }
                {...form.register("confirmPassword")}
              />
              {form.formState.errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-destructive">
                  {form.formState.errors.confirmPassword.message}
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
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("auth.resetPassword.confirm")
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
