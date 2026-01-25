import { Link, type LinkProps } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Button } from "~/components/ui/button";

type BackLinkProps = {
  to: LinkProps["to"];
  search?: LinkProps["search"];
  label: string;
};

export function BackLink({ to, search, label }: BackLinkProps) {
  return (
    <Button variant="ghost" size="sm" asChild>
      <Link to={to} search={search}>
        <ArrowLeft className="size-4" />
        Back to {label}
      </Link>
    </Button>
  );
}
