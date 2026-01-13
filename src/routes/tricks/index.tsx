import { ReactFlowProvider } from "@xyflow/react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import type { Trick } from "~/lib/tricks";

import {
  TrickDetail,
  TricksGraph,
  TricksSearch,
  TricksSidebar,
} from "~/components/tricks";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/tricks/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(tricks.get.queryOptions());
  },
  component: TricksPage,
});

function TricksPage() {
  const { data } = useSuspenseQuery(tricks.get.queryOptions());
  const [selectedTrickId, setSelectedTrickId] = useState<string | null>(null);
  const [detailTrick, setDetailTrick] = useState<Trick | null>(null);

  function handleSelectTrick(trick: Trick) {
    setSelectedTrickId(trick.id);
  }

  function handleOpenTrickDetail(trick: Trick) {
    setDetailTrick(trick);
  }

  function handleNavigateToTrick(trickId: string) {
    const trick = data.byId[trickId];
    if (trick) {
      setSelectedTrickId(trickId);
      setDetailTrick(trick);
    }
  }

  return (
    <div className="flex h-full grow flex-col overflow-hidden">
      {/* Mobile search bar */}
      <div className="shrink-0 border-b p-3 md:hidden">
        <TricksSearch data={data} onSelectTrick={handleSelectTrick} />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden h-full w-64 shrink-0 overflow-hidden border-r md:block">
          <TricksSidebar
            data={data}
            onSelectTrick={handleSelectTrick}
            selectedTrickId={selectedTrickId}
          />
        </div>

        {/* Graph */}
        <div className="flex-1">
          <ReactFlowProvider>
            <TricksGraph
              data={data}
              onOpenTrickDetail={handleOpenTrickDetail}
              onSelectTrick={handleSelectTrick}
              selectedTrickId={selectedTrickId}
            />
          </ReactFlowProvider>
        </div>
      </div>

      {/* Detail dialog */}
      {detailTrick && (
        <TrickDetail
          onNavigateToTrick={handleNavigateToTrick}
          onOpenChange={(open) => !open && setDetailTrick(null)}
          open
          trick={detailTrick}
          tricksData={data}
        />
      )}
    </div>
  );
}
