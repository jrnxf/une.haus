import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"

import {
  ReviewCard,
  ReviewFields,
  ReviewReason,
} from "~/components/admin/review-card"
import { confirm } from "~/components/confirm-dialog-handle"
import { RichText } from "~/components/rich-text"
import { Button } from "~/components/ui/button"
import { CodeViewer } from "~/components/ui/code-viewer"
import { DiffViewer } from "~/components/ui/diff-viewer"
import { VideoPlayer } from "~/components/video-player"
import { type FlagEntityType } from "~/db/schema"
import { useQueueMutation } from "~/lib/admin/hooks"
import {
  glossaryEditReview,
  submissionReview,
  trickSuggestionReview,
  vaultSuggestionReview,
} from "~/lib/admin/review"
import { flagsDomain } from "~/lib/flags"
import { type PendingVideosData, tricks } from "~/lib/tricks"
import { MULTIPLE_TRICKS_REJECTION } from "~/lib/tricks/videos/schemas"
import { type ServerFnReturn } from "~/lib/types"
import { utv } from "~/lib/utv/core"

type Submission = ServerFnReturn<typeof tricks.submissions.list.fn>[number]
type Suggestion = ServerFnReturn<typeof tricks.suggestions.list.fn>[number]
type Proposal = ServerFnReturn<typeof tricks.glossary.proposals.list.fn>[number]
type VaultSuggestion = ServerFnReturn<typeof utv.suggestions.list.fn>[number]
type Flag = ServerFnReturn<typeof flagsDomain.list.fn>[number]

// ==================== Tricks: submission ====================

export function SubmissionCard({ submission: s }: { submission: Submission }) {
  const qc = useQueryClient()
  const review = useQueueMutation({
    queryKey: tricks.submissions.list.queryOptions({ status: "pending" })
      .queryKey,
    mutationFn: tricks.submissions.review.fn,
    itemId: ({ data }) => data.id,
    onSuccess: ({ data }) => {
      qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey })
      toast.success(
        data.status === "approved"
          ? "submission approved"
          : "submission rejected",
      )
    },
  })
  const { fields, raw } = submissionReview(s)

  return (
    <ReviewCard
      kind="submission"
      title={s.name}
      submitter={s.submittedBy}
      createdAt={s.createdAt}
      raw={<CodeViewer value={raw} />}
      decision={{
        noun: "submission",
        rejectDescription:
          "this will reject the submission. this action cannot be undone.",
        isPending: review.isPending,
        onApprove: (reviewNotes) =>
          review.mutate({
            data: { id: s.id, status: "approved", reviewNotes },
          }),
        onReject: (reviewNotes) =>
          review.mutate({
            data: { id: s.id, status: "rejected", reviewNotes },
          }),
      }}
    >
      <ReviewFields fields={fields} />
    </ReviewCard>
  )
}

// ==================== Tricks: suggestion ====================

export function SuggestionCard({ suggestion: s }: { suggestion: Suggestion }) {
  const qc = useQueryClient()
  const review = useQueueMutation({
    queryKey: tricks.suggestions.list.queryOptions({ status: "pending" })
      .queryKey,
    mutationFn: tricks.suggestions.review.fn,
    itemId: ({ data }) => data.id,
    onSuccess: ({ data }) => {
      qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey })
      toast.success(
        data.status === "approved"
          ? "suggestion approved"
          : "suggestion rejected",
      )
    },
  })
  const { fields, raw } = trickSuggestionReview(
    s.trick,
    s.diff,
    s.addedRelationshipTargets,
  )

  return (
    <ReviewCard
      kind="suggestion"
      title={
        <Link
          to="/tricks/$trickId"
          params={{ trickId: String(s.trick.id) }}
          className="hover:underline"
        >
          {s.trick.name}
        </Link>
      }
      submitter={s.submittedBy}
      createdAt={s.createdAt}
      raw={<DiffViewer original={raw.original} modified={raw.modified} />}
      decision={{
        noun: "suggestion",
        rejectDescription:
          "this will reject the suggestion. this action cannot be undone.",
        isPending: review.isPending,
        onApprove: (reviewNotes) =>
          review.mutate({
            data: { id: s.id, status: "approved", reviewNotes },
          }),
        onReject: (reviewNotes) =>
          review.mutate({
            data: { id: s.id, status: "rejected", reviewNotes },
          }),
      }}
    >
      <ReviewFields fields={fields} />
      {s.reason && <ReviewReason>{s.reason}</ReviewReason>}
    </ReviewCard>
  )
}

