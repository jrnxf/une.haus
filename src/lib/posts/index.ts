import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { PAGE_SIZE } from "~/lib/constants";
import {
  createPostServerFn,
  deletePostServerFn,
  getPostServerFn,
  listPostsServerFn,
  updatePostServerFn,
} from "~/lib/posts/fns";
import {
  createPostSchema,
  deletePostSchema,
  getPostSchema,
  listPostsSchema,
  updatePostSchema,
} from "~/lib/posts/schemas";
import { type ServerFnData, type ServerFnReturn } from "~/lib/types";

export const posts = {
  list: {
    fn: listPostsServerFn,
    schema: listPostsSchema,
    infiniteQueryOptions: (data: ServerFnData<typeof listPostsServerFn>) => {
      return infiniteQueryOptions({
        queryKey: ["posts.list", data],
        queryFn: ({ pageParam: cursor }) => {
          return listPostsServerFn({
            data: {
              ...data,
              cursor,
            },
          });
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => {
          if (lastPage.length < PAGE_SIZE) {
            // the last page returned less than the requested limit, so we
            // know there is no more results for this filter set
            return;
          }
          return lastPage.at(-1)?.id;
        },
      });
    },
  },
  get: {
    fn: getPostServerFn,
    schema: getPostSchema,
    queryOptions: (data: ServerFnData<typeof getPostServerFn>) => {
      return queryOptions({
        queryKey: ["posts.get", data],
        queryFn: () => getPostServerFn({ data }),
      });
    },
  },
  create: {
    fn: createPostServerFn,
    schema: createPostSchema,
  },
  update: {
    fn: updatePostServerFn,
    schema: updatePostSchema,
  },
  delete: {
    fn: deletePostServerFn,
    schema: deletePostSchema,
  },
};

export type PostsGetData = ServerFnReturn<typeof getPostServerFn>;
export type PostsUpdateData = ServerFnReturn<typeof updatePostServerFn>;
