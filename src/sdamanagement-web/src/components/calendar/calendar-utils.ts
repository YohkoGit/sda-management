import type { PublicActivityListItem, PublicDepartment } from "@/types/public";

export function getInitialDateRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: fmt(startDate), end: fmt(endDate) };
}

export function mapToCalendarEvents(activities: PublicActivityListItem[]) {
  return activities.map((a) => ({
    id: String(a.id),
    title: a.departmentAbbreviation
      ? `[${a.departmentAbbreviation}] ${a.title}`
      : a.title,
    start: Temporal.ZonedDateTime.from(
      `${a.date}T${a.startTime}[America/Toronto]`,
    ),
    end: Temporal.ZonedDateTime.from(
      `${a.date}T${a.endTime}[America/Toronto]`,
    ),
    calendarId: a.departmentAbbreviation ?? "general",
    description: a.departmentName ?? undefined,
    people: a.predicateurName ? [a.predicateurName] : [],
  }));
}

export function buildCalendarsFromDepartments(departments: PublicDepartment[]) {
  const calendars: Record<
    string,
    {
      colorName: string;
      lightColors: { main: string; container: string; onContainer: string };
    }
  > = {
    general: {
      colorName: "general",
      lightColors: {
        main: "#94A3B8",
        container: "#F1F5F9",
        onContainer: "#0F172A",
      },
    },
  };

  for (const dept of departments) {
    calendars[dept.abbreviation] = {
      colorName: dept.abbreviation,
      lightColors: {
        main: dept.color,
        container: `${dept.color}20`,
        onContainer: "#0F172A",
      },
    };
  }
  return calendars;
}

export type CalendarViewType = "day" | "week" | "month-grid" | "year";
