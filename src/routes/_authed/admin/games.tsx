import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import pluralize from "pluralize"
import { Fragment } from "react"
import { toast } from "sonner"

import { confirm } from "~/components/confirm-dialog"
import { PageHeader } from "~/components/page-header"
import { Button } from "~/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"
import { games } from "~/lib/games"
import { useAdminRotateRius } from "~/lib/games/rius/hooks"

export const Route = createFileRoute("/_authed/admin/games")({
  loader: async ({ context }) => {
    if (context.user.id !== 1) {
      throw new Error("Not authorized")
    }

    await Promise.all([
      context.queryClient.ensureQueryData(
        games.sius.rounds.active.queryOptions(),
      ),
      context.queryClient.ensureQueryData(games.bius.rounds.queryOptions()),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  if (pathname !== "/admin/games" && pathname !== "/admin/games/") {
    return <Outlet />
  }

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/admin">admin</PageHeader.Crumb>
          <PageHeader.Crumb>games</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
        <RiuSection />
        <SiusSection />
        <BiusSection />
      </div>
    </>
  )
}

const Slash = () => <span className="opacity-25">/</span>

function MetaLine({ parts }: { parts: string[] }) {
  return (
    <p className="text-muted-foreground text-xs">
      {parts.map((part, index) => (
        <Fragment key={`${part}-${index}`}>
          {index > 0 && (
            <>
              {" "}
              <Slash />{" "}
            </>
          )}
          {part}
        </Fragment>
      ))}
    </p>
  )
}

function RiuSection() {
  const rotateRius = useAdminRotateRius()

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>rack it up</CardTitle>
        <Button
          onClick={() => rotateRius.mutate({})}
          disabled={rotateRius.isPending}
          size="sm"
        >
          rotate
        </Button>
      </CardHeader>
    </Card>
  )
}

function SiusSection() {
  const { data: rounds } = useSuspenseQuery(
    games.sius.rounds.active.queryOptions(),
  )
  const roundsOrdered = rounds.toSorted((a, b) => a.id - b.id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const startRound = useMutation({
    mutationFn: games.sius.rounds.start.fn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: games.sius.rounds.active.queryOptions().queryKey,
      })
      toast.success("started new SIU round", {
        action: (
          <button
            onClick={() => {
              navigate({
                to: "/games/sius/$roundId",
                params: { roundId: data.round.id },
              })
            }}
          >
            view
          </button>
        ),
      })
    },
    onError: (error) => {
      toast.error(error.message || "failed to start round")
    },
  })
  const archiveRound = useMutation({
    mutationFn: games.sius.admin.archiveRound.fn,
    onSuccess: () => {
      toast.success("round archived")
      queryClient.invalidateQueries({
        queryKey: games.sius.rounds.active.queryOptions().queryKey,
      })
      queryClient.invalidateQueries({
        queryKey: games.sius.rounds.archived.list.queryOptions().queryKey,
      })
    },
    onError: (error) => {
      toast.error(error.message || "failed to archive round")
    },
  })

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>stack it up</CardTitle>
        {rounds.length < 3 && (
          <Button
            size="sm"
            disabled={startRound.isPending}
            onClick={() => startRound.mutate({ data: {} })}
          >
            start
          </Button>
        )}
      </CardHeader>
      {rounds.length > 0 && (
        <CardContent className="space-y-4">
          {roundsOrdered.map((round) => (
            <div
              key={round.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="text-sm font-medium">round {round.id}</p>
                <MetaLine
                  parts={[
                    `${round.sets?.length ?? 0} ${pluralize("trick", round.sets?.length ?? 0)}`,
                    `${round.archiveVotes?.length ?? 0} ${pluralize("archive vote", round.archiveVotes?.length ?? 0)}`,
                  ]}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="secondary">
                  <Link
                    to="/games/sius/$roundId"
                    params={{ roundId: round.id }}
                  >
                    view
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={archiveRound.isPending}
                  onClick={() => {
                    confirm.open({
                      title: `archive round ${round.id}?`,
                      onConfirm: () =>
                        archiveRound.mutate({ data: { roundId: round.id } }),
                      confirmText: "archive",
                      variant: "destructive",
                    })
                  }}
                >
                  archive
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}

function BiusSection() {
  const { data: rounds } = useSuspenseQuery(games.bius.rounds.queryOptions())
  const roundsOrdered = rounds.toSorted((a, b) => a.id - b.id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const startRound = useMutation({
    mutationFn: games.bius.rounds.start.fn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: games.bius.rounds.queryOptions().queryKey,
      })
      toast.success("started new BIU round", {
        action: (
          <button
            onClick={() => {
              navigate({
                to: "/games/bius/$roundId",
                params: { roundId: data.round.id },
              })
            }}
          >
            view
          </button>
        ),
      })
    },
    onError: (error) => {
      toast.error(error.message || "failed to start round")
    },
  })

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>back it up</CardTitle>
        {rounds.length < 3 && (
          <Button
            size="sm"
            disabled={startRound.isPending}
            onClick={() => startRound.mutate({ data: {} })}
          >
            start
          </Button>
        )}
      </CardHeader>
      {rounds.length > 0 && (
        <CardContent className="space-y-4">
          {roundsOrdered.map((round) => (
            <div
              key={round.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div>
                <p className="text-sm font-medium">round {round.id}</p>
                <MetaLine
                  parts={[
                    `${round.sets?.length ?? 0} ${pluralize("set", round.sets?.length ?? 0)}`,
                  ]}
                />
              </div>
              <Button asChild size="sm" variant="secondary">
                <Link to="/games/bius/$roundId" params={{ roundId: round.id }}>
                  view
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
