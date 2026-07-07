import { useSuspenseQueries } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { Badges } from "~/components/badges"
import { LikesButtonGroup } from "~/components/likes-button-group"
import { RichText } from "~/components/rich-text"
import { RelativeTimeCard } from "~/components/ui/relative-time-card"
import { SectionDivider } from "~/components/ui/section-divider"
import { UserOnlineStatus } from "~/components/user-online-status"
import { VideoPlayer } from "~/components/video-player"
import { YoutubeIframe } from "~/components/youtube-iframe"
import { invariant } from "~/lib/invariant"
import { messages } from "~/lib/messages"
import { useCreateMessage } from "~/lib/messages/hooks"
import { posts } from "~/lib/posts"
import { useDeletePost } from "~/lib/posts/hooks"
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks"
import { useSessionUser } from "~/lib/session/hooks"
import { getCloudflareImageUrl } from "~/lib/utils"
import { DetailActionsMenu } from "~/views/detail-actions-menu"
import { DetailHeader } from "~/views/detail-header"
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
    refetchQueryKey: posts.list.infiniteQueryOptions({}).queryKey,
  })

  const { mutate: deletePost } = useDeletePost()

  const isOwner = post.userId === sessionUser?.id

  return (
    <div className="mx-auto flex h-auto w-full max-w-3xl flex-col justify-start gap-6 p-4">
      <DetailHeader>
        <DetailHeader.Title
          meta={[
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
        >
          {post.title}
        </DetailHeader.Title>
        <DetailHeader.Actions>
          <LikesButtonGroup
            users={post.likes.map((like) => like.user)}
            authUserLiked={authUserLiked}
            onLikeUnlike={sessionUser ? likeUnlikePost : undefined}
          />
          <DetailActionsMenu
            flag={
              sessionUser && !isOwner
                ? { entityType: "post", entityId: post.id }
                : undefined
            }
            edit={
              isOwner ? (
                <Link params={{ postId }} to="/posts/$postId/edit" />
              ) : undefined
            }
            onDelete={
              isOwner
                ? { noun: "post", run: () => deletePost({ data: post.id }) }
                : undefined
            }
          />
        </DetailHeader.Actions>
      </DetailHeader>

      <div className="overflow-hidden text-sm wrap-break-word whitespace-pre-wrap sm:text-base">
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
        <SectionDivider>
          {messagesData.messages.length}{" "}
          {messagesData.messages.length === 1 ? "message" : "messages"}
        </SectionDivider>
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
