import { useSuspenseInfiniteQuery } from "@tanstack/react-query"
import { createFileRoute, Link, redirect } from "@tanstack/react-router"
import {
  ArrowUpRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlayIcon,
  VideoIcon,
} from "lucide-react"
import { Suspense, useMemo, useState } from "react"

import { ContentHeaderRow } from "~/components/content-header-row"
import { Filters, type FilterField } from "~/components/filters/filters"
import { InfiniteScrollTrigger } from "~/components/infinite-scroll-trigger"
import { NoResultsEmpty } from "~/components/no-results-empty"
import { PageHeader } from "~/components/page-header"
import { SuspenseLoader } from "~/components/suspense-loader"
import { Button } from "~/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "~/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import {
  getMuxPoster,
  VideoPlayer,
  VideoPreload,
} from "~/components/video-player"
import { useFilteredList } from "~/hooks/use-filtered-list"
import { seo } from "~/lib/seo"
import { session } from "~/lib/session/index"
import { users, type UserVideoItem } from "~/lib/users"
import { USER_VIDEO_TYPES, userVideosFiltersSchema } from "~/lib/users/schemas"
import { getVideoSource } from "~/lib/users/video-source"
import { errorFmt } from "~/lib/utils"

const TYPE_LABELS = {
  post: "post",
  riuSet: "riu set",
  riuSubmission: "riu submission",
  biuSet: "biu set",
  siuSet: "siu set",
  trickVideo: "trick video",
} satisfies Record<(typeof USER_VIDEO_TYPES)[number], string>

type VideoQueryParams = {
  q?: string
  types?: string[]
}

export const Route = createFileRoute("/users/$userId/videos")({
  component: RouteComponent,
  params: users.get.schema,
  validateSearch: userVideosFiltersSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params: { userId }, deps, cause }) => {
    try {
      const [user] = await Promise.all([
        context.queryClient.ensureQueryData(users.get.queryOptions({ userId })),
        // Skip on "stay" (filter changed on same page) — awaiting here blocks
        // rendering. useDeferredValue + Suspense handle client transitions.
        cause === "stay"
          ? Promise.resolve()
          : context.queryClient.ensureInfiniteQueryData(
              users.videos.infiniteQueryOptions({ userId, ...deps }),
            ),
      ])
      return { user }
    } catch (error) {
      await session.flash.set.fn({
        data: { type: "error", message: errorFmt(error) },
      })
      throw redirect({ to: "/users" })
    }
  },
  head: ({ loaderData }) => {
    const user = loaderData?.user
    if (!user) return {}

    return seo({
      title: `${user.name} videos`,
      description: `all videos uploaded by ${user.name} on une.haus`,
      path: `/users/${user.id}/videos`,
    })
  },
})

function RouteComponent() {
  const { userId } = Route.useParams()
  const searchParams = Route.useSearch()
  const navigate = Route.useNavigate()

  const videoFilterFields: FilterField[] = useMemo(
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
        key: "types",
        label: "type",
        type: "multiselect" as const,
        operators: [{ value: "contain", label: "contain" }],
        defaultOperator: "contain",
        options: USER_VIDEO_TYPES.map((t) => ({
          value: t,
          label: TYPE_LABELS[t],
        })),
      },
    ],
    [],
  )

  const { filters, filterFields, handleFiltersChange, queryParams } =
    useFilteredList({
      fields: videoFilterFields,
      searchParams,
      navigate,
    })

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
          <PageHeader.Crumb to={`/users/${userId}`}>{userId}</PageHeader.Crumb>
          <PageHeader.Crumb>videos</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="flex h-full flex-col">
        <ContentHeaderRow
          sticky
          className="max-w-none gap-2 p-4"
          left={
            <Filters
              fields={filterFields}
              filters={filters}
              onFiltersChange={handleFiltersChange}
            />
          }
        />

        <Suspense fallback={<SuspenseLoader />}>
          <VideoGallery
            userId={userId}
            queryParams={queryParams as VideoQueryParams}
          />
        </Suspense>
      </div>
    </>
  )
}