// ==================== Tricks: video ====================

export function VideoCard({ video }: { video: PendingVideosData[number] }) {
  const qc = useQueryClient()
  const review = useQueueMutation({
    queryKey: tricks.videos.listPending.queryOptions().queryKey,
    mutationFn: tricks.videos.review.fn,
    itemId: ({ data }) => data.id,
    onSuccess: ({ data }) => {
      qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey })
      qc.removeQueries({
        queryKey: tricks.videos.list.queryOptions({ trickId: video.trick.id })
          .queryKey,
      })
      qc.removeQueries({
        queryKey: tricks.videos.list.queryOptions({
          trickId: video.trick.id,
          status: "active",
        }).queryKey,
      })
      toast.success(
        data.status === "active" ? "video approved" : "video rejected",
      )
    },
  })

  return (
    <ReviewCard
      kind="video"
      title={
        <Link
          to="/admin/tricks/$trickId/videos"
          params={{ trickId: String(video.trick.id) }}
          className="hover:underline"
        >
          {video.trick.name}
        </Link>
      }
      submitter={video.submittedBy}
      createdAt={video.createdAt}
      decision={{
        noun: "video",
        rejectDescription:
          "this will reject the video and revoke the rider's landing. this action cannot be undone.",
        quickNote: {
          label: "contains multiple tricks",
          text: MULTIPLE_TRICKS_REJECTION,
        },
        isPending: review.isPending,
        onApprove: (reviewNotes) =>
          review.mutate({
            data: { id: video.id, status: "active", reviewNotes },
          }),
        onReject: (reviewNotes) =>
          review.mutate({
            data: { id: video.id, status: "rejected", reviewNotes },
          }),
      }}
    >
      {video.video?.playbackId && (
        <VideoPlayer playbackId={video.video.playbackId} />
      )}
      {video.notes && (
        <p className="text-muted-foreground text-sm text-pretty">
          {video.notes}
        </p>
      )}
    </ReviewCard>
  )
}

// ==================== Tricks: glossary ====================

export function GlossaryCard({ proposal: p }: { proposal: Proposal }) {
  const qc = useQueryClient()
  const { data: elements } = useSuspenseQuery(
    tricks.elements.list.queryOptions(),
  )
  const { data: modifiers } = useSuspenseQuery(
    tricks.modifiers.list.queryOptions(),
  )

  const review = useQueueMutation({
    queryKey: tricks.glossary.proposals.list.queryOptions({
      status: "pending",
    }).queryKey,
    mutationFn: tricks.glossary.proposals.review.fn,
    itemId: ({ data }) => data.id,
    onSuccess: ({ data }) => {
      qc.removeQueries({
        queryKey: tricks.elements.list.queryOptions().queryKey,
      })
      qc.removeQueries({
        queryKey: tricks.modifiers.list.queryOptions().queryKey,
      })
      toast.success(
        data.status === "approved" ? "proposal approved" : "proposal rejected",
      )
    },
  })

  const edit =
    p.action === "edit" && p.diff && p.targetId
      ? glossaryEditReview(
          (p.type === "element" ? elements : modifiers).find(
            (item) => item.id === p.targetId,
          ),
          p.diff,
        )
      : null

  return (
    <ReviewCard
      kind="glossary"
      badge={`${p.action} ${p.type}`}
      title={p.name}
      submitter={p.submittedBy}
      createdAt={p.createdAt}
      raw={
        edit && (
          <DiffViewer
            original={edit.raw.original}
            modified={edit.raw.modified}
          />
        )
      }
      decision={{
        noun: "proposal",
        rejectDescription:
          "this will reject the glossary proposal. this action cannot be undone.",
        isPending: review.isPending,
        onApprove: (reviewNotes) =>
          review.mutate({
            data: { id: p.id, status: "approved", reviewNotes },
          }),
        onReject: (reviewNotes) =>
          review.mutate({
            data: { id: p.id, status: "rejected", reviewNotes },
          }),
      }}
    >
      {p.action === "create" && p.description && (
        <p className="text-sm text-pretty">{p.description}</p>
      )}
      {edit && <ReviewFields fields={edit.fields} />}
      {p.reason && <ReviewReason>{p.reason}</ReviewReason>}
    </ReviewCard>
  )
}

