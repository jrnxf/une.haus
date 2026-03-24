import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"

import { CobeGlobe } from "~/components/cobe-globe"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { ButtonGroup } from "~/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { FlagEmoji } from "~/components/ui/flag-emoji"
import { seo } from "~/lib/seo"
import { users, type UsersWithLocationsData } from "~/lib/users"

export const Route = createFileRoute("/users/globe/")({
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      users.withLocations.queryOptions(),
    )
  },
  head: () =>
    seo({
      title: "globe",
      description: "unicyclists around the world",
      path: "/users/globe",
    }),
  component: RouteComponent,
})

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const GREEN: [number, number, number] = [0.1, 0.6, 0.25]

function RouteComponent() {
  const { data } = useSuspenseQuery(users.withLocations.queryOptions())
  const shuffled = useMemo(() => shuffle(data), [data])

  if (shuffled.length === 0) {
    return (
      <>
        <PageHeader>
          <PageHeader.Breadcrumbs>
            <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
            <ViewDropdown label="globe" />
          </PageHeader.Breadcrumbs>
        </PageHeader>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-muted-foreground">no users with locations</p>
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/users">users</PageHeader.Crumb>
          <ViewDropdown label="globe" />
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="flex min-h-0 flex-1 flex-col">
        <UserGlobe users={shuffled} />
      </div>
    </>
  )
}

function UserGlobe({ users }: { users: UsersWithLocationsData }) {
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const playingRef = useRef(playing)
  playingRef.current = playing

  const current = users[index]

  const locationCounts = useMemo(() => {
    const counts = new Map<
      string,
      { location: [number, number]; count: number }
    >()
    for (const u of users) {
      const key = `${u.location.lat},${u.location.lng}`
      const entry = counts.get(key)
      if (entry) {
        entry.count++
      } else {
        counts.set(key, {
          location: [u.location.lat, u.location.lng],
          count: 1,
        })
      }
    }
    return [...counts.values()]
  }, [users])

  const activeLocation: [number, number] = [
    current.location.lat,
    current.location.lng,
  ]
  const activeKey = `${activeLocation[0]},${activeLocation[1]}`

  const overlayDots = useMemo(() => {
    return locationCounts
      .filter(({ location }) => `${location[0]},${location[1]}` !== activeKey)
      .map(({ location, count }) => ({
        location,
        sizeClass: count >= 4 ? "size-2.5" : count >= 2 ? "size-2" : "size-1.5",
        colorClass: "bg-blue-400 dark:bg-blue-600",
        opacity: 0.55,
      }))
  }, [locationCounts, activeKey])

  const dotMarkers = useMemo(() => {
    for (const { location } of locationCounts) {
      if (`${location[0]},${location[1]}` === activeKey) {
        return [{ location, size: 0.02, color: GREEN }]
      }
    }
    return []
  }, [locationCounts, activeKey])

  const scheduleNext = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (playingRef.current) {
      timerRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % users.length)
      }, 3000)
    }
  }

  const lastIndexRef = useRef(-1)
  if (lastIndexRef.current !== index) {
    lastIndexRef.current = index
    scheduleNext()
  }

  const togglePlaying = () => {
    setPlaying((prev) => {
      const next = !prev
      playingRef.current = next
      if (next) {
        timerRef.current = setTimeout(() => {
          setIndex((i) => (i + 1) % users.length)
        }, 3000)
      } else if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      return next
    })
  }

  const goTo = (direction: "prev" | "next") => {
    setIndex((prev) => {
      if (direction === "next") return (prev + 1) % users.length
      return (prev - 1 + users.length) % users.length
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center p-6">
      <div className="min-h-0 flex-1">
        <div className="mx-auto aspect-square h-full max-h-full">
          <CobeGlobe
            focusTarget={activeLocation}
            dotMarkers={dotMarkers}
            overlayDots={overlayDots}
            pulseMarker={activeLocation}
          />
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Link
          to="/users/$userId"
          params={{ userId: current.id }}
          className="hover:bg-muted flex flex-col items-center rounded-md px-4 py-2 transition-colors"
        >
          <span className="font-medium">{current.name}</span>
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            {current.location.countryCode && (
              <FlagEmoji
                className="text-sm"
                location={{ countryCode: current.location.countryCode }}
              />
            )}
            <span>{current.location.label}</span>
          </div>
        </Link>
        <ButtonGroup>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo("prev")}
            aria-label="previous user"
          >
            <ChevronLeftIcon className="size-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={togglePlaying}
            aria-label={playing ? "pause" : "play"}
          >
            {playing ? (
              <PauseIcon className="size-3.5" />
            ) : (
              <PlayIcon className="size-3.5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goTo("next")}
            aria-label="next user"
          >
            <ChevronRightIcon className="size-3.5" />
          </Button>
        </ButtonGroup>
      </div>
    </div>
  )
}

function ViewDropdown({ label }: { label: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="text-foreground flex items-center gap-1 text-sm font-medium outline-none">
        {label}
        <ChevronDownIcon className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem render={<Link to="/users/globe" />}>
          globe
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link to="/users/map" />}>
          map
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
