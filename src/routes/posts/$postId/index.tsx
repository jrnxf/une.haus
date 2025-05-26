import { createFileRoute, redirect } from "@tanstack/react-router";

import { z } from "zod";

import { messages } from "~/lib/messages";
import { posts } from "~/lib/posts";
import { session } from "~/lib/session/index";
import { PostView } from "~/views/post";

const pathParametersSchema = z.object({
  postId: z.coerce.number(),
});

export const Route = createFileRoute("/posts/$postId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { postId } }) => {
    const ensurePost = async () => {
      try {
        await context.queryClient.ensureQueryData(
          posts.get.queryOptions({ postId }),
        );

        await context.queryClient.ensureQueryData(
          messages.list.queryOptions({
            recordId: postId,
            type: "post",
          }),
        );
      } catch {
        await session.flash.set.fn({ data: { message: "Post not found" } });
        throw redirect({ to: "/posts" });
      }
    };

    const ensureMessages = async () => {
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({
          recordId: postId,
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
    <div className="flex grow flex-col">
      <div
        className="mx-auto flex min-h-0 w-full max-w-4xl grow flex-col gap-4 px-4 py-6"
        id="main-content"
      >
        <PostView postId={postId} />
      </div>
    </div>
  );
}
