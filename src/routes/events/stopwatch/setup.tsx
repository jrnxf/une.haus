import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeftIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

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
  name: z.string().optional(),
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

function RouteComponent() {
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [name, setName] = useState(search.name ?? "");
  const [time, setTime] = useState(search.time);

  const handleStart = () => {
    navigate({
      to: "/events/stopwatch",
      search: {
        name: name || undefined,
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
              <CardTitle>Stopwatch</CardTitle>
              <CardDescription>
                Configure the timer settings before starting
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Rider name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  Displayed in the top left corner
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
