import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import {
  Controller,
  type DefaultValues,
  FormProvider,
  useForm,
} from "react-hook-form";

import { BadgeInput } from "~/components/badge-input";
import { FormMessage, FormSubmitButton } from "~/components/ui/form";
import { FormOpsProvider } from "~/components/ui/form-ops-provider";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Textarea } from "~/components/ui/textarea";
import { YoutubeInput } from "~/components/youtube-input";
import { POST_TAGS } from "~/db/schema";
import { posts } from "~/lib/posts";
import { type CreateUpdatePostArgs } from "~/models/posts";

const MEDIA_TYPES = {
  none: "None",
  upload: "Upload",
  youtube: "YouTube",
} as const;

type MediaType = keyof typeof MEDIA_TYPES;

export function PostForm({
  defaultValues = {
    content: undefined,
    imageUrl: undefined,
    title: undefined,
    videoPlaybackId: undefined,
    videoUploadId: undefined,
  },
  onSubmit,
}: {
  defaultValues?: DefaultValues<CreateUpdatePostArgs> & {
    videoPlaybackId?: string;
  };
  onSubmit: (data: CreateUpdatePostArgs) => void;
}) {
  const form = useForm<CreateUpdatePostArgs>({
    defaultValues: {
      content: defaultValues.content,
      imageUrl: defaultValues.imageUrl,
      tags: defaultValues.tags,
      title: defaultValues.title,
      videoUploadId: defaultValues.videoUploadId,
    },
    resolver: zodResolver(posts.create.schema),
    shouldUnregister: false,
  });

  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    // watch,
  } = form;

  const [mediaType, setMediaType] = useState<MediaType>(
    defaultValues.imageUrl || defaultValues.videoUploadId ? "upload" : "none",
  );

  // const formImageUrl = watch("imageUrl");
  // const formVideoUploadId = watch("videoUploadId");

  return (
    <div className="mx-auto w-full max-w-xl">
      <FormProvider {...form}>
        <FormOpsProvider>
          <form
            className="space-y-4"
            method="post"
            onSubmit={(event) => {
              event.preventDefault();
              handleSubmit((data) => {
                const processedData = { ...data };

                if (mediaType !== "upload") {
                  processedData.imageUrl = null;
                  processedData.videoUploadId = null;
                }

                if (mediaType !== "youtube") {
                  processedData.youtubeVideoId = null;
                }

                onSubmit(processedData);
              })(event);
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Title</Label>
              <Input {...register("title")} autoFocus id="title" />
              <FormMessage error={errors.title} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea {...register("content")} id="content" />
              <FormMessage error={errors.content} />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="tags">Tags</Label>
              <Controller
                control={control}
                name="tags"
                render={({ field: { onChange, value } }) => (
                  <BadgeInput
                    defaultSelections={value}
                    onChange={onChange}
                    options={POST_TAGS}
                  />
                )}
              />
              <FormMessage error={errors.tags} />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Media</Label>
              <RadioGroup
                className="flex gap-6 py-2"
                onValueChange={(value) => setMediaType(value as MediaType)}
                value={mediaType}
              >
                {Object.entries(MEDIA_TYPES).map(([k, v]) => (
                  <div className="flex items-center space-x-2" key={k}>
                    <RadioGroupItem id="r2" value={k} />
                    <Label htmlFor="r2">{v}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
            {/* 
            {mediaType === "upload" && (
              <>
                <div className="flex flex-col gap-2">
                  {formImageUrl ||
                  (formVideoUploadId && defaultValues.videoPlaybackId) ? (
                    <div className="flex flex-col gap-2">
                      <div className="h-80">
                        {formImageUrl ? (
                          <img
                            alt=""
                            className="h-full rounded-lg object-cover"
                            src={formImageUrl}
                          />
                        ) : formVideoUploadId &&
                          defaultValues.videoPlaybackId ? (
                          <MuxPlayer
                            accentColor="#000000"
                            className="aspect-video"
                            playbackId={defaultValues.videoPlaybackId}
                            playbackRates={[0.1, 0.25, 0.5, 0.75, 1]}
                            poster={getMuxPoster(defaultValues.videoPlaybackId)}
                            preload="none" // save on bandwidth
                            streamType="on-demand"
                          />
                        ) : null}
                      </div>

                      <Button
                        iconRight={<TrashIcon className="size-4" />}
                        onClick={() => {
                          setValue("imageUrl", null);
                          setValue("videoUploadId", null);
                        }}
                        type="button"
                        variant="destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <>
                      <ImageOrVideoInput
                        imageName="imageUrl"
                        videoName="videoUploadId"
                      />
                      <FormMessage error={errors.imageUrl} />
                      <FormMessage error={errors.videoUploadId} />
                    </>
                  )}
                </div>
              </>
            )} */}

            {mediaType === "youtube" && (
              <Controller
                control={control}
                name="youtubeVideoId"
                render={({ field: { onChange, value } }) => (
                  <YoutubeInput currentId={value} onChange={onChange} />
                )}
              />
            )}

            <div className="float-right">
              <FormSubmitButton busy={isSubmitting} />
            </div>
          </form>
        </FormOpsProvider>
      </FormProvider>
    </div>
  );
}
