import { useWatch, type Control } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Eyebrow, Rule } from "@/components/ui/typography";
import { deptSwatchColor } from "@/lib/dept-color";
import { formatTime } from "@/lib/dateFormatting";
import type { DepartmentListItem } from "@/services/departmentService";
import type { CreateActivityFormData } from "@/schemas/activitySchema";

interface ActivityFormSidePanelProps {
  control: Control<CreateActivityFormData>;
  departments: DepartmentListItem[];
  templateApplied: boolean;
}

interface VerificationItem {
  ok: boolean;
  label: string;
}

export function ActivityFormSidePanel({
  control,
  departments,
  templateApplied,
}: ActivityFormSidePanelProps) {
  const { t, i18n } = useTranslation();
  const values = useWatch({ control });

  const dept = departments.find((d) => d.id === values.departmentId);
  const swatch = dept
    ? deptSwatchColor({
        abbreviation: dept.abbreviation ?? undefined,
        color: dept.color ?? undefined,
      })
    : "var(--hairline-2)";

  const previewTitle = values.title?.trim() || t("pages.adminActivities.preview.untitled", "Sans titre");
  const previewDate = values.date
    ? new Date(values.date + "T00:00:00").toLocaleDateString(i18n.language, {
        day: "numeric",
        month: "long",
      })
    : "—";
  const previewTime =
    values.startTime && values.endTime
      ? `${formatTime(values.startTime + (values.startTime.length === 5 ? ":00" : ""), i18n.language)}–${formatTime(values.endTime + (values.endTime.length === 5 ? ":00" : ""), i18n.language)}`
      : "—";
  const isSainteCene = values.specialType === "sainte-cene";

  const rolesArr = (values.roles ?? []) as Array<{ headcount?: number; assignments?: Array<unknown> }>;
  const unfilledRoles = rolesArr.filter((r) => (r?.assignments?.length ?? 0) < (r?.headcount ?? 1)).length;

  const checks: VerificationItem[] = [
    {
      ok: templateApplied,
      label: t("pages.adminActivities.verify.template", "Modèle appliqué"),
    },
    {
      ok: !!(values.title && values.title.trim().length > 0),
      label: t("pages.adminActivities.verify.title", "Titre rédigé"),
    },
    {
      ok: !!(values.date && values.startTime && values.endTime && values.endTime > values.startTime),
      label: t("pages.adminActivities.verify.datetime", "Date et horaire définis"),
    },
    {
      ok: !!values.departmentId && values.departmentId > 0,
      label: t("pages.adminActivities.verify.department", "Département choisi"),
    },
    {
      ok: unfilledRoles === 0 && rolesArr.length > 0,
      label:
        unfilledRoles > 0
          ? t("pages.adminActivities.verify.rolesGap", { count: unfilledRoles, defaultValue: "{{count}} rôle(s) à pourvoir" })
          : t("pages.adminActivities.verify.rolesOk", "Tous les rôles pourvus"),
    },
  ];

  return (
    <aside className="space-y-8">
      <div>
        <Eyebrow>{t("pages.adminActivities.preview.label", "Aperçu public")}</Eyebrow>
        <p className="mt-1.5 text-xs text-[var(--ink-3)]">
          {t("pages.adminActivities.preview.hint", "Ce que verra la congrégation après publication.")}
        </p>

        <div className="mt-4 rounded-[6px] border border-[var(--hairline)] bg-[var(--parchment)] p-6">
          <Eyebrow gilt>
            {isSainteCene ? t("pages.home.thisSabbath", "Ce Sabbat") : t("pages.adminActivities.preview.activity", "Activité")}
          </Eyebrow>
          <h3 className="mt-2.5 font-display text-2xl leading-tight text-[var(--ink)]">{previewTitle}</h3>
          <Rule className="my-4" />
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: swatch }}
              aria-hidden
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
              {dept?.abbreviation ?? "—"}
            </span>
          </div>
          <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--ink-2)]">
            {previewDate} · {previewTime}
          </div>
          {isSainteCene && (
            <div className="mt-2">
              <span className="inline-block rounded-[2px] border border-[var(--gilt-soft)] bg-[var(--gilt-wash)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gilt-2)]">
                ✣ {t("pages.home.specialType.sainte-cene", "Sainte-Cène")}
              </span>
            </div>
          )}
        </div>
      </div>

      <div>
        <Eyebrow>{t("pages.adminActivities.verify.label", "Vérification")}</Eyebrow>
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {checks.map((c) => (
            <li
              key={c.label}
              className="flex items-center gap-2.5 text-sm"
              style={{ color: c.ok ? "var(--ink-2)" : "var(--gaps)" }}
            >
              <span
                className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[11px]"
                style={{
                  borderColor: c.ok ? "var(--staffed)" : "var(--gaps)",
                  color: c.ok ? "var(--staffed)" : "var(--gaps)",
                }}
                aria-hidden
              >
                {c.ok ? "✓" : "!"}
              </span>
              {c.label}
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
