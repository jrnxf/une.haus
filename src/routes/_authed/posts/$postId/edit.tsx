import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { BadgeInput } from "~/components/input/badge-input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { POST_TAGS } from "~/db/schema";
import { posts } from "~/lib/posts";
import { session } from "~/lib/session/index";
import { type ServerFnReturn } from "~/lib/types";
import { errorFmt } from "~/lib/utils";

import { PageHeader } from "~/components/page-header";

const pathParametersSchema = z.object({
  postId: z.coerce.number(),
});

export const Route = createFileRoute("/_authed/posts/$postId/edit")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  beforeLoad: async ({ context, params: { postId } }) => {
    const post = await context.queryClient.ensureQueryData(
      posts.get.queryOptions({ postId }),
    );

    if (post.user.id !== context.user.id) {
      await session.flash.set.fn({
        data: { message: "You can only edit your own posts" },
      });
      throw redirect({ to: "/posts/$postId", params: { postId } });
    }

    return { post };
  },
  loader: async ({ context, params: { postId } }) => {
    try {
      await context.queryClient.ensureQueryData(
        posts.get.queryOptions({ postId }),
      );
    } catch (error) {
      await session.flash.set.fn({ data: { message: errorFmt(error) } });
      throw redirect({ to: "/posts" });
    }
  },
});

function RouteComponent() {
  const { postId } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: post } = useSuspenseQuery(posts.get.queryOptions({ postId }));

  const { mutateAsync } = useMutation({
    mutationFn: posts.update.fn,
    onMutate: ({ data }) => {
      qc.cancelQueries({
        queryKey: posts.get.queryOptions({ postId }).queryKey,
      });

      const prev = qc.getQueryData(posts.get.queryOptions({ postId }).queryKey);

      qc.setQueryData(posts.get.queryOptions({ postId }).queryKey, (prev) => {
        return prev
          ? {
            ...prev,
            ...data,
          }
          : undefined;
      });

      navigate({ to: "/posts/$postId", params: { postId } });

      return {
        prev,
      };
    },
    onSuccess: () => {
      // no need to await - fire and forget. will almost definitely finish
      // before the user can navigate there
      qc.refetchQueries({
        queryKey: posts.list.infiniteQueryOptions({}).queryKey,
      });
    },
    onError: (error, _variables, context) => {
      console.error(error);
      if (context) {
        qc.setQueryData(
          posts.get.queryOptions({ postId }).queryKey,
          context.prev,
        );
        toast.error("Failed to update post");
        navigate({ to: "/posts/$postId/edit", params: { postId } });
      }
    },
    onSettled: () => {
      qc.invalidateQueries({
        queryKey: posts.get.queryOptions({ postId }).queryKey,
      });
    },
  });

  const rhf = useForm<z.input<typeof posts.create.schema>>({
    defaultValues: buildDefaultValues(post),
    resolver: zodResolver(posts.create.schema),
    shouldUnregister: false,
  });

  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
  } = rhf;

  if (!post) {
    return null;
  }

  return (
    <>
      <PageHeader maxWidth="max-w-4xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/posts">posts</PageHeader.Crumb>
          <PageHeader.Crumb to={`/posts/${postId}`}>{post.title}</PageHeader.Crumb>
          <PageHeader.Crumb>edit</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <Form
        rhf={rhf}
        className="mx-auto flex min-h-0 w-full max-w-4xl grow flex-col gap-4 p-4 md:p-6"
        id="main-content"
        method="post"
        onSubmit={(event) => {
          handleSubmit(async (data) => {
            await mutateAsync({ data: { ...data, postId } });
          })(event);
        }}
      >
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <BadgeInput
                  defaultSelections={field.value}
                  onChange={field.onChange}
                  options={POST_TAGS}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <FormSubmitButton busy={isSubmitting} />
        </div>
      </Form>
    </>
  );
}

function buildDefaultValues(post: ServerFnReturn<typeof posts.get.fn>) {
  return {
    content: post.content,
    media: post.imageId
      ? {
        type: "image" as const,
        value: post.imageId,
      }
      : post.video && post.video.playbackId
        ? {
          type: "video" as const,
          value: post.video.playbackId,
        }
        : post.youtubeVideoId
          ? {
            type: "youtube" as const,
            value: post.youtubeVideoId,
          }
          : undefined,
    tags: post.tags ?? [],
    title: post.title,
  } as const;
}
