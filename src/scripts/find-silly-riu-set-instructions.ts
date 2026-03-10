import { asc, desc, sql } from "drizzle-orm"
import { drizzle } from "drizzle-orm/postgres-js"
import { writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import postgres from "postgres"

import { riuSets } from "../db/skrrrt/schema"

const MAX_CHARS = 4
const OUTPUT_FILE = new URL(
  "../../silly-riu-set-instructions.json",
  import.meta.url,
)

type InstructionRow = {
  instructions: string
  setId: number
  title: string
  trimmedLength: number
}

type OutputRow = {
  id: number
  instructions: string
  setName: string
}

async function fetchShortInstructions(
  databaseUrl: string,
): Promise<InstructionRow[]> {
  const client = postgres(databaseUrl, { max: 1 })
  const db = drizzle(client)
  const trimmedLength = sql<number>`char_length(trim(${riuSets.instructions}))`

  try {
    return await db
      .select({
        instructions: riuSets.instructions,
        setId: riuSets.id,
        title: riuSets.title,
        trimmedLength,
      })
      .from(riuSets)
      .where(sql`${trimmedLength} < ${MAX_CHARS + 1}`)
      .orderBy(asc(trimmedLength), desc(riuSets.createdAt), desc(riuSets.id))
  } finally {
    await client.end()
  }
}

export async function getShortInstructions() {
  const databaseUrl = process.env.SKRRRT_DATABASE_URL

  if (!databaseUrl) {
    throw new Error("SKRRRT_DATABASE_URL is not set")
  }

  return fetchShortInstructions(databaseUrl)
}

export async function main() {
  const rows = await getShortInstructions()
  const output: OutputRow[] = rows.map((row) => ({
    id: row.setId,
    instructions: row.instructions,
    setName: row.title,
  }))

  await writeFile(OUTPUT_FILE, `${JSON.stringify(output, null, 2)}\n`, "utf8")

  console.log(
    `Wrote ${rows.length} RIU set instructions to ${fileURLToPath(OUTPUT_FILE)}.`,
  )
}

if (import.meta.main) {
  await main()
}
