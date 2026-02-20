import { useNavigate } from "@tanstack/react-router";

import pluralize from "pluralize";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { type RankedRider } from "~/lib/games";
import { type RiderScore } from "~/lib/games/rius/ranking";

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

type SetsGroupedListProps = {
  rankedRiders: RankedRider<SetData>[];
  openUserId?: number;
  basePath: string;
  pathParams?: Record<string, string>;
  searchParams?: Record<string, unknown>;
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge
        variant="default"
        className="bg-yellow-600 px-1.5 py-0 text-[10px] text-yellow-100 dark:bg-yellow-700"
      >
        1st
      </Badge>
    );
  }
  if (rank === 2) {
    return (
      <Badge
        variant="default"
        className="bg-gray-500 px-1.5 py-0 text-[10px] text-gray-100 dark:bg-gray-600"
      >
        2nd
      </Badge>
    );
  }
  if (rank === 3) {
    return (
      <Badge
        variant="default"
        className="bg-amber-700 px-1.5 py-0 text-[10px] text-amber-100 dark:bg-amber-800"
      >
        3rd
      </Badge>
    );
  }
  return null;
}

function RiderStats({ ranking }: { ranking: RiderScore }) {
  const parts: string[] = [];

  if (ranking.setsCount > 0) {
    parts.push(`${ranking.setsCount} ${pluralize("set", ranking.setsCount)}`);
  }
  if (ranking.submissionsCount > 0) {
    parts.push(
      `${ranking.submissionsCount} ${pluralize("submission", ranking.submissionsCount)}`,
    );
  }

  const statsText = parts.join(" · ");
  const pointsText = `${ranking.points} ${ranking.points === 1 ? "pt" : "pts"}`; // "pt" is an abbreviation, not a real word

  return (
    <p className="text-muted-foreground text-xs">
      {statsText} · {pointsText}
    </p>
  );
}

export function SetsGroupedList({
  rankedRiders,
  openUserId,
  basePath,
  pathParams = {},
  searchParams = {},
}: SetsGroupedListProps) {
  const navigate = useNavigate();

  if (rankedRiders.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground">No sets available</p>
      </div>
    );
  }

  return (
    <Accordion
      className="space-y-2"
      value={openUserId ? [openUserId.toString()] : []}
      onValueChange={(value) => {
        const first = value[0];
        navigate({
          to: basePath,
          params: pathParams,
          search: {
            ...searchParams,
            open: first ? Number.parseInt(String(first), 10) : undefined,
          },
          replace: true,
        });
      }}
    >
      {rankedRiders.map(({ user, sets, ranking }) => (
        <AccordionItem
          key={user.id}
          value={user.id.toString()}
          className="bg-card overflow-hidden rounded-lg border last:border-b"
        >
          <AccordionTrigger className="[&[data-state=open]]:border-border border-b border-transparent px-4 py-3 hover:no-underline [&[data-state=open]]:rounded-b-none">
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
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium">{user.name}</h3>
                  <RankBadge rank={ranking.rank} />
                </div>
                <RiderStats ranking={ranking} />
              </div>
            </div>
          </AccordionTrigger>

          <AccordionContent className="p-3 pt-0">
            <div className="flex flex-col gap-2 pt-3">
              {sets.length > 0 ? (
                sets.map((set) => <SetCard key={set.id} set={set} />)
              ) : (
                <p className="text-muted-foreground py-2 text-center text-sm">
                  No sets uploaded (submissions only)
                </p>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
