import { useQuery } from "@tanstack/react-query";
import { publicService } from "@/services/publicService";
import { configService } from "@/services/configService";
import type { PublicNextActivity, LiveStatus, PublicActivityListItem, PublicProgramSchedule } from "@/types/public";

export function useNextActivity() {
  return useQuery<PublicNextActivity | null>({
    queryKey: ["public", "next-activity"],
    queryFn: publicService.getNextActivity,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useChurchInfo() {
  return useQuery({
    queryKey: ["public", "church-info"],
    queryFn: () => configService.getPublic().then((res) => res.data),
    staleTime: 30 * 60 * 1000,
  });
}

export function useLiveStatus(enabled: boolean = true) {
  return useQuery<LiveStatus>({
    queryKey: ["public", "live-status"],
    queryFn: publicService.getLiveStatus,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
    enabled,
    retry: 1,
  });
}

export function useUpcomingActivities() {
  return useQuery<PublicActivityListItem[]>({
    queryKey: ["public", "upcoming-activities"],
    queryFn: publicService.getUpcomingActivities,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useProgramSchedules() {
  return useQuery<PublicProgramSchedule[]>({
    queryKey: ["public", "program-schedules"],
    queryFn: publicService.getProgramSchedules,
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}
