import { useQuery } from "@tanstack/react-query"

import { games } from "~/lib/games"

// resolves the ids and round status shown in the games/rius breadcrumb trail
// from the current pathname, fetching the round via the set or submission
// when only their ids are in the url
export function useRiuBreadcrumbTrail(pathname: string) {
  const isActive = pathname.startsWith("/games/rius/active")
  const isUpcoming = pathname.startsWith("/games/rius/upcoming")
  const archivedId = pathname.match(/^\/games\/rius\/archived\/(\d+)/)?.[1]
  const setId = pathname.match(/^\/games\/rius\/sets\/(\d+)/)?.[1]
  const submissionId = pathname.match(/^\/games\/rius\/submissions\/(\d+)/)?.[1]

  const activeQuery = useQuery({
    ...games.rius.active.list.queryOptions(),
    enabled: isActive,
  })
  const upcomingQuery = useQuery({
    ...games.rius.upcoming.roster.queryOptions(),
    enabled: isUpcoming,
  })
  const setQuery = useQuery({
    ...games.rius.sets.get.queryOptions({ setId: Number(setId) }),
    enabled: Boolean(setId),
  })
  const submissionQuery = useQuery({
    ...games.rius.submissions.get.queryOptions({
      submissionId: Number(submissionId),
    }),
    enabled: Boolean(submissionId),
  })

  const roundId =
    archivedId ??
    (isActive ? activeQuery.data?.id?.toString() : undefined) ??
    (isUpcoming ? upcomingQuery.data?.round?.id?.toString() : undefined) ??
    setQuery.data?.riu.id?.toString() ??
    submissionQuery.data?.riuSet.riuId?.toString()

  const roundStatus = isActive
    ? "active"
    : isUpcoming
      ? "upcoming"
      : archivedId
        ? "archived"
        : (setQuery.data?.riu.status ?? submissionQuery.data?.riuSet.riu.status)

  return {
    archivedId,
    setId,
    submissionId,
    isOnRoundPage: isActive || isUpcoming || Boolean(archivedId),
    roundId,
    roundStatus,
  }
}
