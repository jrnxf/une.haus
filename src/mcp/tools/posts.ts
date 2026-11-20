import { and, count, desc, eq, like, lt, or, sql } from "drizzle-orm"
import { z } from "zod"

import { muxVideos, postLikes, postMessages, posts, users } from "~/db/schema"
import { ToolError, defineTool } from "~/mcp/tools/define"
import { LIST_LIMIT, excerpt, videoUrl } from "~/mcp/tools/result"

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
      likes: z.number(),
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

export const listPostsTool = defineTool({
  name: "list_posts",
  title: "List posts",
  description:
    "List une.haus community posts, newest first or most liked first. Filter by words in the title or body, or by author user id. Returns short excerpts and like counts; call get_post for the full text and comments.",
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
    sort: z
      .enum(["newest", "likes"])
      .default("newest")
      .describe("newest first, or most liked first"),
    before: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("nextBefore from the previous page; newest sort only"),
  }),
  outputSchema: listOutput,
  run: async (db, { q, userId, limit, sort, before }) => {
    const likes = db.$with("likes").as(
      db
        .select({ postId: postLikes.postId, n: count().as("n") })
        .from(postLikes)
        .groupBy(postLikes.postId),
    )
    const likeCount = sql<number>`coalesce(${likes.n}, 0)`
    const byLikes = sort === "likes"
    // Ask for one extra row. If it comes back, there is a next page.
    const rows = await db
      .with(likes)
      .select({
        likes: likeCount,
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
      .leftJoin(likes, eq(likes.postId, posts.id))
      .where(
        and(
          q
            ? or(like(posts.title, `%${q}%`), like(posts.content, `%${q}%`))
            : undefined,
          userId ? eq(posts.userId, userId) : undefined,
          before && !byLikes ? lt(posts.id, before) : undefined,
        ),
      )
      .orderBy(
        ...(byLikes ? [desc(likeCount), desc(posts.id)] : [desc(posts.id)]),
      )
      .limit(limit + 1)

    const page = rows.slice(0, limit)
    return {
      posts: page.map((row) => ({
        id: row.id,
        title: row.title,
        excerpt: excerpt(row.content),
        tags: row.tags,
        author: { id: row.authorId, name: row.authorName },
        createdAt: row.createdAt.toISOString(),
        likes: row.likes,
      })),
      // A like ranking has no id cursor, so it is one page.
      nextBefore:
        !byLikes && rows.length > limit ? (page.at(-1)?.id ?? null) : null,
    }
  },
})

export const getPostTool = defineTool({
  name: "get_post",
  title: "Get post",
  description:
    "Get one une.haus post by id: full text, author, video link, like count and the latest 20 comments.",
  inputSchema: z.object({
    postId: z.number().int().positive().describe("the post id"),
  }),
  outputSchema: postOutput,
  run: async (db, { postId }) => {
    const [post] = await db
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
    if (!post) throw new ToolError(`no post with id ${postId}`)

    const [likes, comments] = await Promise.all([
      db
        .select({ n: count() })
        .from(postLikes)
        .where(eq(postLikes.postId, postId))
        .then(([row]) => row?.n ?? 0),
      db
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

    return {
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
    }
  },
})
