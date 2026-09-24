import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import {
  backUpSetSchema,
  createFirstSetSchema,
  deleteSetSchema,
  getSetSchema,
  startRoundSchema,
  updateSetSchema,
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
  .middleware([adminOnlyMiddleware])
  .inputValidator(zodValidator(startRoundSchema))
  .handler(async () => {
    const { startRound } = await loadBiuOps()
    return startRound()
  })

// Create first set in an existing empty round
export const createFirstSetServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createFirstSetSchema))
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
  .middleware([authMiddleware])
  .inputValidator(zodValidator(backUpSetSchema))
  .handler(async (ctx) => {
    const { backUpBiuSet } = await loadBiuOps()
    return backUpBiuSet(ctx)
  })

// Update set (owner only)
export const updateSetServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(updateSetSchema))
  .handler(async (ctx) => {
    const { updateBiuSet } = await loadBiuOps()
    return updateBiuSet(ctx)
  })

// Delete set (owner only)
export const deleteSetServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(zodValidator(deleteSetSchema))
  .handler(async (ctx) => {
    const { deleteBiuSet } = await loadBiuOps()
    return deleteBiuSet(ctx)
  })
