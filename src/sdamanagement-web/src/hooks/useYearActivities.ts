import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { publicService } from "@/services/publicService";
import type { PublicActivityListItem } from "@/types/public";

function quarterRange(year: number, q: number) {
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = q * 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  const start = `${year}-${String(startMonth).padStart(2, "0")}-01`;
  const end = `${year}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export function useYearActivities(year: number, enabled: boolean) {
  const q1 = quarterRange(year, 1);
  const q2 = quarterRange(year, 2);
  const q3 = quarterRange(year, 3);
  const q4 = quarterRange(year, 4);

  const q1Query = useQuery<PublicActivityListItem[]>({
    queryKey: ["public", "calendar", q1.start, q1.end],
    queryFn: () => publicService.getCalendarActivities(q1.start, q1.end),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled,
  });

  const q2Query = useQuery<PublicActivityListItem[]>({
    queryKey: ["public", "calendar", q2.start, q2.end],
    queryFn: () => publicService.getCalendarActivities(q2.start, q2.end),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled,
  });

  const q3Query = useQuery<PublicActivityListItem[]>({
    queryKey: ["public", "calendar", q3.start, q3.end],
    queryFn: () => publicService.getCalendarActivities(q3.start, q3.end),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled,
  });

  const q4Query = useQuery<PublicActivityListItem[]>({
    queryKey: ["public", "calendar", q4.start, q4.end],
    queryFn: () => publicService.getCalendarActivities(q4.start, q4.end),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled,
  });

  const data = useMemo(() => {
    const all: PublicActivityListItem[] = [];
    if (q1Query.data) all.push(...q1Query.data);
    if (q2Query.data) all.push(...q2Query.data);
    if (q3Query.data) all.push(...q3Query.data);
    if (q4Query.data) all.push(...q4Query.data);
    return all.length > 0 ? all : undefined;
  }, [q1Query.data, q2Query.data, q3Query.data, q4Query.data]);

  const isPending =
    q1Query.isPending || q2Query.isPending || q3Query.isPending || q4Query.isPending;
  const isError =
    q1Query.isError && q2Query.isError && q3Query.isError && q4Query.isError;

  const refetch = useCallback(() => {
    q1Query.refetch();
    q2Query.refetch();
    q3Query.refetch();
    q4Query.refetch();
  }, [q1Query, q2Query, q3Query, q4Query]);

  return { data, isPending, isError, refetch };
}
