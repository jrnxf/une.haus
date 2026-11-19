import { beforeEach, describe, expect, it } from "bun:test"

import { db } from "~/db"
import { posts } from "~/db/schema"
import { ToolError } from "~/mcp/tools/define"
import { getPostTool, listPostsTool } from "~/mcp/tools/posts"
import { readTools } from "~/mcp/tools/registry"
import { searchUsersTool } from "~/mcp/tools/search"
import { getUserTool } from "~/mcp/tools/users"
import { seedUser, truncatePublicTables } from "~/testing/integration"

beforeEach(async () => {
  await truncatePublicTables()
})

describe("shared MCP tools", () => {
  it("have unique names", () => {
    const names = readTools.map((tool) => tool.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it("get_user returns a profile that matches its schema, with no email", async () => {
    const user = await seedUser({ name: "Ada Rider" })
    if (!user) throw new Error("seed failed")

    const out = await getUserTool.run(db, { userId: user.id })

    expect(getUserTool.outputSchema.parse(out)).toBeTruthy()
    expect(out.name).toBe("Ada Rider")
    expect(out).not.toHaveProperty("email")
  })

  it("get_user throws a ToolError for a missing id", async () => {
    expect(getUserTool.run(db, { userId: 999_999 })).rejects.toBeInstanceOf(
      ToolError,
    )
  })

  it("search_users finds a rider by part of the name", async () => {
    await seedUser({ name: "Ada Rider" })
    await seedUser({ name: "Bo Other" })

    const out = await searchUsersTool.run(db, { q: "ada", limit: 10 })

    expect(out.users.map((u) => u.name)).toEqual(["Ada Rider"])
  })

  it("list_posts pages with nextBefore, and get_post reads one", async () => {
    const user = await seedUser()
    if (!user) throw new Error("seed failed")
    for (const title of ["first", "second", "third"]) {
      await db.insert(posts).values({ title, content: title, userId: user.id })
    }

    const page1 = await listPostsTool.run(db, { limit: 2 })
    expect(page1.posts.map((p) => p.title)).toEqual(["third", "second"])
    expect(page1.nextBefore).not.toBeNull()

    const page2 = await listPostsTool.run(db, {
      limit: 2,
      before: page1.nextBefore ?? undefined,
    })
    expect(page2.posts.map((p) => p.title)).toEqual(["first"])
    expect(page2.nextBefore).toBeNull()

    const firstId = page2.posts[0]?.id ?? 0
    const post = await getPostTool.run(db, { postId: firstId })
    expect(getPostTool.outputSchema.parse(post).title).toBe("first")
  })
})
