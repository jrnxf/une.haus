import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "~/components/page-header";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/tricks/glossary")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tricks.graph.queryOptions());
  },
  component: TricksGlossaryPage,
});

function TricksGlossaryPage() {
  const { data } = useSuspenseQuery(tricks.graph.queryOptions());

  const prefixes = [...data.prefixes].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>glossary</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="mx-auto w-full max-w-4xl p-4 md:p-6">
        <div className="flex flex-col gap-4">
          {prefixes.map((prefix) => (
            <Link
              key={prefix.id}
              to="/tricks/$trickId"
              params={{ trickId: prefix.id }}
              className="group flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-accent"
            >
              <span className="text-sm font-medium group-hover:text-accent-foreground">
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
    </>
  );
}
