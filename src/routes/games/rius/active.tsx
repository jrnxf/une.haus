import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { HeartIcon, MessageCircleIcon } from "lucide-react";
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
import { VideoPlayer } from "~/components/video-player";
import { Json } from "~/lib/dx/json";
import { games, groupSetsByUser } from "~/lib/games";
import { useCreateSubmission } from "~/lib/games/rius/hooks";
import { useVideoUpload } from "~/lib/media";
import { messages } from "~/lib/messages";
import { useCreateMessage } from "~/lib/messages/hooks";
import { useSessionUser } from "~/lib/session/hooks";
import { MessagesView } from "~/views/messages";

export const Route = createFileRoute("/games/rius/active")({
  component: RouteComponent,
  loader: async ({ context }) => {
    const activeRiuData = await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    );

    // Prefetch messages for all sets
    const messagePromises = activeRiuData.sets.map((set) =>
      context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "riuSet", id: set.id }),
      ),
    );

    await Promise.all(messagePromises);
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

function SetMessages({ setId }: { setId: number }) {
  const record = { type: "riuSet" as const, id: setId };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));
  const createMessage = useCreateMessage(record);

  return (
    <div className="flex h-64 flex-col">
      <MessagesView
        record={record}
        messages={messagesQuery.data.messages}
        handleCreateMessage={(content) => createMessage.mutate(content)}
      />
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
        <Json data={data} />
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

                    <AccordionContent className="@container px-3 pb-3">
                      <div
                        className="flex flex-col gap-3 @3xl:flex-row"
                        data-set-id={set.id}
                      >
                        <div className="space-y-3">
                          {/* Video player */}
                          {set.video?.playbackId && (
                            <div className="mx-auto aspect-video max-w-md">
                              <VideoPlayer playbackId={set.video.playbackId} />
                            </div>
                          )}

                          {/* Instructions below video */}
                          {set.instructions && (
                            <p className="text-muted-foreground text-xs">
                              {set.instructions}
                            </p>
                          )}
                        </div>

                        <div className="grow space-y-3">
                          {/* Action buttons */}
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

                          {/* Messages */}
                          <SetMessages setId={set.id} />
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
