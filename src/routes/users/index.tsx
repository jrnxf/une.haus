import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { FilterIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badges } from "~/components/badges";
import { BadgeInput } from "~/components/input/badge-input";
import { UserSelector } from "~/components/input/user-selector";
import {
  Tray,
  TrayClose,
  TrayContent,
  TrayTitle,
  TrayTrigger,
} from "~/components/tray";
import { AnimatedGhost } from "~/components/ui/animated-ghost";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { USER_DISCIPLINES } from "~/db/schema";
import { users } from "~/lib/users";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/users/")({
  validateSearch: users.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureInfiniteQueryData(
      users.list.infiniteQueryOptions(deps),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = Route.useSearch();

  const {
    data: usersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(users.list.infiniteQueryOptions(searchParams));

  const displayedUsers = useMemo(() => usersPages.pages.flat(), [usersPages]);

  return (
    <div className="flex grow flex-col overflow-hidden">
      <ScrollArea className="overflow-y-auto" id="main-content">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 p-3">
          <div className="fixed right-3 bottom-3 z-10 md:sticky md:top-3 md:self-end">
            <FiltersTray />
          </div>
          {displayedUsers.length === 0 && (
            <div className="flex h-28 flex-col items-center justify-center gap-1.5">
              <AnimatedGhost />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}

          {displayedUsers.map((user) => {
            return (
              <Link
                key={user.id}
                to="/users/$userId"
                params={{ userId: user.id }}
                className={cn(
                  "w-full space-y-2 rounded-md border bg-white p-3 text-left dark:bg-[#0a0a0a]",
                  "ring-offset-background",
                  "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
                )}
                data-user-name={user.name}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="size-6 rounded-full">
                    <AvatarImage alt={user.name} src={user.avatarUrl} />
                    <AvatarFallback className="text-xs" name={user.name} />
                  </Avatar>
                  <p className="truncate text-base">{user.name}</p>
                </div>
                {user.bio && (
                  <p className="text-muted-foreground line-clamp-3 text-sm">
                    {user.bio}
                  </p>
                )}

                <Badges content={user.disciplines} />
              </Link>
            );
          })}
          {hasNextPage && (
            <Button
              className="shrink-0 self-center"
              onClick={() => fetchNextPage()}
            >
              {isFetchingNextPage ? "Loading more..." : "Load more"}
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function FiltersTray() {
  const searchParams = Route.useSearch();
  const router = useRouter();

  const [selectedUserId, setSelectedUserId] = useState<number>();

  const [disciplines, setDisciplines] = useState(searchParams.disciplines);

  return (
    <Tray>
      <TrayTrigger asChild>
        <Button variant="outline">
          Filters <FilterIcon className="size-4" />
        </Button>
      </TrayTrigger>
      <TrayContent>
        <div className="flex flex-col items-start gap-3">
          <TrayTitle className="text-lg">Filters</TrayTitle>
          <label htmlFor="user-selector">User</label>
          <UserSelector onSelect={(user) => setSelectedUserId(user?.id)} />

          <label htmlFor="disciplines">Disciplines</label>
          <BadgeInput
            defaultSelections={disciplines}
            onChange={setDisciplines}
            options={USER_DISCIPLINES}
          />

          <div className="flex w-full justify-end gap-2">
            <TrayClose asChild>
              <Button
                variant="secondary"
                onClick={() => {
                  router.navigate({ to: "/users", replace: true });
                }}
              >
                Reset
              </Button>
            </TrayClose>
            <TrayClose asChild>
              <Button asChild>
                <Link
                  to="/users"
                  replace
                  search={{ id: selectedUserId, disciplines }}
                >
                  Apply
                </Link>
              </Button>
            </TrayClose>
          </div>
        </div>
      </TrayContent>
    </Tray>
  );
}

// function UpDownArrows({
//   goToNext,
//   goToPrevious,
// }: React.HTMLAttributes<HTMLDivElement> & {
//   goToNext: () => void;
//   goToPrevious: () => void;
// }) {
//   useEventListener("keydown", (e) => {
//     if (e.key === "ArrowDown") {
//       goToNext();
//     } else if (e.key === "ArrowUp") {
//       goToPrevious();
//     }
//   });

//   return (
//     <>
//       <Button onClick={goToNext} size="icon" variant="outline">
//         <ArrowDownIcon className="size-4" />
//       </Button>
//       <Button onClick={goToPrevious} size="icon" variant="outline">
//         <ArrowUpIcon className="size-4" />
//       </Button>
//     </>
//   );
// }
