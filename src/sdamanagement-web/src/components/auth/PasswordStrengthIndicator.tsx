import { useTranslation } from "react-i18next";

const CHECKS = [
  { id: "minLength", test: (p: string) => p.length >= 8 },
  { id: "uppercase", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lowercase", test: (p: string) => /[a-z]/.test(p) },
  { id: "digit", test: (p: string) => /[0-9]/.test(p) },
] as const;

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const { t } = useTranslation();

  return (
    <ul className="space-y-1 text-sm" aria-label={t("auth.setPassword.strength.label")}>
      {CHECKS.map((check) => {
        const met = check.test(password);
        return (
          <li
            key={check.id}
            className={met ? "text-emerald-600" : "text-destructive"}
          >
            {met ? "✓" : "○"} {t(`auth.setPassword.strength.${check.id}`)}
          </li>
        );
      })}
    </ul>
  );
}
