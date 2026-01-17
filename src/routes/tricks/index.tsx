import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ReactFlowProvider } from "@xyflow/react";
import { Plus, Send } from "lucide-react";
import { useState } from "react";

import { TrickDetail } from "~/components/tricks/trick-detail";
import { TricksGraph } from "~/components/tricks/tricks-graph";
import { TricksSearch } from "~/components/tricks/tricks-search";
import { TricksSidebar } from "~/components/tricks/tricks-sidebar";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { session } from "~/lib/session";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/tricks/")({
  loader: async ({ context }) => {
    const [, sessionData] = await Promise.all([
      context.queryClient.ensureQueryData(tricks.graph.queryOptions()),
      context.queryClient.ensureQueryData(session.get.queryOptions()),
    ]);
    return {
      isLoggedIn: !!sessionData.user,
      isAdmin: sessionData.user?.id === 1,
    };
  },
  component: TricksPage,
});

function TricksPage() {
  const { isLoggedIn, isAdmin } = Route.useLoaderData();
  const { data } = useSuspenseQuery(tricks.graph.queryOptions());
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
        <div className="relative flex-1">
          <ReactFlowProvider>
            <TricksGraph
              data={data}
              onOpenTrickDetail={(trick) => handleOpenTrickDetail(trick.id)}
              onSelectTrick={(trick) => handleSelectTrick(trick.id)}
              selectedTrickId={selectedTrickId}
            />
          </ReactFlowProvider>

          {/* Action buttons */}
          <div className="absolute right-4 top-4 flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/tricks/review">Review</Link>
            </Button>

            {isLoggedIn &&
              (isAdmin ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button>Create</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/tricks/submit">
                        <Send className="mr-2 size-4" />
                        Submit for Review
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/admin/tricks/create">
                        <Plus className="mr-2 size-4" />
                        Create Directly
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button asChild>
                  <Link to="/tricks/submit">Create</Link>
                </Button>
              ))}
          </div>
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
