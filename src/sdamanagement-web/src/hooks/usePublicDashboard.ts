import { useQuery } from "@tanstack/react-query";
import { publicService } from "@/services/publicService";
import { configService } from "@/services/configService";
import type { PublicNextActivity } from "@/types/public";

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
