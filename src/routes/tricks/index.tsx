import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ReactFlowProvider } from "@xyflow/react";
import { ShieldIcon } from "lucide-react";
import { useState } from "react";

import { z } from "zod";

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

const searchSchema = z.object({
  trick: z.string().optional(),
});

export const Route = createFileRoute("/tricks/")({
  validateSearch: searchSchema,
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
  const { trick: trickFromUrl } = Route.useSearch();
  const navigate = useNavigate();
  const { data } = useSuspenseQuery(tricks.graph.queryOptions());

  // Use URL param if valid, otherwise default to "treyflip"
  const selectedTrickId =
    trickFromUrl && data.byId[trickFromUrl] ? trickFromUrl : "treyflip";

  const [detailTrickId, setDetailTrickId] = useState<string | null>(null);
  const detailTrick = detailTrickId ? data.byId[detailTrickId] : null;

  function handleSelectTrick(trickId: string) {
    // Replace URL state so back button works correctly
    navigate({
      to: "/tricks",
      search: { trick: trickId },
      replace: true,
    });
  }

  function handleOpenTrickDetail(trickId: string) {
    setDetailTrickId(trickId);
  }

  function handleCenterNodeClick(trickId: string) {
    navigate({
      to: "/tricks/$trickId",
      params: { trickId },
    });
  }

  function handleNavigateToTrick(trickId: string) {
    if (data.byId[trickId]) {
      navigate({
        to: "/tricks",
        search: { trick: trickId },
        replace: true,
      });
      setDetailTrickId(trickId);
    }
  }

  return (
    <div className="flex h-full grow flex-col overflow-hidden">
      {/* Mobile search bar */}
      <div className="shrink-0 border-b p-4 md:hidden">
        <TricksSearch
          data={data}
          onSelectTrick={(trick) => handleSelectTrick(trick.id)}
        />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar - hidden on mobile */}
        <div className="hidden h-full w-(--sidebar-width) shrink-0 overflow-hidden border-r md:block">
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
              onCenterNodeClick={(trick) => handleCenterNodeClick(trick.id)}
              onOpenTrickDetail={(trick) => handleOpenTrickDetail(trick.id)}
              onSelectTrick={(trick) => handleSelectTrick(trick.id)}
              selectedTrickId={selectedTrickId}
            />
          </ReactFlowProvider>

          {/* Action buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/tricks/review">Review</Link>
            </Button>

            {isLoggedIn &&
              (isAdmin ? (
                <>
                  <Button asChild>
                    <Link to="/tricks/create">Create</Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label="Admin menu"
                      >
                        <ShieldIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to="/admin/tricks/elements">Elements</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin/tricks/modifiers">Modifiers</Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button asChild>
                  <Link to="/tricks/create">Create</Link>
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
