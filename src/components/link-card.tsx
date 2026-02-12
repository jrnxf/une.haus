import { Link } from "@tanstack/react-router";
import { ArrowRightIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { cn } from "~/lib/utils";

function LinkCardRoot({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      to={href}
      className="group block h-full rounded-xl transition-transform hover:scale-[1.01] focus-visible:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card
        className={cn(
          "relative flex h-full flex-col overflow-hidden",
          "cursor-pointer",
          className,
        )}
      >
        {children}
      </Card>
    </Link>
  );
}

function LinkCardHeader({
  icon: Icon,
  title,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  iconClassName?: string;
}) {
  return (
    <CardHeader className="pb-2">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg",
            iconClassName,
          )}
        >
          <Icon className="size-4" />
        </div>
        <CardTitle className="text-lg">{title}</CardTitle>
      </div>
    </CardHeader>
  );
}

function LinkCardDescription({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>
  );
}

function LinkCardContent({ children }: { children: React.ReactNode }) {
  return (
    <CardContent className="flex grow flex-col space-y-4">
      {children}
    </CardContent>
  );
}

function LinkCardCta({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-end">
      <span className="text-muted-foreground group-hover:text-foreground group-focus-visible:text-foreground flex items-center gap-1 text-sm transition-colors">
        {label}
        <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5" />
      </span>
    </div>
  );
}

export const LinkCard = {
  Root: LinkCardRoot,
  Header: LinkCardHeader,
  Content: LinkCardContent,
  Description: LinkCardDescription,
  Cta: LinkCardCta,
};