function VideoGallery({
  userId,
  queryParams,
}: {
  userId: number
  queryParams: VideoQueryParams
}) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery(
      users.videos.infiniteQueryOptions({ userId, ...queryParams }),
    )

  const items = useMemo(() => data.pages.flatMap((p) => p.items), [data])
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const activeItem = activeIndex === null ? null : (items[activeIndex] ?? null)

  const goTo = (index: number) => {
    if (index < 0 || index >= items.length) return
    setActiveIndex(index)
    // Keep the next clip ready as the rider approaches the end of the list
    if (index >= items.length - 2 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  const goNext = async () => {
    if (activeIndex === null) return
    if (activeIndex < items.length - 1) {
      goTo(activeIndex + 1)
      return
    }
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage()
      setActiveIndex(activeIndex + 1)
    }
  }

  const canPrev = activeIndex !== null && activeIndex > 0
  const canNext =
    activeIndex !== null && (activeIndex < items.length - 1 || hasNextPage)

  const isFiltered = Boolean(
    queryParams.q || (queryParams.types && queryParams.types.length > 0),
  )

  if (items.length === 0) {
    return isFiltered ? (
      <NoResultsEmpty />
    ) : (
      <div className="p-4 md:p-6">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <VideoIcon />
            </EmptyMedia>
            <EmptyTitle>no videos</EmptyTitle>
            <EmptyDescription>
              this rider hasn't uploaded any videos yet
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto" ref={setScrollRoot}>
      <div className="@container flex w-full flex-col px-4 pb-6">
        <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3 @7xl:grid-cols-4">
          {items.map((item, index) => (
            <VideoCard
              key={`${item.type}-${item.id}`}
              item={item}
              onOpen={() => goTo(index)}
            />
          ))}
        </div>
        <InfiniteScrollTrigger
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          fetchNextPage={fetchNextPage}
          root={scrollRoot}
        />
      </div>

      <Dialog
        open={activeItem !== null}
        onOpenChange={(open) => {
          if (!open) setActiveIndex(null)
        }}
      >
        <DialogContent className="gap-4 p-4 sm:max-w-4xl">
          {activeItem && activeIndex !== null && (
            <>
              <div className="flex min-w-0 items-center pr-8">
                <DialogTitle className="min-w-0 text-sm font-medium">
                  <Link
                    to={getVideoSource(activeItem).url}
                    className="flex min-w-0 items-center gap-1 hover:underline"
                  >
                    <span className="truncate">
                      {getVideoSource(activeItem).label}
                    </span>
                    <ArrowUpRightIcon className="size-3.5 shrink-0" />
                  </Link>
                </DialogTitle>
              </div>

              {/* One persistent player (no remount key): the element keeps its
                  user-gesture activation, so chained autoplay isn't blocked */}
              <VideoPlayer
                playbackId={activeItem.playbackId}
                autoPlay
                onEnded={goNext}
                showPoster={false}
                className="rounded-md bg-black"
              />

              {/* Buffer the next two clips so advancing has no loading gap */}
              {[items[activeIndex + 1], items[activeIndex + 2]]
                .filter((item) => item !== undefined)
                .map((item) => (
                  <VideoPreload
                    key={item.playbackId}
                    playbackId={item.playbackId}
                  />
                ))}

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="secondary"
                  size="icon"
                  disabled={!canPrev}
                  onClick={() => activeIndex !== null && goTo(activeIndex - 1)}
                >
                  <ChevronLeftIcon className="size-4" />
                  <span className="sr-only">previous video</span>
                </Button>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>
                    {activeIndex + 1} / {items.length}
                    {hasNextPage ? "+" : ""}
                  </span>
                  <RelativeTimeCard
                    date={activeItem.createdAt}
                    variant="muted"
                  />
                </div>
                <Button
                  variant="secondary"
                  size="icon"
                  disabled={!canNext}
                  onClick={goNext}
                >
                  <ChevronRightIcon className="size-4" />
                  <span className="sr-only">next video</span>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VideoCard({
  item,
  onOpen,
}: {
  item: UserVideoItem
  onOpen: () => void
}) {
  const { label, url } = getVideoSource(item)

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="group relative aspect-video w-full cursor-pointer overflow-clip rounded-md bg-black"
      >
        <img
          src={getMuxPoster({ playbackId: item.playbackId, width: 640 })}
          alt={label}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full bg-black/50 p-3 backdrop-blur-xs transition-transform group-hover:scale-105">
            <PlayIcon className="size-5 fill-white text-white" />
          </div>
        </div>
      </button>
      <div className="flex items-center justify-between gap-2 text-xs">
        <Link
          to={url}
          className="text-muted-foreground hover:text-foreground flex min-w-0 items-center gap-1 transition-colors"
        >
          <span className="truncate">{label}</span>
          <ArrowUpRightIcon className="size-3.5 shrink-0" />
        </Link>
        <RelativeTimeCard date={item.createdAt} variant="muted" />
      </div>
    </div>
  )
}
