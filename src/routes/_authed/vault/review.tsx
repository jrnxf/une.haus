import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { Card, CardContent } from "~/components/ui/card";
import { UtvSuggestionCard } from "~/components/vault/suggestion-card";
import { utv } from "~/lib/utv/core";

export const Route = createFileRoute("/_authed/vault/review")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      utv.suggestions.list.queryOptions({ status: "pending" }),
    );
  },
  staticData: {
    pageHeader: {
      breadcrumbs: [{ label: "vault", to: "/vault" }, { label: "review" }],
      maxWidth: "4xl",
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data: suggestions } = useSuspenseQuery(
    utv.suggestions.list.queryOptions({ status: "pending" }),
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Community suggestions</h1>

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
