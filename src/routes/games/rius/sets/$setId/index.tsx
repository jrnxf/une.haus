import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  HeartIcon,
  PencilIcon,
  Share2Icon,
  TrashIcon,
  TrendingUpIcon,
} from "lucide-react";

import { z } from "zod";

import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { VideoPlayer } from "~/components/video-player";
import { games } from "~/lib/games";
import { invariant } from "~/lib/invariant";
import { useSessionUser } from "~/lib/session/hooks";
import { session } from "~/lib/session/index";
import { cn } from "~/lib/utils";

const pathParametersSchema = z.object({
  setId: z.coerce.number(),
});

export const Route = createFileRoute("/games/rius/sets/$setId/")({
  component: RouteComponent,
  params: {
    parse: pathParametersSchema.parse,
  },
  loader: async ({ context, params: { setId } }) => {
    const ensureSet = async () => {
      try {
        await context.queryClient.ensureQueryData(
          games.rius.sets.get.queryOptions({ setId }),
        );
      } catch {
        await session.flash.set.fn({ data: { message: "Set not found" } });
        throw redirect({ to: "/games/rius" });
      }
    };

    await ensureSet();
  },
});

function RouteComponent() {
  const { setId } = Route.useParams();

  return (
    <div className="mx-auto flex w-full max-w-4xl grow overflow-hidden overflow-y-auto px-2 py-4">
      <ScrollArea
        className="flex w-full max-w-4xl grow overflow-hidden overflow-y-auto px-4"
        id="main-content"
      >
        <SetView setId={setId} />
      </ScrollArea>
    </div>
  );
}

function SetView({ setId }: { setId: number }) {
  const { data: set } = useSuspenseQuery(
    games.rius.sets.get.queryOptions({ setId }),
  );

  invariant(set, "Set not found");

  const sessionUser = useSessionUser();

  // TODO: Add like/unlike functionality for sets if needed
  const authUserLiked = false; // Sets don't have likes yet

  const isOwner = set.user.id === sessionUser?.id;

  return (
    <div className="mx-auto flex h-auto w-full max-w-4xl flex-col justify-start gap-6 p-3">
      <div>
        <div className="w-full space-y-1">
          <button
            className="flex items-center gap-2 text-2xl leading-none font-semibold tracking-tight"
            style={{ viewTransitionName: `set-name-${set.id}` }}
          >
            {set.name}
          </button>
        </div>

        <button
          className="text-muted-foreground text-sm"
          style={{ viewTransitionName: `user-name-${set.user.id}` }}
        >
          {set.user.name}
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon-sm" variant="outline" disabled>
            <HeartIcon
              className={cn(
                "size-4",
                authUserLiked && "fill-red-700/50 stroke-red-700",
              )}
            />
          </Button>
          <Button size="icon-sm" variant="outline" disabled>
            <TrendingUpIcon className="size-4" />
          </Button>
          <Button size="icon-sm" variant="outline" disabled>
            <Share2Icon className="size-4" />
          </Button>
        </div>
      </div>

      <div className="break-words whitespace-pre-wrap">
        <p>{set.description}</p>
      </div>

      {isOwner && (
        <div className="flex items-center gap-1">
          <Button size="icon-sm" variant="outline" disabled>
            <PencilIcon className="size-4" />
          </Button>
          <Button
            onClick={() => {
              // TODO: Implement delete set functionality
              console.log("Delete set", set.id);
            }}
            size="icon-sm"
            variant="outline"
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      )}

      {set.video && set.video.playbackId && (
        <VideoPlayer playbackId={set.video.playbackId} setId={set.id} />
      )}

      {/* Sets don't have messages yet - could be added later */}
    </div>
  );
}
