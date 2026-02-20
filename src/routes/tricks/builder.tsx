import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";

import { PageHeader } from "~/components/page-header";
import type { SidebarTrick } from "~/components/tricks/tricks-sidebar";
import { TricksSidebar } from "~/components/tricks/tricks-sidebar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "~/components/ui/button-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { ResponsiveCombobox } from "~/components/ui/responsive-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { Switch } from "~/components/ui/switch";
import type { CATCH_TYPES } from "~/db/schema";
import { session } from "~/lib/session";
import type { TrickBuilderData } from "~/lib/tricks";
import { tricks } from "~/lib/tricks";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/tricks/builder")({
  loader: async ({ context }) => {
    const [, sessionData] = await Promise.all([
      context.queryClient.ensureQueryData(tricks.builder.queryOptions()),
      context.queryClient.ensureQueryData(session.get.queryOptions()),
    ]);
    return {
      isLoggedIn: !!sessionData.user,
    };
  },
  component: TricksPage,
});

type Modifiers = {
  flips: number;
  spin: number;
  wrap: string;
  twist: number;
  fakie: boolean;
  tire: string;
  switchStance: boolean;
  late: boolean;
};

type CatchType = (typeof CATCH_TYPES)[number];

const SPIN_OPTIONS = [
  0, 90, 180, 270, 360, 450, 540, 630, 720, 810, 900, 990, 1080, 1170, 1260,
] as const;

const TWIST_OPTIONS = [0, 180, 360, 540] as const;

const WRAP_OPTIONS = [
  "none",
  "side",
  "secretside",
  "backside",
  "antiside",
] as const;

const TIRE_OPTIONS = ["none", "to tire", "from tire", "on tire"] as const;

const INITIAL_MODIFIERS: Modifiers = {
  flips: 0,
  spin: 0,
  wrap: "none",
  twist: 0,
  fakie: false,
  tire: "none",
  switchStance: false,
  late: false,
};

function modifiersKey(m: Modifiers) {
  return `${m.flips}:${m.spin}:${m.wrap}:${m.twist}:${m.fakie}:${m.tire}:${m.switchStance}:${m.late}`;
}

function isDefaultModifiers(m: Modifiers) {
  return (
    m.flips === 0 &&
    m.spin === 0 &&
    m.wrap === "none" &&
    m.twist === 0 &&
    m.fakie === false &&
    m.tire === "none" &&
    m.switchStance === false &&
    m.late === false
  );
}

type SimpleTrick = TrickBuilderData["simpleTricks"][number];
type CompoundTrick = TrickBuilderData["compoundTricks"][number];

