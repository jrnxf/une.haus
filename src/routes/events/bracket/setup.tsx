import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeftIcon, ShieldIcon, UsersIcon } from "lucide-react";
import { useState } from "react";

import { RiderSelector } from "~/components/input/rider-selector";
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
import { users } from "~/lib/users";

import {
  bracketSearchSchema,
  generateOrderId,
  parseRidersParamOrdered,
  type OrderedRiderEntry,
} from "~/lib/events/bracket";

const presets = [4, 8, 16, 32];

export const Route = createFileRoute("/events/bracket/setup")({
  component: RouteComponent,
  validateSearch: zodValidator(bracketSearchSchema),
});

const timePresets = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "90s", value: 90 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
];

function RouteComponent() {
  const { name: initialName, riders: ridersParam, prelimsTime: initialPrelimsTime, semifinalsTime: initialSemifinalsTime, finalsTime: initialFinalsTime } = Route.useSearch();
  const navigate = useNavigate();
  const isAdmin = useIsAdmin();

  const [name, setName] = useState(initialName ?? "");
  const [riders, setRiders] = useState<OrderedRiderEntry[]>(() => parseRidersParamOrdered(ridersParam));
  const [prelimsTime, setPrelimsTime] = useState(initialPrelimsTime);
  const [semifinalsTime, setSemifinalsTime] = useState(initialSemifinalsTime);
  const [finalsTime, setFinalsTime] = useState(initialFinalsTime);

  const loadDemo = async (count: number) => {
    // Only fill if there are empty slots
    const slotsToFill = count - riders.length;
    if (slotsToFill <= 0) return;

    const allUsers = await users.all.fn();
    // Filter to only users with avatars that aren't already added, then shuffle
    const existingUserIds = new Set(riders.filter((r) => r.userId).map((r) => r.userId));
    const withAvatars = allUsers.filter((u) => u.avatarId && !existingUserIds.has(u.id));
    const shuffled = [...withAvatars].sort(() => Math.random() - 0.5);
    const newRiders: OrderedRiderEntry[] = shuffled.slice(0, slotsToFill).map((u) => ({
      orderId: generateOrderId(),
      userId: u.id,
      name: u.name,
    }));
    setRiders([...riders, ...newRiders]);
  };

  const handleStart = () => {
    if (riders.length < 2) return;

    // Encode riders: 1,20,~CustomName,30 (userIds or ~prefixed names)
    const ridersStr = riders
      .map((r) => (r.userId !== null ? String(r.userId) : r.name ? `~${r.name}` : null))
      .filter(Boolean)
      .join(",");

    // Navigate using TanStack Router (stringifySearch keeps commas/tildes readable)
    navigate({
      to: "/events/bracket",
      search: {
        name: name || undefined,
        riders: ridersStr,
        prelimsTime,
        semifinalsTime,
        finalsTime,
      },
    });
  };

  return (
    <div className="flex grow flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto flex w-full max-w-lg items-center gap-4 px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5"
            asChild
          >
            <Link to="/events">
              <ArrowLeftIcon className="size-4" />
              Events
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" id="main-content">
        <div className="mx-auto w-full max-w-lg p-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>Bracket</CardTitle>
                  <CardDescription>
                    Add participants and start the tournament
                  </CardDescription>
                </div>
                {isAdmin && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon">
                        <ShieldIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {presets.map((count) => {
                        const slotsToFill = count - riders.length;
                        return (
                          <DropdownMenuItem
                            key={count}
                            onClick={() => loadDemo(count)}
                            disabled={slotsToFill <= 0}
                          >
                            <UsersIcon className="size-4" />
                            Fill to {count}
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
                  placeholder="e.g. Summer Championship"
                />
              </div>

              <div className="space-y-2">
                <Label>Participants</Label>
                <RiderSelector value={riders} onChange={setRiders} />
                <p className="text-muted-foreground text-xs">
                  {riders.length} participants added
                </p>
              </div>

              <div className="space-y-4">
                <Label>Timer Durations</Label>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Prelims</Label>
                    <div className="flex flex-wrap gap-2">
                      {timePresets.map((preset) => (
                        <Button
                          key={preset.value}
                          variant={prelimsTime === preset.value ? "default" : "secondary"}
                          size="sm"
                          onClick={() => setPrelimsTime(preset.value)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Semifinals</Label>
                    <div className="flex flex-wrap gap-2">
                      {timePresets.map((preset) => (
                        <Button
                          key={preset.value}
                          variant={semifinalsTime === preset.value ? "default" : "secondary"}
                          size="sm"
                          onClick={() => setSemifinalsTime(preset.value)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-muted-foreground text-xs">Finals</Label>
                    <div className="flex flex-wrap gap-2">
                      {timePresets.map((preset) => (
                        <Button
                          key={preset.value}
                          variant={finalsTime === preset.value ? "default" : "secondary"}
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

              <Button
                onClick={handleStart}
                disabled={riders.length < 2}
                className="w-full"
              >
                Start
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
