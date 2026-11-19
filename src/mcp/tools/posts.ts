import { and, count, desc, eq, like, lt, or } from "drizzle-orm"
import { z } from "zod"

import { muxVideos, postLikes, postMessages, posts, users } from "~/db/schema"
import { prodDb } from "~/mcp/d1"
import {
  LIST_LIMIT,
  errorResult,
  excerpt,
  jsonResult,
  videoUrl,
} from "~/mcp/tools/result"

import type { McpServer } from "@modelcontextprotocol/server"

const author = z.object({ id: z.number(), name: z.string() })

const listOutput = z.object({
  posts: z.array(
    z.object({
      id: z.number(),
      title: z.string(),
      excerpt: z.string(),
      tags: z.array(z.string()).nullable(),
      author,
      createdAt: z.string(),
    }),
  ),
  // Pass this back as `before` to get the next page. Null on the last page.
  nextBefore: z.number().nullable(),
})

const postOutput = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).nullable(),
  author,
  createdAt: z.string(),
  videoUrl: z.string().nullable(),
  youtubeUrl: z.string().nullable(),
  likes: z.number(),
  comments: z.array(
    z.object({
      author: z.string(),
      content: z.string(),
      createdAt: z.string(),
    }),
  ),
})

export function registerPostTools(server: McpServer) {
  server.registerTool(
    "list_posts",
    {
      title: "List posts",
      description:
        "List une.haus community posts, newest first. Filter by words in the title or body, or by author user id. Returns short excerpts; call get_post for the full text and comments.",
      inputSchema: z.object({
        q: z
          .string()
          .min(2)
          .optional()
          .describe("words to find in the title or body"),
        userId: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("only posts by this user id"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(LIST_LIMIT.max)
          .default(LIST_LIMIT.default),
        before: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("nextBefore from the previous page"),
      }),
      outputSchema: listOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ q, userId, limit, before }) => {
      // Ask for one extra row. If it comes back, there is a next page.
      const rows = await prodDb
        .select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          tags: posts.tags,
          createdAt: posts.createdAt,
          authorId: users.id,
          authorName: users.name,
        })
        .from(posts)
        .innerJoin(users, eq(users.id, posts.userId))
        .where(
          and(
            q
              ? or(like(posts.title, `%${q}%`), like(posts.content, `%${q}%`))
              : undefined,
            userId ? eq(posts.userId, userId) : undefined,
            before ? lt(posts.id, before) : undefined,
          ),
        )
        .orderBy(desc(posts.id))
        .limit(limit + 1)

      const page = rows.slice(0, limit)
      return jsonResult({
        posts: page.map((row) => ({
          id: row.id,
          title: row.title,
          excerpt: excerpt(row.content),
          tags: row.tags,
          author: { id: row.authorId, name: row.authorName },
          createdAt: row.createdAt.toISOString(),
        })),
        nextBefore: rows.length > limit ? (page.at(-1)?.id ?? null) : null,
      })
    },
  )

  server.registerTool(
    "get_post",
    {
      title: "Get post",
      description:
        "Get one une.haus post by id: full text, author, video link, like count and the latest 20 comments.",
      inputSchema: z.object({
        postId: z.number().int().positive().describe("the post id"),
      }),
      outputSchema: postOutput,
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ postId }) => {
      const [post] = await prodDb
        .select({
          id: posts.id,
          title: posts.title,
          content: posts.content,
          tags: posts.tags,
          createdAt: posts.createdAt,
          youtubeVideoId: posts.youtubeVideoId,
          playbackId: muxVideos.playbackId,
          authorId: users.id,
          authorName: users.name,
        })
        .from(posts)
        .innerJoin(users, eq(users.id, posts.userId))
        .leftJoin(muxVideos, eq(muxVideos.assetId, posts.muxAssetId))
        .where(eq(posts.id, postId))
        .limit(1)
      if (!post) return errorResult(`no post with id ${postId}`)

      const [likes, comments] = await Promise.all([
        prodDb
          .select({ n: count() })
          .from(postLikes)
          .where(eq(postLikes.postId, postId))
          .then(([row]) => row?.n ?? 0),
        prodDb
          .select({
            author: users.name,
            content: postMessages.content,
            createdAt: postMessages.createdAt,
          })
          .from(postMessages)
          .innerJoin(users, eq(users.id, postMessages.userId))
          .where(eq(postMessages.postId, postId))
          .orderBy(desc(postMessages.id))
          .limit(20),
      ])

      return jsonResult({
        id: post.id,
        title: post.title,
        content: post.content,
        tags: post.tags,
        author: { id: post.authorId, name: post.authorName },
        createdAt: post.createdAt.toISOString(),
        videoUrl: videoUrl(post.playbackId),
        youtubeUrl: post.youtubeVideoId
          ? `https://www.youtube.com/watch?v=${post.youtubeVideoId}`
          : null,
        likes,
        // Oldest first, so the thread reads top to bottom.
        comments: comments.toReversed().map((c) => ({
          author: c.author,
          content: c.content,
          createdAt: c.createdAt.toISOString(),
        })),
      })
    },
  )
}
