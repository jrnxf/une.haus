import { useQuery } from "@tanstack/react-query"

import { games } from "~/lib/games"

// resolves the ids shown in the games/bius breadcrumb trail from the current
// pathname, fetching the set's round when only a set id is in the url
export function useBiuBreadcrumbTrail(pathname: string) {
  const browseRoundId = pathname.match(/^\/games\/bius\/(\d+)/)?.[1]
  const setId = pathname.match(/^\/games\/bius\/sets\/(\d+)/)?.[1]

  const setQuery = useQuery({
    ...games.bius.sets.get.queryOptions({ setId: Number(setId) }),
    enabled: Boolean(setId),
  })

  return {
    browseRoundId,
    setId,
    roundId: browseRoundId ?? setQuery.data?.biu.id?.toString(),
  }
}
