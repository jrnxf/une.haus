import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";

import { toast } from "sonner";

import { PostForm } from "~/components/forms/post";
import { posts } from "~/lib/posts";

export const Route = createFileRoute("/posts/create")({
  component: RouteComponent,
  loader: async ({ context, location }) => {
    if (!context.session.user) {
      throw redirect({
        to: "/auth/login",
        search: {
          redirect: location.href,
        },
      });
    }
  },
});

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();

  const { mutate } = useMutation({
    mutationFn: posts.create.fn,
    onSuccess: async (data) => {
      // no need to await - fire and forget. will almost definitely finish
      // before the user can navigate there
      qc.refetchQueries({
        queryKey: posts.list.infiniteQueryOptions({}).queryKey,
      });

      router.navigate({ params: { postId: data.id }, to: "/posts/$postId" });
    },
    onError: () => {
      // sentry
      toast.error("Failed to create post");
      router.navigate({ to: "/posts/create" });
    },
  });

  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-4xl grow flex-col gap-4 px-4 py-6"
      id="main-content"
    >
      <PostForm onSubmit={(data) => mutate({ data })} />
    </div>
  );
}
