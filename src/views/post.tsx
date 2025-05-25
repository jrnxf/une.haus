import { useSuspenseQueries } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Button } from "~/components/ui/button";
import { VideoPlayer } from "~/components/video-player";
import { Badges } from "~/components/badges";
import { YoutubeIframe } from "~/components/youtube-iframe";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { posts } from "~/lib/posts";
import { useSessionUser } from "~/lib/session/hooks";
import { MessagesView } from "~/views/messages";

export function PostView({ postId }: { postId: number }) {
  const [{ data: post }, { data: messagesData }] = useSuspenseQueries({
    queries: [
      posts.get.queryOptions({ postId }),
      messages.list.queryOptions({
        recordId: postId,
        type: "post",
      }),
    ],
  });

  const sessionUser = useSessionUser();

  const { mutate } = useCreateMessage({
    recordId: postId,
    type: "post",
  });

  if (!post) {
    return null;
  }

  const isOwner = post.userId === sessionUser?.id;

  return (
    <div className="mx-auto flex h-auto w-full max-w-4xl flex-col justify-start gap-6">
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
        {isOwner && (
          <Button asChild>
            <Link params={{ postId }} to={`/posts/$postId/edit`}>
              Edit
            </Link>
          </Button>
        )}
      </div>

      <div className="break-words whitespace-pre-wrap">
        {post.imageUrl && (
          <img
            alt=""
            className="max-h-96 max-w-48 rounded-md object-cover"
            src={post.imageUrl}
          />
        )}
        <p>{post.content}</p>
      </div>

      {post.youtubeVideoId && <YoutubeIframe videoId={post.youtubeVideoId} />}

      {post.video && post.video.playbackId && (
        <VideoPlayer playbackId={post.video.playbackId} />
      )}

      <Badges content={post.tags} />
      {post.userId === sessionUser?.id && (
        <div className="flex gap-2">
          <Button asChild>
            <Link params={{ postId }} to={`/posts/$postId/edit`}>
              Edit
            </Link>
          </Button>
          {/* 
          <Button
            disabled={deletePost.isPending}
            iconLeft={
              deletePost.isPending && (
                <Loader2Icon className="size-4 animate-spin" />
              )
            }
            onClick={() => {
              deletePost.mutate(post.id);
            }}
            variant="destructive"
          >
            {deletePost.isPending ? "Deleting" : "Delete"}
          </Button> */}
        </div>
      )}

      <div className="shrink-0">
        <MessagesView
          record={{ recordId: postId, type: "post" }}
          messages={messagesData}
          onMessageCreated={(message) => {
            mutate(message);
          }}
        />
      </div>
    </div>
  );
}
