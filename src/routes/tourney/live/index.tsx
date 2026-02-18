import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { tourney } from "~/lib/tourney";

export const Route = createFileRoute("/tourney/live/")({
  staticData: {
    pageHeader: {
      breadcrumbs: [{ label: "tourney" }, { label: "live" }],
      maxWidth: "lg",
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 4) return;

    setLoading(true);
    try {
      await tourney.get.fn({ data: { code: trimmed } });
      navigate({ to: "/tourney/live/$code", params: { code: trimmed } });
    } catch {
      toast.error("Tournament not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background fixed inset-0 z-50 flex items-center justify-center p-4 lowercase">
      <div className="w-full max-w-xs space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Join Tournament</h1>
          <p className="text-muted-foreground text-sm">
            Enter the 4-digit code to watch live
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="a3k9"
            className="text-center font-mono text-2xl tracking-widest"
            maxLength={4}
            autoFocus
          />
          <Button
            type="submit"
            className="w-full"
            disabled={code.trim().length !== 4 || loading}
          >
            {loading ? "Joining..." : "Join"}
          </Button>
        </form>
      </div>
    </div>
  );
}
