import { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { emailSchema, type EmailFormData } from "@/schemas/authSchema";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
  }, []);

  const form = useForm<EmailFormData>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
    mode: "onBlur",
  });

  const onSubmit = async (data: EmailFormData) => {
    try {
      const response = await api.post<{ token?: string }>(
        "/api/auth/password-reset/request",
        data
      );
      // MVP: auto-redirect with token from response
      if (response.data.token) {
        navigate(`/reset-password?token=${encodeURIComponent(response.data.token)}`);
      } else {
        toast.success(t("auth.resetPassword.requestSuccess"));
        navigate("/login");
      }
    } catch {
      toast.error(t("auth.error.generic"));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full rounded-2xl border bg-card p-6 shadow-sm sm:w-[400px] lg:w-[500px]">
        <h1 className="mb-2 text-2xl font-bold">{t("auth.resetPassword.title")}</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {t("auth.resetPassword.helper")}
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)}>
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
                aria-invalid={!!form.formState.errors.email}
                aria-describedby={
                  form.formState.errors.email ? "email-error" : undefined
                }
                {...form.register("email")}
                ref={(e) => {
                  form.register("email").ref(e);
                  (firstInputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                }}
              />
              {form.formState.errors.email && (
                <p id="email-error" className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full min-h-[44px]"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("auth.resetPassword.request")
              )}
            </Button>
          </div>
        </form>

        <Link
          to="/login"
          className="mt-4 inline-block text-sm text-muted-foreground hover:underline"
        >
          {t("auth.login.back")}
        </Link>
      </div>
    </div>
  );
}
