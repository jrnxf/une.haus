import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";

import { toast } from "sonner";
import { z } from "zod";

import { PostForm } from "~/components/forms/post";
import { posts } from "~/lib/posts";
import { session } from "~/lib/session/index";
import { errorFmt } from "~/lib/utils";

const pathParametersSchema = z.object({
  postId: z.coerce.number(),
});

export const Route = createFileRoute("/posts/$postId/edit")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { postId } }) => {
    try {
      return await context.queryClient.ensureQueryData(
        posts.get.queryOptions({ postId }),
      );
    } catch (error) {
      await session.flash.set.fn({ data: { message: errorFmt(error) } });
      throw redirect({ to: "/posts" });
    }
  },
});

function RouteComponent() {
  const { postId } = Route.useParams();

  const { data: post } = useSuspenseQuery(posts.get.queryOptions({ postId }));

  const navigate = useNavigate();

  const qc = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: posts.update.fn,
    onMutate: ({ data }) => {
      qc.cancelQueries({
        queryKey: posts.get.queryOptions({ postId }).queryKey,
      });

      const prev = qc.getQueryData(posts.get.queryOptions({ postId }).queryKey);

      qc.setQueryData(posts.get.queryOptions({ postId }).queryKey, (prev) => {
        return prev
          ? {
              ...prev,
              ...data,
            }
          : undefined;
      });

      navigate({ to: "/posts/$postId", params: { postId } });

      return {
        prev,
      };
    },
    onSuccess: () => {
      // no need to await - fire and forget. will almost definitely finish
      // before the user can navigate there
      qc.refetchQueries({
        queryKey: posts.list.infiniteQueryOptions({}).queryKey,
      });
    },
    onError: (error, _variables, context) => {
      console.error(error);
      if (context) {
        qc.setQueryData(
          posts.get.queryOptions({ postId }).queryKey,
          context.prev,
        );
        toast.error("Failed to update post");
        navigate({ to: "/posts/$postId/edit", params: { postId } });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: posts.get.queryOptions({ postId }).queryKey,
      });
    },
  });

  if (!post) {
    return null;
  }

  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-4xl grow flex-col gap-4 px-4 py-6"
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
            data: {
              ...data,
              postId,
            },
          });
        }}
      />
    </div>
  );
}
