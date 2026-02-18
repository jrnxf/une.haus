import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";

import z from "zod";

import { Button } from "~/components/ui/button";
import { useFormField, useFormMedia } from "~/components/ui/form";
import { invariant } from "~/lib/invariant";
import { media } from "~/lib/media";
import { nano } from "~/lib/nanoid";
import { cn, getCloudflareImageUrl } from "~/lib/utils";

const cloudflareDirectUploadResponseSchema = z.object({
  result: z.object({
    id: z.string(),
  }),
});

export const ImageInput = ({
  value,
  onChange,
  previewClassNames,
}: {
  value: string | null | undefined;
  onChange: (url: null | string) => void;
  previewClassNames?: string;
}) => {
  const { formItemId } = useFormField();

  const [file, setFile] = useState<File>();

  const createCloudflareImagesDirectUpload = useMutation({
    mutationFn: media.createCloudflareImagesDirectUpload.fn,
  });

  const { imageUploadStatus, setImageUploadStatus } = useFormMedia();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) {
        setFile(file);
        try {
          setImageUploadStatus("pending");
          const directUpload =
            await createCloudflareImagesDirectUpload.mutateAsync({});

          invariant(directUpload.uploadURL, "Failed to create direct upload");

          const ext = file.name.split(".").pop();
          const newFileName = `${nano()}.${ext}`;

          const formData = new FormData();
          formData.append("file", file, newFileName);

          const response = await fetch(directUpload.uploadURL, {
            body: formData,
            method: "POST",
          });

          const data = await response.json();
          const parsedData = cloudflareDirectUploadResponseSchema.parse(data);

          onChange(parsedData.result.id);
        } catch {
          setFile(undefined);
        } finally {
          setImageUploadStatus("idle");
        }
      }
    },
    [createCloudflareImagesDirectUpload, onChange, setImageUploadStatus],
  );

  const { getInputProps, getRootProps } = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    onDrop,
  });

  const previewSource = file
    ? URL.createObjectURL(file)
    : value
      ? getCloudflareImageUrl(value, { width: 400, quality: 80 })
      : null;

  if (previewSource) {
    return (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "group relative flex size-48 shrink-0 items-center justify-center overflow-hidden rounded-full",
            previewClassNames,
          )}
        >
          <img
            alt=""
            className={cn(
              "size-full object-cover",
              imageUploadStatus === "pending" && "opacity-30",
            )}
            src={previewSource}
          />
          {imageUploadStatus === "pending" && (
            <div className="absolute inset-0 flex h-full items-center justify-center bg-zinc-900/50 text-white">
              <Loader2Icon className="size-6 animate-spin duration-700" />
            </div>
          )}
        </div>
        <Button
          className="self-start"
          onClick={() => {
            setFile(undefined);
            onChange(null);
          }}
          iconRight={<TrashIcon className="size-4" />}
          type="button"
          variant="destructive"
        >
          Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="h-32">
      <Button
        aria-label="file upload"
        className="border-border h-full w-full rounded-md border-2 border-dashed"
        type="button"
        variant="unstyled"
        {...getRootProps()}
      >
        <input {...getInputProps()} id={formItemId} />

        <span className="w-64 leading-relaxed text-wrap sm:w-auto">
          {file
            ? file.name
            : "Click to select an image or drag and drop one here"}
        </span>
      </Button>
    </div>
  );
};
