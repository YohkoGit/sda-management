import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, Serial } from "@/components/ui/typography";
import { useProgramSchedules } from "@/hooks/usePublicDashboard";
import { formatTime } from "@/lib/dateFormatting";

export default function ProgramTimesSection() {
  const { t, i18n } = useTranslation();
  const { data, isPending, isError } = useProgramSchedules();

  if (!isPending && !isError && (!data || data.length === 0)) {
    return null;
  }

  const headingId = "program-schedules-heading";

  return (
    <section className="bg-[var(--parchment-2)]" aria-labelledby={headingId}>
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="flex items-baseline justify-between gap-6 border-b border-[var(--ink)] pb-4">
          <h2
            id={headingId}
            className="font-display text-3xl leading-tight text-[var(--ink)] lg:text-4xl"
          >
            {t("pages.home.programSchedulesTitle")}
          </h2>
          <Eyebrow>{t("pages.home.weeklyRhythm", "Rhythme hebdomadaire")}</Eyebrow>
        </div>

        {isPending ? (
          <div className="mt-2 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full bg-[var(--parchment-3)]" />
            ))}
          </div>
        ) : isError ? (
          <p className="mt-6 text-base text-[var(--rose)]">
            {t("pages.home.loadError")}
          </p>
        ) : (
          <ul className="mt-2">
            {data!.map((program, idx) => (
              <li
                key={`${program.title}-${program.dayOfWeek}-${program.startTime}`}
                className="grid grid-cols-[32px_1fr_auto] items-center gap-6 border-b border-[var(--hairline)] py-5"
              >
                <Serial n={idx + 1} />
                <div className="min-w-0">
                  <h3 className="font-display text-lg leading-tight text-[var(--ink)]">
                    {program.title}
                  </h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <Eyebrow asChild className="capitalize">
                      <span>{t(`days.${program.dayOfWeek}`)}</span>
                    </Eyebrow>
                    {program.hostName && (
                      <span className="text-sm text-[var(--ink-3)]">
                        · <span className="italic">avec</span> {program.hostName}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-mono text-sm tabular-nums text-[var(--ink-2)]">
                  {formatTime(program.startTime, i18n.language)}
                  {" – "}
                  {formatTime(program.endTime, i18n.language)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
