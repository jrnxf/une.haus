import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";

import { toast } from "sonner";

import { posts } from ".";

export function useDeletePost() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: posts.delete.fn,
    onMutate: ({ data: postId }) => {
      qc.setQueryData(posts.list.infiniteQueryOptions({}).queryKey, (prev) => {
        if (prev === undefined) {
          return prev;
        }
        return {
          ...prev,
          pages: prev.pages.map((page) =>
            page.filter((post) => post.id !== postId),
          ),
        };
      });
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: posts.list.infiniteQueryOptions({}).queryKey,
        exact: false,
      });
    },
    onSuccess: () => {
      toast.success("Post deleted");
      navigate({ to: "/posts" });
    },
  });
}
