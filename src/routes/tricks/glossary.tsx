import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/tricks/glossary")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tricks.graph.queryOptions());
  },
  staticData: {
    pageHeader: {
      breadcrumbs: [{ label: "tricks", to: "/tricks" }, { label: "glossary" }],
      maxWidth: "4xl",
    },
  },
  component: TricksGlossaryPage,
});

function TricksGlossaryPage() {
  const { data } = useSuspenseQuery(tricks.graph.queryOptions());

  const prefixes = [...data.prefixes].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
      <div className="flex flex-col gap-4">
        {prefixes.map((prefix) => (
          <Link
            key={prefix.id}
            to="/tricks/$trickId"
            params={{ trickId: prefix.id }}
            className="group hover:bg-accent flex flex-col gap-1 rounded-lg border p-4 transition-colors"
          >
            <span className="group-hover:text-accent-foreground text-sm font-medium">
              {prefix.name}
            </span>
            {prefix.definition && (
              <span className="text-muted-foreground text-sm">
                {prefix.definition}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
