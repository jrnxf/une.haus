import { queryOptions } from "@tanstack/react-query"

import {
  createElementServerFn,
  createModifierServerFn,
  createTrickServerFn,
  deleteElementServerFn,
  deleteModifierServerFn,
  deleteTrickServerFn,
  getAllTricksForGraphServerFn,
  getTrickByIdServerFn,
  getTrickServerFn,
  listElementsServerFn,
  listModifiersServerFn,
  listTricksServerFn,
  searchTricksServerFn,
  updateElementServerFn,
  updateModifierServerFn,
  updateTrickServerFn,
} from "./fns"
import {
  createGlossaryProposalServerFn,
  getGlossaryProposalServerFn,
  listGlossaryProposalsServerFn,
  reviewGlossaryProposalServerFn,
} from "./glossary/fns"
import {
  createGlossaryProposalSchema,
  getGlossaryProposalSchema,
  type ListGlossaryProposalsInput,
  listGlossaryProposalsSchema,
  reviewGlossaryProposalSchema,
} from "./glossary/schemas"
import {
  createElementSchema,
  createModifierSchema,
  createTrickSchema,
  deleteElementSchema,
  deleteModifierSchema,
  deleteTrickSchema,
  getTrickByIdSchema,
  getTrickSchema,
  type ListTricksInput,
  listElementsSchema,
  listModifiersSchema,
  listTricksSchema,
  searchTricksSchema,
  updateElementSchema,
  updateModifierSchema,
  updateTrickSchema,
} from "./schemas"
import {
  createSubmissionServerFn,
  createSuggestionServerFn,
  getSubmissionServerFn,
  getSuggestionServerFn,
  listSubmissionsServerFn,
  listSuggestionsServerFn,
  reviewSubmissionServerFn,
  reviewSuggestionServerFn,
} from "./submissions/fns"
import {
  createSubmissionSchema,
  createSuggestionSchema,
  getSubmissionSchema,
  getSuggestionSchema,
  type ListSubmissionsInput,
  type ListSuggestionsInput,
  listSubmissionsSchema,
  listSuggestionsSchema,
  reviewSubmissionSchema,
  reviewSuggestionSchema,
} from "./submissions/schemas"
import {
  deleteVideoServerFn,
  demoteVideoServerFn,
  listPendingVideosServerFn,
  listVideosServerFn,
  reorderVideosServerFn,
  reviewVideoServerFn,
  submitVideoServerFn,
} from "./videos/fns"
import {
  deleteVideoSchema,
  demoteVideoSchema,
  type ListPendingVideosInput,
  type ListVideosInput,
  listPendingVideosSchema,
  listVideosSchema,
  reorderVideosSchema,
  reviewVideoSchema,
  submitVideoSchema,
} from "./videos/schemas"
import { type ServerFnData, type ServerFnReturn } from "~/lib/types"

export type { NeighborLink, Trick, TrickModifiers, TricksData } from "./types"

export const tricks = {
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

  // Elements (components that make up a trick)
  elements: {
    list: {
      fn: listElementsServerFn,
      schema: listElementsSchema,
      queryOptions: () =>
        queryOptions({
          queryKey: ["tricks.elements.list"],
          queryFn: () => listElementsServerFn(),
          staleTime: 1000 * 60 * 5, // 5 minutes
        }),
    },
    create: {
      fn: createElementServerFn,
      schema: createElementSchema,
    },
    update: {
      fn: updateElementServerFn,
      schema: updateElementSchema,
    },
    delete: {
      fn: deleteElementServerFn,
      schema: deleteElementSchema,
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

  // Videos (multiple per trick)
  videos: {
    list: {
      fn: listVideosServerFn,
      schema: listVideosSchema,
      queryOptions: (data: ListVideosInput) =>
        queryOptions({
          queryKey: ["tricks.videos.list", data],
          queryFn: () => listVideosServerFn({ data }),
          staleTime: 1000 * 30, // 30 seconds
        }),
    },
    listPending: {
      fn: listPendingVideosServerFn,
      schema: listPendingVideosSchema,
      queryOptions: (data?: ListPendingVideosInput) =>
        queryOptions({
          queryKey: ["tricks.videos.pending", data],
          queryFn: () => listPendingVideosServerFn({ data }),
          staleTime: 1000 * 30, // 30 seconds
        }),
    },
    submit: {
      fn: submitVideoServerFn,
      schema: submitVideoSchema,
    },
    review: {
      fn: reviewVideoServerFn,
      schema: reviewVideoSchema,
    },
    reorder: {
      fn: reorderVideosServerFn,
      schema: reorderVideosSchema,
    },
    demote: {
      fn: demoteVideoServerFn,
      schema: demoteVideoSchema,
    },
    delete: {
      fn: deleteVideoServerFn,
      schema: deleteVideoSchema,
    },
  },

  // Glossary proposals (elements/modifiers community contributions)
  glossary: {
    proposals: {
      list: {
        fn: listGlossaryProposalsServerFn,
        schema: listGlossaryProposalsSchema,
        queryOptions: (data?: ListGlossaryProposalsInput) =>
          queryOptions({
            queryKey: ["tricks.glossary.proposals.list", data],
            queryFn: () => listGlossaryProposalsServerFn({ data }),
            staleTime: 1000 * 30, // 30 seconds
          }),
      },
      get: {
        fn: getGlossaryProposalServerFn,
        schema: getGlossaryProposalSchema,
        queryOptions: (
          data: ServerFnData<typeof getGlossaryProposalServerFn>,
        ) =>
          queryOptions({
            queryKey: ["tricks.glossary.proposals.get", data],
            queryFn: () => getGlossaryProposalServerFn({ data }),
          }),
      },
      create: {
        fn: createGlossaryProposalServerFn,
        schema: createGlossaryProposalSchema,
      },
      review: {
        fn: reviewGlossaryProposalServerFn,
        schema: reviewGlossaryProposalSchema,
      },
    },
  },
}

// Type exports
export type TrickData = ServerFnReturn<typeof getTrickServerFn>
export type TrickByIdData = ServerFnReturn<typeof getTrickByIdServerFn>
export type TricksListData = ServerFnReturn<typeof listTricksServerFn>
export type TrickSearchData = ServerFnReturn<typeof searchTricksServerFn>
export type TrickGraphData = ServerFnReturn<typeof getAllTricksForGraphServerFn>
export type ModifierData = ServerFnReturn<typeof listModifiersServerFn>
export type ElementData = ServerFnReturn<typeof listElementsServerFn>
export type SubmissionData = ServerFnReturn<typeof getSubmissionServerFn>
export type SuggestionData = ServerFnReturn<typeof getSuggestionServerFn>
export type PendingVideosData = ServerFnReturn<typeof listPendingVideosServerFn>
export type TrickVideosData = ServerFnReturn<typeof listVideosServerFn>
export type GlossaryProposalData = ServerFnReturn<
  typeof getGlossaryProposalServerFn
>
export type GlossaryProposalsListData = ServerFnReturn<
  typeof listGlossaryProposalsServerFn
>
