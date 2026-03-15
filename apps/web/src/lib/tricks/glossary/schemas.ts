import { z } from "zod"

import {
  GLOSSARY_PROPOSAL_ACTIONS,
  GLOSSARY_PROPOSAL_TYPES,
  TRICK_SUBMISSION_STATUSES,
} from "~/db/schema"

export const createGlossaryProposalSchema = z.object({
  action: z.enum(GLOSSARY_PROPOSAL_ACTIONS),
  type: z.enum(GLOSSARY_PROPOSAL_TYPES),
  name: z.string().min(1, "Name is required"),
  description: z.string().nullable().optional(),
  targetId: z.number().optional(),
  diff: z
    .object({
      name: z.string().optional(),
      description: z.string().nullable().optional(),
    })
    .optional(),
  reason: z.string().nullable().optional(),
})

export const listGlossaryProposalsSchema = z
  .object({
    status: z.enum(TRICK_SUBMISSION_STATUSES).optional(),
    cursor: z.number().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  })
  .optional()

export type ListGlossaryProposalsInput = z.input<
  typeof listGlossaryProposalsSchema
>

export const getGlossaryProposalSchema = z.object({
  id: z.number(),
})

export const reviewGlossaryProposalSchema = z.object({
  id: z.number(),
  status: z.enum(["approved", "rejected"]),
  reviewNotes: z.string().min(1),
})
