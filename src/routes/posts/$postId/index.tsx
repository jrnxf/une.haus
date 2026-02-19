import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { z } from "zod";

import { PageHeader } from "~/components/page-header";
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
  const { data: post } = useSuspenseQuery(posts.get.queryOptions({ postId }));

  return (
    <>
      <PageHeader maxWidth="max-w-4xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/posts">posts</PageHeader.Crumb>
          <PageHeader.Crumb>{post.title}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-4xl">
          <PostView postId={postId} />
        </div>
      </div>
    </>
  );
}
