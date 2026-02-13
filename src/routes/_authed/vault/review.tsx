import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";
import { Badge } from "~/components/ui/badge";
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
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/vault">vault</PageHeader.Crumb>
          <PageHeader.Crumb>review</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm">
            Community suggestions for video metadata
          </p>
          {suggestions.length > 0 && (
            <Badge variant="secondary">{suggestions.length}</Badge>
          )}
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
    </>
  );
}
