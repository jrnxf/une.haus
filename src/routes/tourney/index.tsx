import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
    <div className="mx-auto w-full max-w-lg space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Tournaments</h2>
        {user && (
          <Button asChild>
            <Link to="/tourney/create">Create</Link>
          </Button>
        )}
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-muted-foreground">No tournaments yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {tournaments.map((t) => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{t.name}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      {t.code}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">{t.phase}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Button size="sm" asChild>
                    <Link
                      to="/tourney/live/$code"
                      params={{ code: t.code }}
                    >
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
          ))}
        </div>
      )}
    </div>
  );
}

function getPhaseRoute(
  phase: string,
):
  | "/tourney/$code/prelims"
  | "/tourney/$code/ranking"
  | "/tourney/$code/bracket" {
  switch (phase) {
    case "prelims":
      return "/tourney/$code/prelims";
    case "ranking":
      return "/tourney/$code/ranking";
    case "bracket":
    case "complete":
      return "/tourney/$code/bracket";
    default:
      return "/tourney/$code/prelims";
  }
}
