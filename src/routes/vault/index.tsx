import { useDebouncedCallback } from "@tanstack/react-pacer"
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"
import pluralize from "pluralize"
import {
  Suspense,
  useCallback,
  useDeferredValue,
  useMemo,
  useState,
} from "react"
import { InView } from "react-intersection-observer"

import {
  Filters,
  type ActiveFilter,
  type FilterField,
} from "~/components/filters/filters"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { getMuxPoster } from "~/components/video-player"
import { USER_DISCIPLINES } from "~/db/schema"
import { seo } from "~/lib/seo"
import { utv } from "~/lib/utv/core"

export const Route = createFileRoute("/vault/")({
  validateSearch: utv.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps, cause }) => {
    // Skip on "stay" (filter changed on same page) — awaiting here blocks
    // rendering and causes a blank page. useDeferredValue + Suspense in
    // the component handle client-side transitions instead.
    if (cause === "stay") return
    await Promise.all([
      context.queryClient.ensureInfiniteQueryData(
        utv.list.infiniteQueryOptions(deps),
      ),
      context.queryClient.ensureQueryData(utv.riders.queryOptions()),
    ])
  },
  head: () =>
    seo({
      title: "vault",
      description: "unicycling video archive on une.haus",
      path: "/vault",
    }),
  component: RouteComponent,
})

function RouteComponent() {
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  const { data: riderNames } = useSuspenseQuery(utv.riders.queryOptions())

  // Local state for immediate input feedback
  const [queryInput, setQueryInput] = useState(searchParams.q ?? "")
  const [disciplines, setDisciplines] = useState<string[]>(
    searchParams.disciplines ?? [],
  )
  const [riders, setRiders] = useState<string[]>(searchParams.riders ?? [])

  // Debounced navigate — updates URL (and loaderDeps) after wait period
  const debouncedNavigate = useDebouncedCallback(
    (updates: { q?: string; disciplines?: string[]; riders?: string[] }) => {
      navigate({
        search: {
          q: updates.q || undefined,
          disciplines:
            updates.disciplines && updates.disciplines.length > 0
              ? updates.disciplines
              : undefined,
          riders:
            updates.riders && updates.riders.length > 0
              ? updates.riders
              : undefined,
        },
        replace: true,
      })
    },
    { wait: 200 },
  )

  // useDeferredValue on URL search params — prevents suspense flash
  const deferredQ = useDeferredValue(searchParams.q)
  const deferredDisciplines = useDeferredValue(searchParams.disciplines)
  const deferredRiders = useDeferredValue(searchParams.riders)

  // Track which filter fields are open
  const [activeFields, setActiveFields] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (queryInput) initial.add("q")
    if (disciplines.length > 0) initial.add("disciplines")
    if (riders.length > 0) initial.add("riders")
    return initial
  })

  const filterFields: FilterField[] = useMemo(
    () => [
      {
        key: "q",
        label: "title",
        type: "text" as const,
        placeholder: "search...",
        operators: [{ value: "contains", label: "contains" }],
        defaultOperator: "contains",
      },
      {
        key: "disciplines",
        label: "disciplines",
        type: "multiselect" as const,
        operators: [{ value: "is_any_of", label: "includes" }],
        defaultOperator: "is_any_of",
        options: USER_DISCIPLINES.map((d) => ({ value: d, label: d })),
      },
      {
        key: "riders",
        label: "riders",
        type: "multiselect" as const,
        operators: [{ value: "is_any_of", label: "includes" }],
        defaultOperator: "is_any_of",
        options: riderNames.map((w) => ({ value: w, label: w })),
      },
    ],
    [riderNames],
  )

  // Derive filters from LOCAL state
  const filters = useMemo<ActiveFilter[]>(() => {
    const result: ActiveFilter[] = []
    if (activeFields.has("q")) {
      result.push({
        id: "q",
        field: "q",
        operator: "contains",
        values: queryInput ? [queryInput] : [],
      })
    }
    if (activeFields.has("disciplines") || disciplines.length > 0) {
      result.push({
        id: "disciplines",
        field: "disciplines",
        operator: "is_any_of",
        values: disciplines,
      })
    }
    if (activeFields.has("riders") || riders.length > 0) {
      result.push({
        id: "riders",
        field: "riders",
        operator: "is_any_of",
        values: riders,
      })
    }
    return result
  }, [queryInput, disciplines, riders, activeFields])

  const handleFiltersChange = useCallback(
    (next: ActiveFilter[]) => {
      const qFilter = next.find((f) => f.field === "q")
      const disciplinesFilter = next.find((f) => f.field === "disciplines")
      const ridersFilter = next.find((f) => f.field === "riders")

      setActiveFields((prev) => {
        const wantQ = Boolean(qFilter)
        const wantDisciplines = Boolean(disciplinesFilter)
        const wantRiders = Boolean(ridersFilter)
        if (
          prev.has("q") === wantQ &&
          prev.has("disciplines") === wantDisciplines &&
          prev.has("riders") === wantRiders
        ) {
          return prev
        }
        const s = new Set<string>()
        if (wantQ) s.add("q")
        if (wantDisciplines) s.add("disciplines")
        if (wantRiders) s.add("riders")
        return s
      })

      const newQ = qFilter?.values[0] || ""
      const newDisciplines =
        disciplinesFilter && disciplinesFilter.values.length > 0
          ? disciplinesFilter.values
          : []
      const newRiders =
        ridersFilter && ridersFilter.values.length > 0
          ? ridersFilter.values
          : []

      // Update local state immediately for instant feedback
      setQueryInput(newQ)
      setDisciplines(newDisciplines)
      setRiders(newRiders)

      // Debounced URL update via router
      debouncedNavigate({
        q: newQ,
        disciplines: newDisciplines,
        riders: newRiders,
      })
    },
    [debouncedNavigate],
  )

  const queryParams = useMemo(
    () => ({
      q: deferredQ || undefined,
      disciplines:
        deferredDisciplines && deferredDisciplines.length > 0
          ? deferredDisciplines
          : undefined,
      riders:
        deferredRiders && deferredRiders.length > 0
          ? deferredRiders
          : undefined,
    }),
    [deferredQ, deferredDisciplines, deferredRiders],
  )

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>vault</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            <Button variant="secondary" size="sm" asChild>
              <Link to="/vault/history">history</Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>

      <div className="flex h-full flex-col">
        <div className="bg-background sticky top-0 z-10">
          <div className="mx-auto flex max-w-5xl items-center gap-2 p-4">
            <div className="min-w-0 flex-1">
              <Filters
                fields={filterFields}
                filters={filters}
                onFiltersChange={handleFiltersChange}
                size="sm"
              />
            </div>
          </div>
        </div>

        <Suspense>
          <VideoGrid queryParams={queryParams} />
        </Suspense>
      </div>
    </>
  )
}

