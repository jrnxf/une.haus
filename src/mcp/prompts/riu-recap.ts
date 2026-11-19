import { desc, eq } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"
import { z } from "zod"

import { riuSets, riuSubmissions, rius, users } from "~/db/schema"
import { type ToolDb } from "~/mcp/tools/define"

import type { McpServer } from "@modelcontextprotocol/server"

const submitters = alias(users, "submitters")

// Loads one RIU round with its sets and who landed each one.
async function loadRound(db: ToolDb, which: "last" | "current") {
  const [round] = await db
    .select({ id: rius.id })
    .from(rius)
    .where(eq(rius.status, which === "last" ? "archived" : "active"))
    .orderBy(desc(rius.id))
    .limit(1)
  if (!round) return undefined

  const rows = await db
    .select({
      setId: riuSets.id,
      setName: riuSets.name,
      instructions: riuSets.instructions,
      setter: users.name,
      submitter: submitters.name,
    })
    .from(riuSets)
    .innerJoin(users, eq(users.id, riuSets.userId))
    .leftJoin(riuSubmissions, eq(riuSubmissions.riuSetId, riuSets.id))
    .leftJoin(submitters, eq(submitters.id, riuSubmissions.userId))
    .where(eq(riuSets.riuId, round.id))
    .orderBy(riuSets.id)

  // One row per (set, submission) pair. Fold them into one entry per set.
  const sets = new Map<
    number,
    {
      name: string
      instructions: string | null
      setter: string
      landedBy: string[]
    }
  >()
  for (const row of rows) {
    const set = sets.get(row.setId) ?? {
      name: row.setName,
      instructions: row.instructions,
      setter: row.setter,
      landedBy: [],
    }
    if (row.submitter) set.landedBy.push(row.submitter)
    sets.set(row.setId, set)
  }

  return {
    roundId: round.id,
    sets: [...sets.values()],
  }
}

export function registerRiuRecapPrompt(server: McpServer, db: ToolDb) {
  server.registerPrompt(
    "riu_recap",
    {
      title: "RIU recap",
      description:
        "Draft a short community recap of a Rack It Up round, from live data.",
      // Prompt arguments travel as strings, so an enum of strings fits.
      argsSchema: z.object({
        round: z
          .enum(["last", "current"])
          .default("last")
          .describe("last = the round that just ended, current = the live one"),
      }),
    },
    async ({ round }) => {
      const data = await loadRound(db, round)
      const label = round === "last" ? "archived" : "active"
      let text: string
      if (!data) {
        text = `There is no ${label} RIU round yet. Say so in one sentence.`
      } else if (data.sets.length === 0) {
        text = `RIU round ${data.roundId} (${label}) has no sets. Say so in one friendly sentence, and invite riders to post a set for the upcoming round.`
      } else {
        text = [
          `Here is RIU round ${data.roundId} from une.haus, as JSON:`,
          "",
          JSON.stringify(data, null, 2),
          "",
          "Write a short recap of this round for the une.haus community.",
          "- Write in lowercase, like the rest of the site.",
          "- Name the sets that the most riders landed, and who set them.",
          "- Thank the riders who landed the most sets.",
          "- Do not mention how many riders took part in total.",
          "- Keep it under 120 words.",
        ].join("\n")
      }

      return {
        messages: [{ role: "user", content: { type: "text", text } }],
      }
    },
  )
}
