import { Link } from "@tanstack/react-router";

import { Button } from "~/components/ui/button";
import { VideoPlayer } from "~/components/video-player";
import { WrappedBadges } from "~/components/wrapped-badges";
import { YoutubeIframe } from "~/components/youtube-iframe";
import { type PostsGetData } from "~/lib/posts";
import { useSessionUser } from "~/lib/session";

export function PostView({
  initialData,
  postId,
}: {
  initialData: {
    messages: [];
    post: PostsGetData;
  };
  postId: number;
}) {
  const sessionUser = useSessionUser();

  const post = initialData.post;
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
            className="h-full w-48 rounded-md object-cover"
            src={post.imageUrl}
          />
        )}
        <p>{post.content}</p>
      </div>

      {post.youtubeVideoId && <YoutubeIframe videoId={post.youtubeVideoId} />}

      {post.video && post.video.playbackId && (
        <VideoPlayer playbackId={post.video.playbackId} />
      )}

      <WrappedBadges content={post.tags} />
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

      {/* <div className="shrink-0">
        <MessagesView
          record={{ recordId: post.id, type: "post" }}
          messages={messages}
          onMessageCreated={(message) => {
            createPostMessage.mutate({
              content: message,
              recordId: post.id,
              type: "post",
            });
          }}
        />
      </div> */}
    </div>
  );
}
