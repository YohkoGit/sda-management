import api from "@/lib/api";
import type { PublicNextActivity } from "@/types/public";

export const publicService = {
  getNextActivity: () =>
    api
      .get<PublicNextActivity>("/api/public/next-activity")
      .then((res) => (res.status === 204 ? null : res.data)),
};
