import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import {
  SingleRiderSelector,
  type RiderEntry,
} from "~/components/input/single-rider-selector";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

const searchSchema = z.object({
  rider: z.string().optional(),
  time: z.coerce.number().min(1).max(3600).optional().default(60),
});

export const Route = createFileRoute("/events/stopwatch/setup")({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
});

const presets = [
  { label: "30s", value: 30 },
  { label: "1m", value: 60 },
  { label: "2m", value: 120 },
  { label: "3m", value: 180 },
  { label: "5m", value: 300 },
];

function parseRiderParam(param: string | undefined): RiderEntry | null {
  if (!param) return null;
  if (param.startsWith("~")) {
    return { userId: null, name: param.slice(1) };
  }
  const userId = Number.parseInt(param, 10);
  if (Number.isNaN(userId)) return null;
  return { userId, name: null };
}

function encodeRiderParam(rider: RiderEntry | null): string | undefined {
  if (!rider) return undefined;
  if (rider.userId !== null) return String(rider.userId);
  if (rider.name) return `~${rider.name}`;
  return undefined;
}

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [rider, setRider] = useState<RiderEntry | null>(() =>
    parseRiderParam(search.rider),
  );
  const [time, setTime] = useState(search.time);

  const handleStart = () => {
    navigate({
      to: "/events/stopwatch",
      search: {
        rider: encodeRiderParam(rider),
        time,
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
              events
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" id="main-content">
        <div className="mx-auto w-full max-w-lg p-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>stopwatch</CardTitle>
              <CardDescription>
                configure the timer settings before starting
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Rider</Label>
                <SingleRiderSelector
                  value={rider}
                  onChange={setRider}
                  placeholder="Select rider"
                />
                <p className="text-muted-foreground text-xs">
                  displayed in the top left corner
                </p>
              </div>

              <div className="space-y-2">
                <Label>Time Limit</Label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((preset) => (
                    <Button
                      key={preset.value}
                      variant={time === preset.value ? "default" : "secondary"}
                      size="sm"
                      onClick={() => setTime(preset.value)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={3600}
                    value={time}
                    onChange={(e) => setTime(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">seconds</span>
                </div>
              </div>

              <Button onClick={handleStart} className="w-full">
                Start
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
