import { useInfiniteQuery } from "@tanstack/react-query";
import { useRole } from "@/hooks/useRole";
import { userService } from "@/services/userService";

export function useUsers() {
  const { hasRole, isAuthenticated } = useRole();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["users"],
    queryFn: ({ pageParam }) =>
      userService.getUsers(pageParam).then((res) => res.data),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: isAuthenticated,
  });

  const users = data?.pages.flatMap((page) => page.items) ?? [];
  const isAdminOrOwner = hasRole("ADMIN", "OWNER");

  return {
    users,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    isAdminOrOwner,
  };
}
