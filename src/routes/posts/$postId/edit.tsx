import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { merge } from "lodash-es";
import { z } from "zod";

import { toast } from "sonner";
import { PostForm } from "~/components/forms/post";
import { useTRPC } from "~/integrations/trpc/react";
import { setFlash } from "~/server/fns/session/flash/set";

const pathParametersSchema = z.object({
  postId: z.coerce.number(),
});

export const Route = createFileRoute("/posts/$postId/edit")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { postId } }) => {
    const post = await context.queryClient.ensureQueryData(
      context.trpc.post.get.queryOptions({ id: postId }),
    );
    if (!post) {
      await setFlash({ data: "Post not found" });
      throw redirect({ to: "/posts" });
    }
    if (post.userId !== context.session.user?.id) {
      await setFlash({ data: "Access denied" });
      throw redirect({ to: "/posts" });
    }
  },
});

function RouteComponent() {
  const { postId } = Route.useParams();
  const trpc = useTRPC();

  const { data: post } = useSuspenseQuery(
    trpc.post.get.queryOptions({ id: postId }),
  );

  const navigate = useNavigate();

  const qc = useQueryClient();

  const { mutate } = useMutation(
    trpc.post.update.mutationOptions({
      onMutate: (data) => {
        qc.cancelQueries({
          queryKey: trpc.post.get.queryKey({ id: postId }),
        });

        const prev = qc.getQueryData(trpc.post.get.queryKey({ id: postId }));

        qc.setQueryData(trpc.post.get.queryKey({ id: postId }), (prev) =>
          merge(prev, data),
        );

        navigate({ to: "/posts/$postId", params: { postId } });

        return {
          prev,
        };
      },
      onSuccess: () => {
        // no need to await - fire and forget. will almost definitely finish
        // before the user can navigate there
        qc.refetchQueries({
          queryKey: trpc.post.list.queryKey(),
        });
      },
      onError: (error, _variables, context) => {
        console.error(error);
        if (context) {
          qc.setQueryData(trpc.post.get.queryKey({ id: postId }), context.prev);
          toast.error("Failed to update post");
          navigate({ to: "/posts/$postId/edit", params: { postId } });
        }
      },
      onSettled: () => {
        qc.invalidateQueries({
          queryKey: trpc.post.get.queryKey({ id: postId }),
        });
      },
    }),
  );

  if (!post) {
    return null;
  }

  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-xl grow flex-col gap-4 px-4 py-6"
      id="main-content"
    >
      <PostForm
        defaultValues={{
          content: post.content,
          imageUrl: post.imageUrl,
          tags: post.tags ?? [],
          title: post.title,
          videoPlaybackId: post.video?.playbackId ?? undefined,
          videoUploadId: post.video?.uploadId ?? undefined,
        }}
        onSubmit={(data) => {
          mutate({
            ...data,
            postId,
          });
        }}
      />
    </div>
  );
}
