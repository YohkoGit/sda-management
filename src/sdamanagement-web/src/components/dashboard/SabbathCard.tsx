import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Eyebrow, Numerator, Rule } from "@/components/ui/typography";
import { Skeleton } from "@/components/ui/skeleton";
import { useNextActivity } from "@/hooks/usePublicDashboard";
import { formatTime } from "@/lib/dateFormatting";
import { deptSwatchColor } from "@/lib/dept-color";

export function SabbathCard() {
  const { t, i18n } = useTranslation();
  const { data, isLoading } = useNextActivity();

  if (isLoading) {
    return (
      <div className="rounded-[6px] border border-[var(--hairline)] bg-[var(--parchment)] p-6">
        <Skeleton className="h-3 w-16 bg-[var(--parchment-2)]" />
        <Skeleton className="mt-3 h-6 w-3/4 bg-[var(--parchment-2)]" />
        <Skeleton className="mt-2 h-12 w-12 bg-[var(--parchment-2)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[6px] border border-[var(--hairline)] bg-[var(--parchment)] p-6">
        <Eyebrow gilt>{t("pages.home.thisSabbath", "Ce Sabbat")}</Eyebrow>
        <p className="mt-3 font-display italic text-[var(--ink-3)]">
          {t("pages.home.noPlannedActivity", "Aucune activité planifiée")}
        </p>
      </div>
    );
  }

  const dt = new Date(data.date + "T00:00:00");
  const day = dt.getDate();
  const weekday = dt.toLocaleDateString(i18n.language, { weekday: "long" });
  const swatch = deptSwatchColor({
    abbreviation: data.departmentAbbreviation ?? undefined,
    color: data.departmentColor ?? undefined,
  });
  const timeRange = `${formatTime(data.startTime, i18n.language)}–${formatTime(data.endTime, i18n.language)}`;
  const isSainteCene = data.specialType === "sainte-cene";

  return (
    <Link
      to={`/activities/${data.id}`}
      className="block rounded-[6px] border border-[var(--hairline)] bg-[var(--parchment)] p-6 no-underline transition-colors hover:border-[var(--ink)]"
    >
      <Eyebrow gilt>{t("pages.home.thisSabbath", "Ce Sabbat")}</Eyebrow>

      <h3 className="mt-3 font-display text-2xl leading-tight text-[var(--ink)]">
        {data.title}
      </h3>

      <Rule className="my-5" />

      <div className="flex items-baseline gap-4">
        <div className="flex flex-col items-start leading-none">
          <Numerator className="text-5xl text-[var(--ink)]">{day}</Numerator>
          <Eyebrow className="mt-1.5 capitalize">{weekday}</Eyebrow>
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--ink-2)] tabular-nums">
            {timeRange}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: swatch }}
            />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ink-3)]">
              {data.departmentAbbreviation ?? "—"}
            </span>
          </span>
        </div>
      </div>

      {isSainteCene && (
        <div className="mt-4">
          <span className="inline-block rounded-[2px] border border-[var(--gilt-soft)] bg-[var(--gilt-wash)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--gilt-2)]">
            ✣ {t("pages.home.specialType.sainte-cene", "Sainte-Cène")}
          </span>
        </div>
      )}

      {data.predicateurName && (
        <>
          <Rule className="my-4" />
          <div>
            <Eyebrow>{t("pages.home.predicateur", "Prédicateur")}</Eyebrow>
            <p className="mt-1.5 font-display text-base text-[var(--ink)]">
              {data.predicateurName}
            </p>
          </div>
        </>
      )}
    </Link>
  );
}
