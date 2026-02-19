import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ReactFlowProvider } from "@xyflow/react";

import { zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";

import { TricksGraph } from "~/components/tricks/tricks-graph";
import { TricksSearch } from "~/components/tricks/tricks-search";
import { TricksSidebar } from "~/components/tricks/tricks-sidebar";
import { tricks, type Trick } from "~/lib/tricks";

import { PageHeader } from "~/components/page-header";

const graphSearchSchema = z.object({
  trick: z.string().optional(),
});

export const Route = createFileRoute("/tricks/graph")({
  validateSearch: zodValidator(graphSearchSchema),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tricks.graph.queryOptions());
  },
  component: TricksGraphPage,
});

function TricksGraphPage() {
  const { trick: selectedSlug } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data } = useSuspenseQuery(tricks.graph.queryOptions());

  const nonPrefixTricks = data.tricks.filter((t) => !t.isPrefix);

  const activeTrickId = selectedSlug ?? "treyflip";

  function handleSelectTrick(trick: Trick) {
    navigate({
      search: { trick: trick.id },
      replace: true,
    });
  }

  function handleCenterNodeClick(trick: Trick, meta: { metaKey: boolean }) {
    if (meta.metaKey) {
      window.open(`/tricks/${trick.id}`, "_blank");
    } else {
      navigate({
        to: "/tricks/$trickId",
        params: { trickId: trick.id },
      });
    }
  }

  function handleOpenTrickDetail(trick: Trick) {
    navigate({
      to: "/tricks/$trickId",
      params: { trickId: trick.id },
    });
  }

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>tricks</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Tabs>
          <PageHeader.Tab to="/tricks">list</PageHeader.Tab>
          <PageHeader.Tab to="/tricks/graph">graph</PageHeader.Tab>
          <PageHeader.Tab to="/tricks/builder">builder</PageHeader.Tab>
        </PageHeader.Tabs>
      </PageHeader>
      <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row">
      <div className="shrink-0 border-b p-4 md:hidden">
        <TricksSearch data={data} onSelectTrick={handleSelectTrick} />
      </div>

      <TricksSidebar
        tricks={nonPrefixTricks}
        selectedId={activeTrickId}
        onSelect={handleSelectTrick}
      />

      <div className="min-h-0 flex-1">
        <ReactFlowProvider>
          <TricksGraph
            data={data}
            selectedTrickId={activeTrickId}
            onSelectTrick={handleSelectTrick}
            onOpenTrickDetail={handleOpenTrickDetail}
            onCenterNodeClick={handleCenterNodeClick}
          />
        </ReactFlowProvider>
      </div>
      </div>
    </>
  );
}
