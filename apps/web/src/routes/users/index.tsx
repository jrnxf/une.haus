import { useDebouncedCallback } from "@tanstack/react-pacer"
import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  Suspense,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react"
import { preload } from "react-dom"
import { InView } from "react-intersection-observer"

import { Badges } from "~/components/badges"
import {
  Filters,
  type ActiveFilter,
  type FilterField,
} from "~/components/filters/filters"
import { NoResultsEmpty } from "~/components/no-results-empty"
import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { Button } from "~/components/ui/button"
import { UserOnlineStatus } from "~/components/user-online-status"
import { USER_DISCIPLINES } from "~/db/schema"
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

const normalizeMultiOperator = (operator?: string): "contain" | "equal" => {
  if (
    operator === "equal" ||
    operator === "includes_all" ||
    operator === "is"
  ) {
    return "equal"
  }
  return "contain"
}

function RouteComponent() {
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  // Local state for immediate input feedback
  const [nameInput, setNameInput] = useState(searchParams.name ?? "")
  const [disciplines, setDisciplines] = useState<string[]>(
    searchParams.disciplines ?? [],
  )
  const [disciplineOp, setDisciplineOp] = useState<"contain" | "equal">(
    "contain",
  )

  // Debounced navigate — updates URL (and loaderDeps) after wait period
  const debouncedNavigate = useDebouncedCallback(
    (updates: { name?: string; disciplines?: string[] }) => {
      navigate({
        search: {
          name: updates.name || undefined,
          disciplines:
            updates.disciplines && updates.disciplines.length > 0
              ? updates.disciplines
              : undefined,
        },
        replace: true,
      })
    },
    { wait: 200 },
  )

  // useDeferredValue on URL search params — prevents suspense flash
  const deferredName = useDeferredValue(searchParams.name)
  const deferredDisciplines = useDeferredValue(searchParams.disciplines)

  // Track which filter fields are open (text filters can be open with empty value)
  const [activeFields, setActiveFields] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (nameInput) initial.add("name")
    if (disciplines.length > 0) initial.add("disciplines")
    return initial
  })

  const filterFields: FilterField[] = useMemo(
    () => [
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
    ],
    [],
  )

  // Derive filters from LOCAL state (immediate feedback, not URL)
  const filters = useMemo<ActiveFilter[]>(() => {
    const result: ActiveFilter[] = []
    if (activeFields.has("name")) {
      result.push({
        id: "name",
        field: "name",
        operator: "contains",
        values: nameInput ? [nameInput] : [],
      })
    }
    if (activeFields.has("disciplines") || disciplines.length > 0) {
      result.push({
        id: "disciplines",
        field: "disciplines",
        operator: disciplineOp,
        values: disciplines,
      })
    }
    return result
  }, [nameInput, disciplines, activeFields, disciplineOp])

  const handleFiltersChange = useCallback(
    (next: ActiveFilter[]) => {
      const nameFilter = next.find((f) => f.field === "name")
      const discFilter = next.find((f) => f.field === "disciplines")

      setActiveFields((prev) => {
        const wantName = Boolean(nameFilter)
        const wantDisc = Boolean(discFilter)
        if (
          prev.has("name") === wantName &&
          prev.has("disciplines") === wantDisc
        ) {
          return prev
        }
        const s = new Set<string>()
        if (wantName) s.add("name")
        if (wantDisc) s.add("disciplines")
        return s
      })

      const newName = nameFilter?.values[0] || ""
      const newDisciplines =
        discFilter && discFilter.values.length > 0 ? discFilter.values : []
      const newDisciplineOp = normalizeMultiOperator(discFilter?.operator)

      // Update local state immediately for instant feedback
      setNameInput(newName)
      setDisciplines(newDisciplines)
      if (discFilter) setDisciplineOp(newDisciplineOp)

      // Debounced URL update via router
      debouncedNavigate({ name: newName, disciplines: newDisciplines })
    },
    [debouncedNavigate],
  )

  const queryParams = useMemo(
    () => ({
      name: deferredName || undefined,
      disciplines:
        deferredDisciplines && deferredDisciplines.length > 0
          ? deferredDisciplines
          : undefined,
    }),
    [deferredName, deferredDisciplines],
  )

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>users</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="overflow-y-auto">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 p-4">
          <div className="flex items-center justify-between">
            <Filters
              fields={filterFields}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
            <Button variant="secondary" asChild>
              <Link to="/users/map">map</Link>
            </Button>
          </div>

          <Suspense>
            <UsersList
              queryParams={queryParams}
              deferredDisciplines={deferredDisciplines}
              deferredDisciplinesOperator={disciplineOp}
            />
          </Suspense>
        </div>
      </div>
    </>
  )
}

function UsersList({
  queryParams,
  deferredDisciplines,
  deferredDisciplinesOperator,
}: {
  queryParams: { name?: string; disciplines?: string[] }
  deferredDisciplines: string[] | undefined
  deferredDisciplinesOperator: "contain" | "equal"
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
      deferredDisciplinesOperator !== "equal" ||
      !deferredDisciplines ||
      deferredDisciplines.length === 0
    ) {
      return allUsers
    }

    const filterSet = new Set(deferredDisciplines.map(String))
    return allUsers.filter((user) => {
      const userSet = new Set((user.disciplines ?? []).map(String))
      if (userSet.size !== filterSet.size) return false
      for (const discipline of filterSet) {
        if (!userSet.has(discipline)) return false
      }
      return true
    })
  }, [usersPages, deferredDisciplines, deferredDisciplinesOperator])

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
                    active={deferredDisciplines ?? []}
                  />
                </div>
              </Link>
            </Button>
          </div>
        )
      })}
      {hasNextPage && !isFetchingNextPage && (
        <InView
          rootMargin="1000px"
          onChange={(inView) => inView && fetchNextPage()}
        />
      )}
    </>
  )
}
