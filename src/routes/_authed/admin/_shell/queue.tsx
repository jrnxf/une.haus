import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useState } from "react"

import {
  FlagCard,
  GlossaryCard,
  SubmissionCard,
  SuggestionCard,
  VaultCard,
  VideoCard,
} from "~/components/admin/review-items"
import { Button } from "~/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "~/components/ui/empty"
import {
  countKinds,
  REVIEW_KIND_FILTER_LABELS,
  type ReviewKind,
  sortQueue,
} from "~/lib/admin/review"
import { flagsDomain } from "~/lib/flags"
import { tricks } from "~/lib/tricks"
import { utv } from "~/lib/utv/core"

export const Route = createFileRoute("/_authed/admin/_shell/queue")({
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(
        tricks.submissions.list.queryOptions({ status: "pending" }),
      ),
      context.queryClient.ensureQueryData(
        tricks.suggestions.list.queryOptions({ status: "pending" }),
      ),
      context.queryClient.ensureQueryData(
        tricks.videos.listPending.queryOptions(),
      ),
      context.queryClient.ensureQueryData(
        tricks.glossary.proposals.list.queryOptions({ status: "pending" }),
      ),
      context.queryClient.ensureQueryData(tricks.elements.list.queryOptions()),
      context.queryClient.ensureQueryData(tricks.modifiers.list.queryOptions()),
      context.queryClient.ensureQueryData(
        utv.suggestions.list.queryOptions({ status: "pending" }),
      ),
      context.queryClient.ensureQueryData(flagsDomain.list.queryOptions()),
    ])
  },
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
      <Queue />
      {import.meta.env.DEV && (
        <div className="flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              import("@tanstack/devtools-client").then(
                ({ devtoolsEventClient }) => {
                  devtoolsEventClient.emit("trigger-toggled", {
                    isOpen: true,
                  })
                },
              )
            }}
          >
            devtools
          </Button>
        </div>
      )}
    </div>
  )
}

/** Every pending item of every kind in one list, oldest first. */
function Queue() {
  const [filter, setFilter] = useState<ReviewKind | "all">("all")

  const { data: submissions } = useSuspenseQuery(
    tricks.submissions.list.queryOptions({ status: "pending" }),
  )
  const { data: suggestions } = useSuspenseQuery(
    tricks.suggestions.list.queryOptions({ status: "pending" }),
  )
  const { data: videos } = useSuspenseQuery(
    tricks.videos.listPending.queryOptions(),
  )
  const { data: proposals } = useSuspenseQuery(
    tricks.glossary.proposals.list.queryOptions({ status: "pending" }),
  )
  const { data: vaultSuggestions } = useSuspenseQuery(
    utv.suggestions.list.queryOptions({ status: "pending" }),
  )
  const { data: flags } = useSuspenseQuery(flagsDomain.list.queryOptions())

  const items = sortQueue([
    ...submissions.map((s) => ({
      kind: "submission" as const,
      id: s.id,
      createdAt: s.createdAt,
      card: <SubmissionCard submission={s} />,
    })),
    ...suggestions.map((s) => ({
      kind: "suggestion" as const,
      id: s.id,
      createdAt: s.createdAt,
      card: <SuggestionCard suggestion={s} />,
    })),
    ...videos.map((v) => ({
      kind: "video" as const,
      id: v.id,
      createdAt: v.createdAt,
      card: <VideoCard video={v} />,
    })),
    ...proposals.map((p) => ({
      kind: "glossary" as const,
      id: p.id,
      createdAt: p.createdAt,
      card: <GlossaryCard proposal={p} />,
    })),
    ...vaultSuggestions.map((s) => ({
      kind: "vault" as const,
      id: s.id,
      createdAt: s.createdAt,
      card: <VaultCard suggestion={s} />,
    })),
    ...flags.map((f) => ({
      kind: "flag" as const,
      id: f.id,
      createdAt: f.createdAt,
      card: <FlagCard flag={f} />,
    })),
  ])

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyTitle>all clear</EmptyTitle>
          <EmptyDescription>nothing to review</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const kinds = countKinds(items)
  // When the last item of the chosen kind goes away, show every kind again.
  const active = kinds.some((entry) => entry.kind === filter) ? filter : "all"
  const shown = items.filter((item) => active === "all" || item.kind === active)

  return (
    <>
      {kinds.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label="all"
            count={items.length}
            pressed={active === "all"}
            onPress={() => setFilter("all")}
          />
          {kinds.map(({ kind, count }) => (
            <FilterChip
              key={kind}
              label={REVIEW_KIND_FILTER_LABELS[kind]}
              count={count}
              pressed={active === kind}
              onPress={() => setFilter(kind)}
            />
          ))}
        </div>
      )}
      <div className="space-y-2">
        {shown.map((item) => (
          <div key={`${item.kind}-${item.id}`}>{item.card}</div>
        ))}
      </div>
    </>
  )
}

function FilterChip({
  label,
  count,
  pressed,
  onPress,
}: {
  label: string
  count: number
  pressed: boolean
  onPress: () => void
}) {
  return (
    <Button
      size="sm"
      variant={pressed ? "default" : "outline"}
      aria-pressed={pressed}
      onClick={onPress}
    >
      {label}
      <span className="tabular-nums opacity-60">{count}</span>
    </Button>
  )
}
