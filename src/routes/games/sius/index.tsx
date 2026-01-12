import { createFileRoute } from "@tanstack/react-router";
import { BellIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

export const Route = createFileRoute("/games/sius/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Card className="w-full max-w-md border-dashed">
        <CardContent className="flex flex-col items-center gap-6 py-10 text-center">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Coming Soon</h2>
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              Stack It Up is in development. Complete the full stack of tricks,
              then add your own to the growing tower.
            </p>
          </div>

          <div className="bg-muted/50 w-full rounded-lg p-4">
            <h3 className="mb-2 text-sm font-medium">How it works</h3>
            <ol className="text-muted-foreground space-y-1 text-left text-sm">
              <li>1. Watch the entire stack of tricks</li>
              <li>2. Land every trick in order</li>
              <li>3. Add your own trick to the end</li>
              <li>4. Stack grows until someone can&apos;t complete it</li>
            </ol>
          </div>

          <Button variant="outline" className="gap-2" disabled>
            <BellIcon className="size-4" />
            Notify me when it launches
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
