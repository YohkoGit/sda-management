import { useTranslation } from "react-i18next";

interface ActivityFormStepperProps {
  templateApplied: boolean;
  hasRoles: boolean;
}

export function ActivityFormStepper({ templateApplied, hasRoles }: ActivityFormStepperProps) {
  const { t } = useTranslation();
  const steps: Array<{ key: string; label: string; status: "done" | "active" | "upcoming" }> = [
    { key: "template", label: t("pages.adminActivities.stepper.template", "Modèle"), status: templateApplied ? "done" : "active" },
    { key: "details", label: t("pages.adminActivities.stepper.details", "Détails"), status: templateApplied ? "active" : "upcoming" },
    { key: "roles", label: t("pages.adminActivities.stepper.roles", "Rôles"), status: hasRoles ? "active" : "upcoming" },
    { key: "review", label: t("pages.adminActivities.stepper.review", "Révision"), status: "upcoming" },
  ];

  return (
    <ol className="flex w-full gap-0" aria-label={t("pages.adminActivities.stepper.label", "Progression")}>
      {steps.map((s, i) => {
        const isGilt = s.status === "done" || s.status === "active";
        return (
          <li
            key={s.key}
            className="flex flex-1 items-center gap-2.5 pt-3.5"
            style={{ borderTop: `1px solid ${isGilt ? "var(--gilt)" : "var(--hairline-2)"}` }}
          >
            <span
              className={[
                "font-mono text-[11px] tracking-[0.12em]",
                s.status === "done" ? "text-[var(--gilt-2)]" : s.status === "active" ? "text-[var(--ink)]" : "text-[var(--ink-3)]",
              ].join(" ")}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span
              className={[
                "font-display text-base",
                s.status === "active" ? "font-medium text-[var(--ink)]" : s.status === "done" ? "text-[var(--ink-2)]" : "text-[var(--ink-3)]",
              ].join(" ")}
            >
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
