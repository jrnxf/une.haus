import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { useTRPC } from "~/integrations/trpc/react";
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
    // try {
    const post = await context.queryClient.ensureQueryData(
      context.trpc.post.get.queryOptions({ id: postId }),
    );

    if (!post) {
      await setFlash({ data: "Post not found" });
      throw redirect({ to: "/posts" });
    }

    return post;
    // } catch {
    //   await setFlash.serverFn({ data: "Post not found" });
    //   throw redirect({ to: "/posts" });
    // }
  },
});

function RouteComponent() {
  const { postId } = Route.useParams();
  const trpc = useTRPC();
  const { data: post } = useSuspenseQuery(
    trpc.post.get.queryOptions({ id: postId }),
  );

  const { data: session } = useSuspenseQuery(trpc.session.get.queryOptions());

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
