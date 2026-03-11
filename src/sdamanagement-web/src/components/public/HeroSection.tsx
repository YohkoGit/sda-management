import { useTranslation } from "react-i18next";
import { getDay, addDays, isSameDay, format, parse } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNextActivity, useChurchInfo } from "@/hooks/usePublicDashboard";
import type { PublicNextActivity } from "@/types/public";

function formatActivityDate(dateStr: string, t: (key: string) => string): string {
  const activityDate = parse(dateStr, "yyyy-MM-dd", new Date());
  const today = new Date();
  const dayOfWeek = getDay(today);
  const daysUntilSat = dayOfWeek === 6 ? 0 : ((6 - dayOfWeek + 7) % 7);
  const thisSaturday = addDays(today, daysUntilSat);

  if (isSameDay(activityDate, thisSaturday)) {
    return t("pages.home.thisSabbath");
  }
  return format(activityDate, "EEEE d MMMM", { locale: fr });
}

function formatTime(timeStr: string): string {
  // timeStr comes as "HH:mm:ss" from backend
  const [h, m] = timeStr.split(":");
  return `${h}h${m}`;
}

function AvatarInitials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white"
      aria-label={name}
    >
      {initials}
    </div>
  );
}

function PredicateurAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />
    );
  }
  return <AvatarInitials name={name} />;
}

function ActivityContent({
  activity,
}: {
  activity: PublicNextActivity;
}) {
  const { t } = useTranslation();
  const dateLabel = formatActivityDate(activity.date, t);
  const startTime = formatTime(activity.startTime);
  const endTime = formatTime(activity.endTime);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
      {activity.predicateurName && (
        <PredicateurAvatar
          name={activity.predicateurName}
          avatarUrl={activity.predicateurAvatarUrl}
        />
      )}
      <div className="flex flex-col gap-2">
        {activity.predicateurName && (
          <p className="text-xl font-bold text-white">{activity.predicateurName}</p>
        )}
        <p className="text-base font-normal text-white">{activity.title}</p>
        <div className="flex flex-wrap items-center gap-2">
          {activity.departmentAbbreviation && (
            <Badge variant="secondary">{activity.departmentAbbreviation}</Badge>
          )}
          {activity.specialType && (
            <Badge variant="outline" className="border-indigo-400 text-indigo-300">
              {t(`pages.home.specialType.${activity.specialType}`)}
            </Badge>
          )}
        </div>
        <p className="text-sm font-normal text-slate-300">
          {dateLabel} · {startTime} – {endTime}
        </p>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full bg-slate-700" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-48 bg-slate-700" />
        <Skeleton className="h-4 w-32 bg-slate-700" />
        <Skeleton className="h-4 w-24 bg-slate-700" />
      </div>
    </div>
  );
}

export default function HeroSection() {
  const { t } = useTranslation();
  const { data: churchInfo, isPending: churchPending } = useChurchInfo();
  const { data: activity, isPending: activityPending, isError } = useNextActivity();

  return (
    <section className="w-full bg-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="lg:flex lg:items-start lg:justify-between lg:gap-12">
          {/* Church identity block — renders immediately from cached config */}
          <div className="mb-8 lg:mb-0 lg:shrink-0">
            {churchPending ? (
              <div className="space-y-2">
                <Skeleton className="h-9 w-64 bg-slate-700" />
                <Skeleton className="h-4 w-48 bg-slate-700" />
              </div>
            ) : churchInfo ? (
              <>
                <h1 className="text-3xl font-black text-white">{churchInfo.churchName}</h1>
                <p className="mt-1 text-sm font-normal text-slate-300">{churchInfo.address}</p>
                {churchInfo.welcomeMessage && (
                  <p className="mt-2 text-base font-normal text-slate-300">
                    {churchInfo.welcomeMessage}
                  </p>
                )}
              </>
            ) : (
              <h1 className="text-3xl font-black text-white">{t("pages.home.welcomeDefault")}</h1>
            )}
          </div>

          {/* Next activity block */}
          <div>
            {activityPending ? (
              <LoadingSkeleton />
            ) : isError ? (
              <p className="text-sm font-normal text-slate-400">{t("pages.home.loadError")}</p>
            ) : activity === null ? (
              <p className="text-center text-base font-normal text-slate-300 lg:text-left">
                {t("pages.home.noActivities")}
              </p>
            ) : activity ? (
              <ActivityContent activity={activity} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
