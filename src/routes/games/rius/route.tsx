import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { RefreshCwIcon, ShieldIcon } from "lucide-react";

import { PageHeader } from "~/components/page-header";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useAdminRotateRius } from "~/lib/games/rius/hooks";
import { useIsAdmin } from "~/lib/session/hooks";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/games/rius")({
  component: RouteComponent,
});

const sections = [
  { value: "active", route: "/games/rius/active" },
  { value: "upcoming", route: "/games/rius/upcoming" },
  { value: "archived", route: "/games/rius/archived" },
] as const;

function RouteComponent() {
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  const currentSection =
    sections.find((s) => pathname.startsWith(s.route))?.value ??
    sections[0].value;
  const isAdmin = useIsAdmin();
  const rotateRius = useAdminRotateRius();

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/games">games</PageHeader.Crumb>
          <PageHeader.Crumb>rack it up</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            <Select
              value={currentSection}
              onValueChange={(value) => {
                const section = sections.find((s) => s.value === value);
                if (section) navigate({ to: section.route });
              }}
            >
              <SelectTrigger size="sm" className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon-xs"
                    aria-label="Admin menu"
                  >
                    <ShieldIcon className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => rotateRius.mutate({})}
                    disabled={rotateRius.isPending}
                  >
                    <RefreshCwIcon
                      className={cn(
                        "size-4",
                        rotateRius.isPending && "animate-spin",
                      )}
                    />
                    Rotate
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>

      <div className="mx-auto w-full max-w-5xl p-4 md:p-6">
        <Outlet />
      </div>
    </>
  );
}
