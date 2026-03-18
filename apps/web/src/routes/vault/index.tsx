import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { HeartIcon, MessageCircleIcon } from "lucide-react"
import { Suspense, useMemo, useState } from "react"

import { ContentHeaderRow } from "~/components/content-header-row"
import { Filters, type FilterField } from "~/components/filters/filters"
import { InfiniteScrollTrigger } from "~/components/infinite-scroll-trigger"
import { NoResultsEmpty } from "~/components/no-results-empty"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { StatBadge } from "~/components/ui/stat-badge"
import { getMuxPoster } from "~/components/video-player"
import { USER_DISCIPLINES } from "~/db/schema"
import { useFilteredList } from "~/hooks/use-filtered-list"
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

  const vaultFilterFields: FilterField[] = useMemo(
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
        operators: [
          { value: "contain", label: "contain" },
          { value: "equal", label: "equal" },
        ],
        defaultOperator: "contain",
        options: USER_DISCIPLINES.map((d) => ({ value: d, label: d })),
      },
      {
        key: "riders",
        label: "riders",
        type: "multiselect" as const,
        operators: [
          { value: "contain", label: "contain" },
          { value: "equal", label: "equal" },
        ],
        defaultOperator: "contain",
        options: riderNames.map((w) => ({ value: w, label: w })),
      },
    ],
    [riderNames],
  )

  const { filters, filterFields, handleFiltersChange, queryParams, operators } =
    useFilteredList({
      fields: vaultFilterFields,
      searchParams,
      navigate,
    })

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>vault</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="flex h-full flex-col">
        <ContentHeaderRow
          sticky
          className="gap-2 p-4"
          left={
            <Filters
              fields={filterFields}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          }
          right={
            <Button variant="secondary" size="sm" asChild>
              <Link to="/vault/history">history</Link>
            </Button>
          }
        />

        <Suspense>
          <VideoGrid
            queryParams={
              queryParams as {
                q?: string
                disciplines?: string[]
                riders?: string[]
              }
            }
            disciplinesOperator={operators.disciplines ?? "contain"}
            ridersOperator={operators.riders ?? "contain"}
          />
        </Suspense>
      </div>
    </>
  )
}

function VideoGrid({
  queryParams,
  disciplinesOperator,
  ridersOperator,
}: {
  queryParams: { q?: string; disciplines?: string[]; riders?: string[] }
  disciplinesOperator: "contain" | "equal"
  ridersOperator: "contain" | "equal"
}) {
  const {
    data: videosPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(utv.list.infiniteQueryOptions(queryParams))

  const displayedVideos = useMemo(() => {
    let videos = videosPages.pages.flat()

    if (
      disciplinesOperator === "equal" &&
      queryParams.disciplines &&
      queryParams.disciplines.length > 0
    ) {
      const filterSet = new Set(queryParams.disciplines.map(String))
      videos = videos.filter((video) => {
        const videoSet = new Set((video.disciplines ?? []).map(String))
        if (videoSet.size !== filterSet.size) return false
        for (const discipline of filterSet) {
          if (!videoSet.has(discipline)) return false
        }
        return true
      })
    }

    if (
      ridersOperator === "equal" &&
      queryParams.riders &&
      queryParams.riders.length > 0
    ) {
      const filterSet = new Set(queryParams.riders)
      videos = videos.filter((video) => {
        const videoSet = new Set(video.riders ?? [])
        if (videoSet.size !== filterSet.size) return false
        for (const rider of filterSet) {
          if (!videoSet.has(rider)) return false
        }
        return true
      })
    }

    return videos
  }, [
    videosPages,
    queryParams.disciplines,
    disciplinesOperator,
    queryParams.riders,
    ridersOperator,
  ])
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)

  return (
    <div className="flex-1 overflow-y-auto" ref={setScrollRoot}>
      <div className="@container mx-auto flex max-w-3xl flex-col px-4">
        {displayedVideos.length === 0 && <NoResultsEmpty />}
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
                  <StatBadge
                    icon={HeartIcon}
                    count={video.likesCount}
                    label="like"
                  />
                  <StatBadge
                    icon={MessageCircleIcon}
                    count={video.messagesCount}
                    label="message"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
        <InfiniteScrollTrigger
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          root={scrollRoot}
        />
      </div>
    </div>
  )
}
