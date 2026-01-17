import { queryOptions } from "@tanstack/react-query";

import {
  createCategoryServerFn,
  createModifierServerFn,
  createTrickServerFn,
  deleteCategoryServerFn,
  deleteModifierServerFn,
  deleteTrickServerFn,
  getAllTricksForGraphServerFn,
  getTrickByIdServerFn,
  getTrickServerFn,
  listCategoriesServerFn,
  listModifiersServerFn,
  listTricksServerFn,
  searchTricksServerFn,
  updateCategoryServerFn,
  updateModifierServerFn,
  updateTrickServerFn,
} from "./fns";
import {
  createCategorySchema,
  createModifierSchema,
  createTrickSchema,
  deleteCategorySchema,
  deleteModifierSchema,
  deleteTrickSchema,
  getTrickByIdSchema,
  getTrickSchema,
  listCategoriesSchema,
  listModifiersSchema,
  listTricksSchema,
  searchTricksSchema,
  updateCategorySchema,
  updateModifierSchema,
  updateTrickSchema,
  type ListTricksInput,
} from "./schemas";
import {
  createSubmissionServerFn,
  createSuggestionServerFn,
  getSubmissionServerFn,
  getSuggestionServerFn,
  listSubmissionsServerFn,
  listSuggestionsServerFn,
  reviewSubmissionServerFn,
  reviewSuggestionServerFn,
} from "./submissions/fns";
import {
  createSubmissionSchema,
  createSuggestionSchema,
  getSubmissionSchema,
  getSuggestionSchema,
  listSubmissionsSchema,
  listSuggestionsSchema,
  reviewSubmissionSchema,
  reviewSuggestionSchema,
  type ListSubmissionsInput,
  type ListSuggestionsInput,
} from "./submissions/schemas";
import type { ServerFnData, ServerFnReturn } from "~/lib/types";

export type { Trick, TricksData } from "./types";

