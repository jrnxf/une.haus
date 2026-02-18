import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { GhostIcon } from "lucide-react";

import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
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
      maxWidth: "lg",
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

      <div className="mx-auto w-full max-w-lg space-y-2 p-4">
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
            <Card key={t.id}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-muted-foreground font-mono text-xs">
                    {t.code}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" asChild>
                    <Link to="/tourney/live/$code" params={{ code: t.code }}>
                      Watch
                    </Link>
                  </Button>
                  {user?.id === t.createdByUserId && (
                    <Button variant="secondary" size="sm" asChild>
                      <Link
                        to={getPhaseRoute(t.phase)}
                        params={{ code: t.code }}
                      >
                        Manage
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
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
