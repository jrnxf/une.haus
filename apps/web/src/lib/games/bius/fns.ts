import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import {
  backUpSetSchema,
  createFirstSetSchema,
  deleteSetSchema,
  getSetSchema,
  startRoundSchema,
} from "./schemas"
import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware"

const loadBiuOps = createServerOnlyFn(() => import("./ops.server"))

// Get all chains with all sets (ordered by position desc for UI)
export const getChainsServerFn = createServerFn({ method: "GET" })
  .middleware([authOptionalMiddleware])
  .handler(async () => {
    const { getChains } = await loadBiuOps()
    return getChains()
  })

// Start a new BIU round (admin only)
export const startRoundServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(startRoundSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    const { startRound } = await loadBiuOps()
    return startRound()
  })

// Create first set in an existing empty round
export const createFirstSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(createFirstSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createFirstBiuSet } = await loadBiuOps()
    return createFirstBiuSet(ctx)
  })

// Get single set with full details
export const getSetServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSetSchema))
  .handler(async (ctx) => {
    const { getSet } = await loadBiuOps()
    return getSet(ctx)
  })

// Back up a set (continue the chain)
export const backUpSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(backUpSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { backUpBiuSet } = await loadBiuOps()
    return backUpBiuSet(ctx)
  })

// Delete set (owner only)
export const deleteSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { deleteBiuSet } = await loadBiuOps()
    return deleteBiuSet(ctx)
  })
