import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import {
  createGlossaryProposalSchema,
  getGlossaryProposalSchema,
  listGlossaryProposalsSchema,
  reviewGlossaryProposalSchema,
} from "./schemas"
import { adminOnlyMiddleware, authMiddleware } from "~/lib/middleware"

const loadGlossaryOps = createServerOnlyFn(
  () => import("~/lib/tricks/glossary/ops.server"),
)

export const listGlossaryProposalsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listGlossaryProposalsSchema))
  .handler(async (ctx) => {
    const { listGlossaryProposals } = await loadGlossaryOps()
    return listGlossaryProposals(ctx)
  })

export const getGlossaryProposalServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getGlossaryProposalSchema))
  .handler(async (ctx) => {
    const { getGlossaryProposal } = await loadGlossaryOps()
    return getGlossaryProposal(ctx)
  })

export const createGlossaryProposalServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createGlossaryProposalSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createGlossaryProposal } = await loadGlossaryOps()
    return createGlossaryProposal(ctx)
  })

export const reviewGlossaryProposalServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(reviewGlossaryProposalSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { reviewGlossaryProposal } = await loadGlossaryOps()
    return reviewGlossaryProposal(ctx)
  })
