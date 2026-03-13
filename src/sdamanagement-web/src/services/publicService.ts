import api from "@/lib/api";
import type { PublicNextActivity, LiveStatus, PublicActivityListItem, PublicProgramSchedule, PublicDepartment } from "@/types/public";

export const publicService = {
  getNextActivity: () =>
    api
      .get<PublicNextActivity>("/api/public/next-activity")
      .then((res) => (res.status === 204 ? null : res.data)),

  getLiveStatus: () =>
    api.get<LiveStatus>("/api/public/live-status").then((res) => res.data),

  getUpcomingActivities: () =>
    api
      .get<PublicActivityListItem[]>("/api/public/upcoming-activities")
      .then((res) => res.data),

  getProgramSchedules: () =>
    api
      .get<PublicProgramSchedule[]>("/api/public/program-schedules")
      .then((res) => res.data),

  getDepartments: () =>
    api
      .get<PublicDepartment[]>("/api/public/departments")
      .then((res) => res.data),
};
