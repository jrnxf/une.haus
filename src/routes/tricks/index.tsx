import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ReactFlowProvider } from "@xyflow/react";
import { useState } from "react";

import { TrickDetail } from "~/components/tricks/trick-detail";
import { TricksGraph } from "~/components/tricks/tricks-graph";
import { TricksSearch } from "~/components/tricks/tricks-search";
import { TricksSidebar } from "~/components/tricks/tricks-sidebar";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/tricks/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tricks.get.queryOptions());
  },
  component: TricksPage,
});

function TricksPage() {
  const { data } = useSuspenseQuery(tricks.get.queryOptions());
  const [selectedTrickId, setSelectedTrickId] = useState<string | null>(
    "treyflip",
  );
  const [detailTrickId, setDetailTrickId] = useState<string | null>(null);
  const detailTrick = detailTrickId ? data.byId[detailTrickId] : null;

  function handleSelectTrick(trickId: string) {
    setSelectedTrickId(trickId);
  }

  function handleOpenTrickDetail(trickId: string) {
    setDetailTrickId(trickId);
  }

  function handleNavigateToTrick(trickId: string) {
    if (data.byId[trickId]) {
      setSelectedTrickId(trickId);
      setDetailTrickId(trickId);
    }
  }

  return (
    <div className="flex h-full grow flex-col overflow-hidden">
      {/* Mobile search bar */}
      <div className="shrink-0 border-b p-3 md:hidden">
        <TricksSearch
          data={data}
          onSelectTrick={(trick) => handleSelectTrick(trick.id)}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden h-full w-64 shrink-0 overflow-hidden border-r md:block">
          <TricksSidebar
            data={data}
            onSelectTrick={(trick) => handleSelectTrick(trick.id)}
            selectedTrickId={selectedTrickId}
          />
        </div>

        {/* Graph */}
        <div className="flex-1">
          <ReactFlowProvider>
            <TricksGraph
              data={data}
              onOpenTrickDetail={(trick) => handleOpenTrickDetail(trick.id)}
              onSelectTrick={(trick) => handleSelectTrick(trick.id)}
              selectedTrickId={selectedTrickId}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {/* Detail dialog */}
      {detailTrick && (
        <TrickDetail
          onNavigateToTrick={handleNavigateToTrick}
          onOpenChange={(open) => !open && setDetailTrickId(null)}
          open
          trick={detailTrick}
          tricksData={data}
        />
      )}
    </div>
  );
}