// ==================== Vault ====================

export function VaultCard({ suggestion: s }: { suggestion: VaultSuggestion }) {
  const review = useQueueMutation({
    queryKey: utv.suggestions.list.queryOptions({ status: "pending" }).queryKey,
    mutationFn: utv.suggestions.review.fn,
    itemId: ({ data }) => data.id,
    onSuccess: ({ data }) => {
      toast.success(
        data.status === "approved"
          ? "suggestion approved"
          : "suggestion rejected",
      )
    },
  })
  const { fields, raw } = vaultSuggestionReview(s.utvVideo, s.diff)

  return (
    <ReviewCard
      kind="vault"
      title={s.utvVideo.title || s.utvVideo.legacyTitle}
      submitter={s.submittedBy}
      createdAt={s.createdAt}
      raw={<DiffViewer original={raw.original} modified={raw.modified} />}
      decision={{
        noun: "suggestion",
        rejectDescription:
          "this will reject the vault suggestion. this action cannot be undone.",
        isPending: review.isPending,
        onApprove: (reviewNotes) =>
          review.mutate({
            data: { id: s.id, status: "approved", reviewNotes },
          }),
        onReject: (reviewNotes) =>
          review.mutate({
            data: { id: s.id, status: "rejected", reviewNotes },
          }),
      }}
    >
      <ReviewFields fields={fields} />
      {s.reason && <ReviewReason>{s.reason}</ReviewReason>}
    </ReviewCard>
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

export function FlagCard({ flag }: { flag: Flag }) {
  const resolve = useQueueMutation({
    queryKey: flagsDomain.list.queryOptions().queryKey,
    mutationFn: flagsDomain.resolve.fn,
    itemId: ({ data }) => data.flagId,
    onSuccess: ({ data }) => {
      toast.success(
        data.resolution === "dismissed" ? "flag dismissed" : "content removed",
      )
    },
  })

  return (
    <ReviewCard
      kind="flag"
      title={ENTITY_TYPE_LABELS[flag.entityType]}
      submitter={flag.user}
      createdAt={flag.createdAt}
      actions={
        <>
          <Button
            variant="destructive-ghost"
            onClick={() =>
              confirm.open({
                title: "remove content?",
                description:
                  "this will remove the flagged content. this action cannot be undone.",
                confirmText: "remove",
                variant: "destructive",
                onConfirm: () =>
                  resolve.mutate({
                    data: { flagId: flag.id, resolution: "removed" },
                  }),
              })
            }
            disabled={resolve.isPending}
          >
            remove
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              resolve.mutate({
                data: { flagId: flag.id, resolution: "dismissed" },
              })
            }
            disabled={resolve.isPending}
          >
            dismiss
          </Button>
        </>
      }
    >
      <RichText
        content={flag.reason}
        className="text-muted-foreground text-xs italic"
      />
    </ReviewCard>
  )
}