function VideoGrid({
  queryParams,
}: {
  queryParams: { q?: string; disciplines?: string[]; riders?: string[] }
}) {
  const {
    data: videosPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(utv.list.infiniteQueryOptions(queryParams))

  const displayedVideos = useMemo(() => videosPages.pages.flat(), [videosPages])
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)

  return (
    <div className="flex-1 overflow-y-auto" ref={setScrollRoot}>
      <div className="@container mx-auto flex max-w-5xl flex-col px-4">
        <div className="grid grid-cols-2 gap-4 @2xl:grid-cols-3">
          {displayedVideos.map((video) => (
            <Link
              key={video.id}
              to="/vault/$videoId"
              params={{ videoId: video.id }}
              className="group relative aspect-video overflow-clip rounded-md"
            >
              <img
                src={getMuxPoster({
                  playbackId: video.playbackId,
                  time: video.thumbnailSeconds,
                  width: 320,
                })}
                alt={video.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
                style={{
                  transform: `scale(${video.scale})`,
                }}
              />
              <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 rounded-b-md bg-black/60 px-2 py-1.5 backdrop-blur-xs">
                <h2 className="min-w-0 flex-1 truncate text-xs font-semibold text-white">
                  {video.title}
                </h2>
                <div className="flex shrink-0 items-center gap-2 text-xs text-white/70">
                  <div
                    className="flex items-center gap-1"
                    title={`${video.likesCount} ${pluralize("like", video.likesCount)}`}
                  >
                    <HeartIcon className="size-3" />
                    <span>{video.likesCount}</span>
                  </div>
                  <div
                    className="flex items-center gap-1"
                    title={`${video.messagesCount} ${pluralize("message", video.messagesCount)}`}
                  >
                    <MessageCircleIcon className="size-3" />
                    <span>{video.messagesCount}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        {hasNextPage && !isFetchingNextPage && (
          <InView
            root={scrollRoot}
            rootMargin="1000px"
            onChange={(inView) => inView && fetchNextPage()}
          />
        )}
      </div>
    </div>
  )
}
