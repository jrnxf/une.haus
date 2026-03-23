import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { toast } from "sonner"

import { confirm } from "~/components/confirm-dialog"
import { PageHeader } from "~/components/page-header"
import { RichText } from "~/components/rich-text"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Card, CardContent } from "~/components/ui/card"
import { CodeViewer } from "~/components/ui/code-viewer"
import { CountChip } from "~/components/ui/count-chip"
import { DiffViewer } from "~/components/ui/diff-viewer"
import { Metaline } from "~/components/ui/metaline"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
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

export const Route = createFileRoute("/_authed/admin/")({
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
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>admin</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 md:p-6">
        <div className="flex items-center justify-end">
          <Button variant="secondary" size="sm" asChild>
            <Link to="/admin/sandbox">sandbox</Link>
          </Button>
        </div>
        <Accordion multiple>
          <div className="space-y-2">
            <AccordionItem value="tricks" className="bg-card rounded-lg border">
              <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                <TricksLabel />
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0.5">
                <Accordion multiple>
                  <div className="space-y-2">
                    <AccordionItem
                      value="submissions"
                      className="bg-card rounded-lg border"
                    >
                      <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                        <SubmissionsLabel />
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0.5">
                        <SubmissionsSection />
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="suggestions"
                      className="bg-card rounded-lg border"
                    >
                      <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                        <SuggestionsLabel />
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0.5">
                        <SuggestionsSection />
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="videos"
                      className="bg-card rounded-lg border"
                    >
                      <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                        <VideosLabel />
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0.5">
                        <VideosSection />
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem
                      value="glossary"
                      className="bg-card rounded-lg border"
                    >
                      <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                        <GlossaryLabel />
                      </AccordionTrigger>
                      <AccordionContent className="p-4 pt-0.5">
                        <GlossarySection />
                      </AccordionContent>
                    </AccordionItem>
                  </div>
                </Accordion>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="vault" className="bg-card rounded-lg border">
              <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                <VaultLabel />
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0.5">
                <VaultSection />
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="flags" className="bg-card rounded-lg border">
              <AccordionTrigger className="items-center rounded-lg border-0 px-4 py-3 hover:no-underline">
                <FlagsLabel />
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0.5">
                <FlagsSection />
              </AccordionContent>
            </AccordionItem>
          </div>
        </Accordion>

        {__COMMIT_SHA__ && __COMMIT_SHA__ !== "unknown" && (
          <p className="text-muted-foreground mt-6 text-xs tabular-nums">
            <a
              href={`https://github.com/jrnxf/une.haus/commit/${__COMMIT_SHA__}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              {__COMMIT_SHA__}
            </a>
          </p>
        )}
      </div>
    </>
  )
}

// ==================== Accordion Labels ====================

function TricksLabel() {
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
    <span className="flex items-center gap-2">
      tricks
      {count > 0 && <CountChip>{count}</CountChip>}
    </span>
  )
}

function SubmissionsLabel() {
  const { data } = useSuspenseQuery(
    tricks.submissions.list.queryOptions({ status: "pending" }),
  )
  return (
    <span className="flex items-center gap-2">
      submissions
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </span>
  )
}

function SuggestionsLabel() {
  const { data } = useSuspenseQuery(
    tricks.suggestions.list.queryOptions({ status: "pending" }),
  )
  return (
    <span className="flex items-center gap-2">
      suggestions
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </span>
  )
}

function VideosLabel() {
  const { data } = useSuspenseQuery(tricks.videos.listPending.queryOptions())
  return (
    <span className="flex items-center gap-2">
      videos
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </span>
  )
}

function GlossaryLabel() {
  const { data } = useSuspenseQuery(
    tricks.glossary.proposals.list.queryOptions({ status: "pending" }),
  )
  return (
    <span className="flex items-center gap-2">
      glossary
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </span>
  )
}

function VaultLabel() {
  const { data } = useSuspenseQuery(
    utv.suggestions.list.queryOptions({ status: "pending" }),
  )
  return (
    <span className="flex items-center gap-2">
      vault
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </span>
  )
}

function FlagsLabel() {
  const { data } = useSuspenseQuery(flagsDomain.list.queryOptions())
  return (
    <span className="flex items-center gap-2">
      flags
      {data.length > 0 && <CountChip>{data.length}</CountChip>}
    </span>
  )
}

// ==================== Layout ====================

function SectionEmpty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>
}

// ==================== Tricks: Submissions ====================

function SubmissionsSection() {
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

  if (submissions.length === 0) {
    return <SectionEmpty>no pending submissions</SectionEmpty>
  }

  return (
    <div className="space-y-2">
      {submissions.map((s) => {
        const proposed = {
          name: s.name,
          alternateNames: s.alternateNames ?? [],
          description: s.description ?? null,
          inventedBy: s.inventedBy ?? null,
          yearLanded: s.yearLanded ?? null,
          notes: s.notes ?? null,
          videoUrl: s.videoUrl ?? null,
          videoTimestamp: s.videoTimestamp ?? null,
          elements: s.elementAssignments.map((a) => a.element.name),
          relationships: s.relationships.map((r) => ({
            targetId: r.targetTrick.id,
            type: r.type,
          })),
        }

        return (
          <Card key={s.id} className="rounded-md py-3">
            <CardContent className="space-y-4 px-4">
              <SubmitterBadge
                userId={s.submittedBy.id}
                name={s.submittedBy.name}
                createdAt={s.createdAt}
              />

              <CodeViewer value={JSON.stringify(proposed, null, 2)} />

              <ReviewActions
                onApprove={() =>
                  review.mutate({
                    data: { id: s.id, status: "approved", reviewNotes: "" },
                  })
                }
                onReject={() =>
                  confirm.open({
                    title: "reject submission?",
                    description:
                      "this will reject the submission. this action cannot be undone.",
                    confirmText: "reject",
                    variant: "destructive",
                    onConfirm: () =>
                      review.mutate({
                        data: { id: s.id, status: "rejected", reviewNotes: "" },
                      }),
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

// ==================== Tricks: Suggestions ====================

function SuggestionsSection() {
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

  if (suggestions.length === 0) {
    return <SectionEmpty>no pending suggestions</SectionEmpty>
  }

  return (
    <div className="space-y-2">
      {suggestions.map((s) => {
        const diff = s.diff as TrickSuggestionDiff

        const currentRelationships = (s.trick.outgoingRelationships ?? []).map(
          (r) => ({
            targetId: r.targetTrick.id,
            type: r.type,
          }),
        )
        const proposedRelationships = diff.relationships
          ? [
              ...currentRelationships.filter(
                (r) =>
                  !diff.relationships!.removed.some(
                    (rem) => rem.targetId === r.targetId && rem.type === r.type,
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
            (a) => a.element.name,
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
              <div className="flex w-full items-center justify-between gap-2">
                <Link
                  to="/tricks/$trickId"
                  params={{ trickId: String(s.trick.id) }}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {s.trick.name}
                </Link>
                <SubmitterBadge
                  userId={s.submittedBy.id}
                  name={s.submittedBy.name}
                  createdAt={s.createdAt}
                />
              </div>

              <DiffViewer original={original} modified={modified} />

              {s.reason && (
                <p className="text-muted-foreground text-xs text-pretty italic">
                  &quot;{s.reason}&quot;
                </p>
              )}

              <ReviewActions
                onApprove={() =>
                  review.mutate({
                    data: { id: s.id, status: "approved", reviewNotes: "" },
                  })
                }
                onReject={() =>
                  confirm.open({
                    title: "reject suggestion?",
                    description:
                      "this will reject the suggestion. this action cannot be undone.",
                    confirmText: "reject",
                    variant: "destructive",
                    onConfirm: () =>
                      review.mutate({
                        data: { id: s.id, status: "rejected", reviewNotes: "" },
                      }),
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

// ==================== Tricks: Videos ====================

function VideosSection() {
  const { data: videos } = useSuspenseQuery(
    tricks.videos.listPending.queryOptions(),
  )

  if (videos.length === 0) {
    return <SectionEmpty>no pending videos</SectionEmpty>
  }

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
      <CardContent className="space-y-4 px-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-medium">{video.trick.name}</p>
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
          <p className="text-muted-foreground text-sm text-pretty">
            {video.notes}
          </p>
        )}
        <ReviewActions
          onApprove={() =>
            review.mutate({
              data: { id: video.id, status: "active", reviewNotes: "" },
            })
          }
          onReject={() =>
            confirm.open({
              title: "reject video?",
              description:
                "this will reject the video. this action cannot be undone.",
              confirmText: "reject",
              variant: "destructive",
              onConfirm: () =>
                review.mutate({
                  data: { id: video.id, status: "rejected", reviewNotes: "" },
                }),
            })
          }
          isPending={review.isPending}
        />
      </CardContent>
    </Card>
  )
}

// ==================== Tricks: Glossary ====================

function GlossarySection() {
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

  if (proposals.length === 0) {
    return <SectionEmpty>no pending proposals</SectionEmpty>
  }

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
            <CardContent className="space-y-4 px-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {p.type}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {p.action}
                  </Badge>
                  <p className="truncate text-sm font-medium">{p.name}</p>
                </div>
                <SubmitterBadge
                  userId={p.submittedBy.id}
                  name={p.submittedBy.name}
                  createdAt={p.createdAt}
                />
              </div>

              {p.action === "create" && p.description && (
                <p className="text-sm text-pretty">{p.description}</p>
              )}

              {diffViewer}

              {p.reason && (
                <p className="text-muted-foreground text-xs text-pretty italic">
                  &quot;{p.reason}&quot;
                </p>
              )}

              <ReviewActions
                onApprove={() =>
                  review.mutate({
                    data: { id: p.id, status: "approved", reviewNotes: "" },
                  })
                }
                onReject={() =>
                  confirm.open({
                    title: "reject proposal?",
                    description:
                      "this will reject the glossary proposal. this action cannot be undone.",
                    confirmText: "reject",
                    variant: "destructive",
                    onConfirm: () =>
                      review.mutate({
                        data: { id: p.id, status: "rejected", reviewNotes: "" },
                      }),
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

// ==================== Vault ====================

function VaultSection() {
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

  if (suggestions.length === 0) {
    return <SectionEmpty>no pending suggestions</SectionEmpty>
  }

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
            <CardContent className="space-y-4 px-4">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-medium">
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
                <p className="text-muted-foreground text-xs text-pretty italic">
                  &quot;{s.reason}&quot;
                </p>
              )}

              <ReviewActions
                onApprove={() =>
                  review.mutate({
                    data: { id: s.id, status: "approved", reviewNotes: "" },
                  })
                }
                onReject={() =>
                  confirm.open({
                    title: "reject suggestion?",
                    description:
                      "this will reject the vault suggestion. this action cannot be undone.",
                    confirmText: "reject",
                    variant: "destructive",
                    onConfirm: () =>
                      review.mutate({
                        data: { id: s.id, status: "rejected", reviewNotes: "" },
                      }),
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

// ==================== Flags ====================

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

function FlagsSection() {
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

  if (flags.length === 0) {
    return <SectionEmpty>no pending flags</SectionEmpty>
  }

  return (
    <div className="space-y-2">
      {flags.map((flag) => (
        <FlagCard
          key={flag.id}
          flag={flag}
          onDismiss={() =>
            resolveFlag.mutate({
              data: { flagId: flag.id, resolution: "dismissed" },
            })
          }
          onRemove={() =>
            confirm.open({
              title: "remove content?",
              description:
                "this will remove the flagged content. this action cannot be undone.",
              confirmText: "remove",
              variant: "destructive",
              onConfirm: () =>
                resolveFlag.mutate({
                  data: { flagId: flag.id, resolution: "removed" },
                }),
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
  onDismiss,
  onRemove,
  isPending,
}: {
  flag: FlagItem
  onDismiss: () => void
  onRemove: () => void
  isPending: boolean
}) {
  return (
    <Card className="rounded-md py-3">
      <CardContent className="space-y-4 px-4">
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
            <span>·</span>
            <RelativeTimeCard date={flag.createdAt} variant="muted" />
          </p>
        </div>
        <RichText
          content={flag.reason}
          className="text-muted-foreground text-xs italic"
        />
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={onRemove}
            disabled={isPending}
          >
            remove
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            disabled={isPending}
          >
            dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== Shared ====================

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
    <Metaline
      className="shrink-0 text-xs"
      parts={[
        <Link
          key="name"
          to="/users/$userId"
          params={{ userId }}
          className="hover:text-foreground transition-colors"
        >
          {name}
        </Link>,
        <RelativeTimeCard key="time" date={createdAt} variant="muted" />,
      ]}
    />
  )
}

function ReviewActions({
  onApprove,
  onReject,
  isPending,
}: {
  onApprove: () => void
  onReject: () => void
  isPending: boolean
}) {
  return (
    <div className="flex justify-end gap-2">
      <Button
        size="sm"
        variant="destructive"
        onClick={onReject}
        disabled={isPending}
      >
        reject
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={onApprove}
        disabled={isPending}
      >
        approve
      </Button>
    </div>
  )
}
