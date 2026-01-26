import { Link } from "@tanstack/react-router";
import { GhostIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";

export function NotFound({ children }: { children?: React.ReactNode }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <GhostIcon />
        </EmptyMedia>
        <EmptyTitle>Not Found</EmptyTitle>
        <EmptyDescription>
          {children || "The page you're looking for doesn't exist."}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/">back to safety</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
