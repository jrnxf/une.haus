import { drizzle } from "drizzle-orm/sqlite-proxy"
import { z } from "zod"

import * as schema from "~/db/schema"
import { assertReadOnly } from "~/mcp/sql-guard"

// Read-only access to the live D1 database over the Cloudflare REST API.
// The Worker uses the D1 binding instead, which only exists inside workerd.
//
// Needs two values in .env (bun loads it on its own):
//   CLOUDFLARE_ACCOUNT_ID  the account that owns the database
//   CLOUDFLARE_D1_TOKEN    an API token with Account > D1 > Read

const env = z
  .object({
    CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
    CLOUDFLARE_D1_TOKEN: z.string().min(1),
  })
  .parse(process.env)

// Take the database id from wrangler.jsonc, so it cannot drift from the
// Worker's binding.
const wrangler = z
  .object({
    d1_databases: z.array(
      z.object({ binding: z.string(), database_id: z.string() }),
    ),
  })
  .parse(
    Bun.JSONC.parse(
      await Bun.file(new URL("../../wrangler.jsonc", import.meta.url)).text(),
    ),
  )
const databaseId = wrangler.d1_databases.find(
  (d) => d.binding === "DB",
)?.database_id
if (!databaseId) {
  throw new Error("no D1 database bound as DB in wrangler.jsonc")
}

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/d1/database/${databaseId}/raw`

// One D1 /raw response. `rows` are arrays in `columns` order, which is the
// shape drizzle's sqlite-proxy driver expects.
const rawResponse = z.object({
  success: z.boolean(),
  errors: z.array(z.object({ message: z.string() })).default([]),
  result: z
    .array(
      z.object({
        results: z.object({
          columns: z.array(z.string()),
          rows: z.array(z.array(z.unknown())),
        }),
      }),
    )
    .default([]),
})

async function rawQuery(sql: string, params: unknown[]) {
  assertReadOnly(sql)
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLOUDFLARE_D1_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  })
  const body = rawResponse.parse(await res.json())
  if (!res.ok || !body.success) {
    const message = body.errors.map((e) => e.message).join("; ")
    throw new Error(`D1 query failed (${res.status}): ${message}`)
  }
  return body.result[0]?.results ?? { columns: [], rows: [] }
}

export const prodDb = drizzle(
  async (sql, params, method) => {
    const { rows } = await rawQuery(sql, params)
    // "get" wants one row, the others want every row.
    return { rows: method === "get" ? (rows[0] ?? []) : rows }
  },
  { schema },
)
