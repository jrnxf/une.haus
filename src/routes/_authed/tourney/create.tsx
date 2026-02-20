import { createFileRoute } from "@tanstack/react-router";
import { ShieldIcon } from "lucide-react";
import { useState } from "react";

import { RiderSelector } from "~/components/input/rider-selector";
import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useIsAdmin } from "~/lib/session/hooks";
import { generateOrderId, type OrderedRiderEntry } from "~/lib/tourney/bracket";
import { useCreateTournament } from "~/lib/tourney/hooks";
import { users } from "~/lib/users";

const seedPresets = [4, 8, 16, 32];

const timePresets = [
  { label: "1m", value: 60 },
  { label: "90s", value: 90 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
];

const bracketSizeOptions = [4, 8, 16, 32] as const;

export const Route = createFileRoute("/_authed/tourney/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const isAdmin = useIsAdmin();
  const createMutation = useCreateTournament();

  const [name, setName] = useState("");
  const [riders, setRiders] = useState<OrderedRiderEntry[]>([]);
  const [prelimTime, setPrelimTime] = useState(60);
  const [battleTime, setBattleTime] = useState(60);
  const [finalsTime, setFinalsTime] = useState(120);
  const [bracketSize, setBracketSize] = useState<4 | 8 | 16 | 32>(8);

  const loadDemo = async (count: number) => {
    const slotsToFill = count - riders.length;
    if (slotsToFill <= 0) return;

    const allUsers = await users.all.fn();
    const existingUserIds = new Set(
      riders.filter((r) => r.userId).map((r) => r.userId),
    );
    const withAvatars = allUsers.filter(
      (u) => u.avatarId && !existingUserIds.has(u.id),
    );
    const shuffled = [...withAvatars].sort(() => Math.random() - 0.5);
    const newRiders: OrderedRiderEntry[] = shuffled
      .slice(0, slotsToFill)
      .map((u) => ({
        orderId: generateOrderId(),
        userId: u.id,
        name: u.name,
      }));
    setRiders([...riders, ...newRiders]);
  };

  const handleCreate = () => {
    if (riders.length < 2 || !name.trim()) return;

    createMutation.mutate({
      data: {
        name: name.trim(),
        riders: riders.map((r) => ({
          userId: r.userId,
          name: r.name,
        })),
        prelimTime,
        battleTime,
        finalsTime,
        bracketSize,
      },
    });
  };

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tourney">tourney</PageHeader.Crumb>
          <PageHeader.Crumb>create</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl p-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle>roster</CardTitle>
                <CardDescription>
                  add riders and start the tournament
                </CardDescription>
              </div>
              {isAdmin && (
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
                    {seedPresets.map((count) => {
                      const slotsToFill = count - riders.length;
                      return (
                        <DropdownMenuItem
                          key={count}
                          onClick={() => loadDemo(count)}
                          disabled={slotsToFill <= 0}
                        >
                          Seed random {count}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Event Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`euc winter '${String(new Date().getFullYear()).slice(2)}`}
              />
            </div>

            <div className="space-y-2">
              <Label>riders</Label>
              <RiderSelector value={riders} onChange={setRiders} />
              <p className="text-muted-foreground text-xs">
                {riders.length} riders added
              </p>
            </div>

            <div className="space-y-2">
              <Label>Bracket Size</Label>
              <div className="flex gap-2">
                {bracketSizeOptions.map((size) => (
                  <Button
                    key={size}
                    variant={bracketSize === size ? "default" : "secondary"}
                    size="sm"
                    onClick={() => setBracketSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">
                top {bracketSize} riders from prelims advance to the bracket
              </p>
            </div>

            <div className="space-y-4">
              <Label>Timer Durations</Label>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    prelims
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {timePresets.map((preset) => (
                      <Button
                        key={preset.value}
                        variant={
                          prelimTime === preset.value ? "default" : "secondary"
                        }
                        size="sm"
                        onClick={() => setPrelimTime(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    battles
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {timePresets.map((preset) => (
                      <Button
                        key={preset.value}
                        variant={
                          battleTime === preset.value ? "default" : "secondary"
                        }
                        size="sm"
                        onClick={() => setBattleTime(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">
                    final battles
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {timePresets.map((preset) => (
                      <Button
                        key={preset.value}
                        variant={
                          finalsTime === preset.value ? "default" : "secondary"
                        }
                        size="sm"
                        onClick={() => setFinalsTime(preset.value)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleCreate}
                disabled={
                  riders.length < 2 || !name.trim() || createMutation.isPending
                }
              >
                Create
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