export const tricks = {
  // Categories
  categories: {
    list: {
      fn: listCategoriesServerFn,
      schema: listCategoriesSchema,
      queryOptions: () =>
        queryOptions({
          queryKey: ["tricks.categories.list"],
          queryFn: () => listCategoriesServerFn(),
          staleTime: 1000 * 60 * 5, // 5 minutes
        }),
    },
    create: {
      fn: createCategoryServerFn,
      schema: createCategorySchema,
    },
    update: {
      fn: updateCategoryServerFn,
      schema: updateCategorySchema,
    },
    delete: {
      fn: deleteCategoryServerFn,
      schema: deleteCategorySchema,
    },
  },

  // Modifiers
  modifiers: {
    list: {
      fn: listModifiersServerFn,
      schema: listModifiersSchema,
      queryOptions: () =>
        queryOptions({
          queryKey: ["tricks.modifiers.list"],
          queryFn: () => listModifiersServerFn(),
          staleTime: 1000 * 60 * 5, // 5 minutes
        }),
    },
    create: {
      fn: createModifierServerFn,
      schema: createModifierSchema,
    },
    update: {
      fn: updateModifierServerFn,
      schema: updateModifierSchema,
    },
    delete: {
      fn: deleteModifierServerFn,
      schema: deleteModifierSchema,
    },
  },

  // Core tricks
  list: {
    fn: listTricksServerFn,
    schema: listTricksSchema,
    queryOptions: (data?: ListTricksInput) =>
      queryOptions({
        queryKey: ["tricks.list", data],
        queryFn: () => listTricksServerFn({ data }),
        staleTime: 1000 * 60, // 1 minute
      }),
  },

  get: {
    fn: getTrickServerFn,
    schema: getTrickSchema,
    queryOptions: (data: ServerFnData<typeof getTrickServerFn>) =>
      queryOptions({
        queryKey: ["tricks.get", data],
        queryFn: () => getTrickServerFn({ data }),
      }),
  },

  getById: {
    fn: getTrickByIdServerFn,
    schema: getTrickByIdSchema,
    queryOptions: (data: ServerFnData<typeof getTrickByIdServerFn>) =>
      queryOptions({
        queryKey: ["tricks.getById", data],
        queryFn: () => getTrickByIdServerFn({ data }),
      }),
  },

  search: {
    fn: searchTricksServerFn,
    schema: searchTricksSchema,
    queryOptions: (data: ServerFnData<typeof searchTricksServerFn>) =>
      queryOptions({
        queryKey: ["tricks.search", data],
        queryFn: () => searchTricksServerFn({ data }),
        staleTime: 1000 * 30, // 30 seconds
      }),
  },

  create: {
    fn: createTrickServerFn,
    schema: createTrickSchema,
  },

  update: {
    fn: updateTrickServerFn,
    schema: updateTrickSchema,
  },

  delete: {
    fn: deleteTrickServerFn,
    schema: deleteTrickSchema,
  },

  // Graph data (all tricks for visualization)
  graph: {
    fn: getAllTricksForGraphServerFn,
    queryOptions: () =>
      queryOptions({
        queryKey: ["tricks.graph"],
        queryFn: () => getAllTricksForGraphServerFn(),
        staleTime: 1000 * 60 * 5, // 5 minutes
      }),
  },

  // Submissions (new tricks pending review)
  submissions: {
    list: {
      fn: listSubmissionsServerFn,
      schema: listSubmissionsSchema,
      queryOptions: (data?: ListSubmissionsInput) =>
        queryOptions({
          queryKey: ["tricks.submissions.list", data],
          queryFn: () => listSubmissionsServerFn({ data }),
          staleTime: 1000 * 30, // 30 seconds
        }),
    },
    get: {
      fn: getSubmissionServerFn,
      schema: getSubmissionSchema,
      queryOptions: (data: ServerFnData<typeof getSubmissionServerFn>) =>
        queryOptions({
          queryKey: ["tricks.submissions.get", data],
          queryFn: () => getSubmissionServerFn({ data }),
        }),
    },
    create: {
      fn: createSubmissionServerFn,
      schema: createSubmissionSchema,
    },
    review: {
      fn: reviewSubmissionServerFn,
      schema: reviewSubmissionSchema,
    },
  },

  // Suggestions (edits to existing tricks)
  suggestions: {
    list: {
      fn: listSuggestionsServerFn,
      schema: listSuggestionsSchema,
      queryOptions: (data?: ListSuggestionsInput) =>
        queryOptions({
          queryKey: ["tricks.suggestions.list", data],
          queryFn: () => listSuggestionsServerFn({ data }),
          staleTime: 1000 * 30, // 30 seconds
        }),
    },
    get: {
      fn: getSuggestionServerFn,
      schema: getSuggestionSchema,
      queryOptions: (data: ServerFnData<typeof getSuggestionServerFn>) =>
        queryOptions({
          queryKey: ["tricks.suggestions.get", data],
          queryFn: () => getSuggestionServerFn({ data }),
        }),
    },
    create: {
      fn: createSuggestionServerFn,
      schema: createSuggestionSchema,
    },
    review: {
      fn: reviewSuggestionServerFn,
      schema: reviewSuggestionSchema,
    },
  },
};

// Type exports
export type TrickData = ServerFnReturn<typeof getTrickServerFn>;
export type TrickByIdData = ServerFnReturn<typeof getTrickByIdServerFn>;
export type TricksListData = ServerFnReturn<typeof listTricksServerFn>;
export type TrickSearchData = ServerFnReturn<typeof searchTricksServerFn>;
export type TrickGraphData = ServerFnReturn<typeof getAllTricksForGraphServerFn>;
export type CategoryData = ServerFnReturn<typeof listCategoriesServerFn>;
export type ModifierData = ServerFnReturn<typeof listModifiersServerFn>;
export type SubmissionData = ServerFnReturn<typeof getSubmissionServerFn>;
export type SuggestionData = ServerFnReturn<typeof getSuggestionServerFn>;
