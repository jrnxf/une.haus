import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"
import { and, eq } from "drizzle-orm"

import { db } from "~/db"
import {
  muxVideos,
  riuSets,
  riuSubmissions,
  rius,
  type UserDiscipline,
  users,
} from "~/db/schema"
import {
  createRiuSetSchema,
  createRiuSubmissionSchema,
  deleteRiuSetSchema,
  deleteRiuSubmissionSchema,
  getArchivedRiusSchema,
  getRiuSetSchema,
  getRiuSubmissionSchema,
  updateRiuSetSchema,
} from "~/lib/games/rius/schemas"
import { invariant } from "~/lib/invariant"
import {
  adminOnlyMiddleware,
  authMiddleware,
  authOptionalMiddleware,
} from "~/lib/middleware"

const loadRiuOps = createServerOnlyFn(
  () => import("~/lib/games/rius/ops.server"),
)

export const getRiuSetServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getRiuSetSchema))
  .middleware([authOptionalMiddleware])
  .handler(async ({ data: input, context }) => {
    const set = await db.query.riuSets.findFirst({
      where: eq(riuSets.id, input.setId),
      with: {
        riu: {
          columns: {
            status: true,
          },
        },
        user: {
          columns: {
            avatarId: true,
            id: true,
            name: true,
          },
        },
        video: {
          columns: {
            playbackId: true,
          },
        },
        likes: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
          },
        },
        submissions: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
            video: {
              columns: {
                playbackId: true,
              },
            },
            likes: {
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    avatarId: true,
                  },
                },
              },
            },
            messages: {
              columns: {
                id: true,
              },
            },
          },
        },
      },
    })

    invariant(set, "Set not found")

    if (set.riu.status === "upcoming") {
      const isOwner = context.user?.id === set.user.id
      const authUser = context.user
        ? await db.query.users.findFirst({
            where: eq(users.id, context.user.id),
            columns: {
              type: true,
            },
          })
        : null
      const isAdmin = authUser?.type === "admin"

      invariant(isOwner || isAdmin, "Access denied")
    } else {
      invariant(
        set.riu.status === "active" || set.riu.status === "archived",
        "Access denied",
      )
    }

    return set
  })

export const createRiuSetServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createRiuSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createRiuSet } = await loadRiuOps()
    return createRiuSet(ctx)
  })

export const updateRiuSetServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(updateRiuSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { updateRiuSet } = await loadRiuOps()
    return updateRiuSet(ctx)
  })

export const deleteRiuSetServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteRiuSetSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { deleteRiuSet } = await loadRiuOps()
    return deleteRiuSet(ctx)
  })

