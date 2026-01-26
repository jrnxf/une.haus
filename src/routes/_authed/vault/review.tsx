import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { UtvSuggestionCard } from "~/components/vault/suggestion-card";
import { utv } from "~/lib/utv/core";

export const Route = createFileRoute("/_authed/vault/review")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      utv.suggestions.list.queryOptions({ status: "pending" }),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: suggestions } = useSuspenseQuery(
    utv.suggestions.list.queryOptions({ status: "pending" }),
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link to="/vault">
            <ArrowLeftIcon className="size-4" />
            Back to vault
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            review vault edits
          </h1>
          {suggestions.length > 0 && (
            <Badge variant="secondary">{suggestions.length}</Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Community suggestions for video metadata
        </p>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No pending suggestions</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {suggestions.map((suggestion) => (
            <UtvSuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              showStatus={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
