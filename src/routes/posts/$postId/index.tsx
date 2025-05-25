import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { posts } from "~/lib/posts";
import { setFlash } from "~/server/fns/session/flash/set";

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
    try {
      return await context.queryClient.ensureQueryData(
        posts.get.queryOptions({ postId }),
      );
    } catch {
      await setFlash({ data: "Post not found" });
      throw redirect({ to: "/posts" });
    }
  },
});

function RouteComponent() {
  const { postId } = Route.useParams();
  const { data: post } = useSuspenseQuery(posts.get.queryOptions({ postId }));

  return (
    <div className="flex grow flex-col">
      <div
        className="mx-auto flex min-h-0 w-full max-w-xl grow flex-col gap-4 px-4 py-6"
        id="main-content"
      >
        <PostView
          initialData={{
            messages: [],
            post,
          }}
          postId={postId}
        />
      </div>
    </div>
  );
}
