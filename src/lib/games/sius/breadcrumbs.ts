import { useQuery } from "@tanstack/react-query"

import { games } from "~/lib/games"

// resolves the ids and round status shown in the games/sius breadcrumb trail
// from the current pathname, fetching the set's round when only a set id is
// in the url
export function useSiuBreadcrumbTrail(pathname: string) {
  const activeRoundId = pathname.match(/^\/games\/sius\/(\d+)/)?.[1]
  const archivedRoundId = pathname.match(/^\/games\/sius\/archived\/(\d+)/)?.[1]
  const browseRoundId = archivedRoundId ?? activeRoundId
  const setId = pathname.match(/^\/games\/sius\/sets\/(\d+)/)?.[1]

  const setQuery = useQuery({
    ...games.sius.sets.get.queryOptions({ setId: Number(setId) }),
    enabled: Boolean(setId),
  })

  const roundStatus = archivedRoundId
    ? "archived"
    : activeRoundId
      ? "active"
      : setQuery.data?.siu.status

  return {
    browseRoundId,
    setId,
    roundId: browseRoundId ?? setQuery.data?.siu.id?.toString(),
    roundStatus,
  }
}
