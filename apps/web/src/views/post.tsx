import { useSuspenseQueries } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import {
  EllipsisVerticalIcon,
  FlagIcon,
  LinkIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badges } from "~/components/badges"
import { confirm } from "~/components/confirm-dialog"
import { FlagTray } from "~/components/flag-tray"
import { LikesButtonGroup } from "~/components/likes-button-group"
import { RichText } from "~/components/rich-text"
import { ShareButton } from "~/components/share-button"
import { Button } from "~/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu"
import { Metaline } from "~/components/ui/metaline"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { Separator } from "~/components/ui/separator"
import { UserOnlineStatus } from "~/components/user-online-status"
import { VideoPlayer } from "~/components/video-player"
import { YoutubeIframe } from "~/components/youtube-iframe"
import { useHaptics } from "~/lib/haptics"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { posts } from "~/lib/posts"
import { useDeletePost } from "~/lib/posts/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { useSessionUser } from "~/lib/session/hooks"
import { getCloudflareImageUrl } from "~/lib/utils"
import { MessagesView } from "~/views/messages"

function PostActions({
  postId,
  post,
  isOwner,
  sessionUser,
  deletePost,
}: {
  postId: number
  post: { id: number }
  isOwner: boolean
  sessionUser: { id: number } | null | undefined
  deletePost: (args: { data: number }) => void
}) {
  const haptics = useHaptics()
  const [flagOpen, setFlagOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="outline" aria-label="actions">
            <EllipsisVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(globalThis.location.href)
              haptics.success()
              toast.success("link copied")
            }}
          >
            <LinkIcon className="size-4" />
            share
          </DropdownMenuItem>
          {sessionUser && !isOwner && (
            <DropdownMenuItem onClick={() => setFlagOpen(true)}>
              <FlagIcon className="size-4" />
              flag
            </DropdownMenuItem>
          )}
          {isOwner && (
            <>
              <DropdownMenuItem asChild>
                <Link params={{ postId }} to="/posts/$postId/edit">
                  <PencilIcon className="size-4" />
                  edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  confirm.open({
                    title: "delete post",
                    description:
                      "are you sure you want to delete this post? this action cannot be undone.",
                    confirmText: "delete",
                    onConfirm: () => {
                      deletePost({ data: post.id })
                    },
                  })
                }
              >
                <TrashIcon className="size-4" />
                delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {sessionUser && !isOwner && (
        <FlagTray
          entityType="post"
          entityId={post.id}
          hideTrigger
          open={flagOpen}
          onOpenChange={setFlagOpen}
        />
      )}
    </>
  )
}

export function PostView({ postId }: { postId: number }) {
  const [{ data: post }, { data: messagesData }] = useSuspenseQueries({
    queries: [
      posts.get.queryOptions({ postId }),
      messages.list.queryOptions({
        id: postId,
        type: "post",
      }),
    ],
  })

  invariant(post, "Post not found")

  const sessionUser = useSessionUser()

  const { mutate: createMessage } = useCreateMessage({
    id: postId,
    type: "post",
  })

  const authUserLiked = Boolean(
    sessionUser && post.likes.some((like) => like.userId === sessionUser.id),
  )

  const { mutate: likeUnlikePost } = useLikeUnlikeRecord({
    authUserLiked,
    record: { id: postId, type: "post" },
    optimisticUpdateQueryKey: posts.get.queryOptions({ postId }).queryKey,
    refetchQueryKey: posts.list.infiniteQueryOptions({}).queryKey,
  })

  const { mutate: deletePost } = useDeletePost()

  const isOwner = post.userId === sessionUser?.id

  return (
    <div className="mx-auto flex h-auto w-full max-w-3xl flex-col justify-start gap-6 p-4">
      <div className="flex items-start gap-2">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl leading-none font-semibold tracking-tight">
            {post.title}
          </h1>
          <Metaline
            parts={[
              <Link
                key="author"
                to="/users/$userId"
                params={{ userId: post.user.id }}
                className="inline-flex items-center gap-1.5 hover:underline"
              >
                {post.user.name}
                <UserOnlineStatus userId={post.user.id} />
              </Link>,
              <RelativeTimeCard
                key="created-at"
                date={post.createdAt}
                variant="muted"
              />,
            ]}
          />
        </div>

        <div className="flex shrink-0 grow items-center justify-end gap-1">
          <LikesButtonGroup
            users={post.likes.map((like) => like.user)}
            authUserLiked={authUserLiked}
            onLikeUnlike={sessionUser ? likeUnlikePost : undefined}
          />
          {sessionUser ? (
            <PostActions
              postId={postId}
              post={post}
              isOwner={isOwner}
              sessionUser={sessionUser}
              deletePost={deletePost}
            />
          ) : (
            <ShareButton />
          )}
        </div>
      </div>

      <div className="overflow-hidden wrap-break-word whitespace-pre-wrap">
        {post.imageId && (
          <img
            alt=""
            fetchPriority="high"
            loading="eager"
            className="max-h-96 max-w-96 rounded-md object-cover"
            src={getCloudflareImageUrl(post.imageId, {
              width: 1152,
              quality: 70,
            })}
          />
        )}
        <RichText content={post.content} />
      </div>

      {post.youtubeVideoId && <YoutubeIframe videoId={post.youtubeVideoId} />}

      {post.video?.playbackId && (
        <VideoPlayer playbackId={post.video.playbackId} />
      )}

      <Badges content={post.tags} />

      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <Separator className="flex-1" />
          <span className="text-muted-foreground p-4 text-xs italic">
            {messagesData.messages.length}{" "}
            {messagesData.messages.length === 1 ? "message" : "messages"}
          </span>
          <Separator className="flex-1" />
        </div>
        <MessagesView
          record={{ id: postId, type: "post" }}
          messages={messagesData.messages}
          handleCreateMessage={createMessage}
          scrollTargetId="main-content"
        />
      </div>
    </div>
  )
}
