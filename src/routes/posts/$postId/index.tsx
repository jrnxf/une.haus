import { createFileRoute, redirect } from "@tanstack/react-router";

import { z } from "zod";

import { flashMessage } from "~/lib/flash";
import { messages } from "~/lib/messages";
import { posts } from "~/lib/posts";
import { PostView } from "~/views/post";

const pathParametersSchema = z.object({
  postId: z.coerce.number(),
});

export const Route = createFileRoute("/posts/$postId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { postId }, preload }) => {
    const ensurePost = async () => {
      try {
        await context.queryClient.ensureQueryData(
          posts.get.queryOptions({ postId }),
        );

        await context.queryClient.ensureQueryData(
          messages.list.queryOptions({
            id: postId,
            type: "post",
          }),
        );
      } catch {
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await flashMessage("Post not found");
        }
        throw redirect({ to: "/posts" });
      }
    };

    const ensureMessages = async () => {
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({
          id: postId,
          type: "post",
        }),
      );
    };

    await Promise.all([ensurePost(), ensureMessages()]);
  },
});

function RouteComponent() {
  const { postId } = Route.useParams();

  return (
    <div className="h-full min-h-0 overflow-y-auto" id="main-content">
      <div className="mx-auto h-full w-full max-w-4xl">
        <PostView postId={postId} />
      </div>
    </div>
  );
}
