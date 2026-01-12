import { useNavigate } from "@tanstack/react-router";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";

import { SetCard } from "./set-card";

type SetData = {
  id: number;
  name: string;
  instructions: string | null;
  user: {
    id: number;
    name: string;
    avatarId: string | null;
  };
  likes?: unknown[];
  submissions?: unknown[];
};

type GroupedSets = Record<
  number,
  {
    user: SetData["user"];
    sets: SetData[];
  }
>;

type SetsGroupedListProps = {
  groupedSets: GroupedSets;
  openUserId?: number;
  basePath: string;
  searchParams?: Record<string, unknown>;
};

export function SetsGroupedList({
  groupedSets,
  openUserId,
  basePath,
  searchParams = {},
}: SetsGroupedListProps) {
  const navigate = useNavigate();

  const entries = Object.entries(groupedSets);

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">No sets available</p>
      </div>
    );
  }

  return (
    <Accordion
      type="single"
      collapsible
      className="space-y-2"
      value={openUserId?.toString()}
      onValueChange={(value) => {
        navigate({
          to: basePath,
          search: {
            ...searchParams,
            open: value ? Number.parseInt(value, 10) : undefined,
          },
          replace: true,
        });
      }}
    >
      {entries.map(([userId, { user, sets }]) => (
        <AccordionItem
          key={userId}
          value={userId}
          className="bg-card overflow-hidden rounded-lg border last:border-b"
        >
          <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]]:border-b">
            <div className="flex items-center gap-3">
              <Avatar
                className="size-8 rounded-full"
                cloudflareId={user.avatarId}
                alt={user.name}
              >
                <AvatarImage width={32} quality={85} />
                <AvatarFallback className="text-xs" name={user.name} />
              </Avatar>
              <div className="text-left">
                <h3 className="text-sm font-medium">{user.name}</h3>
                <p className="text-muted-foreground text-xs">
                  {sets.length} {sets.length === 1 ? "set" : "sets"}
                </p>
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-3 pt-0">
            <div className="flex flex-col gap-2 pt-3">
              {sets.map((set) => (
                <SetCard key={set.id} set={set} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
