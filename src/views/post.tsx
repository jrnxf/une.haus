import { useSuspenseQueries } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { HeartIcon, PencilIcon, TrashIcon, TrendingUpIcon } from "lucide-react"
import pluralize from "pluralize"

import { Badges } from "~/components/badges"
import { confirm } from "~/components/confirm-dialog"
import { FlagTray } from "~/components/flag-tray"
import { UsersDialog } from "~/components/likes-dialog"
import { RichText } from "~/components/rich-text"
import { ShareButton } from "~/components/share-button"
import { Button } from "~/components/ui/button"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip"
import { VideoPlayer } from "~/components/video-player"
import { YoutubeIframe } from "~/components/youtube-iframe"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { posts } from "~/lib/posts"
import { useDeletePost } from "~/lib/posts/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { useSessionUser } from "~/lib/session/hooks"
import { cn, getCloudflareImageUrl } from "~/lib/utils"
import { MessagesView } from "~/views/messages"

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
    <div className="mx-auto flex h-auto w-full max-w-5xl flex-col justify-start gap-6 p-4">
      <div className="flex items-start gap-2">
        <div className="shrink-0 space-y-1">
          <h1 className="text-2xl leading-none font-semibold tracking-tight">
            {post.title}
          </h1>
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <Link
              to="/users/$userId"
              params={{ userId: post.user.id }}
              className="hover:underline"
            >
              {post.user.name}
            </Link>
            <span className="opacity-25">/</span>
            <RelativeTimeCard date={post.createdAt} variant="muted" />
          </p>
        </div>

        <div className="flex shrink-0 grow items-center justify-end gap-1">
          {sessionUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="outline"
                  onClick={likeUnlikePost}
                  aria-label={authUserLiked ? "unlike" : "like"}
                >
                  <HeartIcon
                    className={cn(
                      "size-4",
                      authUserLiked && "fill-red-700/50 stroke-red-700",
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {authUserLiked ? "unlike" : "like"}
              </TooltipContent>
            </Tooltip>
          )}
          {post.likes.length > 0 && (
            <UsersDialog
              users={post.likes.map((like) => like.user)}
              title={`${post.likes.length} ${pluralize("Like", post.likes.length)}`}
              trigger={
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon-sm"
                      variant="outline"
                      aria-label="view likes"
                    >
                      <TrendingUpIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>likes</TooltipContent>
                </Tooltip>
              }
            />
          )}
          <ShareButton />
          {sessionUser && !isOwner && (
            <FlagTray entityType="post" entityId={post.id} />
          )}
          {isOwner && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    asChild
                    size="icon-sm"
                    variant="outline"
                    aria-label="edit"
                  >
                    <Link params={{ postId }} to="/posts/$postId/edit">
                      <PencilIcon className="size-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>edit</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() =>
                      confirm.open({
                        title: "delete post",
                        description:
                          "are you sure you want to delete this post? this action cannot be undone.",
                        confirmText: "delete",
                        onConfirm: () => {
                          deletePost({
                            data: post.id,
                          })
                        },
                      })
                    }
                    size="icon-sm"
                    variant="outline"
                    aria-label="delete"
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>delete</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      <div className="wrap-break-word whitespace-pre-wrap">
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

      <Badges content={post.tags} clickable="tags" />

      <div className="shrink-0">
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
