import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  HeartIcon,
  MessageCircleIcon,
  UploadIcon,
} from "lucide-react";
import { useMemo } from "react";

import { z } from "zod";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { games, groupSetsByUser } from "~/lib/games";
import { invariant } from "~/lib/invariant";
import { messages } from "~/lib/messages";
import { type ServerFnReturn } from "~/lib/types";

const formatRiuDate = (createdAt: Date | string) => {
  const date = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const searchSchema = z.object({
  riuId: z.number().optional(), // selected RIU id
  open: z.number().optional(), // userId of open accordion
});

type SetType = NonNullable<
  ServerFnReturn<typeof games.rius.archived.get.fn>
>["sets"][number];

function SetCard({ set }: { set: SetType }) {
  const record = { type: "riuSet" as const, id: set.id };
  const messagesQuery = useSuspenseQuery(messages.list.queryOptions(record));

  return (
    <Link
      to="/games/rius/sets/$setId"
      params={{ setId: set.id }}
      className="block"
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
                <span>0</span>
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

export const Route = createFileRoute("/games/rius/previous/")({
  component: RouteComponent,
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ riuId: search.riuId }),
  loader: async ({ context, deps }) => {
    const archivedRius = await context.queryClient.ensureQueryData(
      games.rius.archived.list.queryOptions(),
    );

    const riuId = deps.riuId ?? archivedRius[0].id;

    const riu = await context.queryClient.ensureQueryData(
      games.rius.archived.get.queryOptions({ riuId }),
    );

    // todo is invariant the right thing here
    invariant(riu, "RIU not found");

    // Prefetch messages for all sets to show accurate counts
    const allSets = riu.sets;
    const messagePromises = allSets.map((set) =>
      context.queryClient.ensureQueryData(
        messages.list.queryOptions({ type: "riuSet", id: set.id }),
      ),
    );

    await Promise.all(messagePromises);
  },
});

function RouteComponent() {
  const { riuId: searchRiuId, open } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: archivedRius } = useSuspenseQuery(
    games.rius.archived.list.queryOptions(),
  );

  const selectedRiuId = searchRiuId ?? archivedRius[0].id;

  const { data: selectedRiu } = useSuspenseQuery(
    games.rius.archived.get.queryOptions({ riuId: selectedRiuId }),
  );
  // Group sets by user elegantly
  const groupedSets = useMemo(() => {
    if (!selectedRiu) return {};
    return groupSetsByUser(selectedRiu.sets);
  }, [selectedRiu]);

  if (archivedRius.length === 0) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground">No previous RIUs available yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Previous RIUs</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-between">
              {selectedRiu ? (
                <span>
                  RIU #{selectedRiu.id} - {formatRiuDate(selectedRiu.createdAt)}
                </span>
              ) : (
                "Select a RIU"
              )}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="h-[400px] min-w-[250px]">
              {archivedRius.map((riu) => (
                <DropdownMenuItem key={riu.id} asChild>
                  <Link
                    to="/games/rius/previous"
                    search={{ riuId: riu.id }}
                    className="flex flex-col"
                  >
                    <span className="font-medium">RIU #{riu.id}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatRiuDate(riu.createdAt)} • {riu.setsCount} sets
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {selectedRiu && Object.keys(groupedSets).length > 0 && (
        <Accordion
          type="single"
          collapsible
          className="w-full rounded-lg border"
          value={open?.toString() ?? ""}
          onValueChange={(value) => {
            navigate({
              search: (prev) => ({
                ...prev,
                open: value ? Number.parseInt(value, 10) : undefined,
              }),
              replace: true,
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
      )}
    </div>
  );
}
