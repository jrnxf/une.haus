import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";

import { PAGE_SIZE } from "~/lib/constants";
import { type ServerFnData, type ServerFnReturn } from "~/lib/types";
import {
  addUtvClapsServerFn,
  allUtvVideosServerFn,
  createUtvSuggestionServerFn,
  getUtvClapsServerFn,
  getUtvSuggestionServerFn,
  getUtvVideoServerFn,
  listUtvSuggestionsServerFn,
  listUtvVideosServerFn,
  reviewUtvSuggestionServerFn,
  adminUpdateUtvVideoServerFn,
  updateUtvScaleServerFn,
  updateUtvThumbnailSecondsServerFn,
  updateUtvTitleServerFn,
} from "~/lib/utv/fns";
import {
  createUtvSuggestionSchema,
  getUtvSuggestionSchema,
  listUtvSuggestionsSchema,
  listUtvVideosSchema,
  reviewUtvSuggestionSchema,
  type ListUtvSuggestionsInput,
} from "~/lib/utv/schemas";

export const utv = {
  all: {
    fn: allUtvVideosServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["utv.all"],
        queryFn: allUtvVideosServerFn,
      });
    },
  },
  list: {
    fn: listUtvVideosServerFn,
    schema: listUtvVideosSchema,
    infiniteQueryOptions: (
      data: ServerFnData<typeof listUtvVideosServerFn>,
    ) => {
      return infiniteQueryOptions({
        queryKey: ["utv.list", data],
        queryFn: ({ pageParam: cursor }) => {
          return listUtvVideosServerFn({
            data: {
              ...data,
              cursor,
            },
          });
        },
        initialPageParam: 0 as number | undefined,
        getNextPageParam: (lastPage) => {
          if (lastPage.length < PAGE_SIZE) {
            return;
          }
          return lastPage.at(-1)?.id;
        },
      });
    },
  },
  get: {
    fn: getUtvVideoServerFn,
    queryOptions: (id: number) => {
      return queryOptions({
        queryKey: ["utv.video", id],
        queryFn: () => getUtvVideoServerFn({ data: { id } }),
      });
    },
  },
  claps: {
    get: {
      fn: getUtvClapsServerFn,
      queryOptions: () => {
        return queryOptions({
          queryKey: ["utv.claps"],
          queryFn: getUtvClapsServerFn,
        });
      },
    },
    add: {
      fn: addUtvClapsServerFn,
    },
  },
  updateScale: {
    fn: updateUtvScaleServerFn,
  },
  updateThumbnailSeconds: {
    fn: updateUtvThumbnailSecondsServerFn,
  },
  updateTitle: {
    fn: updateUtvTitleServerFn,
  },
  adminUpdate: {
    fn: adminUpdateUtvVideoServerFn,
  },

  // Suggestions (edits to existing videos)
  suggestions: {
    list: {
      fn: listUtvSuggestionsServerFn,
      schema: listUtvSuggestionsSchema,
      queryOptions: (data?: ListUtvSuggestionsInput) =>
        queryOptions({
          queryKey: ["utv.suggestions.list", data],
          queryFn: () => listUtvSuggestionsServerFn({ data }),
          staleTime: 1000 * 30, // 30 seconds
        }),
    },
    get: {
      fn: getUtvSuggestionServerFn,
      schema: getUtvSuggestionSchema,
      queryOptions: (data: ServerFnData<typeof getUtvSuggestionServerFn>) =>
        queryOptions({
          queryKey: ["utv.suggestions.get", data],
          queryFn: () => getUtvSuggestionServerFn({ data }),
        }),
    },
    create: {
      fn: createUtvSuggestionServerFn,
      schema: createUtvSuggestionSchema,
    },
    review: {
      fn: reviewUtvSuggestionServerFn,
      schema: reviewUtvSuggestionSchema,
    },
  },
};

export type UtvVideosData = ServerFnReturn<typeof allUtvVideosServerFn>;
export type UtvVideosListData = ServerFnReturn<typeof listUtvVideosServerFn>;
export type UtvVideoData = ServerFnReturn<typeof getUtvVideoServerFn>;
export type UtvSuggestionData = ServerFnReturn<typeof getUtvSuggestionServerFn>;
export type UtvSuggestionsData = ServerFnReturn<
  typeof listUtvSuggestionsServerFn
>;
