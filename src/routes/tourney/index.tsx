import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GhostIcon } from "lucide-react";

import { PageHeader } from "~/components/page-header";
import { TimeAgo } from "~/components/time-ago";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { useSessionUser } from "~/lib/session/hooks";
import { tourney } from "~/lib/tourney";

export const Route = createFileRoute("/tourney/")({
  staticData: {
    pageHeader: {
      breadcrumbs: [{ label: "tourney" }],
      maxWidth: "4xl",
    },
  },
  component: RouteComponent,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tourney.list.queryOptions());
  },
});

function RouteComponent() {
  const user = useSessionUser();
  const { data: tournaments } = useSuspenseQuery(tourney.list.queryOptions());

  return (
    <>
      {user && (
        <PageHeader>
          <PageHeader.Actions>
            <Button asChild>
              <Link to="/tourney/create">Create</Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader>
      )}

      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 p-4">
        {tournaments.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>no tournaments</EmptyTitle>
              <EmptyDescription>check back later</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          tournaments.map((t) => (
            <Link
              key={t.id}
              to="/tourney/live/$code"
              params={{ code: t.code }}
              className="ring-offset-background focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden"
            >
              <div className="bg-card flex flex-col gap-2 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <p className="truncate font-semibold">{t.name}</p>
                  <Badge variant="secondary">{t.phase}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
                    <span className="font-mono">{t.code}</span>
                    <span>·</span>
                    <TimeAgo date={t.createdAt} />
                  </p>
                  {user?.id === t.createdByUserId && (
                    <Link
                      to={getPhaseRoute(t.phase)}
                      params={{ code: t.code }}
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground text-xs font-medium"
                    >
                      Manage
                    </Link>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}

function getPhaseRoute(
  phase: string,
):
  | "/tourney/$code/prelims"
  | "/tourney/$code/ranking"
  | "/tourney/$code/bracket" {
  switch (phase) {
    case "prelims": {
      return "/tourney/$code/prelims";
    }
    case "ranking": {
      return "/tourney/$code/ranking";
    }
    case "bracket":
    case "complete": {
      return "/tourney/$code/bracket";
    }
    default: {
      return "/tourney/$code/prelims";
    }
  }
}
