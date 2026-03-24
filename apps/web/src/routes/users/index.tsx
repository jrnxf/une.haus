import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { Suspense, useMemo } from "react"
import { preload } from "react-dom"

import { Badges } from "~/components/badges"
import { Filters, type FilterField } from "~/components/filters/filters"
import { InfiniteScrollTrigger } from "~/components/infinite-scroll-trigger"
import { NoResultsEmpty } from "~/components/no-results-empty"
import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { UserOnlineStatus } from "~/components/user-online-status"
import { USER_DISCIPLINES } from "~/db/schema"
import { useFilteredList } from "~/hooks/use-filtered-list"
import { seo } from "~/lib/seo"
import { users } from "~/lib/users"
import { getCloudflareImageUrl } from "~/lib/utils"

export const Route = createFileRoute("/users/")({
  validateSearch: users.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    // Skip on "stay" (filter changed on same page) — awaiting here blocks
    // rendering and causes a blank page. useDeferredValue + Suspense in
    // the component handle client-side transitions instead.
    if (cause === "stay") return
    await context.queryClient.ensureInfiniteQueryData(
      users.list.infiniteQueryOptions(deps),
    )
  },
  head: () =>
    seo({
      title: "users",
      description: "unicyclists on une.haus",
      path: "/users",
    }),
  component: RouteComponent,
})

const filterFields: FilterField[] = [
  {
    key: "name",
    label: "name",
    type: "text" as const,
    placeholder: "search...",
    operators: [{ value: "contains", label: "contains" }],
    defaultOperator: "contains",
  },
  {
    key: "disciplines",
    label: "disciplines",
    type: "multiselect" as const,
    operators: [
      { value: "contain", label: "contain" },
      { value: "equal", label: "equal" },
    ],
    defaultOperator: "contain",
    options: USER_DISCIPLINES.map((d) => ({ value: d, label: d })),
  },
]

function RouteComponent() {
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  const { filters, handleFiltersChange, queryParams, operators } =
    useFilteredList({
      fields: filterFields,
      searchParams,
      navigate,
    })

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>users</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="overflow-y-auto">
        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-4 p-4">
          <div className="flex items-center justify-between">
            <Filters
              fields={filterFields}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
            <div className="flex items-center gap-2">
              <Button variant="secondary" asChild>
                <Link to="/users/map">map</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link to="/users/globe">globe</Link>
              </Button>
            </div>
          </div>

          <Suspense>
            <UsersList
              queryParams={
                queryParams as { name?: string; disciplines?: string[] }
              }
              disciplinesOperator={operators.disciplines ?? "contain"}
            />
          </Suspense>
        </div>
      </div>
    </>
  )
}

function UsersList({
  queryParams,
  disciplinesOperator,
}: {
  queryParams: { name?: string; disciplines?: string[] }
  disciplinesOperator: "contain" | "equal"
}) {
  const {
    data: usersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(users.list.infiniteQueryOptions(queryParams))

  const displayedUsers = useMemo(() => {
    const allUsers = usersPages.pages.flat()
    if (
      disciplinesOperator !== "equal" ||
      !queryParams.disciplines ||
      queryParams.disciplines.length === 0
    ) {
      return allUsers
    }

    const filterSet = new Set(queryParams.disciplines.map(String))
    return allUsers.filter((user) => {
      const userSet = new Set((user.disciplines ?? []).map(String))
      if (userSet.size !== filterSet.size) return false
      for (const discipline of filterSet) {
        if (!userSet.has(discipline)) return false
      }
      return true
    })
  }, [usersPages, queryParams.disciplines, disciplinesOperator])

  return (
    <>
      {displayedUsers.length === 0 && <NoResultsEmpty />}

      {displayedUsers.map((user, idx) => {
        return (
          <div
            key={user.id}
            className="relative"
            data-testid="user-card"
            data-user-name={user.name}
            onMouseEnter={() => {
              if (user.avatarId) {
                preload(
                  getCloudflareImageUrl(user.avatarId, {
                    width: 448,
                    quality: 60,
                  }),
                  { as: "image", fetchPriority: "high" },
                )
              }
            }}
          >
            <Button
              variant="card"
              className="flex w-full flex-col gap-4 p-3 sm:flex-row"
              asChild
            >
              <Link to="/users/$userId" params={{ userId: user.id }}>
                <div className="flex w-full flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar
                      cloudflareId={user.avatarId}
                      alt={user.name}
                      className="size-6"
                    >
                      <AvatarImage
                        width={72}
                        quality={70}
                        fetchPriority="high"
                        loading={idx < 6 ? "eager" : "lazy"}
                      />
                      <AvatarFallback name={user.name} />
                    </Avatar>
                    <span className="truncate text-base font-semibold">
                      {user.name}
                    </span>
                    <UserOnlineStatus userId={user.id} />
                  </div>
                  {user.bio && (
                    <div className="line-clamp-3 text-sm">
                      <RichText content={user.bio} mentionMode="plainText" />
                    </div>
                  )}
                  <Badges
                    content={user.disciplines}
                    active={queryParams.disciplines ?? []}
                  />
                </div>
              </Link>
            </Button>
          </div>
        )
      })}
      <InfiniteScrollTrigger
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  )
}
