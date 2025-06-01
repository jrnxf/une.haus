import { useMutation } from "@tanstack/react-query";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone-esm";

import { Button } from "~/components/ui/button";
import { useFormField } from "~/components/ui/form";
import { useFormOps } from "~/components/ui/form-ops-provider";
import { media } from "~/lib/media";
import { cn } from "~/lib/utils";

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

  const createPresignedS3Url = useMutation({
    mutationFn: media.createPresignedS3Url.fn,
  });

  const { pendingImageUpload, setPendingImageUpload } = useFormOps();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const [file] = acceptedFiles;
      if (file) {
        setFile(file);
        try {
          setPendingImageUpload(true);
          const presignedS3Url = await createPresignedS3Url.mutateAsync({
            data: {
              fileName: file.name,
            },
          });
          const { href, origin, pathname } = new URL(presignedS3Url);

          await fetch(href, { body: file, method: "PUT" });

          const imageUrl = origin + pathname;

          onChange(imageUrl);
        } catch {
          setFile(undefined);
        } finally {
          setPendingImageUpload(false);
        }
      }
    },
    [onChange, setPendingImageUpload],
  );

  const { acceptedFiles, getInputProps, getRootProps } = useDropzone({
    accept: { "image/*": [] },
    multiple: false,
    onDrop,
  });

  const previewSource = file ? URL.createObjectURL(file) : value;

  if (previewSource) {
    return (
      <div
        className={cn(
          "group relative flex size-48 shrink-0 items-center justify-center overflow-hidden",
          previewClassNames,
        )}
      >
        <img
          alt=""
          className={cn(
            "size-full object-cover",
            pendingImageUpload && "opacity-30",
          )}
          src={previewSource}
        />
        {pendingImageUpload ? (
          <div className="bg-opacity-50 absolute inset-0 flex h-full items-center justify-center bg-zinc-900 text-white">
            <Loader2Icon className="size-6 animate-spin duration-700" />
          </div>
        ) : (
          <Button
            className="absolute inset-0 flex h-full items-center justify-center rounded-none bg-red-900/90 text-white opacity-0 outline-hidden group-hover:opacity-100 focus:opacity-100"
            onClick={() => {
              setFile(undefined);
              onChange(null);
            }}
            type="button"
            variant="unstyled"
          >
            <TrashIcon className="size-6" />
          </Button>
        )}
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
          {acceptedFiles[0]
            ? acceptedFiles[0].name
            : "Click to select an image or drag and drop one here"}
        </span>
      </Button>
    </div>
  );
};