export const getRiuSubmissionServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getRiuSubmissionSchema))
  .handler(async ({ data: input }) => {
    const submission = await db.query.riuSubmissions.findFirst({
      where: eq(riuSubmissions.id, input.submissionId),
      with: {
        user: {
          columns: {
            avatarId: true,
            id: true,
            name: true,
          },
        },
        video: {
          columns: {
            playbackId: true,
          },
        },
        likes: {
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
          },
        },
        riuSet: {
          columns: {
            id: true,
            name: true,
          },
        },
        messages: {
          columns: {
            id: true,
            content: true,
            createdAt: true,
          },
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
            likes: {
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    avatarId: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    return submission
  })

export const deleteRiuSubmissionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(deleteRiuSubmissionSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { deleteRiuSubmission } = await loadRiuOps()
    return deleteRiuSubmission(ctx)
  })

export const createRiuSubmissionServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(zodValidator(createRiuSubmissionSchema))
  .middleware([authMiddleware])
  .handler(async (ctx) => {
    const { createRiuSubmission } = await loadRiuOps()
    return createRiuSubmission(ctx)
  })

export const listActiveRiusServerFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(async () => {
    const activeRius = await db.query.rius.findFirst({
      where: eq(rius.status, "active"),
      with: {
        sets: {
          columns: {
            id: true,
            name: true,
            instructions: true,
            createdAt: true,
          },
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
              },
            },
            video: {
              columns: {
                playbackId: true,
              },
            },
            likes: {
              columns: {
                userId: true,
              },
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    avatarId: true,
                  },
                },
              },
            },
            submissions: {
              columns: {
                id: true,
                createdAt: true,
              },
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    avatarId: true,
                  },
                },
                video: {
                  columns: {
                    playbackId: true,
                  },
                },
                likes: {
                  with: {
                    user: {
                      columns: {
                        id: true,
                        name: true,
                        avatarId: true,
                      },
                    },
                  },
                },
                messages: {
                  columns: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    invariant(activeRius, "No active RIU found")

    return activeRius
  })

export const getArchivedRiusServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getArchivedRiusSchema))
  .handler(async ({ data: input }) => {
    const riu = await db.query.rius.findFirst({
      where: input.riuId
        ? and(eq(rius.status, "archived"), eq(rius.id, input.riuId))
        : eq(rius.status, "archived"),
      orderBy: (rius, { desc }) => [desc(rius.createdAt)],
      with: {
        sets: {
          columns: {
            id: true,
            name: true,
            instructions: true,
            createdAt: true,
          },
          with: {
            user: {
              columns: {
                id: true,
                name: true,
                avatarId: true,
                bio: true,
                disciplines: true,
              },
            },
            video: {
              columns: {
                playbackId: true,
              },
            },
            likes: {
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    avatarId: true,
                  },
                },
              },
            },
            submissions: {
              columns: {
                id: true,
                createdAt: true,
              },
              with: {
                user: {
                  columns: {
                    id: true,
                    name: true,
                    avatarId: true,
                  },
                },
                video: {
                  columns: {
                    playbackId: true,
                  },
                },
                likes: {
                  with: {
                    user: {
                      columns: {
                        id: true,
                        name: true,
                        avatarId: true,
                      },
                    },
                  },
                },
                messages: {
                  columns: {
                    id: true,
                  },
                },
              },
            },
            messages: {
              columns: {
                id: true,
                content: true,
                createdAt: true,
                userId: true,
                riuSetId: true,
              },
              with: {
                likes: {
                  columns: {
                    userId: true,
                    riuSetMessageId: true,
                  },
                  with: {
                    user: true,
                  },
                },
                user: true,
              },
            },
          },
        },
      },
    })

    return riu
  })

export const listArchivedRiusServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { listArchivedRius } = await loadRiuOps()
  return listArchivedRius()
})

export const listUpcomingRiuRosterServerFn = createServerFn({
  method: "GET",
})
  .middleware([authOptionalMiddleware])
  .handler(async ({ context }) => {
    const sets = await db
      .select({
        createdAt: riuSets.createdAt,
        instructions: riuSets.instructions,
        id: riuSets.id,
        name: riuSets.name,
        user: {
          avatarId: users.avatarId,
          id: users.id,
          name: users.name,
          bio: users.bio,
          disciplines: users.disciplines,
          createdAt: users.createdAt,
        },
        video: {
          playbackId: muxVideos.playbackId,
        },
      })
      .from(riuSets)
      .innerJoin(rius, eq(rius.id, riuSets.riuId))
      .innerJoin(users, eq(riuSets.userId, users.id))
      .innerJoin(muxVideos, eq(riuSets.muxAssetId, muxVideos.assetId))
      .where(eq(rius.status, "upcoming"))

    const map = new Map<
      number,
      {
        avatarId: null | string
        count: number
        id: number
        name: string
        bio: string | null
        disciplines: UserDiscipline[] | null
      }
    >()

    for (const set of sets) {
      if (set.user) {
        const existing = map.get(set.user.id)
        if (existing) {
          existing.count++
        } else {
          map.set(set.user.id, {
            ...set.user,
            count: 1,
          })
        }
      }
    }

    const isAuthUsersSet = (set: (typeof sets)[number]) => {
      return context.user && set.user.id === context.user.id
    }

    return {
      authUserSets: context.user ? sets.filter(isAuthUsersSet) : undefined,
      roster: Object.fromEntries(map),
    }
  })

export const adminOnlyRotateRiusServerFn = createServerFn({
  method: "POST",
})
  .middleware([adminOnlyMiddleware])
  .handler(async () => {
    const { rotateRius } = await loadRiuOps()
    return rotateRius()
  })
