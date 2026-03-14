import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { users } from "~/lib/users"

type UserMapEntry = {
  id: number
  name: string
  avatarId: string | null
}

export function useUserMap() {
  const query = useQuery(users.all.queryOptions())

  const userMap = useMemo(() => {
    const map = new Map<number, UserMapEntry>()
    for (const user of query.data ?? []) {
      map.set(user.id, user)
    }
    return map
  }, [query.data])

  return {
    userMap,
    status: query.status,
    isReady: query.status === "success",
  }
}
