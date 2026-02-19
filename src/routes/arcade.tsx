import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EternalStaircase } from "~/components/arcade/eternal-staircase";
import { RailPlatformer } from "~/components/arcade/rail-platformer";
import { PageHeader } from "~/components/page-header";

export const Route = createFileRoute("/arcade")({
  component: RouteComponent,
});

function RouteComponent() {
  const [mode, setMode] = useState<"a" | "b">("a");
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>arcade</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="flex flex-1 flex-col">
        <div className="flex gap-2 border-b px-4 py-2">
          <button
            className={`rounded px-3 py-1 font-mono text-sm transition-colors ${
              mode === "a"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("a")}
          >
            A: eternal staircase
          </button>
          <button
            className={`rounded px-3 py-1 font-mono text-sm transition-colors ${
              mode === "b"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setMode("b")}
          >
            B: rail platformer
          </button>
        </div>
        {mode === "a" ? (
          <EternalStaircase key="a" />
        ) : (
          <RailPlatformer key="b" />
        )}
      </div>
    </>
  );
}
