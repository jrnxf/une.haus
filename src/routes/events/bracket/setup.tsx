import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { ArrowLeftIcon, PlusIcon, TrashIcon, UsersIcon } from "lucide-react";
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
  participants: z.string().optional(),
});

export const Route = createFileRoute("/events/bracket/setup")({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
});

const presets = [4, 8, 16, 32];

function RouteComponent() {
  const { participants: participantsParam } = Route.useSearch();
  const navigate = useNavigate();

  const initialParticipants = participantsParam
    ? participantsParam.split(",").map((p) => p.trim()).filter(Boolean)
    : ["", ""];

  const [participants, setParticipants] = useState<string[]>(
    initialParticipants.length >= 2 ? initialParticipants : ["", ""],
  );

  const addParticipant = () => {
    setParticipants((prev) => [...prev, ""]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 2) return;
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, value: string) => {
    setParticipants((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const setPreset = (count: number) => {
    const current = participants.filter(Boolean);
    const newParticipants = [...current];
    while (newParticipants.length < count) {
      newParticipants.push("");
    }
    while (newParticipants.length > count) {
      newParticipants.pop();
    }
    setParticipants(newParticipants);
  };

  const handleStart = () => {
    const validParticipants = participants.filter(Boolean);
    if (validParticipants.length < 2) return;

    navigate({
      to: "/events/bracket",
      search: {
        participants: validParticipants.join(","),
      },
    });
  };

  const validCount = participants.filter(Boolean).length;

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
              <CardTitle>Bracket</CardTitle>
              <CardDescription>
                Add participants and start the tournament
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Quick Setup</Label>
                <div className="flex flex-wrap gap-2">
                  {presets.map((count) => (
                    <Button
                      key={count}
                      variant={
                        participants.length === count ? "default" : "secondary"
                      }
                      size="sm"
                      onClick={() => setPreset(count)}
                    >
                      <UsersIcon className="size-3.5" />
                      {count}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Participants</Label>
                  <span className="text-muted-foreground text-xs">
                    {validCount} added
                  </span>
                </div>
                <div className="space-y-2">
                  {participants.map((participant, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-muted-foreground w-6 text-right text-xs">
                        {index + 1}.
                      </span>
                      <Input
                        placeholder={`Player ${index + 1}`}
                        value={participant}
                        onChange={(e) =>
                          updateParticipant(index, e.target.value)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeParticipant(index)}
                        disabled={participants.length <= 2}
                      >
                        <TrashIcon className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addParticipant}
                  className="w-full"
                >
                  <PlusIcon className="size-3.5" />
                  Add
                </Button>
              </div>

              <Button
                onClick={handleStart}
                disabled={validCount < 2}
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
