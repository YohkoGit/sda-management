import { fr } from "date-fns/locale/fr";
import { enUS } from "date-fns/locale/en-US";
import { getDay, addDays, isSameDay, format, parse, formatDistanceToNow, isValid } from "date-fns";

export function getDateLocale(lang: string) {
  return lang.startsWith("en") ? enUS : fr;
}

export function formatActivityDate(
  dateStr: string,
  t: (key: string) => string,
  lang: string
): string {
  const activityDate = parse(dateStr, "yyyy-MM-dd", new Date());
  const today = new Date();
  const dayOfWeek = getDay(today);
  const daysUntilSat = dayOfWeek === 6 ? 0 : (6 - dayOfWeek + 7) % 7;
  const thisSaturday = addDays(today, daysUntilSat);

  if (isSameDay(activityDate, thisSaturday)) {
    return t("pages.home.thisSabbath");
  }
  return format(activityDate, "EEEE d MMMM", { locale: getDateLocale(lang) });
}

export function formatRelativeDate(dateStr: string, lang: string): string {
  const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
  if (!isValid(parsed)) return "";
  return formatDistanceToNow(parsed, { addSuffix: true, locale: getDateLocale(lang) });
}

export function formatTime(timeStr: string): string {
  // timeStr comes as "HH:mm:ss" from backend
  if (!timeStr || !timeStr.includes(":")) return timeStr ?? "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  return `${isNaN(hour) ? h : hour}h${m}`;
}
