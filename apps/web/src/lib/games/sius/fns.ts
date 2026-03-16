import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, desc, eq, isNull, lte } from "drizzle-orm"

import {
  addSetSchema,
  archiveRoundSchema,
  createFirstSetSchema,
  deleteSetSchema,
  getArchivedRoundSchema,
  getSetSchema,
  removeArchiveVoteSchema,
  startRoundSchema,
  updateSetSchema,
  voteToArchiveSchema,
} from "./schemas"
import { db } from "~/db"
import { siuSets, sius } from "~/db/schema"
import { invariant } from "~/lib/invariant"
import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware"

const MAX_ACTIVE_ROUNDS = 3
const loadSiuOps = createServerOnlyFn(
  () => import("~/lib/games/sius/ops.server"),
)

// Get active rounds with all sets (ordered by position desc for UI)
export const getActiveRoundsServerFn = createServerFn({ method: "GET" })
  .middleware([authOptionalMiddleware])
  .handler(async () => {
    const activeRounds = await db.query.sius.findMany({
      where: eq(sius.status, "active"),
      orderBy: desc(sius.createdAt),
      with: {
        sets: {
          orderBy: desc(siuSets.position),
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
            video: {
              columns: { playbackId: true },
            },
            likes: {
              with: {
                user: {
                  columns: { id: true, name: true, avatarId: true },
                },
              },
            },
            messages: {
              columns: { id: true },
            },
            parentSet: {
              columns: { id: true, name: true },
              with: {
                user: {
                  columns: { id: true, name: true },
                },
              },
            },
          },
        },
        archiveVotes: {
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
          },
        },
      },
    })

    return activeRounds
  })

// Get single set with full details
export const getSetServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSetSchema))
  .handler(async ({ data: input }) => {
    const set = await db.query.siuSets.findFirst({
      where: eq(siuSets.id, input.setId),
      with: {
        siu: {
          columns: { id: true, status: true },
          with: {
            archiveVotes: {
              with: {
                user: {
                  columns: { id: true, name: true, avatarId: true },
                },
              },
            },
          },
        },
        user: {
          columns: { id: true, name: true, avatarId: true },
        },
        video: {
          columns: { playbackId: true },
        },
        parentSet: {
          columns: { id: true, name: true },
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
            video: {
              columns: { playbackId: true },
            },
          },
        },
        likes: {
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
          },
        },
        messages: {
          columns: { id: true, content: true, createdAt: true },
          with: {
            user: {
              columns: { id: true, name: true, avatarId: true },
            },
            likes: {
              with: {
                user: {
                  columns: { id: true, name: true, avatarId: true },
                },
              },
            },
          },
        },
      },
    })

    if (!set) return set

    // Check if this is the latest set in its round (no non-deleted children)
    const childSet = await db.query.siuSets.findFirst({
      where: and(eq(siuSets.parentSetId, set.id), isNull(siuSets.deletedAt)),
      columns: { id: true, name: true },
    })

    return { ...set, childSet, isLatest: !childSet }
  })

// Start a new round (admin only)
export const startRoundServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(startRoundSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    // Check if max active rounds reached
    const activeRounds = await db.query.sius.findMany({
      where: eq(sius.status, "active"),
      columns: { id: true },
    })

    invariant(
      activeRounds.length < MAX_ACTIVE_ROUNDS,
      `Maximum of ${MAX_ACTIVE_ROUNDS} active rounds reached`,
    )

    // Create new round
    const [round] = await db
      .insert(sius)
      .values({ status: "active" })
      .returning()

    return { round }
  })

// Create first set in an existing empty round
export const createFirstSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(createFirstSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createFirstSiuSet } = await loadSiuOps()
    return createFirstSiuSet(ctx)
  })

// Add set (continue the round with full line + new trick)
export const addSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(addSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { addSiuSet } = await loadSiuOps()
    return addSiuSet(ctx)
  })

// Vote to archive round
export const voteToArchiveServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(voteToArchiveSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { voteToArchive } = await loadSiuOps()
    return voteToArchive(ctx)
  })

// Remove archive vote
export const removeArchiveVoteServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(removeArchiveVoteSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { removeArchiveVote } = await loadSiuOps()
    return removeArchiveVote(ctx)
  })

// Archive round (admin only)
export const archiveRoundServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(archiveRoundSchema))
  .middleware([adminOnlyMiddleware])
  .handler(async (ctx) => {
    const { archiveSiuRound } = await loadSiuOps()
    return archiveSiuRound(ctx)
  })

// Update set (owner only)
export const updateSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(updateSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { updateSiuSet } = await loadSiuOps()
    return updateSiuSet(ctx)
  })

// Delete set (owner only)
export const deleteSetServerFn = createServerFn({ method: "POST" })
  .inputValidator(zodValidator(deleteSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { deleteSiuSet } = await loadSiuOps()
    return deleteSiuSet(ctx)
  })

// List archived rounds
export const listArchivedRoundsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { listArchivedRounds } = await loadSiuOps()
  return listArchivedRounds()
})

// Get specific archived round with all sets
export const getArchivedRoundServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getArchivedRoundSchema))
  .handler(async (ctx) => {
    const { getArchivedRound } = await loadSiuOps()
    return getArchivedRound(ctx)
  })

// Get all tricks in the line up to and including the requested set
export const getLineServerFn = createServerFn({ method: "GET" })
  .inputValidator(zodValidator(getSetSchema))
  .handler(async ({ data: input }) => {
    const set = await db.query.siuSets.findFirst({
      where: eq(siuSets.id, input.setId),
      columns: { siuId: true, position: true },
    })

    if (!set) return []

    // Show the landed line for the current set, not future additions.
    const sets = await db.query.siuSets.findMany({
      where: and(
        eq(siuSets.siuId, set.siuId),
        lte(siuSets.position, set.position),
        isNull(siuSets.deletedAt),
      ),
      orderBy: siuSets.position,
      columns: { id: true, name: true, position: true },
      with: {
        user: {
          columns: { id: true, name: true },
        },
      },
    })

    return sets
  })
