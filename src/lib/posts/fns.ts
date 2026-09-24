import { createServerFn, createServerOnlyFn } from "@tanstack/react-start"
import { zodValidator } from "@tanstack/zod-adapter"

import { authMiddleware } from "~/lib/middleware"
import {
  createPostSchema,
  deletePostSchema,
  getPostSchema,
  listPostsSchema,
  updatePostSchema,
} from "~/lib/posts/schemas"

const loadPostOps = createServerOnlyFn(() => import("~/lib/posts/ops.server"))

export const listPostsServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(listPostsSchema))
  .handler(async (ctx) => {
    const { listPosts } = await loadPostOps()
    return listPosts(ctx)
  })

export const getPostServerFn = createServerFn({
  method: "GET",
})
  .inputValidator(zodValidator(getPostSchema))
  .handler(async (ctx) => {
    const { getPost } = await loadPostOps()
    return getPost(ctx)
  })

export const createPostServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(createPostSchema))
  .handler(async (ctx) => {
    const { createPost } = await loadPostOps()
    return createPost(ctx)
  })

export const updatePostServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(updatePostSchema))
  .handler(async (ctx) => {
    const { updatePost } = await loadPostOps()
    return updatePost(ctx)
  })

export const deletePostServerFn = createServerFn({
  method: "POST",
})
  .middleware([authMiddleware])
  .inputValidator(zodValidator(deletePostSchema))
  .handler(async (ctx) => {
    const { deletePost } = await loadPostOps()
    return deletePost(ctx)
  })
