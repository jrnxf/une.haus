import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CornerDownLeftIcon, HeartIcon, MessageCircleIcon } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useDropzone } from "react-dropzone-esm";

import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { VideoPlayer } from "~/components/video-player";
import { games, groupSetsByUser } from "~/lib/games";
import { useCreateSubmission } from "~/lib/games/rius/hooks";
import { useVideoUpload } from "~/lib/media";
import { useSessionUser } from "~/lib/session/hooks";

export const Route = createFileRoute("/games/rius/active")({
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    );
  },
});

function UploadButton({
  onUploadSuccess,
}: {
  onUploadSuccess: (assetId: string) => void;
}) {
  const { uploadVideo, isUploading } = useVideoUpload({
    onSuccess: (data) => {
      onUploadSuccess(data.assetId);
      toast.success("Video uploaded successfully");
    },
  });

  const { getRootProps, getInputProps, open } = useDropzone({
    accept: { "video/*": [] },
    multiple: false,
    noClick: true,
    onDrop: useCallback(
      (acceptedFiles: File[]) => {
        const [file] = acceptedFiles;
        if (file) {
          uploadVideo(file);
        }
      },
      [uploadVideo],
    ),
  });

  return (
    <div {...getRootProps()}>
      <input {...getInputProps()} />
      <Button onClick={open} disabled={isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </Button>
    </div>
  );
}

function RouteComponent() {
  const { data } = useSuspenseQuery(games.rius.active.list.queryOptions());
  const sessionUser = useSessionUser();
  const createSubmission = useCreateSubmission();

  if (!data?.sets.length) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">No active RIUs available.</p>
      </div>
    );
  }

  // Group sets by user elegantly
  const groupedSets = useMemo(() => groupSetsByUser(data.sets), [data.sets]);

  return (
    <div className="flex flex-col gap-8 p-4">
      <h2 className="text-lg font-semibold">RIU #{data.id}</h2>
      <Accordion type="single" collapsible className="w-full rounded-lg border">
        {Object.entries(groupedSets).map(([userId, { user, sets }]) => (
          <AccordionItem
            key={userId}
            value={userId}
            className="border-b last:border-b-0"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <h2 className="font-semibold">{user.name}</h2>
            </AccordionTrigger>

            <AccordionContent className="px-4 pb-3">
              <Accordion
                type="single"
                collapsible
                className="rounded-md border"
                defaultValue={sets[0]?.id.toString()}
              >
                {sets.map((set) => (
                  <AccordionItem
                    key={set.id}
                    value={set.id.toString()}
                    className="border-b last:border-b-0"
                  >
                    <AccordionTrigger className="px-3 py-2 hover:no-underline">
                      <div className="flex w-full items-center justify-between pr-4">
                        <h3 className="text-sm font-medium">{set.name}</h3>
                        <div className="text-muted-foreground flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <MessageCircleIcon className="size-3" />
                            <span>0</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HeartIcon className="size-3" />
                            <span>0</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-3 pb-3">
                      <div className="space-y-4" data-set-id={set.id}>
                        {/* Video player */}
                        {set.video?.playbackId && (
                          <VideoPlayer playbackId={set.video.playbackId} />
                        )}

                        {/* Instructions below video */}
                        {set.instructions && (
                          <p className="text-muted-foreground text-xs">
                            {set.instructions}
                          </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {sessionUser && (
                            <UploadButton
                              onUploadSuccess={(assetId) => {
                                createSubmission.mutate({
                                  data: {
                                    riuSetId: set.id,
                                    muxAssetId: assetId,
                                  },
                                });
                              }}
                            />
                          )}

                          {/* Message form */}
                          <form className="bg-background focus-within:ring-ring border-input relative w-full overflow-clip rounded-md border px-2 focus-within:ring-2">
                            <div className="flex items-center gap-2">
                              <Input
                                className="h-9 border-0 px-1 shadow-none focus-visible:ring-0"
                                placeholder="Quick message..."
                              />
                              <Button
                                iconRight={
                                  <CornerDownLeftIcon className="size-3" />
                                }
                                size="sm"
                                type="submit"
                                variant="secondary"
                              />
                            </div>
                          </form>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
