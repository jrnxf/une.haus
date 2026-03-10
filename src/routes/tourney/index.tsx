import { useQuery } from "@tanstack/react-query"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp"
import { GhostIcon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { PageHeader } from "~/components/page-header"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { FieldDescription } from "~/components/ui/field"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { seo } from "~/lib/seo"
import { session } from "~/lib/session"
import { useSessionUser } from "~/lib/session/hooks"
import { tourney } from "~/lib/tourney"

export const Route = createFileRoute("/tourney/")({
  component: RouteComponent,
  head: () =>
    seo({
      title: "tournaments",
      description: "unicycling tournaments on une.haus",
      path: "/tourney",
    }),
  loader: async ({ context }) => {
    const sessionData = context.queryClient.getQueryData(
      session.get.queryOptions().queryKey,
    )
    if (sessionData?.user) {
      await context.queryClient.ensureQueryData(tourney.list.queryOptions())
    }
  },
})

function RouteComponent() {
  const sessionUser = useSessionUser()

  if (!sessionUser) {
    return <UnauthenticatedView />
  }

  return <AuthenticatedView />
}

function UnauthenticatedView() {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleComplete = async (value: string) => {
    const upper = value.toUpperCase()
    setLoading(true)
    try {
      await tourney.get.fn({ data: { code: upper } })
      navigate({ to: "/tourney/$code/live", params: { code: upper } })
    } catch {
      toast.error("tournament not found")
      setCode("")
      setLoading(false)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>tourney</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-xl p-4">
        <div className="bg-card space-y-4 rounded-xl border p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium">join tourney</p>
            <FieldDescription>
              enter the 4-digit code to watch live
            </FieldDescription>
          </div>
          <InputOTP
            maxLength={4}
            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
            value={code}
            onChange={(v) => setCode(v.toUpperCase())}
            onComplete={handleComplete}
            disabled={loading}
            autoFocus
            autoComplete="off"
            ref={inputRef}
          >
            <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
          <FieldDescription>
            managing a tournament?{" "}
            <Link to="/auth" search={{ redirect: "/tourney" }}>
              log in
            </Link>
          </FieldDescription>
        </div>
      </div>
    </>
  )
}

function AuthenticatedView() {
  const { data: tournaments = [] } = useQuery(tourney.list.queryOptions())

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>tourney</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-3xl p-4">
        {tournaments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>no tournaments</EmptyTitle>
              <EmptyDescription>
                create a tournament or join one with a code
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <div className="flex items-center gap-2">
                <Button variant="secondary" asChild>
                  <Link to="/tourney/join">join</Link>
                </Button>
                <Button asChild>
                  <Link to="/tourney/create">create</Link>
                </Button>
              </div>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <div className="flex items-center justify-end gap-2 pb-4">
              <Button variant="secondary" asChild>
                <Link to="/tourney/join">join</Link>
              </Button>
              <Button asChild>
                <Link to="/tourney/create">create</Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {tournaments.map((t) => (
                <div key={t.id} className="relative">
                  <div className="bg-card flex flex-col gap-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <Link
                        to="/tourney/$code/live"
                        params={{ code: t.code }}
                        className="truncate font-semibold after:absolute after:inset-0 after:rounded-md"
                      >
                        {t.name}
                      </Link>
                      <Badge variant="secondary">{t.code}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-muted-foreground relative z-10 inline-flex items-center gap-1.5 text-xs">
                        <RelativeTimeCard date={t.createdAt} variant="muted" />
                      </p>
                      <Button variant="secondary" size="sm" asChild>
                        <Link
                          to={getPhaseRoute(t.phase)}
                          params={{ code: t.code }}
                          className="relative z-10"
                        >
                          manage
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function getPhaseRoute(
  phase: string,
):
  | "/tourney/$code/prelims"
  | "/tourney/$code/ranking"
  | "/tourney/$code/bracket" {
  switch (phase) {
    case "prelims": {
      return "/tourney/$code/prelims"
    }
    case "ranking": {
      return "/tourney/$code/ranking"
    }
    case "bracket":
    case "complete": {
      return "/tourney/$code/bracket"
    }
    default: {
      return "/tourney/$code/prelims"
    }
  }
}
