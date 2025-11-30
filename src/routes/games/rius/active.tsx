import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { HeartIcon, MessageCircleIcon, UploadIcon } from "lucide-react";
import { useMemo } from "react";

import { z } from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import { Json } from "~/lib/dx/json";
import { games, groupSetsByUser } from "~/lib/games";
import { messages } from "~/lib/messages";
import { type ServerFnReturn } from "~/lib/types";

const searchSchema = z.object({
  open: z.number().optional(), // userId of open accordion
});

export const Route = createFileRoute("/games/rius/active")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loader: async ({ context }) => {
    const activeRiuData = await context.queryClient.ensureQueryData(
      games.rius.active.list.queryOptions(),
    );

    // Prefetch messages for all sets to show accurate counts
    const messagePromises = activeRiuData.sets.map((set) =>
      context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "riuSet", id: set.id }),
      ),
    );

    await Promise.all(messagePromises);
  },
});

type SetType = ServerFnReturn<typeof games.rius.active.list.fn>["sets"][number];

function SetCard({ set }: { set: SetType }) {
  const record = { type: "riuSet" as const, id: set.id };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));

  return (
    <Link
      to="/games/rius/sets/$setId"
      params={{ setId: set.id }}
      className="block"
      preload="intent"
    >
      <Button
        variant="outline"
        className="h-auto w-full flex-col items-start justify-start gap-1 p-3 text-left whitespace-normal"
        asChild
      >
        <div>
          {/* Content */}
          <div className="flex w-full items-start justify-between gap-6">
            <h3 className="truncate text-sm font-medium">{set.name}</h3>
            {/* Stats */}
            <div className="text-muted-foreground flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <MessageCircleIcon className="size-3" />
                <span>{messagesQuery.data.messages.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <HeartIcon className="size-3" />
                <span>{set.likes.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <UploadIcon className="size-3" />
                <span>0</span>
              </div>
            </div>
          </div>

          {set.instructions && (
            <p className="text-muted-foreground line-clamp-2 overflow-hidden text-xs">
              {set.instructions}
            </p>
          )}
        </div>
      </Button>
    </Link>
  );
}

function RouteComponent() {
  const { open } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data } = useSuspenseQuery(games.rius.active.list.queryOptions());

  // Group sets by user elegantly
  const groupedSets = useMemo(() => groupSetsByUser(data.sets), [data.sets]);

  if (!data?.sets.length) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">No active RIUs available.</p>
        <Json data={data} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      <h2 className="text-lg font-semibold">RIU #{data.id}</h2>

      <Accordion
        type="single"
        collapsible
        className="w-full rounded-lg border"
        value={open?.toString()}
        onValueChange={(value) => {
          navigate({
            search: (prev) => ({
              ...prev,
              open: value ? Number.parseInt(value, 10) : undefined,
            }),
          });
        }}
      >
        {Object.entries(groupedSets).map(([userId, { user, sets }]) => (
          <AccordionItem
            key={userId}
            value={userId}
            className="border-b last:border-b-0"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <h2 className="font-semibold">{user.name}</h2>
            </AccordionTrigger>

            <AccordionContent className="border-t p-3">
              <div className="flex flex-col gap-3">
                {sets.map((set) => (
                  <SetCard key={set.id} set={set} />
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
