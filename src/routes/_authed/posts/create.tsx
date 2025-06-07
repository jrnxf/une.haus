import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { type z } from "zod";

import { BadgeInput } from "~/components/input/badge-input";
import { ImageInput } from "~/components/input/image-input";
import { VideoInput } from "~/components/input/video-input";
import { YoutubeInput } from "~/components/input/youtube-input";
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
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import { POST_TAGS } from "~/db/schema";
import { posts } from "~/lib/posts";

const MEDIA_OPTIONS = {
  none: "None",
  image: "Image",
  video: "Video",
  youtube: "YouTube",
} as const;

type MediaOption = keyof typeof MEDIA_OPTIONS;

export const Route = createFileRoute("/_authed/posts/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();

  const [mediaOption, setMediaOption] = useState<MediaOption>("none");

  const { mutate } = useMutation({
    mutationFn: posts.create.fn,
    onSuccess: async (data) => {
      // no need to await - fire and forget. will almost definitely finish
      // before the user can navigate there
      qc.refetchQueries({
        queryKey: posts.list.infiniteQueryOptions({}).queryKey,
      });

      router.navigate({ params: { postId: data.id }, to: "/posts/$postId" });
    },
    onError: () => {
      // sentry
      toast.error("Failed to create post");
    },
  });

  const form = useForm<z.infer<typeof posts.create.schema>>({
    resolver: zodResolver(posts.create.schema),
    shouldUnregister: false,
  });

  const {
    control,
    formState: { isSubmitting },
    handleSubmit,
  } = form;

  return (
    <Form {...form}>
      <form
        className="mx-auto flex min-h-0 w-full max-w-4xl grow flex-col gap-4 px-4 py-6"
        id="main-content"
        method="post"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit((data) => {
            mutate({ data });
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

        <FormField
          control={control}
          name="media"
          render={({ field }) => {
            const currentValue = field.value?.value;

            return (
              <FormItem>
                <FormLabel>Media</FormLabel>
                <RadioGroup
                  className="flex gap-6 py-2"
                  onValueChange={(value) => {
                    field.onChange(undefined);
                    setMediaOption(value as MediaOption);
                  }}
                  value={mediaOption}
                >
                  {Object.entries(MEDIA_OPTIONS).map(([k, v]) => (
                    <Label
                      htmlFor={k}
                      className="flex items-center space-x-2"
                      key={k}
                    >
                      <RadioGroupItem id={k} value={k} />
                      {v}
                    </Label>
                  ))}
                </RadioGroup>
                <FormControl>
                  <>
                    {mediaOption === "youtube" && (
                      <YoutubeInput
                        currentId={currentValue}
                        onChange={(id) => {
                          field.onChange(
                            id ? { type: "youtube", value: id } : undefined,
                          );
                        }}
                      />
                    )}

                    {mediaOption === "image" && (
                      <ImageInput
                        previewClassNames="rounded-md size-86"
                        value={currentValue}
                        onChange={(data) => {
                          field.onChange(
                            data ? { type: "image", value: data } : undefined,
                          );
                        }}
                      />
                    )}

                    {mediaOption === "video" && (
                      <VideoInput
                        onChange={(data) => {
                          field.onChange(
                            data ? { type: "video", value: data } : undefined,
                          );
                        }}
                      />
                    )}
                  </>
                </FormControl>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormSubmitButton busy={isSubmitting} />
      </form>
    </Form>
  );
}
