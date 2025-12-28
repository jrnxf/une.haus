import { useSuspenseQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useLikeUnlikeRecord } from "~/lib/reactions/hooks";
import {
  HeartIcon,
  PencilIcon,
  Share2Icon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react";

import { Badges } from "~/components/badges";
import { confirm } from "~/components/confirm-dialog";
import { UsersDialog } from "~/components/likes-dialog";
import { Button } from "~/components/ui/button";
import { VideoPlayer } from "~/components/video-player";
import { YoutubeIframe } from "~/components/youtube-iframe";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { posts } from "~/lib/posts";
import { useDeletePost } from "~/lib/posts/hooks";
import { useSessionUser } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";
import { MessagesView } from "~/views/messages";

export function PostView({ postId }: { postId: number }) {
  const [{ data: post }, { data: messagesData }] = useSuspenseQueries({
    queries: [
      posts.get.queryOptions({ postId }),
      messages.list.queryOptions({
        id: postId,
        type: "post",
      }),
    ],
  });

  invariant(post, "Post not found");

  const sessionUser = useSessionUser();

  const { mutate: createMessage } = useCreateMessage({
    id: postId,
    type: "post",
  });

  const authUserLiked = Boolean(
    sessionUser && post.likes.some((like) => like.userId === sessionUser.id),
  );

  const { mutate: likeUnlikePost } = useLikeUnlikeRecord({
    authUserLiked,
    record: { id: postId, type: "post" },
    optimisticUpdateQueryKey: posts.get.queryOptions({ postId }).queryKey,
    refetchQueryKey: posts.list.infiniteQueryOptions({}).queryKey,
  });

  const { mutate: deletePost } = useDeletePost();

  const isOwner = post.userId === sessionUser?.id;

  return (
    <div className="mx-auto flex h-auto w-full max-w-4xl flex-col justify-start gap-6 p-4">
      <div className="flex items-center gap-3">
        <div className="w-full space-y-1">
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight">
              {post.title}
            </div>
            {/* <PostOptions post={post} /> */}
          </div>

          <div className="text-muted-foreground text-sm">{post.user.name}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon-sm" variant="outline" onClick={likeUnlikePost}>
            <HeartIcon
              className={cn(
                "size-4",
                authUserLiked && "fill-red-700/50 stroke-red-700",
              )}
            />
          </Button>
          <UsersDialog
            users={post.likes.map((like) => like.user)}
            title={`${post.likes.length} ${post.likes.length === 1 ? "Like" : "Likes"}`}
            trigger={
              <Button size="icon-sm" variant="outline">
                <TrendingUpIcon className="size-4" />
              </Button>
            }
          />
          <Button size="icon-sm" variant="outline">
            <Share2Icon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="wrap-break-word whitespace-pre-wrap">
        {post.imageId && (
          <img
            alt=""
            fetchPriority="high"
            loading="eager"
            className="max-h-96 max-w-96 rounded-md object-cover"
            src={`https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/${post.imageId}/width=1152,quality=70`}
          />
        )}
        <p>{post.content}</p>
      </div>

      {isOwner && (
        <div className="flex items-center gap-1">
          <Button asChild size="icon-sm" variant="outline">
            <Link params={{ postId }} to="/posts/$postId/edit">
              <PencilIcon className="size-4" />
            </Link>
          </Button>
          <Button
            onClick={() =>
              confirm.open({
                title: "Delete Post",
                description:
                  "Are you sure you want to delete this post? This action cannot be undone.",
                confirmText: "Delete",
                onConfirm: () => {
                  deletePost({
                    data: post.id,
                  });
                },
              })
            }
            size="icon-sm"
            variant="outline"
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      )}

      {post.youtubeVideoId && <YoutubeIframe videoId={post.youtubeVideoId} />}

      {post.video && post.video.playbackId && (
        <VideoPlayer playbackId={post.video.playbackId} />
      )}

      <Badges content={post.tags} />

      <div className="shrink-0">
        <MessagesView
          record={{ id: postId, type: "post" }}
          messages={messagesData.messages}
          handleCreateMessage={createMessage}
        />
      </div>
    </div>
  );
}
