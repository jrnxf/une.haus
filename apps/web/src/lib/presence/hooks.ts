import { useQuery } from "@tanstack/react-query"

import { presence } from "~/lib/presence"

export function useIsUserOnline(userId: number) {
  const { data } = useQuery(presence.online.queryOptions())
  return data?.users.some((u) => u.id === userId) ?? false
}
