import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { EternalStaircase } from "~/components/arcade/eternal-staircase";
import { RailPlatformer } from "~/components/arcade/rail-platformer";
import { PageHeader } from "~/components/page-header";
import { UnicycleGame } from "~/components/unicycle-game";

export const Route = createFileRoute("/games/arcade")({
  component: RouteComponent,
});

const tabs = [
  { id: "original", label: "original" },
  { id: "a", label: "A: eternal staircase" },
  { id: "b", label: "B: rail platformer" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function RouteComponent() {
  const [mode, setMode] = useState<TabId>("original");
  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>arcade</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="flex flex-1 flex-col">
        <div className="flex gap-2 border-b px-4 py-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`rounded px-3 py-1 font-mono text-sm transition-colors ${
                mode === tab.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {mode === "original" ? (
          <UnicycleGame key="original" />
        ) : mode === "a" ? (
          <EternalStaircase key="a" />
        ) : (
          <RailPlatformer key="b" />
        )}
      </div>
    </>
  );
}
