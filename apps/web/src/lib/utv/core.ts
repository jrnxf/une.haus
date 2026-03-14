import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query"

import { PAGE_SIZE } from "~/lib/constants"
import { type ServerFnData } from "~/lib/types"
import {
  addUtvClapsServerFn,
  adminUpdateUtvVideoServerFn,
  allUtvVideosServerFn,
  createUtvSuggestionServerFn,
  getUtvClapsServerFn,
  getUtvSuggestionServerFn,
  getUtvVideoServerFn,
  listUtvRidersServerFn,
  listUtvSuggestionsServerFn,
  listUtvVideosServerFn,
  reviewUtvSuggestionServerFn,
  updateUtvScaleServerFn,
  updateUtvThumbnailSecondsServerFn,
  updateUtvTitleServerFn,
} from "~/lib/utv/fns"
import {
  createUtvSuggestionSchema,
  getUtvSuggestionSchema,
  type ListUtvSuggestionsInput,
  listUtvSuggestionsSchema,
  listUtvVideosSchema,
  reviewUtvSuggestionSchema,
} from "~/lib/utv/schemas"

export const utv = {
  all: {
    fn: allUtvVideosServerFn,
    queryOptions: () => {
      return queryOptions({
        queryKey: ["utv.all"],
        queryFn: allUtvVideosServerFn,
      })
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
          })
        },
        initialPageParam: 0 as number | undefined,
        getNextPageParam: (lastPage, allPages) => {
          if (lastPage.length < PAGE_SIZE) {
            return
          }
          return allPages.reduce((sum, page) => sum + page.length, 0)
        },
      })
    },
  },
  get: {
    fn: getUtvVideoServerFn,
    queryOptions: (id: number) => {
      return queryOptions({
        queryKey: ["utv.video", id],
        queryFn: () => getUtvVideoServerFn({ data: { id } }),
      })
    },
  },
  riders: {
    fn: listUtvRidersServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["utv.riders"],
        queryFn: listUtvRidersServerFn,
        staleTime: 1000 * 60 * 5,
      }),
  },
  claps: {
    get: {
      fn: getUtvClapsServerFn,
      queryOptions: () => {
        return queryOptions({
          queryKey: ["utv.claps"],
          queryFn: getUtvClapsServerFn,
        })
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
}
