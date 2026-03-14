import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { GhostIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { CodeViewer } from "~/components/ui/code-viewer"
import { CountChip } from "~/components/ui/count-chip"
import { DiffViewer } from "~/components/ui/diff-viewer"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs"
import { Textarea } from "~/components/ui/textarea"
import { VideoPlayer } from "~/components/video-player"
import {
  type FlagEntityType,
  type GlossaryProposalDiff,
  type TrickSuggestionDiff,
  type UtvVideoSuggestionDiff,
} from "~/db/schema"
import { flagsDomain } from "~/lib/flags"
import { type PendingVideosData, tricks } from "~/lib/tricks"
import { type ServerFnReturn } from "~/lib/types"
import { utv } from "~/lib/utv/core"

function buildJsonDiff(
  current: unknown,
  proposed: unknown,
): { original: string; modified: string } {
  return {
    original: JSON.stringify(current, null, 2),
    modified: JSON.stringify(proposed, null, 2),
  }
}

const searchSchema = z.object({
  outer: z.enum(["tricks", "vault", "flags"]).optional(),
  inner: z
    .enum(["submissions", "suggestions", "videos", "glossary"])
    .optional(),
})

export const Route = createFileRoute("/_authed/admin/")({
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    if (context.user.id !== 1) {
      throw new Error("Not authorized")
    }

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
  const search = Route.useSearch()
  const outerTab = search.outer ?? "tricks"
  const innerTab = search.inner ?? "submissions"

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>admin</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            {__COMMIT_SHA__ && __COMMIT_SHA__ !== "unknown" && (
              <Button variant="secondary" size="sm" asChild>
                <a
                  href={`https://github.com/jrnxf/une.haus/commit/${__COMMIT_SHA__}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {__COMMIT_SHA__}
                </a>
              </Button>
            )}
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4">
        <Tabs defaultValue={outerTab}>
          <TabsList>
            <TricksOuterTab />
            <VaultOuterTab />
            <FlagsOuterTab />
          </TabsList>

          <TabsContent value="tricks" className="mt-4">
            <Tabs defaultValue={innerTab}>
              <TabsList>
                <SubmissionsInnerTab />
                <SuggestionsInnerTab />
                <VideosInnerTab />
                <GlossaryInnerTab />
              </TabsList>

              <TabsContent value="submissions" className="mt-4">
                <SubmissionsPanel />
              </TabsContent>
              <TabsContent value="suggestions" className="mt-4">
                <SuggestionsPanel />
              </TabsContent>
              <TabsContent value="videos" className="mt-4">
                <VideosPanel />
              </TabsContent>
              <TabsContent value="glossary" className="mt-4">
                <GlossaryPanel />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="vault" className="mt-4">
            <VaultPanel />
          </TabsContent>

          <TabsContent value="flags" className="mt-4">
            <FlagsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}

// ==================== Tab Triggers ====================

function TricksOuterTab() {
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
  const count =
    submissions.length + suggestions.length + videos.length + proposals.length

  return (
    <TabsTrigger value="tricks">
      tricks
      {count > 0 && <CountChip>{count}</CountChip>}
    </TabsTrigger>
  )
}

function VaultOuterTab() {
  const { data: suggestions } = useSuspenseQuery(
    utv.suggestions.list.queryOptions({ status: "pending" }),
  )

  return (
    <TabsTrigger value="vault">
      vault
      {suggestions.length > 0 && <CountChip>{suggestions.length}</CountChip>}
    </TabsTrigger>
  )
}

function SubmissionsInnerTab() {
  const { data } = useSuspenseQuery(
    tricks.submissions.list.queryOptions({ status: "pending" }),
  )
  return (
    <TabsTrigger value="submissions">
      submissions
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </TabsTrigger>
  )
}

function SuggestionsInnerTab() {
  const { data } = useSuspenseQuery(
    tricks.suggestions.list.queryOptions({ status: "pending" }),
  )
  return (
    <TabsTrigger value="suggestions">
      suggestions
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </TabsTrigger>
  )
}

function VideosInnerTab() {
  const { data } = useSuspenseQuery(tricks.videos.listPending.queryOptions())
  return (
    <TabsTrigger value="videos">
      videos
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </TabsTrigger>
  )
}

function GlossaryInnerTab() {
  const { data } = useSuspenseQuery(
    tricks.glossary.proposals.list.queryOptions({ status: "pending" }),
  )
  return (
    <TabsTrigger value="glossary">
      glossary
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </TabsTrigger>
  )
}

function FlagsOuterTab() {
  const { data: flags } = useSuspenseQuery(flagsDomain.list.queryOptions())

  return (
    <TabsTrigger value="flags">
      flags
      {flags.length > 0 && <CountChip>{flags.length}</CountChip>}
    </TabsTrigger>
  )
}

// ==================== Panels ====================

function EmptyState({
  message = "no results",
  description = "try again later",
}: {
  message?: string
  description?: string
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GhostIcon />
        </EmptyMedia>
        <EmptyTitle>{message.toLowerCase()}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function SubmissionsPanel() {
  const qc = useQueryClient()
  const submissionsQueryKey = tricks.submissions.list.queryOptions({
    status: "pending",
  }).queryKey
  const graphQueryKey = tricks.graph.queryOptions().queryKey

  const { data: submissions } = useSuspenseQuery(
    tricks.submissions.list.queryOptions({ status: "pending" }),
  )

  const review = useMutation({
    mutationFn: tricks.submissions.review.fn,
    onMutate: async ({ data: { id } }) => {
      await qc.cancelQueries({ queryKey: submissionsQueryKey })
      const prev = qc.getQueryData(submissionsQueryKey)
      qc.setQueryData(submissionsQueryKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== id),
      )
      return { prev }
    },
    onSuccess: (_, variables) => {
      qc.removeQueries({ queryKey: graphQueryKey })
      toast.success(
        variables.data.status === "approved"
          ? "submission approved"
          : "submission rejected",
      )
    },
    onError: (error, _, context) => {
      if (context?.prev) qc.setQueryData(submissionsQueryKey, context.prev)
      toast.error(error.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: submissionsQueryKey })
    },
  })

  if (submissions.length === 0) return <EmptyState />

  return (
    <div className="space-y-2">
      {submissions.map((s) => {
        const proposed = {
          name: s.name,
          slug: s.slug,
          alternateNames: s.alternateNames ?? [],
          description: s.description ?? null,
          inventedBy: s.inventedBy ?? null,
          yearLanded: s.yearLanded ?? null,
          notes: s.notes ?? null,
          videoUrl: s.videoUrl ?? null,
          videoTimestamp: s.videoTimestamp ?? null,
          elements: s.elementAssignments.map((a) => a.element.slug),
          relationships: s.relationships.map((r) => ({
            targetSlug: r.targetTrick.slug,
            type: r.type,
          })),
        }

        return (
          <Card key={s.id} className="rounded-md py-3">
            <CardContent className="space-y-4 px-4">
              <div className="flex items-start justify-between gap-2">
                <SubmitterBadge
                  userId={s.submittedBy.id}
                  name={s.submittedBy.name}
                  createdAt={s.createdAt}
                />
              </div>

              <CodeViewer value={JSON.stringify(proposed, null, 2)} />

              <ReviewButtons
                onApprove={(notes) =>
                  review.mutate({
                    data: { id: s.id, status: "approved", reviewNotes: notes },
                  })
                }
                onReject={(notes) =>
                  review.mutate({
                    data: { id: s.id, status: "rejected", reviewNotes: notes },
                  })
                }
                isPending={review.isPending}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function SuggestionsPanel() {
  const qc = useQueryClient()
  const suggestionsQueryKey = tricks.suggestions.list.queryOptions({
    status: "pending",
  }).queryKey
  const graphQueryKey = tricks.graph.queryOptions().queryKey

  const { data: suggestions } = useSuspenseQuery(
    tricks.suggestions.list.queryOptions({ status: "pending" }),
  )

  const review = useMutation({
    mutationFn: tricks.suggestions.review.fn,
    onMutate: async ({ data: { id } }) => {
      await qc.cancelQueries({ queryKey: suggestionsQueryKey })
      const prev = qc.getQueryData(suggestionsQueryKey)
      qc.setQueryData(suggestionsQueryKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== id),
      )
      return { prev }
    },
    onSuccess: (_, variables) => {
      qc.removeQueries({ queryKey: graphQueryKey })
      toast.success(
        variables.data.status === "approved"
          ? "suggestion approved"
          : "suggestion rejected",
      )
    },
    onError: (error, _, context) => {
      if (context?.prev) qc.setQueryData(suggestionsQueryKey, context.prev)
      toast.error(error.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: suggestionsQueryKey })
    },
  })

  if (suggestions.length === 0) return <EmptyState />

  return (
    <div className="space-y-2">
      {suggestions.map((s) => {
        const diff = s.diff as TrickSuggestionDiff

        const currentRelationships = (s.trick.outgoingRelationships ?? []).map(
          (r) => ({
            targetSlug: r.targetTrick.slug,
            type: r.type,
          }),
        )
        const proposedRelationships = diff.relationships
          ? [
              ...currentRelationships.filter(
                (r) =>
                  !diff.relationships!.removed.some(
                    (rem) =>
                      rem.targetSlug === r.targetSlug && rem.type === r.type,
                  ),
              ),
              ...diff.relationships.added,
            ]
          : currentRelationships

        const current = {
          name: s.trick.name,
          alternateNames: s.trick.alternateNames ?? [],
          description: s.trick.description ?? null,
          inventedBy: s.trick.inventedBy ?? null,
          yearLanded: s.trick.yearLanded ?? null,
          notes: s.trick.notes ?? null,
          elements: (s.trick.elementAssignments ?? []).map(
            (a) => a.element.slug,
          ),
          relationships: currentRelationships,
        }
        const proposed = {
          ...current,
          ...(diff.name !== undefined && { name: diff.name }),
          ...(diff.alternateNames !== undefined && {
            alternateNames: diff.alternateNames,
          }),
          ...(diff.description !== undefined && {
            description: diff.description,
          }),
          ...(diff.inventedBy !== undefined && { inventedBy: diff.inventedBy }),
          ...(diff.yearLanded !== undefined && { yearLanded: diff.yearLanded }),
          ...(diff.notes !== undefined && { notes: diff.notes }),
          ...(diff.elements !== undefined && { elements: diff.elements }),
          ...(diff.relationships !== undefined && {
            relationships: proposedRelationships,
          }),
        }
        const { original, modified } = buildJsonDiff(current, proposed)

        return (
          <Card key={s.id} className="rounded-md py-3">
            <CardContent className="space-y-4 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.trick.name}</p>
                </div>
                <SubmitterBadge
                  userId={s.submittedBy.id}
                  name={s.submittedBy.name}
                  createdAt={s.createdAt}
                />
              </div>

              <DiffViewer original={original} modified={modified} />

              {s.reason && (
                <p className="text-muted-foreground text-xs italic">
                  &quot;{s.reason}&quot;
                </p>
              )}

              <ReviewButtons
                onApprove={(notes) =>
                  review.mutate({
                    data: { id: s.id, status: "approved", reviewNotes: notes },
                  })
                }
                onReject={(notes) =>
                  review.mutate({
                    data: { id: s.id, status: "rejected", reviewNotes: notes },
                  })
                }
                isPending={review.isPending}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function VideosPanel() {
  const { data: videos } = useSuspenseQuery(
    tricks.videos.listPending.queryOptions(),
  )

  if (videos.length === 0) return <EmptyState />

  return (
    <div className="space-y-2">
      {videos.map((video) => (
        <VideoReviewCard key={video.id} video={video} />
      ))}
    </div>
  )
}

function VideoReviewCard({ video }: { video: PendingVideosData[number] }) {
  const qc = useQueryClient()
  const pendingVideosQueryKey =
    tricks.videos.listPending.queryOptions().queryKey
  const graphQueryKey = tricks.graph.queryOptions().queryKey

  const review = useMutation({
    mutationFn: tricks.videos.review.fn,
    onMutate: async ({ data: { id } }) => {
      await qc.cancelQueries({ queryKey: pendingVideosQueryKey })
      const prev = qc.getQueryData(pendingVideosQueryKey)
      qc.setQueryData(pendingVideosQueryKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== id),
      )
      return { prev }
    },
    onSuccess: (_, variables) => {
      qc.removeQueries({ queryKey: graphQueryKey })
      toast.success(
        variables.data.status === "active"
          ? "video approved"
          : "video rejected",
      )
    },
    onError: (error, _, context) => {
      if (context?.prev) qc.setQueryData(pendingVideosQueryKey, context.prev)
      toast.error(error.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: pendingVideosQueryKey })
    },
  })

  return (
    <Card className="rounded-md py-3">
      <CardContent className="space-y-2 px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium">{video.trick.name}</p>
          <SubmitterBadge
            userId={video.submittedBy.id}
            name={video.submittedBy.name}
            createdAt={video.createdAt}
          />
        </div>
        {video.video?.playbackId && (
          <VideoPlayer playbackId={video.video.playbackId} />
        )}
        {video.notes && (
          <p className="text-muted-foreground text-sm">{video.notes}</p>
        )}
        <ReviewButtons
          onApprove={(notes) =>
            review.mutate({
              data: { id: video.id, status: "active", reviewNotes: notes },
            })
          }
          onReject={(notes) =>
            review.mutate({
              data: { id: video.id, status: "rejected", reviewNotes: notes },
            })
          }
          isPending={review.isPending}
        />
      </CardContent>
    </Card>
  )
}

function GlossaryPanel() {
  const qc = useQueryClient()
  const proposalsQueryKey = tricks.glossary.proposals.list.queryOptions({
    status: "pending",
  }).queryKey

  const { data: proposals } = useSuspenseQuery(
    tricks.glossary.proposals.list.queryOptions({ status: "pending" }),
  )
  const { data: elements } = useSuspenseQuery(
    tricks.elements.list.queryOptions(),
  )
  const { data: modifiers } = useSuspenseQuery(
    tricks.modifiers.list.queryOptions(),
  )

  const review = useMutation({
    mutationFn: tricks.glossary.proposals.review.fn,
    onMutate: async ({ data: { id } }) => {
      await qc.cancelQueries({ queryKey: proposalsQueryKey })
      const prev = qc.getQueryData(proposalsQueryKey)
      qc.setQueryData(proposalsQueryKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== id),
      )
      return { prev }
    },
    onSuccess: (_, variables) => {
      qc.removeQueries({
        queryKey: tricks.elements.list.queryOptions().queryKey,
      })
      qc.removeQueries({
        queryKey: tricks.modifiers.list.queryOptions().queryKey,
      })
      toast.success(
        variables.data.status === "approved"
          ? "proposal approved"
          : "proposal rejected",
      )
    },
    onError: (error, _, context) => {
      if (context?.prev) qc.setQueryData(proposalsQueryKey, context.prev)
      toast.error(error.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: proposalsQueryKey })
    },
  })

  if (proposals.length === 0) return <EmptyState />

  return (
    <div className="space-y-2">
      {proposals.map((p) => {
        const diff = p.diff as GlossaryProposalDiff | null

        let diffViewer: React.ReactNode = null
        if (p.action === "edit" && diff && p.targetId) {
          const target =
            p.type === "element"
              ? elements.find((e) => e.id === p.targetId)
              : modifiers.find((m) => m.id === p.targetId)
          const current = {
            name: target?.name ?? null,
            description: target?.description ?? null,
          }
          const proposed = {
            ...current,
            ...(diff.name !== undefined && { name: diff.name }),
            ...(diff.description !== undefined && {
              description: diff.description,
            }),
          }
          const { original, modified } = buildJsonDiff(current, proposed)
          diffViewer = <DiffViewer original={original} modified={modified} />
        }

        return (
          <Card key={p.id} className="rounded-md py-3">
            <CardContent className="space-y-2 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {p.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {p.action}
                  </Badge>
                  <p className="text-sm font-medium">{p.name}</p>
                </div>
                <SubmitterBadge
                  userId={p.submittedBy.id}
                  name={p.submittedBy.name}
                  createdAt={p.createdAt}
                />
              </div>

              {p.action === "create" && (
                <>
                  <p className="text-muted-foreground text-xs">
                    slug: {p.slug}
                  </p>
                  {p.description && <p className="text-sm">{p.description}</p>}
                </>
              )}

              {diffViewer}

              {p.reason && (
                <p className="text-muted-foreground text-xs italic">
                  &quot;{p.reason}&quot;
                </p>
              )}

              <ReviewButtons
                onApprove={(notes) =>
                  review.mutate({
                    data: { id: p.id, status: "approved", reviewNotes: notes },
                  })
                }
                onReject={(notes) =>
                  review.mutate({
                    data: { id: p.id, status: "rejected", reviewNotes: notes },
                  })
                }
                isPending={review.isPending}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function VaultPanel() {
  const qc = useQueryClient()
  const suggestionsQueryKey = utv.suggestions.list.queryOptions({
    status: "pending",
  }).queryKey

  const { data: suggestions } = useSuspenseQuery(
    utv.suggestions.list.queryOptions({ status: "pending" }),
  )

  const review = useMutation({
    mutationFn: utv.suggestions.review.fn,
    onMutate: async ({ data: { id } }) => {
      await qc.cancelQueries({ queryKey: suggestionsQueryKey })
      const prev = qc.getQueryData(suggestionsQueryKey)
      qc.setQueryData(suggestionsQueryKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== id),
      )
      return { prev }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.status === "approved"
          ? "suggestion approved"
          : "suggestion rejected",
      )
    },
    onError: (error, _, context) => {
      if (context?.prev) qc.setQueryData(suggestionsQueryKey, context.prev)
      toast.error(error.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: suggestionsQueryKey })
    },
  })

  if (suggestions.length === 0) return <EmptyState />

  return (
    <div className="space-y-2">
      {suggestions.map((s) => {
        const diff = s.diff as UtvVideoSuggestionDiff

        const current = {
          title: s.utvVideo.title || s.utvVideo.legacyTitle,
          disciplines: s.utvVideo.disciplines ?? null,
          riders: (s.utvVideo.riders ?? []).map((r) => ({
            userId: r.userId,
            name: r.user?.name ?? r.name,
          })),
        }
        const proposed = {
          ...current,
          ...(diff.title !== undefined && { title: diff.title }),
          ...(diff.disciplines !== undefined && {
            disciplines: diff.disciplines,
          }),
          ...(diff.riders !== undefined && { riders: diff.riders }),
        }
        const { original, modified } = buildJsonDiff(current, proposed)

        return (
          <Card key={s.id} className="rounded-md py-3">
            <CardContent className="space-y-2 px-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">
                  {s.utvVideo.title || s.utvVideo.legacyTitle}
                </p>
                <SubmitterBadge
                  userId={s.submittedBy.id}
                  name={s.submittedBy.name}
                  createdAt={s.createdAt}
                />
              </div>

              <DiffViewer original={original} modified={modified} />

              {s.reason && (
                <p className="text-muted-foreground text-xs italic">
                  &quot;{s.reason}&quot;
                </p>
              )}

              <ReviewButtons
                onApprove={(notes) =>
                  review.mutate({
                    data: { id: s.id, status: "approved", reviewNotes: notes },
                  })
                }
                onReject={(notes) =>
                  review.mutate({
                    data: { id: s.id, status: "rejected", reviewNotes: notes },
                  })
                }
                isPending={review.isPending}
              />
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ==================== Game Flag Panels ====================

const ENTITY_TYPE_LABELS: Record<FlagEntityType, string> = {
  post: "post",
  biuSet: "BIU set",
  siuSet: "SIU set",
  riuSet: "RIU set",
  riuSubmission: "RIU submission",
  postMessage: "post message",
  biuSetMessage: "BIU message",
  siuSetMessage: "SIU message",
  riuSetMessage: "RIU message",
  riuSubmissionMessage: "RIU message",
  utvVideoMessage: "vault message",
  chatMessage: "chat message",
}

type FlagItem = ServerFnReturn<typeof flagsDomain.list.fn>[number]

function FlagsPanel() {
  const qc = useQueryClient()
  const flagsKey = flagsDomain.list.queryOptions().queryKey

  const { data: flags } = useSuspenseQuery(flagsDomain.list.queryOptions())

  const resolveFlag = useMutation({
    mutationFn: flagsDomain.resolve.fn,
    onMutate: async ({ data: { flagId } }) => {
      await qc.cancelQueries({ queryKey: flagsKey })
      const prev = qc.getQueryData(flagsKey)
      qc.setQueryData(flagsKey, (old: typeof prev) =>
        old?.filter((item) => item.id !== flagId),
      )
      return { prev }
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.data.resolution === "dismissed"
          ? "flag dismissed"
          : "content removed",
      )
    },
    onError: (error, _, context) => {
      if (context?.prev) qc.setQueryData(flagsKey, context.prev)
      toast.error(error.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: flagsKey })
    },
  })

  if (flags.length === 0) return <EmptyState />

  return (
    <div className="space-y-4">
      {flags.map((flag) => (
        <FlagCard
          key={flag.id}
          flag={flag}
          onResolve={(resolution) =>
            resolveFlag.mutate({
              data: { flagId: flag.id, resolution },
            })
          }
          isPending={resolveFlag.isPending}
        />
      ))}
    </div>
  )
}

function FlagCard({
  flag,
  onResolve,
  isPending,
}: {
  flag: FlagItem
  onResolve: (resolution: "dismissed" | "removed") => void
  isPending: boolean
}) {
  return (
    <Card className="rounded-md py-3">
      <CardContent className="space-y-2 px-4">
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className="text-xs">
            {ENTITY_TYPE_LABELS[flag.entityType]}
          </Badge>
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
            <Link
              to="/users/$userId"
              params={{ userId: flag.user.id }}
              className="hover:text-foreground transition-colors"
            >
              {flag.user.name}
            </Link>
            <span>•</span>
            <RelativeTimeCard date={flag.createdAt} variant="muted" />
          </p>
        </div>
        <RichText
          content={flag.reason}
          className="text-muted-foreground text-xs italic"
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onResolve("removed")}
            disabled={isPending}
          >
            remove
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onResolve("dismissed")}
            disabled={isPending}
          >
            dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== Shared Components ====================

function SubmitterBadge({
  userId,
  name,
  createdAt,
}: {
  userId: number
  name: string
  createdAt: Date
}) {
  return (
    <div className="flex shrink-0 items-center gap-1.5 text-xs">
      <Link
        to="/users/$userId"
        params={{ userId }}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {name}
      </Link>
      <span className="text-muted-foreground">&middot;</span>
      <span className="text-muted-foreground">
        <RelativeTimeCard date={createdAt} variant="muted" />
      </span>
    </div>
  )
}

function ReviewButtons({
  onApprove,
  onReject,
  isPending,
}: {
  onApprove: (notes: string) => void
  onReject: (notes: string) => void
  isPending: boolean
}) {
  const [notes, setNotes] = useState("")
  const trimmed = notes.trim()

  return (
    <div className="space-y-2 pt-1">
      <Textarea
        placeholder="review notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
      />
      <div className="flex justify-end gap-2">
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onReject(trimmed)}
          disabled={isPending || !trimmed}
        >
          reject
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onApprove(trimmed)}
          disabled={isPending || !trimmed}
        >
          approve
        </Button>
      </div>
    </div>
  )
}