function TricksPage() {
  const { isLoggedIn } = Route.useLoaderData();
  const { data: builderData } = useSuspenseQuery(tricks.builder.queryOptions());
  const { simpleTricks, compoundTricks } = builderData;

  const [panels, setPanels] = useState<Modifiers[]>([INITIAL_MODIFIERS]);
  const [catches, setCatches] = useState<CatchType[]>([]);

  // Build lookup map for simple tricks: modifier key -> trick
  const simpleTrickMap = useMemo(() => {
    const map = new Map<string, SimpleTrick>();
    for (const trick of simpleTricks) {
      const key = modifiersKey({
        flips: trick.flips,
        spin: trick.spin,
        wrap: trick.wrap,
        twist: trick.twist,
        fakie: trick.fakie,
        tire: trick.tire,
        switchStance: trick.switchStance,
        late: trick.late,
      });
      map.set(key, trick);
    }
    return map;
  }, [simpleTricks]);

  // Build lookup map for compound tricks
  const compoundTrickMap = useMemo(() => {
    const map = new Map<string, CompoundTrick>();
    for (const trick of compoundTricks) {
      if (trick.compositions.length < 2) continue;
      const sorted = [...trick.compositions].sort(
        (a, b) => a.position - b.position,
      );
      const parts: string[] = [];
      for (let i = 0; i < sorted.length; i++) {
        parts.push(String(sorted[i].componentTrick.id));
        if (i < sorted.length - 1 && sorted[i].catchType) {
          parts.push(sorted[i].catchType!);
        }
      }
      map.set(parts.join(":"), trick);
    }
    return map;
  }, [compoundTricks]);

  // Resolve each panel to a simple trick
  const panelTricks = panels.map(
    (m) => simpleTrickMap.get(modifiersKey(m)) ?? null,
  );

  // In multi-panel mode, try to find a compound trick
  const isMultiPanel = panels.length > 1;
  const compoundResult = useMemo(() => {
    if (!isMultiPanel) return null;
    const allResolved = panelTricks.every((t) => t !== null);
    if (!allResolved) return null;

    const parts: string[] = [];
    for (let i = 0; i < panelTricks.length; i++) {
      parts.push(String(panelTricks[i]!.id));
      if (i < panelTricks.length - 1) {
        parts.push(catches[i]);
      }
    }
    return compoundTrickMap.get(parts.join(":")) ?? null;
  }, [isMultiPanel, panelTricks, catches, compoundTrickMap]);

  const isAllDefault = panels.length === 1 && isDefaultModifiers(panels[0]);

  // Derive selected slug from current builder state
  const selectedSlug = isMultiPanel
    ? (compoundResult?.slug ?? null)
    : (panelTricks[0]?.slug ?? null);

  // Build sidebar items: merge simple + compound, map to SidebarTrick shape
  const sidebarTricks = useMemo(() => {
    const items: (SidebarTrick & { _original: SimpleTrick | CompoundTrick })[] =
      [];
    for (const t of simpleTricks) {
      items.push({
        id: t.slug,
        name: t.name,
        isCompound: t.isCompound,
        alternateNames: t.alternateNames,
        _original: t,
      });
    }
    for (const t of compoundTricks) {
      items.push({
        id: t.slug,
        name: t.name,
        isCompound: t.isCompound,
        alternateNames: t.alternateNames,
        _original: t,
      });
    }
    return items;
  }, [simpleTricks, compoundTricks]);

  function handleSidebarSelect(
    item: SidebarTrick & { _original: SimpleTrick | CompoundTrick },
  ) {
    handleSelectTrick(item._original);
  }

  function updatePanelModifier(
    panelIndex: number,
    key: keyof Modifiers,
    value: Modifiers[keyof Modifiers],
  ) {
    setPanels((prev) =>
      prev.map((p, i) => (i === panelIndex ? { ...p, [key]: value } : p)),
    );
  }

  function addCatch() {
    if (panels.length >= 3) return;
    setCatches((prev) => [...prev, "two-foot"]);
    setPanels((prev) => [...prev, INITIAL_MODIFIERS]);
  }

  function removeCatch(catchIndex: number) {
    setCatches((prev) => prev.filter((_, i) => i !== catchIndex));
    setPanels((prev) => prev.filter((_, i) => i !== catchIndex + 1));
  }

  function handleReset() {
    setPanels([INITIAL_MODIFIERS]);
    setCatches([]);
  }

  function handleSelectTrick(trick: SimpleTrick | CompoundTrick) {
    if ("isCompound" in trick && trick.isCompound && "compositions" in trick) {
      const compound = trick as CompoundTrick;
      const sorted = [...compound.compositions].sort(
        (a, b) => a.position - b.position,
      );
      const newPanels: Modifiers[] = sorted.map((comp, i) => ({
        flips: comp.componentTrick.flips,
        spin: comp.componentTrick.spin,
        wrap: comp.componentTrick.wrap,
        twist: comp.componentTrick.twist,
        fakie: i === 0 ? comp.componentTrick.fakie : false,
        tire: comp.componentTrick.tire,
        switchStance: comp.componentTrick.switchStance,
        late: i === 0 ? comp.componentTrick.late : false,
      }));
      const newCatches: CatchType[] = sorted
        .slice(0, -1)
        .map((comp) => comp.catchType ?? "two-foot");

      setPanels(newPanels);
      setCatches(newCatches);
    } else {
      const simple = trick as SimpleTrick;
      setPanels((prev) => [
        {
          flips: simple.flips,
          spin: simple.spin,
          wrap: simple.wrap,
          twist: simple.twist,
          fakie: simple.fakie,
          tire: simple.tire,
          switchStance: simple.switchStance,
          late: simple.late,
        },
        ...prev.slice(1),
      ]);
    }
  }

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>tricks</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Tabs>
            <PageHeader.Tab to="/tricks">list</PageHeader.Tab>
            <PageHeader.Tab to="/tricks/graph">graph</PageHeader.Tab>
            <PageHeader.Tab to="/tricks/builder">builder</PageHeader.Tab>
          </PageHeader.Tabs>
          <PageHeader.Actions>
            {isLoggedIn && (
              <Button asChild size="sm">
                <Link to="/tricks/create">Create</Link>
              </Button>
            )}
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>

      <div className="flex h-[calc(100vh-64px)] flex-col md:flex-row">
        <div className="shrink-0 border-b p-4 md:hidden">
          <BuilderSearch
            tricks={sidebarTricks}
            onSelect={handleSidebarSelect}
          />
        </div>

        <TricksSidebar
          tricks={sidebarTricks}
          selectedId={selectedSlug}
          onSelect={handleSidebarSelect}
        />

        <div className="flex min-h-0 flex-1 justify-center overflow-y-auto">
          <div className="flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
            {/* Result display */}
            <div className="flex min-h-24 flex-col items-center justify-center">
              {isMultiPanel ? (
                <CompoundResult
                  panelTricks={panelTricks}
                  catches={catches}
                  compoundResult={compoundResult}
                />
              ) : (
                <SingleResult trick={panelTricks[0]} isDefault={isAllDefault} />
              )}
            </div>

            {/* Panels */}
            {panels.map((panelModifiers, panelIndex) => (
              <div key={panelIndex}>
                {/* Catch type selector between panels */}
                {panelIndex > 0 && (
                  <div className="mb-4 flex items-center gap-2">
                    <Separator className="flex-1" />
                    <div className="flex items-center gap-1">
                      <Select
                        value={catches[panelIndex - 1]}
                        onValueChange={(val) =>
                          setCatches((prev) =>
                            prev.map((c, i) =>
                              i === panelIndex - 1 ? (val as CatchType) : c,
                            ),
                          )
                        }
                      >
                        <SelectTrigger size="sm" className="min-w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="one-foot">one-foot</SelectItem>
                          <SelectItem value="two-foot">two-foot</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeCatch(panelIndex - 1)}
                      >
                        <XIcon className="size-3.5" />
                      </Button>
                    </div>
                    <Separator className="flex-1" />
                  </div>
                )}

                {/* Panel label for multi-panel */}
                {isMultiPanel && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium">
                      trick {panelIndex + 1}
                    </span>
                    {panelTricks[panelIndex] && (
                      <Badge variant="secondary" className="text-xs">
                        {panelTricks[panelIndex]!.name.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                )}

                <ModifierPanel
                  modifiers={panelModifiers}
                  onUpdate={(key, value) =>
                    updatePanelModifier(panelIndex, key, value)
                  }
                  isFirstPanel={panelIndex === 0}
                />
              </div>
            ))}

            {/* Actions */}
            <div className="flex items-center justify-center gap-2">
              {panels.length < 3 && (
                <Button variant="outline" size="sm" onClick={addCatch}>
                  <PlusIcon className="size-3.5" />
                  Catch
                </Button>
              )}
              {!isAllDefault && (
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <RotateCcwIcon className="size-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function SingleResult({
  trick,
  isDefault,
}: {
  trick: SimpleTrick | null;
  isDefault: boolean;
}) {
  if (trick) {
    return (
      <>
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold">{trick.name.toLowerCase()}</p>
          <Button variant="ghost" size="icon-xs" asChild>
            <Link to="/tricks/$trickId" params={{ trickId: trick.slug }}>
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
        <p className="text-muted-foreground mt-1 line-clamp-1 text-center text-sm">
          {trick.definition ?? "\u00A0"}
        </p>
      </>
    );
  }

  return (
    <p className="text-muted-foreground text-3xl font-bold">
      {isDefault ? "-" : "NBD"}
    </p>
  );
}

function CompoundResult({
  panelTricks,
  catches,
  compoundResult,
}: {
  panelTricks: (SimpleTrick | null)[];
  catches: CatchType[];
  compoundResult: CompoundTrick | null;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {/* Component trick names row */}
      <div className="flex flex-wrap items-center justify-center gap-1 text-sm">
        {panelTricks.map((trick, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <span className="text-muted-foreground">{catches[i - 1]}</span>
            )}
            <span
              className={cn(
                "font-medium",
                trick ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {trick ? trick.name.toLowerCase() : "?"}
            </span>
          </span>
        ))}
      </div>

      {/* Compound trick result */}
      {compoundResult ? (
        <div className="flex items-center gap-2">
          <p className="text-3xl font-bold">
            {compoundResult.name.toLowerCase()}
          </p>
          <Button variant="ghost" size="icon-xs" asChild>
            <Link
              to="/tricks/$trickId"
              params={{ trickId: compoundResult.slug }}
            >
              <ArrowRightIcon className="size-4" />
            </Link>
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground text-3xl font-bold">
          {panelTricks.every((t) => t !== null) ? "NBD" : "-"}
        </p>
      )}
    </div>
  );
}

function BuilderSearch({
  tricks,
  onSelect,
}: {
  tricks: (SidebarTrick & { _original: SimpleTrick | CompoundTrick })[];
  onSelect: (
    trick: SidebarTrick & { _original: SimpleTrick | CompoundTrick },
  ) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const filteredTricks = useMemo(() => {
    const sorted = [...tricks].sort((a, b) => a.name.localeCompare(b.name));
    const q = deferredSearchTerm.toLowerCase().trim();
    if (!q) return sorted.slice(0, 20);

    return sorted
      .filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.alternateNames ?? []).some((n) => n.toLowerCase().includes(q)),
      )
      .slice(0, 50);
  }, [tricks, deferredSearchTerm]);

  function handleSelect(id: string) {
    const trick = tricks.find((t) => t.id === id);
    if (trick) {
      onSelect(trick);
      setOpen(false);
      setSearchTerm("");
    }
  }

  return (
    <ResponsiveCombobox
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setSearchTerm("");
      }}
      title="search tricks"
      trigger={
        <button
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-md border px-3",
            "bg-background text-muted-foreground text-sm",
            "hover:bg-accent hover:text-accent-foreground",
            "transition-colors",
          )}
          type="button"
        >
          <SearchIcon className="size-4 shrink-0" />
          <span>search tricks...</span>
        </button>
      }
    >
      <Command shouldFilter={false}>
        <CommandInput
          onValueChange={setSearchTerm}
          placeholder="search tricks..."
          value={searchTerm}
        />
        <CommandList>
          <CommandEmpty>No tricks found.</CommandEmpty>
          <CommandGroup>
            {filteredTricks.map((trick) => (
              <CommandItem
                key={trick.id}
                onSelect={() => handleSelect(trick.id)}
                value={trick.id}
              >
                <span className="font-medium">{trick.name.toLowerCase()}</span>
                {trick.isCompound && (
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 text-[10px]"
                  >
                    compound
                  </Badge>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </ResponsiveCombobox>
  );
}

function ModifierPanel({
  modifiers,
  onUpdate,
  isFirstPanel,
}: {
  modifiers: Modifiers;
  onUpdate: (key: keyof Modifiers, value: Modifiers[keyof Modifiers]) => void;
  isFirstPanel: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Flips */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">flips</span>
        <ButtonGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate("flips", (modifiers.flips as number) - 1)}
          >
            -
          </Button>
          <ButtonGroupText className="min-w-12 justify-center text-sm">
            {modifiers.flips}
          </ButtonGroupText>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onUpdate("flips", (modifiers.flips as number) + 1)}
          >
            +
          </Button>
        </ButtonGroup>
      </div>

      {/* Spin */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">spin</span>
        <Select
          value={String(modifiers.spin)}
          onValueChange={(val) => val && onUpdate("spin", Number(val))}
        >
          <SelectTrigger size="sm" className="min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPIN_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}°
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tire */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">tire</span>
        <Select
          value={modifiers.tire as string}
          onValueChange={(val) => val && onUpdate("tire", val)}
        >
          <SelectTrigger size="sm" className="min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIRE_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Twist */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">twist</span>
        <Select
          value={String(modifiers.twist)}
          onValueChange={(val) => val && onUpdate("twist", Number(val))}
        >
          <SelectTrigger size="sm" className="min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TWIST_OPTIONS.map((option) => (
              <SelectItem key={option} value={String(option)}>
                {option}°
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Wrap */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">wrap</span>
        <Select
          value={modifiers.wrap as string}
          onValueChange={(val) => val && onUpdate("wrap", val)}
        >
          <SelectTrigger size="sm" className="min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WRAP_OPTIONS.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Fakie (only on first trick before a catch) */}
      {isFirstPanel && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium">
            fakie
          </span>
          <Switch
            checked={modifiers.fakie as boolean}
            onCheckedChange={(checked) => onUpdate("fakie", checked)}
          />
        </div>
      )}

      {/* Switch */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">
          switch
        </span>
        <Switch
          checked={modifiers.switchStance as boolean}
          onCheckedChange={(checked) => onUpdate("switchStance", checked)}
        />
      </div>

      {/* Late (only on first trick before a catch) */}
      {isFirstPanel && (
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm font-medium">
            late
          </span>
          <Switch
            checked={modifiers.late as boolean}
            onCheckedChange={(checked) => onUpdate("late", checked)}
          />
        </div>
      )}
    </div>
  );
}
