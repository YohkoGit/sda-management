import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Eyebrow, Rule } from "@/components/ui/typography";
import { useNextActivity, useChurchInfo } from "@/hooks/usePublicDashboard";
import { formatActivityDate, formatTime } from "@/lib/dateFormatting";
import { deptSwatchColor } from "@/lib/dept-color";
import type { PublicNextActivity } from "@/types/public";

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--parchment-3)] font-display text-lg text-[var(--ink-2)]"
      aria-label={name}
    >
      {initials}
    </div>
  );
}

function PredicateurAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-16 w-16 shrink-0 rounded-full object-cover ring-1 ring-[var(--hairline)]"
      />
    );
  }
  return <AvatarInitials name={name} />;
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-2 font-display text-lg leading-tight text-[var(--ink)]">{value}</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-16 w-16 rounded-full bg-[var(--parchment-2)]" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48 bg-[var(--parchment-2)]" />
        <Skeleton className="h-4 w-32 bg-[var(--parchment-2)]" />
      </div>
    </div>
  );
}

function ActivityFeatured({ activity }: { activity: PublicNextActivity }) {
  const { i18n } = useTranslation();
  const [year, monthStr, dayStr] = activity.date.split("-");
  const day = Number(dayStr);
  const month = new Date(Number(year), Number(monthStr) - 1, day).toLocaleDateString(
    i18n.language,
    { month: "long" },
  );
  return (
    <div>
      <div className="flex items-end gap-6 leading-none">
        <span className="numerator text-[120px] md:text-[180px] lg:text-[220px] text-[var(--ink)]">
          {day}
        </span>
        <div className="pb-6">
          <span className="font-display text-2xl italic text-[var(--ink-2)] capitalize">
            {month}
          </span>
          <span className="ml-2 font-mono text-sm tracking-[0.18em] text-[var(--ink-3)]">
            {year}
          </span>
        </div>
      </div>
      {activity.predicateurName && (
        <div className="mt-10 flex items-center gap-5">
          <PredicateurAvatar
            name={activity.predicateurName}
            avatarUrl={activity.predicateurAvatarUrl}
          />
          <div>
            <Eyebrow>Prédicateur</Eyebrow>
            <p className="mt-1 font-display text-xl text-[var(--ink)]">
              {activity.predicateurName}
            </p>
            {activity.departmentName && (
              <div className="mt-2 flex items-center gap-2">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: deptSwatchColor({
                    abbreviation: activity.departmentAbbreviation ?? undefined,
                    color: activity.departmentColor ?? undefined,
                  }) }}
                />
                <Eyebrow asChild>
                  <span>{activity.departmentAbbreviation ?? activity.departmentName}</span>
                </Eyebrow>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HeroSection() {
  const { t, i18n } = useTranslation();
  const { data: churchInfo, isPending: churchPending } = useChurchInfo();
  const { data: activity, isPending: activityPending, isError } = useNextActivity();

  const heroTitle = activity?.title ?? churchInfo?.churchName ?? t("pages.home.welcomeDefault");
  const eyebrowText = activity ? t("pages.home.thisSabbath") : t("pages.home.welcomeDefault");

  return (
    <section className="w-full anim-rise" aria-labelledby="public-hero-title">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_auto_1fr] lg:items-stretch lg:gap-14">
          {/* Left: typographic title block */}
          <div className="flex flex-col">
            <Eyebrow gilt>{eyebrowText}</Eyebrow>

            {churchPending && !activity ? (
              <Skeleton className="mt-6 h-24 w-full bg-[var(--parchment-2)]" />
            ) : (
              <h1
                id="public-hero-title"
                className="mt-6 font-display text-5xl leading-[1.05] text-[var(--ink)] lg:text-7xl"
              >
                <FancyTitle text={heroTitle} />
              </h1>
            )}

            {churchInfo?.welcomeMessage && (
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink-2)]">
                {churchInfo.welcomeMessage}
              </p>
            )}

            <div className="mt-8 grid flex-1 grid-cols-3 items-end gap-6 border-t border-[var(--hairline)] pt-6">
              {activityPending ? (
                <Skeleton className="col-span-3 h-12 bg-[var(--parchment-2)]" />
              ) : isError ? (
                <p className="col-span-3 text-sm text-[var(--rose)]">
                  {t("pages.home.loadError")}
                </p>
              ) : activity ? (
                <>
                  <MetaItem
                    label={t("pages.home.metaDate", "Date")}
                    value={formatActivityDate(activity.date, t, i18n.language)}
                  />
                  <MetaItem
                    label={t("pages.home.metaTime", "Horaire")}
                    value={`${formatTime(activity.startTime, i18n.language)} – ${formatTime(activity.endTime, i18n.language)}`}
                  />
                  <MetaItem
                    label={t("pages.home.metaPlace", "Lieu")}
                    value={churchInfo?.address?.split(",")[0] ?? "Sanctuaire"}
                  />
                </>
              ) : (
                <p className="col-span-3 text-base text-[var(--ink-3)]">
                  {t("pages.home.noActivities")}
                </p>
              )}
            </div>
          </div>

          {/* Vertical hairline rule */}
          <Rule vertical className="hidden lg:block" />

          {/* Right: numerator + predicateur */}
          <div className="flex flex-col justify-between">
            {activityPending ? (
              <LoadingSkeleton />
            ) : activity ? (
              <ActivityFeatured activity={activity} />
            ) : (
              <div className="font-display text-xl text-[var(--ink-3)]">
                {t("pages.home.noActivities")}
              </div>
            )}

            <p className="mt-10 max-w-md font-display text-base italic leading-relaxed text-[var(--ink-3)]">
              « Si tu chéris le sabbat… tu mettras ta joie dans l’Éternel. »
              <span className="ml-2 font-mono text-[10px] not-italic uppercase tracking-[0.18em] text-[var(--ink-4)]">
                Ésaïe 58
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function FancyTitle({ text }: { text: string }) {
  const words = text.split(" ");
  if (words.length < 2) {
    return (
      <>
        <span>{text}</span>
        <span className="text-[var(--gilt-2)]">.</span>
      </>
    );
  }
  const head = words.slice(0, words.length - 1).join(" ");
  const tail = words[words.length - 1];
  return (
    <>
      <span>{head} </span>
      <span className="italic font-normal">{tail}</span>
      <span className="text-[var(--gilt-2)]">.</span>
    </>
  );
}
