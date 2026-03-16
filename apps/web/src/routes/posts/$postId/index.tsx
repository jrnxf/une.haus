import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { z } from "zod"

import { PageHeader } from "~/components/page-header"
import { getMuxPoster } from "~/components/video-player"
import { messages } from "~/lib/messages"
import { posts } from "~/lib/posts"
import { seo } from "~/lib/seo"
import { session } from "~/lib/session/index"
import { getCloudflareImageUrl } from "~/lib/utils"
import { PostView } from "~/views/post"

const pathParametersSchema = z.object({
  postId: z.coerce.number(),
})

export const Route = createFileRoute("/posts/$postId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { postId }, preload }) => {
    const ensurePost = async () => {
      try {
        return await context.queryClient.ensureQueryData(
          posts.get.queryOptions({ postId }),
        )
      } catch {
        // Only show flash message on actual navigation, not preload
        if (!preload) {
          await session.flash.set.fn({
            data: { type: "error", message: "post not found" },
          })
        }
        throw redirect({ to: "/posts" })
      }
    }

    const ensureMessages = async () => {
      await context.queryClient.ensureQueryData(
        messages.list.queryOptions({
          id: postId,
          type: "post",
        }),
      )
    }

    const [post] = await Promise.all([ensurePost(), ensureMessages()])
    return { post }
  },
  head: ({ loaderData }) => {
    const post = loaderData?.post
    if (!post) return {}

    const image = post.imageId
      ? getCloudflareImageUrl(post.imageId, { width: 1200, quality: 80 })
      : post.video?.playbackId
        ? getMuxPoster({ playbackId: post.video.playbackId, width: 1200 })
        : post.youtubeVideoId
          ? `https://img.youtube.com/vi/${post.youtubeVideoId}/hqdefault.jpg`
          : undefined

    return seo({
      title: post.title,
      description: post.content?.slice(0, 160) || "Post on une.haus",
      path: `/posts/${post.id}`,
      image,
      card: image ? "summary_large_image" : "summary",
      type: "article",
    })
  },
})

function RouteComponent() {
  const { postId } = Route.useParams()
  const { data: post } = useSuspenseQuery(posts.get.queryOptions({ postId }))

  return (
    <>
      <PageHeader maxWidth="max-w-3xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/posts">posts</PageHeader.Crumb>
          <PageHeader.Crumb>{post.title}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="h-full min-h-0 overflow-y-auto">
        <div className="mx-auto h-full w-full max-w-3xl">
          <PostView postId={postId} />
        </div>
      </div>
    </>
  )
}
